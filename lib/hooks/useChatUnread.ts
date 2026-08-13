"use client";

import useSWR from "swr";
import { getChatUnreadCount } from "@/lib/api/chat";
import { useAuthStore } from "@/store/useAuthStore";

// Unread badge for the inbox icon.
//
// Polls rather than riding the SSE stream: the badge only needs to be roughly
// current, and the count is also what has to be right after a *read* elsewhere
// (another tab, another device), which an incoming-message event alone would
// never tell us about. Refreshes on focus so switching back to the tab is the
// common case that corrects it.
export function useChatUnread(): number {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useSWR(isAuthenticated ? "chat-unread-count" : null, getChatUnreadCount, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
  return data?.count ?? 0;
}
