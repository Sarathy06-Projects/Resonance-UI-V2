"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { profileUrl } from "@/lib/urls";
import { ErrorState } from "@/components/shared/ErrorState";
import { deleteMessage, markConversationRead, type ChatMessage } from "@/lib/api/chat";
import { useConversation, type PendingMessage } from "@/lib/hooks/useConversation";
import { useAuthStore } from "@/store/useAuthStore";
import { timeAgo } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// A single thread.
//
// Message bodies render as JSX text children throughout - never through
// dangerouslySetInnerHTML - so React escapes them. That is the XSS control on
// this screen: markup in a message is displayed as characters, not parsed. Do
// not add rich-text rendering here without sanitising server-side first.
export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
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
    isPeerTyping,
    participant,
    otherLastReadAt,
    onlineUsers,
  } = useConversation(conversationId);

  // Only the newest message you sent carries a status. Instagram does the same,
  // and for the same reason: repeating "Seen" down the column says nothing
  // extra once the marker has passed, and reads as clutter.
  const lastOwnMessage = [...messages].reverse().find((m) => m.senderId === user?.id && !m.isDeleted);
  const isSeen =
    !!lastOwnMessage && !!otherLastReadAt && new Date(otherLastReadAt) >= new Date(lastOwnMessage.createdAt);
  const isPeerOnline = !!participant && onlineUsers.includes(participant.id);

  useEffect(() => {
    if (!isAuthenticated) return;
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId, isAuthenticated, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending.length, isPeerTyping]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    // Cleared immediately: the optimistic bubble is already on screen, so
    // leaving the text in the box would show it twice.
    setDraft("");
    await send(body);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center text-[15px] text-zinc-500 dark:text-zinc-400">
        Sign in to view this conversation.
      </div>
    );
  }

  // A 404 here is also what a non-member gets - the server does not
  // distinguish "no such thread" from "not yours", so neither does this.
  if (error) return <ErrorState title="Conversation unavailable" error={error} onRetry={() => mutate()} />;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Who you are talking to. The thread previously showed only a generic
          "Message" title on mobile and nothing at all on desktop, so an open
          conversation never named its other side. */}
      {/* Rendered unconditionally, not gated on `participant`.
          This route sets header: "none" (lib/mobile/nav.ts) so the shell draws
          nothing above it - if this bar only appeared once the participant had
          loaded, a slow or failed lookup would leave a mobile user with no
          header and, worse, no back affordance at all. The identity fills in
          when it arrives; the frame and the way out are always there. */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-100 bg-white/90 px-2 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-6 sm:py-3 dark:border-zinc-800 dark:bg-zinc-950/90">
        {/* Mobile only - on desktop you navigate from the rail. */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back to messages"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-900 transition-colors active:bg-zinc-100 md:hidden dark:text-zinc-100 dark:active:bg-zinc-800"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
        </button>

        {participant ? (
          <Link href={profileUrl(participant)} className="flex min-w-0 items-center gap-3">
            <span className="relative shrink-0">
              <Avatar className="h-9 w-9 border border-zinc-100 dark:border-zinc-800">
                <AvatarImage src={participant.image ?? undefined} alt="" />
                <AvatarFallback className="text-sm dark:bg-zinc-800">{participant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {isPeerOnline && (
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-950"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-zinc-950 dark:text-white">
                {participant.name}
              </span>
              <span className="block truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                {isPeerTyping ? "typing…" : isPeerOnline ? "Active now" : `@${participant.username ?? ""}`}
              </span>
            </span>
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-3">
            <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
            <span className="h-3.5 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </span>
        )}
      </div>

      <div className="flex-1 px-4 pb-4 pt-2 sm:px-6">
        {isLoading && messages.length === 0 ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : messages.length === 0 && pending.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-zinc-500 dark:text-zinc-400">
            No messages yet. Say hello.
          </p>
        ) : (
          <ol className="flex flex-col gap-2 py-2">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} isMine={m.senderId === user?.id} onChanged={() => mutate()} />
            ))}
            {/* Pending bubbles always sort last: they are, by definition, the
                newest thing this client knows about. */}
            {pending.map((p) => (
              <PendingBubble key={p.clientId} pending={p} onRetry={() => retry(p.clientId)} onDiscard={() => discard(p.clientId)} />
            ))}

            {/* Delivery status, on the newest sent message only. "Sent" means
                the server stored it; "Seen" means the other side's read marker
                has passed it. Suppressed while something is still in flight,
                since the newest thing on screen is then the pending bubble,
                which carries its own state. */}
            {lastOwnMessage && pending.length === 0 && (
              <li className="pr-1 text-right text-[11px] text-zinc-400 dark:text-zinc-500">
                {isSeen ? "Seen" : "Sent"}
              </li>
            )}
          </ol>
        )}

        {isPeerTyping && (
          <div className="flex items-center gap-1.5 px-1 py-2 text-[13px] text-zinc-500 dark:text-zinc-400">
            <span className="flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            typing
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer owns the bottom edge - this is a pushed screen, so the tab
          bar steps aside (lib/mobile/nav.ts). */}
      <div className="sticky bottom-0 flex items-end gap-2 border-t border-zinc-100 bg-white/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) notifyTyping();
            else stopTyping();
          }}
          onBlur={stopTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Message"
          aria-label="Message"
          // text-base (16px): anything smaller and iOS Safari zooms the page in
          // on focus and never zooms back out.
          className="max-h-32 flex-1 resize-none rounded-2xl bg-zinc-100 px-4 py-2.5 text-base outline-none placeholder:text-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90",
            draft.trim()
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
          )}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

