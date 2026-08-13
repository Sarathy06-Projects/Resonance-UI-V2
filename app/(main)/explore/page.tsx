"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { Search, Clock, TrendingUp, Hash, Sparkles, X } from "lucide-react";
import { PostCard } from "@/components/shared/PostCard";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { useFeed } from "@/lib/hooks/useFeed";
import { search as searchApi, getRecentSearches, recordSearch } from "@/lib/api/search";
import { getTrendingHashtags } from "@/lib/api/hashtags";
import { getTopics, getSuggestedCommunities } from "@/lib/api/discovery";
import { getRecommendedUsers } from "@/lib/api/users";
import { getPopularArticles } from "@/lib/api/articles";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/formatCount";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { ErrorState } from "@/components/shared/ErrorState";
import { profileUrl, topicUrl } from "@/lib/urls";
import { getSiteUrl } from "@/lib/siteUrl";
import type { Author } from "@/lib/api/types";

// Subtitles are desktop-only: on a phone they push the section's actual
// content below the fold to restate what the title already said.
const SectionHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="mb-3 flex items-end justify-between px-4 sm:mb-6 sm:px-6">
    <div>
      <h2 className="text-[17px] font-bold tracking-tight sm:text-xl dark:text-white">{title}</h2>
      {subtitle && <p className="mt-1 hidden text-sm text-zinc-500 sm:block dark:text-zinc-400">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

function DesignerCard({ user }: { user: Author & { followersCount?: number } }) {
  const { isFollowing, toggleFollow } = useFollowState(user.id, false);
  const { isAuthenticated, openAuthModal } = useAuthStore();

  return (
    <div className="flex w-[220px] shrink-0 flex-col rounded-3xl border border-zinc-100 bg-white p-4 sm:w-[280px] sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <Link href={profileUrl(user)} className="flex items-center gap-3 mb-4">
        <Avatar className="w-12 h-12 border border-zinc-200 dark:border-zinc-700">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[15px] dark:text-white truncate">{user.name}</div>
          <div className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">@{user.username}</div>
        </div>
      </Link>
      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">{user.role || "Designer"}</div>
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
        {typeof user.followersCount === "number" && (
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{user.followersCount} Followers</div>
        )}
        <Button
          variant={isFollowing ? "secondary" : "outline"}
          size="sm"
          className={cn("rounded-full font-semibold transition-all h-8 px-4 ml-auto", isFollowing ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200" : "dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800")}
          onClick={() => (isAuthenticated ? toggleFollow() : openAuthModal())}
        >
          {isFollowing ? "Following" : "Follow"}
        </Button>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: searchResults, error: searchError, isLoading: isSearching, mutate: mutateSearch } = useSWR(
    debouncedQuery ? `explore-search-${debouncedQuery}` : null,
    () => searchApi(debouncedQuery)
  );
  const { data: recentSearches } = useSWR("recent-searches", getRecentSearches);
  const { data: trending } = useSWR("trending-hashtags", () => getTrendingHashtags(6));
  const { data: recommended } = useSWR(!debouncedQuery ? "recommended-users-explore" : null, () => getRecommendedUsers(6));
  const { data: popularArticles } = useSWR(!debouncedQuery ? "popular-articles-explore" : null, () => getPopularArticles(6));
  const { data: topics } = useSWR("topics", getTopics);
  const { data: communities } = useSWR("suggested-communities", () => getSuggestedCommunities(4));
  const { posts: feedPosts, error: feedError, mutate: mutateFeed } = useFeed("foryou");

  const commitSearch = (q: string) => {
    if (q.trim()) recordSearch(q.trim()).catch(() => {});
  };

  const hasResults = debouncedQuery
    ? Boolean(searchResults && (searchResults.posts.length || searchResults.articles.length || searchResults.users.length || searchResults.hashtags.length))
    : true;

  const filters = ["All", "Posts", "Articles", "Designers", "Topics", "Hashtags"];

  const exploreJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Explore - Resonance",
    "url": `${getSiteUrl()}/explore`
  };

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-zinc-950">
      <JsonLd id="explore-json-ld" data={exploreJsonLd} />

      {/* On mobile this bar *is* the screen's header - there's no separate
          title row above it (see lib/mobile/nav.ts, which gives this route
          header: "search"). A screen that exists to search doesn't need a
          heading telling you it's the search screen. */}
      <div className="sticky top-0 z-30 border-b border-zinc-100 bg-white/90 pt-safe backdrop-blur-xl sm:top-16 dark:border-zinc-800 dark:bg-zinc-950/90">

        <div className="p-3 sm:px-6 sm:pt-6" ref={searchContainerRef}>
          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              // "search" + these hints give mobile keyboards the right layout
              // and a "Search" return key instead of a newline key.
              enterKeyHint="search"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="Search designers, posts, tags"
              // text-base (16px) is deliberate: iOS Safari force-zooms the
              // page on focus for anything smaller and never zooms back out.
              className="w-full rounded-2xl border-2 border-transparent bg-zinc-100 py-3.5 pl-12 pr-10 text-base font-medium outline-none transition-all placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-950"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitSearch(searchQuery);
                  // Drop the keyboard so results get the full screen.
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={() => commitSearch(searchQuery)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-200 dark:active:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {isSearchFocused && !searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2">
                  {recentSearches && recentSearches.recent.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Recent Searches</div>
                      {recentSearches.recent.map((r) => (
                        <button key={r.query} onClick={() => setSearchQuery(r.query)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left text-sm dark:text-zinc-200">
                          <Clock className="w-4 h-4 text-zinc-400" /> {r.query}
                        </button>
                      ))}
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                    </>
                  )}

                  {trending && trending.hashtags.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Trending</div>
                      {trending.hashtags.slice(0, 3).map((h) => (
                        <button key={h.tag} onClick={() => setSearchQuery(h.tag)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left text-sm font-medium dark:text-zinc-200">
                          <TrendingUp className="w-4 h-4 text-blue-500" /> {h.tag}
                        </button>
                      ))}
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                    </>
                  )}

                  {topics && (
                    <>
                      <div className="px-3 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Suggested Topics</div>
                      <div className="flex flex-wrap gap-2 px-3 py-2">
                        {topics.topics.slice(0, 6).map((topic) => (
                          <span key={topic} onClick={() => setSearchQuery(topic)} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium dark:text-zinc-300 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto px-3 pb-3 no-scrollbar rail-x sm:px-6 sm:pb-4">
          <div className="mx-auto flex min-w-max max-w-5xl items-center gap-2">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors active:scale-95",
                  activeFilter === filter
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 py-5 sm:space-y-16 sm:py-8">

        {isSearching && (
          <div className="px-4 sm:px-6 space-y-8 animate-pulse">
            <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-48 mb-6" />
          </div>
        )}

        {!isSearching && debouncedQuery && searchError && (
          <ErrorState title="Search failed" error={searchError} onRetry={() => mutateSearch()} />
        )}

        {!isSearching && !searchError && debouncedQuery && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 dark:text-white">No results found</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">We couldn&apos;t find anything matching &quot;{debouncedQuery}&quot;. Try different keywords or browse topics.</p>
          </div>
        )}

        {!isSearching && !searchError && hasResults && (
          <>
            {(activeFilter === "All" || activeFilter === "Hashtags") && !debouncedQuery && trending && trending.hashtags.length > 0 && (
              <section>
                <SectionHeader title="Trending Today" subtitle="The most discussed topics right now." />
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 no-scrollbar rail-x sm:gap-4 sm:px-6 sm:pb-4">
                  {trending.hashtags.map((tag) => (
                    <Link href={topicUrl(tag.tag)} key={tag.tag} className="snap-start shrink-0 min-w-[200px] p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                          <Hash className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg dark:text-white">{tag.tag}</span>
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium ml-11">{tag.postsCount} posts</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {debouncedQuery && (activeFilter === "All" || activeFilter === "Hashtags") && searchResults && searchResults.hashtags.length > 0 && (
              <section>
                <SectionHeader title="Hashtags" />
                <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar rail-x sm:gap-4 sm:px-6 sm:pb-4">
                  {searchResults.hashtags.map((tag) => (
                    <Link href={topicUrl(tag.tag)} key={tag.tag} className="snap-start shrink-0 min-w-[200px] p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                      <span className="font-bold text-lg dark:text-white">{tag.tag}</span>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{tag.postsCount} posts</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(activeFilter === "All" || activeFilter === "Designers") && (
              <section>
                <SectionHeader title={debouncedQuery ? "Designers" : "Featured Designers"} subtitle={debouncedQuery ? undefined : "Creative minds making waves this week."} />
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 no-scrollbar rail-x sm:gap-4 sm:px-6 sm:pb-4">
                  {(debouncedQuery ? searchResults?.users : recommended?.users)?.map(user => (
                    <div key={user.id} className="snap-start">
                      <DesignerCard user={user} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(activeFilter === "All" || activeFilter === "Articles") && (
              <section>
                <SectionHeader title={debouncedQuery ? "Articles" : "Top Articles"} subtitle={debouncedQuery ? undefined : "In-depth thoughts from industry leaders."} />
                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar rail-x sm:gap-6 sm:px-6 sm:pb-6">
                  {(debouncedQuery ? searchResults?.articles : popularArticles?.articles)?.map(article => (
                    <div key={article.id} className="snap-start h-full">
                      <ArticleCard article={article} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(activeFilter === "All" || activeFilter === "Topics") && !debouncedQuery && topics && (
              <section className="px-4 sm:px-6">
                <SectionHeader title="Browse Topics" />
                <div className="flex flex-wrap gap-3">
                  {topics.topics.map((topic) => (
                    <button key={topic} onClick={() => setSearchQuery(topic)} className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 dark:text-zinc-200 rounded-2xl font-semibold hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all text-sm">
                      {topic}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {(activeFilter === "All" || activeFilter === "Posts") && (
              <section>
                <SectionHeader title={debouncedQuery ? "Posts" : "Popular Discussions"} subtitle={debouncedQuery ? undefined : "Join the conversation."} />
                {!debouncedQuery && feedError ? (
                  <ErrorState title="Couldn't load discussions" error={feedError} onRetry={() => mutateFeed()} className="min-h-0 py-10" />
                ) : (
                  // Edge-to-edge divided list, not a stack of inset cards -
                  // PostCard brings its own padding, and on a 360px screen
                  // the card gutters were eating content width for a border
                  // that a hairline divider communicates just as well.
                  <div className="mx-auto max-w-2xl divide-y divide-zinc-100 border-y border-zinc-100 dark:divide-zinc-800/60 dark:border-zinc-800/60">
                    {(debouncedQuery ? searchResults?.posts : feedPosts.slice(0, 5))?.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeFilter === "All" && !debouncedQuery && communities && communities.communities.length > 0 && (
              <section className="px-4 sm:px-6">
                <SectionHeader title="Suggested Communities" subtitle="Find your niche." action={<Sparkles className="w-6 h-6 text-amber-500" />} />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {communities.communities.map(community => (
                    <div key={community.id} className="relative overflow-hidden w-full p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 border-dashed rounded-3xl flex flex-col">
                      <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-zinc-100 dark:border-zinc-700 mb-4">
                        {community.icon}
                      </div>
                      <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{community.name}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{formatCount(community.membersCount)} Members</p>
                      <div className="mt-auto">
                        <Button disabled variant="outline" className="w-full rounded-full border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500">
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
