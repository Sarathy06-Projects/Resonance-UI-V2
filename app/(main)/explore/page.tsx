"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Search, X, TrendingUp, Hash, Eye, Bookmark, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PostCard } from "@/components/shared/PostCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { useFollowState } from "@/lib/hooks/useFollowState";
import { search as searchApi, recordSearch, type SearchResults as SearchResponse } from "@/lib/api/search";
import { getTrendingHashtags } from "@/lib/api/hashtags";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/formatCount";
import { JsonLd } from "@/components/seo/JsonLd";
import { ErrorState } from "@/components/shared/ErrorState";
import { profileUrl, topicUrl, articleUrl } from "@/lib/urls";
import { getSiteUrl } from "@/lib/siteUrl";
import type { Article, Author } from "@/lib/api/types";

// Three things a search on a design community is actually for. The backend's
// /api/search already filters by type, so the tab drives the query rather
// than slicing an "all" response client-side - the wrong results never get
// fetched, let alone rendered.
const FILTERS = [
  { id: "posts", label: "Posts" },
  { id: "users", label: "People" },
  { id: "articles", label: "Articles" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

const TRENDING_LIMIT = 10;

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("posts");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: trending, error: trendingError, mutate: mutateTrending } = useSWR(
    "trending-hashtags-list",
    () => getTrendingHashtags(TRENDING_LIMIT)
  );

  // Keyed by filter as well as query, so switching tabs refetches rather than
  // showing the previous tab's results under a new label.
  const { data: results, error: searchError, isLoading: isSearching, mutate: mutateSearch } = useSWR(
    debouncedQuery ? `search-${filter}-${debouncedQuery}` : null,
    () => searchApi(debouncedQuery, filter)
  );

  const isSearchMode = Boolean(debouncedQuery);

  const exploreJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore - Resonance",
    url: `${getSiteUrl()}/explore`,
  };

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-zinc-950">
      <JsonLd id="explore-json-ld" data={exploreJsonLd} />

      {/* On mobile this bar *is* the screen's header - lib/mobile/nav.ts gives
          this route header: "search", so nothing is rendered above it. A
          screen whose only purpose is searching doesn't need a title saying
          so. */}
      <div className="sticky top-0 z-30 border-b border-zinc-100 bg-white/90 pt-safe backdrop-blur-xl md:top-16 dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="p-3 sm:px-6 sm:pt-6">
          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              // These hints give mobile keyboards the right layout and a
              // "Search" return key instead of a newline key.
              enterKeyHint="search"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="Search Resonance"
              // text-base (16px) is deliberate: iOS Safari force-zooms the
              // page on focus for anything smaller and never zooms back out.
              className="w-full rounded-2xl border-2 border-transparent bg-zinc-100 py-3.5 pl-12 pr-11 text-base font-medium outline-none transition-all placeholder:text-zinc-500 focus:border-blue-500 focus:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-950"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (searchQuery.trim()) recordSearch(searchQuery.trim()).catch(() => {});
                  // Drop the keyboard so results get the full screen.
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-colors active:bg-zinc-200 dark:active:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Only while searching. With no query there is nothing to filter, and
            an always-on row of tabs would imply the trending list below
            responds to them. */}
        {isSearchMode && (
          <div className="mx-auto flex max-w-2xl gap-2 px-3 pb-3 sm:px-6 sm:pb-4">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-semibold transition-colors active:scale-95",
                  filter === f.id
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1">
        {!isSearchMode ? (
          <TrendingList error={trendingError} onRetry={() => mutateTrending()} hashtags={trending?.hashtags} />
        ) : (
          <SearchResults
            filter={filter}
            query={debouncedQuery}
            isLoading={isSearching}
            error={searchError}
            onRetry={() => mutateSearch()}
            results={results}
          />
        )}
      </div>
    </main>
  );
}

