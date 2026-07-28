"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Heart, MessageCircle, UserPlus, Sparkles, AtSign, 
  FileText, CheckCheck, Settings, Bookmark, EyeOff, User, ExternalLink, Mailbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type NotificationGroup = "Today" | "Yesterday" | "Earlier this week";
type NotificationCategory = "all" | "unread" | "mentions" | "replies" | "likes" | "follows" | "articles" | "system";

interface NotificationItem {
  id: string;
  category: NotificationCategory;
  group: NotificationGroup;
  user: { name: string; avatar: string; username?: string };
  actionText: string;
  timestamp: string;
  isRead: boolean;
  icon: any;
  color: string;
  bg: string;
  postPreview?: string;
  articlePreview?: { title: string; coverImage: string; readTime: string };
  systemData?: { title: string; description: string; cta: string };
}

const initialNotifications: NotificationItem[] = [
  {
    id: "n1",
    category: "likes",
    group: "Today",
    user: { name: "Sarah Chen", avatar: "https://i.pravatar.cc/150?u=2", username: "sarahc" },
    actionText: "liked your article",
    timestamp: "2h ago",
    isRead: false,
    icon: Heart,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    articlePreview: {
      title: "The Future of Spatial Design Interfaces",
      coverImage: "https://images.unsplash.com/photo-1622675363311-3e1904dc1885?auto=format&fit=crop&q=80&w=400",
      readTime: "5 min read"
    }
  },
  {
    id: "n2",
    category: "replies",
    group: "Today",
    user: { name: "Marcus Johnson", avatar: "https://i.pravatar.cc/150?u=3", username: "marcusj" },
    actionText: "replied to your discussion",
    timestamp: "4h ago",
    isRead: false,
    icon: MessageCircle,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    postPreview: "Completely agree! Accessibility is so important, especially when designing for enterprise software."
  },
  {
    id: "n3",
    category: "mentions",
    group: "Today",
    user: { name: "Alex Rivera", avatar: "https://i.pravatar.cc/150?u=1", username: "arivera" },
    actionText: "mentioned you in a post",
    timestamp: "5h ago",
    isRead: false,
    icon: AtSign,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    postPreview: "Hey @you, I saw your latest UI kit and I think we could use some of those patterns here."
  },
  {
    id: "n4",
    category: "follows",
    group: "Yesterday",
    user: { name: "Emma Watson", avatar: "https://i.pravatar.cc/150?u=4", username: "emmaw" },
    actionText: "started following you",
    timestamp: "1d ago",
    isRead: true,
    icon: UserPlus,
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  {
    id: "n5",
    category: "system",
    group: "Yesterday",
    user: { name: "Resonance", avatar: "" },
    actionText: "sent you a weekly digest",
    timestamp: "1d ago",
    isRead: true,
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    systemData: {
      title: "Your Weekly Design Digest",
      description: "You have 12 new discussions in your followed communities and 3 trending articles you might like.",
      cta: "Read Digest"
    }
  },
  {
    id: "n6",
    category: "articles",
    group: "Earlier this week",
    user: { name: "Sarah Chen", avatar: "https://i.pravatar.cc/150?u=2", username: "sarahc" },
    actionText: "published a new article",
    timestamp: "3d ago",
    isRead: true,
    icon: FileText,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    articlePreview: {
      title: "Building Accessible Color Palettes",
      coverImage: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&q=80&w=400",
      readTime: "8 min read"
    }
  }
];

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "replies", label: "Replies" },
  { id: "likes", label: "Likes" },
  { id: "follows", label: "Follows" },
  { id: "articles", label: "Articles" },
  { id: "system", label: "System" }
] as const;

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [notifications, setNotifications] = useState(initialNotifications);

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

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    return n.category === activeTab;
  });

  const unreadCounts = notifications.reduce((acc, curr) => {
    if (!curr.isRead) {
      acc.all = (acc.all || 0) + 1;
      acc[curr.category] = (acc[curr.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Group notifications chronologically
  const grouped = filteredNotifications.reduce((acc, curr) => {
    if (!acc[curr.group]) acc[curr.group] = [];
    acc[curr.group].push(curr);
    return acc;
  }, {} as Record<string, NotificationItem[]>);

  const groupOrder: NotificationGroup[] = ["Today", "Yesterday", "Earlier this week"];

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 pb-20 md:pb-0">
      
      {/* Enhanced Header */}
      <div className="sticky top-0 sm:top-16 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 pt-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight dark:text-white mb-1">Notifications</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Stay updated with activity across your design community.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="h-9 font-medium text-xs rounded-xl dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all as read
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-3">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const count = tab.id === "unread" ? unreadCounts.all : (tab.id === "all" ? 0 : unreadCounts[tab.id]);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NotificationCategory)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-300",
                  isActive 
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm" 
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
                )}
              >
                {tab.label}
                {count > 0 && (
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

      {/* Notifications List */}
      <div className="flex-1 py-4 sm:py-6">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center px-4">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <Mailbox className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">
              {activeTab === "all" || activeTab === "unread" ? "You're all caught up." : `No ${activeTab} yet.`}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {activeTab === "mentions" && "Nobody has mentioned you yet."}
              {activeTab === "likes" && "When someone likes your work, it will appear here."}
              {activeTab === "replies" && "Join discussions to get replies."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto px-0 sm:px-6">
            {groupOrder.map(group => {
              if (!grouped[group]) return null;
              
              return (
                <div key={group} className="flex flex-col">
                  <h2 className="px-4 sm:px-0 text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">{group}</h2>
                  <div className="flex flex-col sm:rounded-2xl sm:border border-zinc-100 dark:border-zinc-800/60 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-950">
                    {grouped[group].map(notif => (
                      <div 
                        key={notif.id}
                        className={cn(
                          "group/notif relative flex gap-4 p-4 sm:p-5 transition-all duration-300 cursor-pointer",
                          !notif.isRead 
                            ? "bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/60 dark:hover:bg-blue-900/20" 
                            : "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                        )}
                        onClick={(e) => {
                          if (!notif.isRead) handleMarkAsRead(notif.id, e);
                        }}
                      >
                        {/* Unread Dot */}
                        {!notif.isRead && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                        )}

                        {/* Icon & Avatar */}
                        <div className="shrink-0 flex flex-col items-center gap-2 z-10 pl-1">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border border-zinc-100 dark:border-zinc-800/50", notif.bg)}>
                            <notif.icon className={cn("w-5 h-5", notif.color)} />
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-w-0 pr-12">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-1.5">
                            {notif.category === "system" ? (
                              <span className="font-bold text-[15px] dark:text-white">Resonance</span>
                            ) : (
                              <Link href={`/profile/${notif.user.username}`} className="font-bold text-[15px] dark:text-white hover:underline truncate max-w-[200px]" onClick={e => e.stopPropagation()}>
                                {notif.user.name}
                              </Link>
                            )}
                            <span className={cn("text-[15px] text-zinc-600 dark:text-zinc-300", !notif.isRead && "font-medium text-zinc-900 dark:text-zinc-100")}>
                              {notif.actionText}
                            </span>
                            <span className="text-[13px] text-zinc-400 ml-1">· {notif.timestamp}</span>
                          </div>

                          {/* Post Preview */}
                          {notif.postPreview && (
                            <p className="text-[15px] text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                              {notif.postPreview}
                            </p>
                          )}

                          {/* Article Preview */}
                          {notif.articlePreview && (
                            <div className="mt-3 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden flex bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                              <div className="w-24 h-24 shrink-0 bg-zinc-200 dark:bg-zinc-800">
                                <img src={notif.articlePreview.coverImage} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="p-3 flex flex-col justify-center min-w-0">
                                <h4 className="font-bold text-sm dark:text-white truncate mb-1">{notif.articlePreview.title}</h4>
                                <span className="text-xs text-zinc-500 font-medium">{notif.articlePreview.readTime}</span>
                              </div>
                            </div>
                          )}

                          {/* System Data */}
                          {notif.systemData && (
                            <div className="mt-3 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-500/5">
                              <h4 className="font-bold text-[15px] text-amber-900 dark:text-amber-50 mb-1">{notif.systemData.title}</h4>
                              <p className="text-sm text-amber-700 dark:text-amber-200/70 mb-3">{notif.systemData.description}</p>
                              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg h-8 text-xs font-bold shadow-sm">
                                {notif.systemData.cta}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions (Hover) */}
                        <div className="absolute right-4 top-4 opacity-0 group-hover/notif:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 rounded-lg p-1 z-20">
                          {!notif.isRead && (
                            <button onClick={(e) => handleMarkAsRead(notif.id, e)} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" title="Mark as read">
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" title="Save">
                            <Bookmark className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" title="Mute">
                            <EyeOff className="w-4 h-4" />
                          </button>
                          {notif.category !== "system" && (
                            <button className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" title="View Profile">
                              <User className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
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
