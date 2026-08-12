"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { Search, Clock, TrendingUp, Hash, ArrowRight, Sparkles } from "lucide-react";
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
import type { Author } from "@/lib/api/types";

const SectionHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-6 px-4 sm:px-6">
    <div>
      <h2 className="text-xl font-bold tracking-tight dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

function DesignerCard({ user }: { user: Author & { followersCount?: number } }) {
  const { isFollowing, toggleFollow } = useFollowState(user.id, false);
  const { isAuthenticated, openAuthModal } = useAuthStore();

  return (
    <div className="w-[280px] shrink-0 p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl flex flex-col hover:shadow-sm transition-all duration-300 group">
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
    "url": `${process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design"}/explore`
  };

  return (
    <main className="flex flex-col min-h-screen w-full bg-white dark:bg-zinc-950 pb-20 overflow-x-hidden">
      <JsonLd data={exploreJsonLd} />

      <div className="sticky top-0 sm:top-16 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800">

        <div className="p-4 sm:px-6 pt-6" ref={searchContainerRef}>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search designers, articles, posts or hashtags"
              className="w-full pl-12 pr-4 py-3.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-50 dark:focus:bg-zinc-950 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:ring-0 rounded-2xl text-[15px] font-medium dark:text-zinc-100 transition-all outline-none shadow-sm placeholder:text-zinc-500 dark:placeholder:text-zinc-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => { if (e.key === "Enter") commitSearch(searchQuery); }}
              onBlur={() => commitSearch(searchQuery)}
            />

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

        <div className="px-4 sm:px-6 pb-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 max-w-5xl mx-auto min-w-max">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  activeFilter === filter
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto py-8 space-y-12 sm:space-y-16">

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
                <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 pb-4 no-scrollbar snap-x snap-mandatory">
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
                <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 pb-4 no-scrollbar">
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
                <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 pb-4 no-scrollbar snap-x snap-mandatory">
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
                <div className="flex gap-6 overflow-x-auto px-4 sm:px-6 pb-6 no-scrollbar snap-x snap-mandatory">
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
              <section className="px-4 sm:px-6">
                <SectionHeader title={debouncedQuery ? "Posts" : "Popular Discussions"} subtitle={debouncedQuery ? undefined : "Join the conversation."} />
                {!debouncedQuery && feedError ? (
                  <ErrorState title="Couldn't load discussions" error={feedError} onRetry={() => mutateFeed()} className="min-h-0 py-10" />
                ) : (
                  <div className="max-w-2xl mx-auto space-y-4">
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
