"use client";

import { useDataStore } from "@/store/useDataStore";
import { CommentItem } from "./CommentItem";
import { useMemo } from "react";

interface CommentThreadProps {
  postId: string;
  postAuthorId: string;
}

export function CommentThread({ postId, postAuthorId }: CommentThreadProps) {
  const allComments = useDataStore((state) => state.comments);

  // Filter comments for this post and organize into threads
  const { topLevelComments, repliesMap } = useMemo(() => {
    const postComments = allComments.filter(c => c.postId === postId);
    const topLevel = postComments.filter(c => !c.parentId);
    
    // Sort top level: pinned first, then newest first
    topLevel.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // In a real app, parse timestamps. For mock, keep original array order or reverse it.
      return -1; // Newest first (assuming appending to end of list in mock)
    });

    const map = new Map<string, typeof postComments>();
    
    postComments.forEach(c => {
      if (c.parentId) {
        if (!map.has(c.parentId)) {
          map.set(c.parentId, []);
        }
        map.get(c.parentId)?.push(c);
      }
    });

    return { topLevelComments: topLevel, repliesMap: map };
  }, [allComments, postId]);

  if (topLevelComments.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 text-[15px]">
        No comments yet. Be the first to share your thoughts!
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {topLevelComments.map(comment => (
        <CommentItem 
          key={comment.id} 
          comment={comment} 
          postAuthorId={postAuthorId} 
          replies={repliesMap.get(comment.id)}
        />
      ))}
    </div>
  );
}
