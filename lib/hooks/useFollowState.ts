"use client";

import { useState } from "react";
import { followUser, unfollowUser } from "@/lib/api/users";

export function useFollowState(userId: string, initialIsFollowing: boolean) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, setIsPending] = useState(false);

  const toggleFollow = async () => {
    const next = !isFollowing;
    setIsFollowing(next);
    setIsPending(true);
    try {
      await (next ? followUser(userId) : unfollowUser(userId));
    } catch {
      setIsFollowing(!next);
    } finally {
      setIsPending(false);
    }
  };

  return { isFollowing, isPending, toggleFollow };
}
