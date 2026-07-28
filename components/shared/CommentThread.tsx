"use client";

import useSWR from "swr";
import { CommentItem } from "./CommentItem";
import { getPostComments } from "@/lib/api/posts";
import { getArticleComments } from "@/lib/api/articles";
import type { Comment } from "@/lib/api/types";
import { useAuthStore } from "@/store/useAuthStore";

interface CommentThreadProps {
  targetType: "post" | "article";
  targetId: string;
  targetAuthorId: string;
}

export function CommentThread({ targetType, targetId, targetAuthorId }: CommentThreadProps) {
  const { user } = useAuthStore();
  const viewerIsTargetAuthor = user?.id === targetAuthorId;
  const key = `comments-${targetType}-${targetId}`;
  const { data, mutate, isLoading } = useSWR(key, () =>
    targetType === "post" ? getPostComments(targetId) : getArticleComments(targetId)
  );

  const comments: Comment[] = data?.comments ?? [];

  if (isLoading) {
    return (
      <div className="p-8 text-center text-zinc-400 text-[15px]">Loading comments…</div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 text-[15px]">
        No comments yet. Be the first to share your thoughts!
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          targetType={targetType}
          targetId={targetId}
          viewerIsTargetAuthor={viewerIsTargetAuthor}
          onChanged={() => mutate()}
        />
      ))}
    </div>
  );
}
