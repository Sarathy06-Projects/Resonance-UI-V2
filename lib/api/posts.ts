import { apiFetch } from "./client";
import type { Comment, Post } from "./types";

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

export function getUserPosts(authorId: string, cursor?: string | null) {
  const params = new URLSearchParams({ authorId });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ posts: Post[]; nextCursor: string | null }>(`/api/posts?${params.toString()}`);
}

export function getPost(id: string) {
  return apiFetch<Post & { linkedArticle: import("./types").ArticlePreview | null }>(`/api/posts/${id}`);
}

export function deletePost(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/posts/${id}`, { method: "DELETE" });
}

export function getPostComments(id: string) {
  return apiFetch<{ comments: Comment[] }>(`/api/posts/${id}/comments`);
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
