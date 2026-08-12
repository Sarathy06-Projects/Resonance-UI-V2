import { apiFetch } from "./client";
import type { Comment, CommentSort, Post } from "./types";

export interface CreatePostInput {
  type?: "discussion" | "showcase" | "feedback";
  content: string;
  images?: string[];
  visibility?: "public" | "followers" | "private";
  linkedArticleId?: string;
  toolsUsed?: string;
  portfolioLink?: string;
  feedbackType?: string;
  urgency?: string;
  figmaLink?: string;
}

export function createPost(input: CreatePostInput) {
  return apiFetch<Post>("/api/posts", { method: "POST", json: input });
}

export interface CreateThreadInput {
  visibility?: "public" | "followers" | "private";
  posts: { content: string; images?: string[] }[];
}

export function createThread(input: CreateThreadInput) {
  return apiFetch<{ threadId: string; posts: Post[] }>("/api/posts/thread", { method: "POST", json: input });
}

export function getUserPosts(authorId: string, cursor?: string | null) {
  const params = new URLSearchParams({ authorId });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ posts: Post[]; nextCursor: string | null }>(`/api/posts?${params.toString()}`);
}

export function getPost(id: string) {
  return apiFetch<Post & { linkedArticle: import("./types").ArticlePreview | null }>(`/api/posts/${id}`);
}

// For the legacy /post/:id route.ts redirect handler only. slug is null
// for showcase/feedback posts - those keep their /post/:id URL forever.
export function getPostRedirectTarget(id: string) {
  return apiFetch<{ username: string | null; slug: string | null }>(`/api/posts/${id}/redirect-target`);
}

export function deletePost(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/posts/${id}`, { method: "DELETE" });
}

export function getPostComments(id: string, opts: { cursor?: string | null; sort?: CommentSort; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiFetch<{ comments: Comment[]; nextCursor: string | null }>(`/api/posts/${id}/comments${qs ? `?${qs}` : ""}`);
}

export function likePost(id: string) {
  return apiFetch<{ liked: true }>(`/api/posts/${id}/like`, { method: "POST" });
}

export function unlikePost(id: string) {
  return apiFetch<{ liked: false }>(`/api/posts/${id}/like`, { method: "DELETE" });
}

export function bookmarkPost(id: string) {
  return apiFetch<{ bookmarked: true }>(`/api/posts/${id}/bookmark`, { method: "POST" });
}

export function unbookmarkPost(id: string) {
  return apiFetch<{ bookmarked: false }>(`/api/posts/${id}/bookmark`, { method: "DELETE" });
}

export function repost(id: string) {
  return apiFetch<{ reposted: true }>(`/api/posts/${id}/repost`, { method: "POST" });
}

export function unrepost(id: string) {
  return apiFetch<{ reposted: false }>(`/api/posts/${id}/repost`, { method: "DELETE" });
}
