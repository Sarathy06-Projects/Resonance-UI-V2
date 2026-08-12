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

// For app/sitemap.ts only. Cursors on the tag string itself, not the usual
// createdAt|id shape - hashtag_stats has neither column (see backend
// hashtags.ts's sitemap-feed comment).
export function getHashtagsSitemapFeed(cursor?: string | null) {
  const params = new URLSearchParams({ limit: "100" });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ hashtags: { tag: string; updatedAt: string }[]; nextCursor: string | null }>(`/api/hashtags/sitemap-feed?${params.toString()}`);
}

export function getHashtagArticles(tag: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ tag: string; articles: Article[]; nextCursor: string | null }>(
    `/api/hashtags/${encodeURIComponent(tag)}/articles?${params.toString()}`
  );
}