function TrendingList({
  hashtags,
  error,
  onRetry,
}: {
  hashtags?: { tag: string; postsCount: number; growthPct: number }[];
  error?: Error;
  onRetry: () => void;
}) {
  if (error) return <ErrorState title="Couldn't load trending topics" error={error} onRetry={onRetry} />;

  return (
    <section className="py-2">
      <h2 className="px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-zinc-400 sm:px-6 dark:text-zinc-500">
        Trending now
      </h2>

      {/* A ranked vertical list, not a horizontal card rail. Ten items in a
          rail means eight are off-screen and the ranking is invisible; a list
          shows the whole top ten at a glance and gives each row a full-width
          tap target. */}
      <ol className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {(hashtags ?? []).map((t, i) => (
          <li key={t.tag}>
            <Link
              // Straight to the discussions listing rather than the topic hub:
              // the hub leads with articles, and what a trending tag promises
              // is the conversation happening under it.
              href={`${topicUrl(t.tag)}/discussions`}
              className="flex items-center gap-4 px-4 py-3.5 transition-colors active:bg-zinc-50 sm:px-6 md:hover:bg-zinc-50 dark:active:bg-zinc-900/60 dark:md:hover:bg-zinc-900/60"
            >
              <span className="w-5 shrink-0 text-[15px] font-semibold tabular-nums text-zinc-300 dark:text-zinc-600">
                {i + 1}
              </span>

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <Hash className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-zinc-950 dark:text-white">{t.tag}</span>
                <span className="block text-[13px] text-zinc-500 dark:text-zinc-400">
                  {formatCount(t.postsCount)} {t.postsCount === 1 ? "post" : "posts"}
                </span>
              </span>

              {t.growthPct > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-[11px] font-bold text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  {t.growthPct}%
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>

      {hashtags && hashtags.length === 0 && (
        <p className="px-4 py-16 text-center text-[15px] text-zinc-500 sm:px-6 dark:text-zinc-400">
          Nothing is trending yet.
        </p>
      )}
    </section>
  );
}

interface SearchResultsProps {
  filter: Filter;
  query: string;
  isLoading: boolean;
  error?: Error;
  onRetry: () => void;
  results?: SearchResponse;
}

function SearchResults({ filter, query, isLoading, error, onRetry, results }: SearchResultsProps) {
  if (error) return <ErrorState title="Search failed" error={error} onRetry={onRetry} />;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4 sm:p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const posts = results?.posts ?? [];
  const users = results?.users ?? [];
  const articles = results?.articles ?? [];

  const count = filter === "posts" ? posts.length : filter === "users" ? users.length : articles.length;

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900">
          <Search className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
        </div>
        <h2 className="mb-1.5 text-lg font-bold dark:text-white">No results</h2>
        <p className="max-w-xs text-[15px] text-zinc-500 dark:text-zinc-400">
          Nothing matching &quot;{query}&quot; in {FILTERS.find((f) => f.id === filter)?.label.toLowerCase()}. Try
          another tab or different words.
        </p>
      </div>
    );
  }

  if (filter === "posts") {
    return (
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    );
  }

  if (filter === "users") {
    return (
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {users.map((user) => (
          <PersonRow key={user.id} user={user} />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
      {articles.map((article) => (
        <ArticleRow key={article.id} article={article} />
      ))}
    </div>
  );
}

function PersonRow({ user }: { user: Author & { followersCount?: number } }) {
  const { isFollowing, toggleFollow } = useFollowState(user.id, false);
  const { isAuthenticated, openAuthModal } = useAuthStore();

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
      <Link href={profileUrl(user)} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0 border border-zinc-100 dark:border-zinc-800">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback className="dark:bg-zinc-800">{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold text-zinc-950 dark:text-white">{user.name}</span>
            {user.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
          </div>
          <div className="truncate text-[13px] text-zinc-500 dark:text-zinc-400">
            @{user.username}
            {user.role ? ` · ${user.role}` : ""}
          </div>
        </div>
      </Link>

      <Button
        variant={isFollowing ? "secondary" : "outline"}
        size="sm"
        className={cn(
          "h-9 shrink-0 rounded-full px-4 text-xs font-semibold",
          isFollowing
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "dark:border-zinc-700 dark:text-zinc-300"
        )}
        onClick={() => (isAuthenticated ? toggleFollow() : openAuthModal())}
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
}

function ArticleRow({ article }: { article: Article }) {
  return (
    <Link
      href={articleUrl(article)}
      className="flex gap-3 px-4 py-3.5 transition-colors active:bg-zinc-50 sm:px-6 md:hover:bg-zinc-50 dark:active:bg-zinc-900/60 dark:md:hover:bg-zinc-900/60"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {article.author.name}
          {article.readTime ? ` · ${article.readTime}` : ""}
        </div>
        <h3 className="mb-1 line-clamp-2 text-[15px] font-semibold leading-snug text-zinc-950 dark:text-white">
          {article.title}
        </h3>
        <div className="flex items-center gap-3 text-[13px] text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {formatCount(article.viewsCount)}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="h-3.5 w-3.5" /> {formatCount(article.bookmarksCount)}
          </span>
        </div>
      </div>

      {article.coverImage && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <Image src={article.coverImage} alt="" fill sizes="80px" className="object-cover" />
        </div>
      )}
    </Link>
  );
}
