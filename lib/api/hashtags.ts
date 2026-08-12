import { apiFetch } from "./client";
import type { Article, HashtagStat, Post } from "./types";

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

export function getHashtagArticles(tag: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ tag: string; articles: Article[]; nextCursor: string | null }>(
    `/api/hashtags/${encodeURIComponent(tag)}/articles?${params.toString()}`
  );
}