const BUBBLE = "max-w-[78%] rounded-2xl px-3.5 py-2";
const MINE = "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950";

function MessageBubble({
  message,
  isMine,
  onChanged,
}: {
  message: ChatMessage;
  isMine: boolean;
  onChanged: () => void;
}) {
  const handleDelete = async () => {
    if (!window.confirm("Delete this message? This can't be undone.")) return;
    try {
      await deleteMessage(message.id);
      onChanged();
    } catch {
      window.alert("Couldn't delete that message.");
    }
  };

  return (
    <li className={cn("group/msg flex items-end gap-2", isMine ? "justify-end" : "justify-start")}>
      {isMine && !message.isDeleted && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete message"
          className="mb-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 md:group-hover/msg:flex md:hover:bg-zinc-100 dark:md:hover:bg-zinc-800"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      <div
        className={cn(
          BUBBLE,
          message.isDeleted
            ? "border border-dashed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
            : isMine
              ? MINE
              : "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100"
        )}
      >
        {/* Plain text child: React escapes it. */}
        <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
          {message.isDeleted ? "This message was deleted" : message.body}
        </p>
        <div
          className={cn(
            "mt-0.5 text-[11px]",
            isMine && !message.isDeleted ? "text-white/60 dark:text-zinc-950/60" : "text-zinc-400 dark:text-zinc-500"
          )}
        >
          {timeAgo(message.createdAt)}
          {message.editedAt && !message.isDeleted ? " · edited" : ""}
        </div>
      </div>
    </li>
  );
}

/**
 * A message this client has sent but the server has not confirmed.
 *
 * Rendered at reduced opacity while in flight, and kept on screen with a retry
 * affordance if it fails - never silently dropped, which would lose text
 * someone actually typed.
 */
function PendingBubble({
  pending,
  onRetry,
  onDiscard,
}: {
  pending: PendingMessage;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const failed = pending.status === "failed";

  return (
    <li className="flex flex-col items-end gap-1">
      <div className={cn(BUBBLE, MINE, failed ? "opacity-100 ring-1 ring-red-400" : "opacity-60")}>
        <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{pending.body}</p>
        <div className="mt-0.5 text-[11px] text-white/60 dark:text-zinc-950/60">
          {failed ? "Not sent" : "Sending…"}
        </div>
      </div>

      {failed && (
        <div className="flex items-center gap-2 text-[12px]">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          <button type="button" onClick={onRetry} className="font-semibold text-blue-600 dark:text-blue-400">
            Retry
          </button>
          <button type="button" onClick={onDiscard} className="text-zinc-500 dark:text-zinc-400">
            Discard
          </button>
        </div>
      )}
    </li>
  );
}
