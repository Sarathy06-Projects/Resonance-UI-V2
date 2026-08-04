"use client";

import { useState } from "react";
import useSWR from "swr";
import { CreatePostInput } from "@/components/feed/CreatePostInput";
import { PostCard } from "@/components/shared/PostCard";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { useFeed } from "@/lib/hooks/useFeed";
import { getRecommendedUsers } from "@/lib/api/users";
import { getPopularArticles } from "@/lib/api/articles";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { ErrorState } from "@/components/shared/ErrorState";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const { posts, error, isLoading, hasMore, loadMore, isLoadingMore, mutate } = useFeed(activeTab);

  const { data: recommended } = useSWR(activeTab === "foryou" ? "recommended-users-home" : null, () => getRecommendedUsers(4));
  const { data: popularArticles } = useSWR(activeTab === "foryou" ? "popular-articles-home" : null, () => getPopularArticles(4));

  const feedWithModules: React.ReactNode[] = [];

  posts.forEach((post, index) => {
    feedWithModules.push(
      <div key={post.id} className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/60">
        <PostCard post={post} priority={index === 0} />
      </div>
    );

    if (index === 1 && activeTab === "foryou" && recommended && recommended.users.length > 0) {
      feedWithModules.push(
        <div key="discovery-designers" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="flex items-end justify-between mb-6 px-4 sm:px-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Featured Designers</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Creative minds making waves this week.</p>
            </div>
            <Button variant="ghost" size="sm" nativeButton={false} className="text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20" render={<Link href="/explore" />}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 pb-4 no-scrollbar snap-x snap-mandatory">
            {recommended.users.map((user) => (
              <FeaturedDesignerCard key={user.id} user={user} />
            ))}
          </div>
        </div>
      );
    }

    if (index === 3 && activeTab === "foryou" && popularArticles && popularArticles.articles.length > 0) {
      feedWithModules.push(
        <div key="discovery-articles" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-end justify-between mb-6 px-4 sm:px-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Popular Articles</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">In-depth thoughts from industry leaders.</p>
            </div>
            <Button variant="ghost" size="sm" nativeButton={false} className="text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20" render={<Link href="/explore" />}>
              Read More <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-6 overflow-x-auto px-4 sm:px-6 pb-4 no-scrollbar snap-x snap-mandatory">
            {popularArticles.articles.map((article) => (
              <div key={article.id} className="snap-start h-full">
                <ArticleCard article={article} />
              </div>
            ))}
          </div>
        </div>
      );
    }
  });

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Resonance - Design Community",
    "url": "https://resonance.design",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://resonance.design/explore?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="flex flex-col min-h-screen">
      <JsonLd data={websiteJsonLd} />

      {/* Header & Tabs */}
      <div className="sticky top-0 sm:top-14 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 transition-all duration-300">
        <div className="px-4 py-2 sm:px-6">
          <div className="flex items-center gap-1 p-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl w-full sm:w-fit">
            <button
              onClick={() => setActiveTab("foryou")}
              className={cn(
                "flex-1 sm:w-32 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                activeTab === "foryou"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              For you
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={cn(
                "flex-1 sm:w-32 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                activeTab === "following"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              Following
            </button>
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 sm:px-6 py-6 border-b border-zinc-100 dark:border-zinc-800 hidden sm:block">
        <CreatePostInput onPosted={() => mutate()} />
      </div>

      {/* Feed Content */}
      <div className="flex-1 flex flex-col pb-20">
        {error ? (
          <ErrorState title="Couldn't load your feed" error={error} onRetry={() => mutate()} />
        ) : isLoading ? (
          <div className="p-4 sm:p-6 space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-4 p-6 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
                <div className="w-11 h-11 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-4/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "following" && posts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <Inbox className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2 dark:text-white">Nothing to see here</h2>
            <p className="text-zinc-500 mb-6 max-w-sm dark:text-zinc-400">When you follow designers, their posts will show up here.</p>
            <Button onClick={() => setActiveTab("foryou")} className="rounded-full px-8 font-semibold">
              Discover Designers
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            {feedWithModules}
            {hasMore && (
              <div className="py-8 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={isLoadingMore} className="rounded-full px-8">
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

    </main>
  )
}

function FeaturedDesignerCard({ user }: { user: { id: string; name: string; username: string | null; image: string | null; role: string | null } }) {
  const { isFollowing, toggleFollow } = useFollowState(user.id, false);

  return (
    <div className="snap-start shrink-0 w-[240px] p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
      <Link href={`/profile/${user.username}`}>
        <Avatar className="w-14 h-14 mb-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="font-bold text-[16px] text-zinc-950 dark:text-white truncate">{user.name}</div>
      <div className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium truncate mb-1.5">@{user.username}</div>
      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-5">{user.role || "Designer"}</div>
      <Button variant="outline" size="sm" className="w-full rounded-full dark:border-zinc-700 dark:text-zinc-300" onClick={toggleFollow}>
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
