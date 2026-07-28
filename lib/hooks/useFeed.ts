"use client";

import useSWRInfinite from "swr/infinite";
import { getFeed, type FeedPage } from "@/lib/api/feed";

export function useFeed(tab: "foryou" | "following") {
  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<FeedPage>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.nextCursor) return null;
      const cursor = pageIndex === 0 ? null : previousPageData?.nextCursor;
      return [`feed-${tab}`, cursor ?? ""] as const;
    },
    ([, cursor]: readonly [string, string]) => getFeed(tab, cursor || undefined),
    { revalidateFirstPage: false }
  );

  const posts = data ? data.flatMap((page) => page.posts) : [];
  const hasMore = data ? Boolean(data[data.length - 1]?.nextCursor) : true;

  return {
    posts,
    error,
    isLoading,
    isLoadingMore: isValidating && size > 0,
    hasMore,
    loadMore: () => setSize(size + 1),
    mutate,
  };
}
