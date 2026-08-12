"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Heart, MessageCircle, UserPlus, Sparkles, AtSign,
  FileText, CheckCheck, Settings, Repeat2, Mailbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ErrorState } from "@/components/shared/ErrorState";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api/notifications";
import { timeAgo } from "@/lib/formatTime";
import { profileUrl } from "@/lib/urls";
import type { NotificationItem } from "@/lib/api/types";

type Category = "all" | "unread" | "mentions" | "replies" | "likes" | "follows" | "articles" | "system";

const TABS: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "replies", label: "Replies" },
  { id: "likes", label: "Likes" },
  { id: "follows", label: "Follows" },
  { id: "articles", label: "Articles" },
  { id: "system", label: "System" },
];

const ICONS: Record<NotificationItem["type"], { icon: typeof Heart; color: string; bg: string; text: string }> = {
  like: { icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10", text: "liked your post" },
  reply: { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10", text: "replied to your discussion" },
  mention: { icon: AtSign, color: "text-purple-500", bg: "bg-purple-500/10", text: "mentioned you" },
  follow: { icon: UserPlus, color: "text-green-500", bg: "bg-green-500/10", text: "started following you" },
  repost: { icon: Repeat2, color: "text-emerald-500", bg: "bg-emerald-500/10", text: "reposted your post" },
  article_published: { icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10", text: "published a new article" },
  system: { icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", text: "" },
};

function groupByRecency(items: NotificationItem[]) {
  const now = Date.now();
  const groups: Record<"Today" | "Yesterday" | "Earlier", NotificationItem[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const n of items) {
    const ageMs = now - new Date(n.createdAt).getTime();
    const days = ageMs / (1000 * 60 * 60 * 24);
    if (days < 1) groups.Today.push(n);
    else if (days < 2) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  }
  return groups;
}

function targetHref(n: NotificationItem): string | null {
  // These two are the one deliberate exception left in the /@username/slug
  // migration: the notification payload only carries targetId, not the
  // target content's author/slug (and the notification's own `actor` isn't
  // necessarily that author - e.g. a "like" notification's actor liked
  // *your* content, they didn't write it). Enriching this is a real but
  // separate fast-follow (touches every notification-creation call site in
  // the backend's notify.ts). The permanent /article/:id and /post/:id
  // redirect layer handles these correctly either way - one extra redirect
  // hop, no SEO cost since this page is behind auth and noindex already.
  if (n.targetType === "post" && n.targetId) return `/post/${n.targetId}`;
  if (n.targetType === "article" && n.targetId) return `/article/${n.targetId}`;
  if (n.targetType === "user" && n.actor?.username) return profileUrl(n.actor);
  return null;
}

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Category>("all");

  const { data, error, isLoading, mutate } = useSWR(isAuthenticated ? `notifications-${activeTab}` : null, () => getNotifications(activeTab));
  const { data: unreadData, mutate: mutateUnread } = useSWR(isAuthenticated ? "notifications-unread-all" : null, () => getNotifications("unread", null));

  const unreadCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {};
    const items = unreadData?.notifications ?? [];
    counts.all = items.length;
    for (const n of items) {
      const cat = ({ mention: "mentions", reply: "replies", like: "likes", follow: "follows", article_published: "articles", system: "system", repost: "likes" } as Record<string, Category>)[n.type];
      if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [unreadData]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3 dark:text-white tracking-tight">Stay in the loop</h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto text-lg mb-8">
          Join Resonance to get updates when designers interact with your work, mention you in discussions, and more.
        </p>
      </div>
    );
  }

  const notifications = data?.notifications ?? [];

  const handleMarkAsRead = (id: string) => {
    markNotificationRead(id).then(() => {
      mutate();
      mutateUnread();
    });
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsRead().then(() => {
      mutate();
      mutateUnread();
    });
  };

  const grouped = groupByRecency(notifications);
  const groupOrder: (keyof typeof grouped)[] = ["Today", "Yesterday", "Earlier"];

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">

      <div className="sticky top-0 sm:top-16 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 pt-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight dark:text-white mb-1">Notifications</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Stay updated with activity across your design community.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleMarkAllAsRead} className="flex items-center h-9 px-3 font-medium text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 hover:bg-zinc-50">
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all as read
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 hover:bg-zinc-50">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-3">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const count = unreadCounts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-300",
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
                )}
              >
                {tab.label}
                {!!count && tab.id !== "unread" && (
                  <span className={cn(
                    "flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px]",
                    isActive ? "bg-white/20 text-white dark:bg-black/10 dark:text-zinc-900" : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 py-4 sm:py-6">
        {error ? (
          <ErrorState title="Couldn't load notifications" error={error} onRetry={() => mutate()} />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center px-4">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <Mailbox className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">
              {isLoading ? "Loading…" : "You're all caught up."}
            </h3>
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto px-0 sm:px-6">
            {groupOrder.map(group => {
              if (grouped[group].length === 0) return null;
              return (
                <div key={group} className="flex flex-col">
                  <h2 className="px-4 sm:px-0 text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">{group}</h2>
                  <div className="flex flex-col sm:rounded-2xl sm:border border-zinc-100 dark:border-zinc-800/60 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-950">
                    {grouped[group].map(notif => {
                      const meta = ICONS[notif.type];
                      const Icon = meta.icon;
                      const href = targetHref(notif);

                      return (
                        <div
                          key={notif.id}
                          className={cn(
                            "group/notif relative flex gap-4 p-4 sm:p-5 transition-all duration-300 cursor-pointer",
                            !notif.isRead
                              ? "bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/60 dark:hover:bg-blue-900/20"
                              : "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                          )}
                          onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                        >
                          {!notif.isRead && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                          )}

                          <div className="shrink-0 flex flex-col items-center gap-2 z-10 pl-1">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border border-zinc-100 dark:border-zinc-800/50", meta.bg)}>
                              <Icon className={cn("w-5 h-5", meta.color)} />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-1.5">
                              {notif.type === "system" ? (
                                <span className="font-bold text-[15px] dark:text-white">Resonance</span>
                              ) : (
                                <Link href={profileUrl({ username: notif.actor?.username ?? null })} className="font-bold text-[15px] dark:text-white hover:underline truncate max-w-[200px]" onClick={e => e.stopPropagation()}>
                                  {notif.actor?.name ?? "Someone"}
                                </Link>
                              )}
                              <span className={cn("text-[15px] text-zinc-600 dark:text-zinc-300", !notif.isRead && "font-medium text-zinc-900 dark:text-zinc-100")}>
                                {notif.type === "system" ? notif.data?.title : meta.text}
                              </span>
                              <span className="text-[13px] text-zinc-400 ml-1">· {timeAgo(notif.createdAt)}</span>
                            </div>

                            {notif.type === "system" && notif.data && (
                              <div className="mt-3 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-500/5">
                                <p className="text-sm text-amber-700 dark:text-amber-200/70">{notif.data.description}</p>
                              </div>
                            )}

                            {href && notif.type !== "system" && (
                              <Link href={href} className="text-sm text-blue-600 dark:text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                                View
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
