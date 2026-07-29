"use client";

import { useEffect } from "react";
import type { SWRInfiniteKeyedMutator } from "swr/infinite";
import { commentsStreamUrl } from "@/lib/api/comments";
import type { Comment } from "@/lib/api/types";

interface CommentPage {
  comments: Comment[];
  nextCursor: string | null;
}

function insertReply(comments: Comment[], parentId: string, reply: Comment): { next: Comment[]; found: boolean } {
  let found = false;
  const next = comments.map((c) => {
    if (c.id === parentId) {
      found = true;
      if (c.replies.some((r) => r.id === reply.id)) return c;
      return { ...c, repliesCount: c.repliesCount + 1, replies: [...c.replies, reply].slice(-3) };
    }
    if (c.replies.length > 0) {
      const nested = insertReply(c.replies, parentId, reply);
      if (nested.found) {
        found = true;
        return { ...c, replies: nested.next };
      }
    }
    return c;
  });
  return { next, found };
}

// Live-updates a comment thread over SSE (see realtime/commentStream.ts on
// the backend). New top-level/replies are inserted directly into the SWR
// cache for a snappy feel; every other event (like/unlike/edit/delete/
// restore/pin) triggers a silent revalidate instead of hand-patching cache
// state - simpler and avoids double-counting against each component's own
// local optimistic state (see CommentItem, which mirrors the existing
// post-interaction pattern of owning its own useState copy).
export function useCommentStream(targetType: "post" | "article", targetId: string, mutate: SWRInfiniteKeyedMutator<CommentPage[]>) {
  useEffect(() => {
    const source = new EventSource(commentsStreamUrl(targetType, targetId), { withCredentials: true });

    source.addEventListener("comment:created", (event) => {
      const created = JSON.parse((event as MessageEvent).data) as Comment;
      void mutate(
        (pages) => {
          if (!pages) return pages;
          if (created.parentId) {
            let inserted = false;
            const next = pages.map((page, i) => {
              if (inserted || i !== 0) return page;
              const result = insertReply(page.comments, created.parentId!, created);
              inserted = result.found;
              return { ...page, comments: result.next };
            });
            return next;
          }
          if (pages.some((p) => p.comments.some((c) => c.id === created.id))) return pages;
          return pages.map((page, i) => (i === 0 ? { ...page, comments: [created, ...page.comments] } : page));
        },
        { revalidate: false }
      );
    });

    const revalidate = () => void mutate();
    source.addEventListener("comment:edited", revalidate);
    source.addEventListener("comment:liked", revalidate);
    source.addEventListener("comment:unliked", revalidate);
    source.addEventListener("comment:deleted", revalidate);
    source.addEventListener("comment:restored", revalidate);
    source.addEventListener("comment:pinned", revalidate);

    source.onerror = () => {
      // EventSource auto-reconnects; nothing else to do here.
    };

    return () => source.close();
  }, [targetType, targetId, mutate]);
}
