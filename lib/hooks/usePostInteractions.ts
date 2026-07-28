"use client";

import { useState } from "react";
import * as postsApi from "@/lib/api/posts";
import type { Post } from "@/lib/api/types";

// Each PostCard owns its own optimistic copy of the interactive fields,
// seeded from whatever SWR cache it was rendered from. This keeps
// like/bookmark/repost snappy without needing a single global store to stay
// perfectly in sync across every list the same post might appear in - a
// stale count in a different open tab/page corrects itself on next
// revalidation, which is an acceptable tradeoff at this scale.
export function usePostInteractions(post: Post) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarksCount);
  const [sharesCount, setSharesCount] = useState(post.sharesCount);
  const [isReposted, setIsReposted] = useState(false);

  const toggleLike = async () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? postsApi.likePost(post.id) : postsApi.unlikePost(post.id));
    } catch {
      setIsLiked(!next);
      setLikesCount((c) => c + (next ? -1 : 1));
    }
  };

  const toggleBookmark = async () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    setBookmarksCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? postsApi.bookmarkPost(post.id) : postsApi.unbookmarkPost(post.id));
    } catch {
      setIsBookmarked(!next);
      setBookmarksCount((c) => c + (next ? -1 : 1));
    }
  };

  const toggleRepost = async () => {
    const next = !isReposted;
    setIsReposted(next);
    setSharesCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? postsApi.repost(post.id) : postsApi.unrepost(post.id));
    } catch {
      setIsReposted(!next);
      setSharesCount((c) => c + (next ? -1 : 1));
    }
  };

  return { isLiked, likesCount, isBookmarked, bookmarksCount, sharesCount, isReposted, toggleLike, toggleBookmark, toggleRepost };
}
