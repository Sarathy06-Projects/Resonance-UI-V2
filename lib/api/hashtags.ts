import { apiFetch } from "./client";
import type { HashtagStat, Post } from "./types";

export function getTrendingHashtags(limit = 6) {
  return apiFetch<{ hashtags: HashtagStat[] }>(`/api/hashtags/trending?limit=${limit}`);
}

export function getHashtagPosts(tag: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ tag: string; posts: Post[]; nextCursor: string | null }>(
    `/api/hashtags/${encodeURIComponent(tag)}/posts?${params.toString()}`
  );
}
