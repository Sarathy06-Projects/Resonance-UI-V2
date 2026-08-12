import { apiFetch } from "./client";
import type { Article, Comment, CommentSort } from "./types";

export interface CreateArticleInput {
  title: string;
  content: string;
  coverImage?: string;
  images?: string[];
  tags?: string[];
  preview?: string;
  seriesId?: string;
}

export function createArticle(input: CreateArticleInput) {
  return apiFetch<Article>("/api/articles", { method: "POST", json: input });
}

export function getUserArticles(authorId: string, cursor?: string | null) {
  const params = new URLSearchParams({ authorId });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ articles: Article[]; nextCursor: string | null }>(`/api/articles?${params.toString()}`);
}

// For the legacy /article/:id route.ts redirect handler only.
export function getArticleRedirectTarget(id: string) {
  return apiFetch<{ username: string | null; slug: string }>(`/api/articles/${id}/redirect-target`);
}

export function getArticle(id: string) {
  return apiFetch<Article>(`/api/articles/${id}`);
}

export function updateArticle(id: string, input: Partial<CreateArticleInput>) {
  return apiFetch<Article>(`/api/articles/${id}`, { method: "PATCH", json: input });
}

export function deleteArticle(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/articles/${id}`, { method: "DELETE" });
}

export function getArticleComments(id: string, opts: { cursor?: string | null; sort?: CommentSort; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiFetch<{ comments: Comment[]; nextCursor: string | null }>(`/api/articles/${id}/comments${qs ? `?${qs}` : ""}`);
}

export function getPopularArticles(limit = 6) {
  return apiFetch<{ articles: Article[] }>(`/api/articles/popular?limit=${limit}`);
}

export function likeArticle(id: string) {
  return apiFetch<{ liked: true }>(`/api/articles/${id}/like`, { method: "POST" });
}

export function unlikeArticle(id: string) {
  return apiFetch<{ liked: false }>(`/api/articles/${id}/like`, { method: "DELETE" });
}

export function bookmarkArticle(id: string) {
  return apiFetch<{ bookmarked: true }>(`/api/articles/${id}/bookmark`, { method: "POST" });
}

export function unbookmarkArticle(id: string) {
  return apiFetch<{ bookmarked: false }>(`/api/articles/${id}/bookmark`, { method: "DELETE" });
}

export function recordArticleView(id: string) {
  return apiFetch<{ counted: boolean }>(`/api/articles/${id}/view`, { method: "POST" });
}
