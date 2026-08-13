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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// Shared by the mobile filter rail and the desktop tab row so the two can't
// drift apart as categories are added.
function FilterChips({
  tabs,
  activeTab,
  setActiveTab,
  unreadCounts,
}: {
  tabs: { id: Category; label: string }[];
  activeTab: Category;
  setActiveTab: (c: Category) => void;
  unreadCounts: Partial<Record<Category, number>>;
}) {
  return (
    <>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const count = unreadCounts[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors active:scale-95",
              isActive
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 md:hover:bg-zinc-100 dark:md:hover:bg-zinc-900"
            )}
          >
            {tab.label}
            {!!count && tab.id !== "unread" && (
              <span className={cn(
                "flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                isActive ? "bg-white/20 text-white dark:bg-black/10 dark:text-zinc-900" : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

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
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">

      {/* The page title lives in the mobile header (lib/mobile/nav.ts gives
          this route header: "large-title"), so this bar only carries the
          filters and the mark-all action below `md`. */}
      <div className="sticky top-[var(--mobile-header-height)] z-20 border-b border-zinc-100 bg-white/90 backdrop-blur-xl md:px-6 md:pt-6 dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mb-6 hidden flex-col justify-between gap-4 sm:flex-row sm:items-end md:flex">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight dark:text-white">Notifications</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Stay updated with activity across your design community.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleMarkAllAsRead} className="flex h-9 items-center rounded-xl border border-zinc-200 px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all as read
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mark-all is an icon button on mobile, sat at the end of the filter
            rail - a full-width labelled button would claim a whole row for a
            secondary action. */}
        <div className="flex items-center gap-2 px-3 py-2 md:hidden">
          <div className="flex flex-1 gap-1 overflow-x-auto no-scrollbar rail-x">
            <FilterChips tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} unreadCounts={unreadCounts} />
          </div>
          <button
            onClick={handleMarkAllAsRead}
            aria-label="Mark all as read"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
          >
            <CheckCheck className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden gap-1 overflow-x-auto pb-3 no-scrollbar md:flex">
          <FilterChips tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} unreadCounts={unreadCounts} />
        </div>
      </div>

      <div className="flex-1 py-2 sm:py-6">
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
          <div className="mx-auto flex max-w-4xl flex-col gap-4 px-0 sm:gap-8 sm:px-6">
            {groupOrder.map(group => {
              if (grouped[group].length === 0) return null;
              return (
                <div key={group} className="flex flex-col">
                  <h2 className="mb-2 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 sm:mb-3 sm:px-0 sm:text-sm dark:text-zinc-500">{group}</h2>
                  <div className="flex flex-col divide-y divide-zinc-100 overflow-hidden bg-white sm:rounded-2xl sm:border border-zinc-100 dark:divide-zinc-800/60 dark:border-zinc-800/60 dark:bg-zinc-950">
                    {grouped[group].map(notif => {
                      const meta = ICONS[notif.type];
                      const Icon = meta.icon;
                      const href = targetHref(notif);
                      const isSystem = notif.type === "system";

                      // The whole row navigates. A "View" link inside a row
                      // that already looked tappable gave the same action two
                      // targets of very different sizes - on touch you always
                      // hit the big one, so the small one was just noise.
                      const rowProps = {
                        className: cn(
                          "relative flex gap-3 p-4 transition-colors sm:gap-4 sm:p-5",
                          !notif.isRead
                            ? "bg-blue-50/40 active:bg-blue-50/70 dark:bg-blue-900/10 dark:active:bg-blue-900/20"
                            : "active:bg-zinc-50 dark:active:bg-zinc-900/50"
                        ),
                        onClick: () => {
                          if (!notif.isRead) handleMarkAsRead(notif.id);
                        },
                      };

                      const body = (
                        <>
                          {!notif.isRead && (
                            <span aria-hidden className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                          )}

                          {/* Actor avatar carries the identity, with the event
                              type as a small badge on the corner. Leading with
                              a generic type icon made every like in a list of
                              likes look identical. */}
                          <div className="relative z-10 shrink-0 pl-1">
                            <Avatar className="h-10 w-10 border border-zinc-100 dark:border-zinc-800">
                              <AvatarImage src={notif.actor?.image ?? undefined} alt="" />
                              <AvatarFallback className={cn("text-sm", meta.bg, meta.color)}>
                                {isSystem ? "R" : (notif.actor?.name?.charAt(0) ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                            <span className={cn(
                              "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-950",
                              meta.bg
                            )}>
                              <Icon className={cn("h-3 w-3", meta.color)} />
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] leading-snug text-zinc-600 dark:text-zinc-300">
                              <span className="font-semibold text-zinc-950 dark:text-white">
                                {isSystem ? "Resonance" : (notif.actor?.name ?? "Someone")}
                              </span>{" "}
                              <span className={cn(!notif.isRead && "text-zinc-900 dark:text-zinc-100")}>
                                {isSystem ? notif.data?.title : meta.text}
                              </span>{" "}
                              <span className="whitespace-nowrap text-[13px] text-zinc-400">· {timeAgo(notif.createdAt)}</span>
                            </p>

                            {isSystem && notif.data && (
                              <div className="mt-2.5 rounded-xl border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-500/5">
                                <p className="text-sm text-amber-700 dark:text-amber-200/70">{notif.data.description}</p>
                              </div>
                            )}
                          </div>
                        </>
                      );

                      return href && !isSystem ? (
                        <Link key={notif.id} href={href} {...rowProps}>
                          {body}
                        </Link>
                      ) : (
                        <div key={notif.id} {...rowProps}>
                          {body}
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
