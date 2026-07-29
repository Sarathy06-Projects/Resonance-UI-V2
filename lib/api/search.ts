import { apiFetch } from "./client";
import type { Article, Author, CommentSearchResult, HashtagStat, Post } from "./types";

export interface SearchResults {
  posts: Post[];
  articles: Article[];
  users: Author[];
  hashtags: HashtagStat[];
  comments: CommentSearchResult[];
}

export function search(q: string, type: "all" | "posts" | "articles" | "users" | "hashtags" | "comments" = "all") {
  return apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
}

export function getRecentSearches() {
  return apiFetch<{ recent: { query: string; createdAt: string }[] }>("/api/search/recent");
}

export function recordSearch(query: string) {
  return apiFetch<{ ok: true }>("/api/search/recent", { method: "POST", json: { query } });
}
