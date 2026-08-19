"use client";

import { useEffect, useState } from "react";
import { search } from "@/lib/api/search";
import type { HashtagStat } from "@/lib/api/types";

// Debounced wrapper over the unified search endpoint scoped to hashtags
// (GET /api/search?type=hashtags), which reads hashtag_stats and already
// carries postsCount and articlesCount - so the composer can show how much a
// tag is actually used without a second request or a new route.
//
// Mirrors useMentionSearch deliberately: the two autocompletes in a composer
// should behave identically, and a reader who has understood one should not
// have to work out whether the other debounces differently.
export function useHashtagSearch(query: string) {
  const [results, setResults] = useState<HashtagStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(true);
      search(query, "hashtags")
        .then((res) => {
          if (cancelled) return;
          // Rank exact-prefix matches first. Search does a substring `ilike`,
          // so typing "ux" otherwise puts "#auxiliary" alongside "#ux" ordered
          // only by popularity - and the tag someone is part-way through
          // typing is the one they most likely mean.
          const q = query.toLowerCase();
          const ranked = [...res.hashtags].sort((a, b) => {
            const aStarts = a.tag.replace(/^#/, "").toLowerCase().startsWith(q) ? 0 : 1;
            const bStarts = b.tag.replace(/^#/, "").toLowerCase().startsWith(q) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            return b.postsCount + b.articlesCount - (a.postsCount + a.articlesCount);
          });
          setResults(ranked.slice(0, 6));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results: query ? results : [], isLoading: query ? isLoading : false };
}

/**
 * Finds a `#tag` the caret is currently inside, or null.
 *
 * Anchored to a word boundary so "C#" in prose does not open a tag picker,
 * and bounded to the caret so editing the middle of a sentence only ever
 * suggests for the token being typed.
 */
export function findHashtagQuery(value: string, cursor: number): { start: number; query: string } | null {
  const uptoCursor = value.slice(0, cursor);
  const match = uptoCursor.match(/(?:^|\s)#([a-zA-Z0-9_]{0,50})$/);
  if (!match) return null;
  const query = match[1];
  return { start: cursor - query.length - 1, query };
}
