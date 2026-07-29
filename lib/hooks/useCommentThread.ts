"use client";

import { useCallback, useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { getPostComments } from "@/lib/api/posts";
import { getArticleComments } from "@/lib/api/articles";
import type { Comment, CommentSort } from "@/lib/api/types";

interface CommentPage {
  comments: Comment[];
  nextCursor: string | null;
}

type PageKey = [string, string, "post" | "article", CommentSort, string | undefined];

interface UseCommentThreadOptions {
  targetType: "post" | "article";
  targetId: string;
  initialSort?: CommentSort;
}

// Cursor-paginated, sort-aware top-level comment feed for a post/article.
// Each top-level comment already carries a few inlined replies from the
// backend (see listCommentsForTarget) - deeper/further replies are fetched
// lazily per-comment via useCommentReplies.
export function useCommentThread({ targetType, targetId, initialSort = "relevant" }: UseCommentThreadOptions) {
  const [sort, setSortState] = useState<CommentSort>(initialSort);

  const getKey = useCallback(
    (pageIndex: number, previousPage: CommentPage | null): PageKey | null => {
      if (previousPage && !previousPage.nextCursor) return null;
      const cursor = pageIndex === 0 ? undefined : (previousPage?.nextCursor ?? undefined);
      return ["comments", targetId, targetType, sort, cursor];
    },
    [targetId, targetType, sort]
  );

  const fetcher = useCallback(([, id, type, s, cursor]: PageKey) => {
    return type === "post" ? getPostComments(id, { cursor, sort: s }) : getArticleComments(id, { cursor, sort: s });
  }, []);

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<CommentPage>(getKey, fetcher, {
    revalidateFirstPage: false,
  });

  const comments = useMemo(() => data?.flatMap((page) => page.comments) ?? [], [data]);
  const hasMore = !!data && data.length > 0 && !!data[data.length - 1]?.nextCursor;
  const isLoadingMore = isLoading || (size > 0 && !!data && typeof data[size - 1] === "undefined");

  const loadMore = useCallback(() => {
    void setSize((s) => s + 1);
  }, [setSize]);

  const setSort = useCallback(
    (next: CommentSort) => {
      setSortState(next);
      void setSize(1);
    },
    [setSize]
  );

  return {
    comments,
    sort,
    setSort,
    hasMore,
    loadMore,
    isLoading,
    isLoadingMore,
    isValidating,
    error,
    mutate,
  };
}
