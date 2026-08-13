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
import { profileUrl } from "@/lib/urls";
import { ArrowRight, Inbox } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { ErrorState } from "@/components/shared/ErrorState";
import { getSiteUrl } from "@/lib/siteUrl";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");
  const { posts, error, isLoading, hasMore, loadMore, isLoadingMore, mutate } = useFeed(activeTab);

  const { data: recommended } = useSWR(activeTab === "foryou" ? "recommended-users-home" : null, () => getRecommendedUsers(4));
  const { data: popularArticles } = useSWR(activeTab === "foryou" ? "popular-articles-home" : null, () => getPopularArticles(4));

  const feedWithModules: React.ReactNode[] = [];

  posts.forEach((post, index) => {
    // PostCard owns its own padding now, so the row wrapper only draws the
    // separator - wrapping it in padding again double-inset every post.
    feedWithModules.push(
      <div key={post.id} className="border-b border-zinc-100 dark:border-zinc-800/60">
        <PostCard post={post} priority={index === 0} />
      </div>
    );

    if (index === 1 && activeTab === "foryou" && recommended && recommended.users.length > 0) {
      feedWithModules.push(
        <div key="discovery-designers" className="border-b border-zinc-100 bg-zinc-50/60 py-5 sm:py-8 dark:border-zinc-800/60 dark:bg-zinc-900/20">
          <ModuleHeader
            title="Featured Designers"
            subtitle="Creative minds making waves this week."
            href="/explore"
            action="View all"
          />
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar rail-x sm:gap-4 sm:px-6">
            {recommended.users.map((user) => (
              <FeaturedDesignerCard key={user.id} user={user} />
            ))}
          </div>
        </div>
      );
    }

    if (index === 3 && activeTab === "foryou" && popularArticles && popularArticles.articles.length > 0) {
      feedWithModules.push(
        <div key="discovery-articles" className="border-b border-zinc-100 py-5 sm:py-8 dark:border-zinc-800/60">
          <ModuleHeader
            title="Popular Articles"
            subtitle="In-depth thoughts from industry leaders."
            href="/explore"
            action="Read more"
          />
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar rail-x sm:gap-6 sm:px-6">
            {popularArticles.articles.map((article) => (
              <div key={article.id} className="h-full snap-start">
                <ArticleCard article={article} />
              </div>
            ))}
          </div>
        </div>
      );
    }
  });

  const siteUrl = getSiteUrl();
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Resonance - Design Community",
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/explore?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="flex flex-col min-h-screen">
      <JsonLd id="website-json-ld" data={websiteJsonLd} />

      {/* Feed switcher. On mobile the brand header above it is *not* sticky
          (see lib/mobile/nav.ts), so this pins to the very top and takes over
          the top edge once the header has scrolled off - pt-safe so its own
          background fills the notch area rather than letting posts show
          through. At md+ it sits under the desktop top nav instead.
          Underline tabs rather than a pill group: they read as "which feed am
          I in" instead of as a control that might filter something. */}
      <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white/85 pt-safe backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="flex px-2 sm:px-6">
          {([
            { id: "foryou", label: "For you" },
            { id: "following", label: "Following" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "true" : undefined}
              className={cn(
                "relative flex-1 py-3.5 text-[15px] font-semibold transition-colors sm:flex-none sm:px-8",
                activeTab === tab.id
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-zinc-950 sm:inset-x-6 dark:bg-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Inline composer is desktop-only: on mobile the same job belongs to
          the tab bar's centre button, which opens a full-screen sheet rather
          than asking someone to type into a 2-line box wedged above a feed. */}
      <div className="hidden border-b border-zinc-100 px-4 py-6 sm:px-6 md:block dark:border-zinc-800">
        <CreatePostInput onPosted={() => mutate()} />
      </div>

      {/* Feed Content - bottom clearance for the mobile tab bar is applied
          once by AppLayout, not per screen. */}
      <div className="flex flex-1 flex-col">
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

// Section heading for the discovery modules interleaved into the feed. The
// subtitle is desktop-only - on a phone it pushes the actual cards below the
// fold to explain a section whose own title already says the same thing.
function ModuleHeader({ title, subtitle, href, action }: { title: string; subtitle: string; href: string; action: string }) {
  return (
    <div className="mb-3 flex items-end justify-between px-4 sm:mb-6 sm:px-6">
      <div>
        <h2 className="text-[17px] font-bold tracking-tight text-zinc-950 sm:text-xl dark:text-white">{title}</h2>
        <p className="mt-1 hidden text-sm font-medium text-zinc-500 sm:block dark:text-zinc-400">{subtitle}</p>
      </div>
      <Link href={href} className="flex shrink-0 items-center gap-1 text-[14px] font-semibold text-blue-600 dark:text-blue-400">
        {action}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function FeaturedDesignerCard({ user }: { user: { id: string; name: string; username: string | null; image: string | null; role: string | null } }) {
  const { isFollowing, toggleFollow } = useFollowState(user.id, false);

  return (
    // Narrower on mobile so the next card is partly visible at the right
    // edge - that peek is what tells you the row scrolls sideways at all.
    <div className="flex w-[172px] shrink-0 snap-start flex-col rounded-3xl border border-zinc-100 bg-white p-4 sm:w-[240px] sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <Link href={profileUrl(user)}>
        <Avatar className="mb-3 h-12 w-12 border border-zinc-100 sm:mb-4 sm:h-14 sm:w-14 dark:border-zinc-800">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="truncate text-[15px] font-bold text-zinc-950 sm:text-[16px] dark:text-white">{user.name}</div>
      <div className="mb-1 truncate text-[13px] font-medium text-zinc-500 dark:text-zinc-400">@{user.username}</div>
      <div className="mb-4 truncate text-xs font-semibold text-blue-600 dark:text-blue-400">{user.role || "Designer"}</div>
      <Button
        variant="outline"
        size="sm"
        className="mt-auto w-full rounded-full dark:border-zinc-700 dark:text-zinc-300"
        onClick={toggleFollow}
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
