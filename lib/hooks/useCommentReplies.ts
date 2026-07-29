"use client";

import { useCallback, useState } from "react";
import { getCommentReplies } from "@/lib/api/comments";
import type { Comment } from "@/lib/api/types";

// Lazy-loads a comment's direct children, paginated. Used recursively by
// CommentItem at every depth - the same primitive backs "view N replies"
// on a top-level comment and on a reply of a reply, since the backend
// endpoint (GET /api/comments/:id/replies) is depth-agnostic.
export function useCommentReplies(commentId: string, initialReplies: Comment[], initialHasMore: boolean, initialCursor: string | null) {
  const [replies, setReplies] = useState<Comment[]>(initialReplies);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const page = await getCommentReplies(commentId, { cursor: cursor ?? undefined, sort: "oldest" });
      setReplies((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...page.replies.filter((r) => !seen.has(r.id))];
      });
      setCursor(page.nextCursor);
      setHasMore(!!page.nextCursor);
      setExpanded(true);
    } finally {
      setIsLoading(false);
    }
  }, [commentId, cursor, hasMore, isLoading]);

  const addReply = useCallback((reply: Comment) => {
    setReplies((prev) => (prev.some((r) => r.id === reply.id) ? prev : [...prev, reply]));
    setExpanded(true);
  }, []);

  const removeReply = useCallback((id: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { replies, hasMore, isLoading, expanded, setExpanded, loadMore, addReply, removeReply };
}
