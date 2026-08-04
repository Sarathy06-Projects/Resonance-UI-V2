"use client";

import useSWR from "swr";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { getRecommendedUsers } from "@/lib/api/users";
import { getPopularArticles } from "@/lib/api/articles";
import { getTrendingHashtags } from "@/lib/api/hashtags";
import { getUpcomingEvents, getCurrentChallenges, getPopularResources } from "@/lib/api/discovery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/formatCount";
import { CheckCircle2, Calendar, Zap, LayoutTemplate, Palette, Type } from "lucide-react";
import Link from "next/link";

interface RightPanelProps {
  className?: string;
}

export function RightPanel({ className }: RightPanelProps) {
  const { isAuthenticated, openAuthModal } = useAuthStore();

  const { data: popularArticles } = useSWR("right-panel-popular-articles", () => getPopularArticles(1));
  const { data: recommended } = useSWR("right-panel-recommended", () => getRecommendedUsers(3));
  const { data: trending } = useSWR("right-panel-trending", () => getTrendingHashtags(3));
  const { data: events } = useSWR("right-panel-events", () => getUpcomingEvents(2));
  const { data: challenges } = useSWR("right-panel-challenges", () => getCurrentChallenges(1));
  const { data: resources } = useSWR("right-panel-resources", () => getPopularResources(3));

  const featuredArticle = popularArticles?.articles[0];
  const challenge = challenges?.challenges[0];

  return (
    <div className={cn("w-full shrink-0 flex flex-col gap-6", className)}>

      {featuredArticle && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden group">
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative">
            {featuredArticle.coverImage && (
              <Image src={featuredArticle.coverImage} alt="" fill sizes="320px" loading="lazy" className="object-cover group-hover:scale-105 transition-transform duration-500" />
            )}
            <div className="absolute top-4 right-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              Featured
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-[16px] leading-tight mb-2 text-zinc-950 dark:text-white group-hover:text-blue-500 transition-colors">{featuredArticle.title}</h3>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <span>{featuredArticle.author.name}</span>
              {featuredArticle.readTime && <span>{featuredArticle.readTime}</span>}
            </div>
            <Button variant="secondary" size="sm" nativeButton={false} className="w-full mt-5 rounded-xl font-semibold bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" render={<Link href={`/article/${featuredArticle.id}`} />}>
              Read Article
            </Button>
          </div>
        </div>
      )}

      {recommended && recommended.users.length > 0 && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
          <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Who to follow</h3>
          <div className="space-y-5">
            {recommended.users.map(user => (
              <WhoToFollowRow key={user.id} user={user} />
            ))}
          </div>
        </div>
      )}

      {trending && trending.hashtags.length > 0 && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
          <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Trending Topics</h3>
          <div className="space-y-5">
            {trending.hashtags.map((trend) => (
              <Link href={`/hashtag/${trend.tag.replace('#', '')}`} key={trend.tag} className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-950 group-hover:underline dark:text-zinc-100">{trend.tag}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">{trend.postsCount} posts</span>
                </div>
                {trend.growthPct !== 0 && (
                  <span className={cn(
                    "text-[11px] font-bold px-2.5 py-1 rounded-md",
                    trend.growthPct > 0 ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10" : "text-zinc-500 bg-zinc-100 dark:bg-zinc-800"
                  )}>
                    {trend.growthPct > 0 ? "↑" : "↓"} {Math.abs(trend.growthPct)}%
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {challenge && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-3 text-zinc-950 dark:text-zinc-100">
            <Zap className="w-4 h-4 fill-current text-blue-500" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Weekly Challenge</h3>
          </div>
          <h4 className="font-bold text-[18px] text-zinc-950 dark:text-white mb-2 leading-tight">{challenge.title}</h4>
          {(challenge.participants || challenge.deadline) && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-5">
              {challenge.participants ? `${challenge.participants} participating` : ""}{challenge.participants && challenge.deadline ? " · " : ""}{challenge.deadline}
            </p>
          )}
          <Button
            className="w-full rounded-full h-10 font-semibold shadow-sm"
            onClick={() => !isAuthenticated && openAuthModal()}
          >
            Join Challenge
          </Button>
        </div>
      )}

      {events && events.events.length > 0 && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
          <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Upcoming Events</h3>
          <div className="space-y-5">
            {events.events.map(event => (
              <div key={event.id} className="flex flex-col group">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{event.date}</span>
                </div>
                <span className="font-bold text-[15px] text-zinc-950 dark:text-zinc-100 group-hover:text-blue-500 transition-colors mb-3">{event.title}</span>
                <Button
                  variant="outline" size="sm"
                  className="w-fit h-8 text-xs font-semibold rounded-lg dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => !isAuthenticated && openAuthModal()}
                >
                  Register
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {resources && resources.resources.length > 0 && (
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 mb-8">
          <h3 className="font-bold text-[16px] text-zinc-950 mb-5 dark:text-zinc-100">Popular Resources</h3>
          <div className="space-y-4">
            {resources.resources.map(resource => (
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
      )}

    </div>
  );
}

function WhoToFollowRow({ user }: { user: { id: string; name: string; username: string | null; image: string | null; role: string | null; verified: boolean; followersCount?: number; mutualCount?: number } }) {
  const { isFollowing, toggleFollow } = useFollowState(user.id, false);
  const { isAuthenticated, openAuthModal } = useAuthStore();

  return (
    <div className="flex items-center justify-between gap-3 group/user">
      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-700 shrink-0 shadow-sm">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback className="dark:bg-zinc-800 dark:text-zinc-300">{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[14px] truncate text-zinc-950 dark:text-zinc-100 group-hover/user:underline">{user.name}</span>
            {user.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />}
          </div>
          <span className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium truncate">{user.role || "Designer"}</span>
          {typeof user.followersCount === "number" && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{formatCount(user.followersCount)} followers</span>
          )}
        </div>
      </Link>
      <Button
        variant={isFollowing ? "secondary" : "outline"}
        size="sm"
        className={cn(
          "rounded-full h-8 px-4 font-semibold text-xs transition-colors shrink-0",
          isFollowing
            ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            : "dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md"
        )}
        onClick={() => (isAuthenticated ? toggleFollow() : openAuthModal())}
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
