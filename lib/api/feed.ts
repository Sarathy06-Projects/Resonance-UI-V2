import { apiFetch } from "./client";
import type { Post } from "./types";

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export function getFeed(tab: "foryou" | "following", cursor?: string | null) {
  const params = new URLSearchParams({ tab });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<FeedPage>(`/api/feed?${params.toString()}`);
}
