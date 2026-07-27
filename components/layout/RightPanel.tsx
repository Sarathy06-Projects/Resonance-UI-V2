"use client";

import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { mockUsers, mockArticles, upcomingEvents, designChallenges, popularResources, trendingHashtags } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, TrendingUp, Calendar, Zap, LayoutTemplate, Palette, Type, Users, MessageSquare } from "lucide-react";
import Link from "next/link";

interface RightPanelProps {
  className?: string;
}

export function RightPanel({ className }: RightPanelProps) {
  const { followedUsers, toggleFollow } = useDataStore();
  const { isAuthenticated, openAuthModal } = useAuthStore();

  const handleFollow = (userId: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    toggleFollow(userId);
  };

  const featuredArticle = mockArticles[0];
  const challenge = designChallenges[0];

  return (
    <div className={cn("w-full shrink-0 flex flex-col gap-6", className)}>
      
      {/* 1. Featured Article */}
      {featuredArticle && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden group">
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative">
            <img src={featuredArticle.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-4 right-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              Featured
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-[16px] leading-tight mb-2 text-zinc-950 dark:text-white group-hover:text-blue-500 transition-colors">{featuredArticle.title}</h3>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <span>{featuredArticle.author.name}</span>
              <span>{featuredArticle.readTime}</span>
            </div>
            <Button variant="secondary" size="sm" className="w-full mt-5 rounded-xl font-semibold bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" asChild>
              <Link href={`/article/${featuredArticle.id}`}>Read Article</Link>
            </Button>
          </div>
        </div>
      )}

      {/* 2. Community Pulse */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
        <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Community Pulse</h3>
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-zinc-950 dark:text-white">2.4K</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-1"><MessageSquare className="w-3.5 h-3.5" /> Discussions</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-zinc-950 dark:text-white">186</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-1"><FileTextIcon className="w-3.5 h-3.5" /> Articles</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-zinc-950 dark:text-white">450</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-1"><Users className="w-3.5 h-3.5" /> New Users</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-blue-500">+12%</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-1"><TrendingUp className="w-3.5 h-3.5" /> Engagement</span>
          </div>
        </div>
      </div>

      {/* 3. Recommended Users (Who to follow) */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
        <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Who to follow</h3>
        <div className="space-y-5">
          {mockUsers.slice(1, 4).map(user => {
            const isFollowed = followedUsers.includes(user.id);
            return (
              <div key={user.id} className="flex items-center justify-between gap-3 group/user">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-700 shrink-0 shadow-sm">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="dark:bg-zinc-800 dark:text-zinc-300">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[14px] truncate text-zinc-950 dark:text-zinc-100 group-hover/user:underline">{user.name}</span>
                      {user.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />}
                    </div>
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium truncate">{user.role}</span>
                    {user.mutualFollowers && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">Followed by {user.mutualFollowers} others</span>
                    )}
                  </div>
                </div>
                <Button 
                  variant={isFollowed ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full h-8 px-4 font-semibold text-xs transition-colors shrink-0",
                    isFollowed 
                      ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200" 
                      : "dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md"
                  )}
                  onClick={() => handleFollow(user.id)}
                >
                  {isFollowed ? "Following" : "Follow"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Trending Topics */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
        <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Trending Topics</h3>
        <div className="space-y-5">
          {[
            { topic: "UI Design", posts: "12.5K", growth: "↑ 18%" },
            { topic: "Framer Motion", posts: "8.2K", growth: "↑ 12%" },
            { topic: "Design Systems", posts: "6.1K", growth: "↑ 8%" },
          ].map((trend, i) => (
            <div key={i} className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-950 group-hover:underline dark:text-zinc-100">{trend.topic}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">{trend.posts} discussions</span>
              </div>
              <span className="text-[11px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-md">
                {trend.growth}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Design Challenge */}
      {challenge && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-3 text-zinc-950 dark:text-zinc-100">
            <Zap className="w-4 h-4 fill-current text-blue-500" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Weekly Challenge</h3>
          </div>
          <h4 className="font-bold text-[18px] text-zinc-950 dark:text-white mb-2 leading-tight">{challenge.title}</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-5">{challenge.participants} participating · {challenge.deadline}</p>
          <Button className="w-full rounded-full h-10 font-semibold shadow-sm">
            Join Challenge
          </Button>
        </div>
      )}

      {/* 6. Upcoming Events */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
        <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Upcoming Events</h3>
        <div className="space-y-5">
          {upcomingEvents.map(event => (
            <div key={event.id} className="flex flex-col group">
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{event.date}</span>
              </div>
              <span className="font-bold text-[15px] text-zinc-950 dark:text-zinc-100 group-hover:text-blue-500 transition-colors mb-3">{event.title}</span>
              <Button variant="outline" size="sm" className="w-fit h-8 text-xs font-semibold rounded-lg dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                Register
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Popular Resources */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 mb-8">
        <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Popular Resources</h3>
        <div className="space-y-4">
          {popularResources.map(resource => (
            <div key={resource.id} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm border border-zinc-100 dark:border-zinc-700 group-hover:shadow-md transition-all">
                {resource.type.includes("Figma") ? <LayoutTemplate className="w-4 h-4" /> : resource.type.includes("Color") ? <Palette className="w-4 h-4" /> : <Type className="w-4 h-4" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[14px] text-zinc-950 dark:text-zinc-100 group-hover:underline">{resource.title}</span>
                <span className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{resource.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Simple icon for community pulse
function FileTextIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  )
}
