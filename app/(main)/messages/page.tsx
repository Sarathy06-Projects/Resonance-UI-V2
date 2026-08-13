"use client";

import useSWR from "swr";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ErrorState } from "@/components/shared/ErrorState";
import { getConversations, type ChatConversation } from "@/lib/api/chat";
import { useAuthStore } from "@/store/useAuthStore";
import { timeAgo } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

// Inbox. The server only ever returns conversations this session is a member
// of, so there is no ownership filtering to do here - and none is attempted,
// because a client-side filter would imply the list could contain something it
// shouldn't.
export default function MessagesPage() {
  const { isAuthenticated } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? "chat-conversations" : null,
    () => getConversations(),
    { refreshInterval: 30_000 }
  );

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900">
          <MessageCircle className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-tight dark:text-white">Your messages</h2>
        <p className="max-w-sm text-[15px] text-zinc-500 dark:text-zinc-400">
          Sign in to send and read private messages.
        </p>
      </div>
    );
  }

  if (error) return <ErrorState title="Couldn't load messages" error={error} onRetry={() => mutate()} />;

  const conversations = data?.conversations ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Messages" description="Private conversations. Only you and the other person can read them." />

      {isLoading && conversations.length === 0 ? (
        <div className="animate-pulse space-y-4 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900">
            <MessageCircle className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
          </div>
          <h2 className="mb-1.5 text-lg font-bold dark:text-white">No messages yet</h2>
          <p className="max-w-xs text-[15px] text-zinc-500 dark:text-zinc-400">
            Open someone&apos;s profile and tap the message button to start a conversation.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {conversations.map((c) => (
            <ConversationRow key={c.id} conversation={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({ conversation }: { conversation: ChatConversation }) {
  const other = conversation.participants[0];
  const unread = conversation.unreadCount > 0;

  return (
    <li>
      <Link
        href={`/messages/${conversation.id}`}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-zinc-50 sm:px-6 md:hover:bg-zinc-50 dark:active:bg-zinc-900/60 dark:md:hover:bg-zinc-900/60"
      >
        <Avatar className="h-12 w-12 shrink-0 border border-zinc-100 dark:border-zinc-800">
          <AvatarImage src={other?.image ?? undefined} alt="" />
          <AvatarFallback className="dark:bg-zinc-800">{other?.name?.charAt(0) ?? "?"}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn("truncate text-[15px] text-zinc-950 dark:text-white", unread ? "font-bold" : "font-semibold")}>
              {other?.name ?? "Unknown"}
            </span>
            <span className="ml-auto shrink-0 text-[12px] text-zinc-400 dark:text-zinc-500">
              {timeAgo(conversation.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[14px]",
                unread ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              {conversation.lastMessage
                ? conversation.lastMessage.isDeleted
                  ? "Message deleted"
                  : conversation.lastMessage.body
                : "No messages yet"}
            </span>
            {unread && (
              <span className="min-w-[20px] shrink-0 rounded-full bg-blue-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
