"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  getMessages,
  sendMessage,
  setTyping,
  getPresence,
  type ChatMessage,
} from "@/lib/api/chat";
import { useChatStream } from "@/lib/hooks/useChatStream";
import { useAuthStore } from "@/store/useAuthStore";

/** A message the user has sent that the server has not yet confirmed. */
export interface PendingMessage {
  /** Client-generated, only ever used to reconcile against the server id. */
  clientId: string;
  body: string;
  createdAt: string;
  status: "sending" | "failed";
}

const TYPING_PING_MS = 2000;
// Slightly longer than the sender's ping interval, so a continuously typing
// peer never flickers off between pings.
const TYPING_EXPIRY_MS = 5000;

/**
 * Everything a conversation view needs: history, live events, optimistic
 * sending, and typing state.
 *
 * The ordering and de-duplication rules live here rather than in the component
 * because they are the parts that are easy to get subtly wrong:
 *
 *  - Server ids and server timestamps are authoritative. The client clock is
 *    never used for ordering, only to render a pending bubble before the
 *    server has spoken.
 *  - Every incoming event triggers a refetch rather than being spliced into
 *    local state. That makes duplicate and out-of-order events harmless by
 *    construction: the list is always whatever the server just said it is.
 */
export function useConversation(conversationId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  // Live presence *deltas* only. The fetched snapshot stays in SWR and the two
  // are merged at render, so there is no effect copying server data into state
  // and no window where the snapshot overwrites a newer live event.
  const [presenceDeltas, setPresenceDeltas] = useState<Record<string, boolean>>({});

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? ["chat-messages", conversationId] : null,
    () => getMessages(conversationId),
    {
      // A safety net, not the delivery mechanism - SSE is. But when the stream
      // is down (a proxy that buffers it, a captive network) the thread would
      // otherwise never update at all. One request a minute beats silence.
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    }
  );

  const { data: presence } = useSWR(
    isAuthenticated ? ["chat-presence", conversationId] : null,
    () => getPresence(conversationId)
  );

  const onlineUsers = useMemo(() => {
    const set = new Set(presence?.online ?? []);
    for (const [id, online] of Object.entries(presenceDeltas)) {
      if (online) set.add(id);
      else set.delete(id);
    }
    return [...set];
  }, [presence, presenceDeltas]);

  const handleEvent = useCallback(
    (event: string, payload: unknown) => {
      const p = payload as { conversationId?: string; userId?: string; online?: boolean };

      if (event === "presence") {
        if (!p.userId) return;
        setPresenceDeltas((prev) => ({ ...prev, [p.userId!]: Boolean(p.online) }));
        return;
      }

      // Everything below is conversation-scoped. The stream carries every
      // thread this user belongs to, so filter by id. This is a display
      // filter, not access control - the server already decided what to send.
      if (p.conversationId !== conversationId) return;

      if (event === "typing.started" && p.userId) {
        setTypingUsers((prev) => ({ ...prev, [p.userId!]: Date.now() }));
        return;
      }
      if (event === "typing.stopped" && p.userId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[p.userId!];
          return next;
        });
        return;
      }

      // Message created / edited / deleted / reacted: refetch rather than
      // splice. Cheap at this page size, and it makes duplicate deliveries and
      // out-of-order arrival non-issues.
      void mutate();
    },
    [conversationId, mutate]
  );

  useChatStream(handleEvent);

  // A peer whose "stopped" event was lost (tab closed, network dropped) would
  // otherwise appear to type forever. Expiring locally means the indicator is
  // self-healing and needs no server-side timer.
  useEffect(() => {
    if (Object.keys(typingUsers).length === 0) return;
    const id = setInterval(() => {
      const cutoff = Date.now() - TYPING_EXPIRY_MS;
      setTypingUsers((prev) => {
        const next = Object.fromEntries(Object.entries(prev).filter(([, at]) => at > cutoff));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [typingUsers]);

  // Confirmed history is newest-first from the API (the cursor pages
  // backwards); reversed once so the transcript reads top to bottom.
  const messages = useMemo(() => (data ? [...data.messages].reverse() : []), [data]);

  const lastTypingPing = useRef(0);

  const notifyTyping = useCallback(() => {
    // Debounced to one call per interval. Without this every keystroke would
    // be a request, which is both wasteful and exactly what the rate limiter
    // would start rejecting mid-conversation.
    const now = Date.now();
    if (now - lastTypingPing.current < TYPING_PING_MS) return;
    lastTypingPing.current = now;
    setTyping(conversationId, true).catch(() => {});
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    lastTypingPing.current = 0;
    setTyping(conversationId, false).catch(() => {});
  }, [conversationId]);

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      const clientId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setPending((prev) => [
        ...prev,
        { clientId, body: trimmed, createdAt: new Date().toISOString(), status: "sending" },
      ]);
      stopTyping();

      try {
        await sendMessage(conversationId, trimmed);
        // Refetch first, then drop the placeholder - in that order, so the
        // confirmed message is already in the list when the pending bubble
        // disappears and there is never a frame with neither on screen.
        // Reconciling on the clientId we created, rather than by matching
        // message text, means two identical messages sent in a row can't
        // cancel each other's placeholder.
        await mutate();
        setPending((prev) => prev.filter((p) => p.clientId !== clientId));
      } catch {
        // Left on screen in a failed state rather than removed. Silently
        // discarding a message someone typed is the worst possible outcome.
        setPending((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, status: "failed" } : p)));
      }
    },
    [conversationId, mutate, stopTyping]
  );

  const retry = useCallback(
    async (clientId: string) => {
      const target = pending.find((p) => p.clientId === clientId);
      if (!target) return;
      setPending((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, status: "sending" } : p)));
      try {
        await sendMessage(conversationId, target.body);
        await mutate();
        setPending((prev) => prev.filter((p) => p.clientId !== clientId));
      } catch {
        setPending((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, status: "failed" } : p)));
      }
    },
    [conversationId, mutate, pending]
  );

  const discard = useCallback((clientId: string) => {
    setPending((prev) => prev.filter((p) => p.clientId !== clientId));
  }, []);

  return {
    messages,
    pending,
    isLoading,
    error,
    send,
    retry,
    discard,
    mutate,
    notifyTyping,
    stopTyping,
    isPeerTyping: Object.keys(typingUsers).length > 0,
    onlineUsers,
  };
}

export type { ChatMessage };
