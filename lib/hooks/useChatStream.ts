"use client";

import { useEffect, useRef } from "react";
import { notificationsStreamUrl } from "@/lib/api/notifications";
import { useAuthStore } from "@/store/useAuthStore";

type ChatEvent = "chat:message" | "chat:message-edited" | "chat:message-deleted" | "chat:reaction";

const CHAT_EVENTS: ChatEvent[] = [
  "chat:message",
  "chat:message-edited",
  "chat:message-deleted",
  "chat:reaction",
];

/**
 * Subscribes to live chat events.
 *
 * There is deliberately no conversation id parameter. The backend's SSE hub is
 * keyed by user (realtime/sse.ts): a client opens *its own* authenticated
 * stream and the server decides what to put on it. Because the client never
 * names a topic, there is no subscribe-to-someone-else's-thread request to
 * forge - the realtime surface has no id for an attacker to change.
 *
 * The stream is shared with notifications rather than opened separately:
 * browsers cap concurrent EventSource connections per origin, and a second
 * one buys nothing when both are the same authenticated per-user channel.
 */
export function useChatStream(onEvent: (event: string, payload: unknown) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Held in a ref so a caller passing an inline handler doesn't tear down and
  // re-open the connection on every render. Written in an effect rather than
  // during render - a render can be discarded, and mutating a ref there would
  // leave the stream calling a handler from an abandoned attempt.
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const source = new EventSource(notificationsStreamUrl(), { withCredentials: true });
    const listeners: [string, (e: Event) => void][] = CHAT_EVENTS.map((name) => {
      const listener = (e: Event) => {
        try {
          handlerRef.current(name, JSON.parse((e as MessageEvent).data));
        } catch {
          // A malformed frame shouldn't take down the stream.
        }
      };
      source.addEventListener(name, listener);
      return [name, listener];
    });

    source.onerror = () => {
      // EventSource reconnects on its own; the poll in useChatUnread and SWR's
      // revalidation cover the gap in the meantime.
    };

    return () => {
      for (const [name, listener] of listeners) source.removeEventListener(name, listener);
      source.close();
    };
  }, [isAuthenticated]);
}
