import { apiFetch } from "./client";
import type { Comment } from "./types";

export function createComment(input: { targetType: "post" | "article"; targetId: string; parentId?: string; content: string }) {
  return apiFetch<Comment>("/api/comments", { method: "POST", json: input });
}

export function likeComment(id: string) {
  return apiFetch<{ liked: true }>(`/api/comments/${id}/like`, { method: "POST" });
}

export function unlikeComment(id: string) {
  return apiFetch<{ liked: false }>(`/api/comments/${id}/like`, { method: "DELETE" });
}

export function pinComment(id: string) {
  return apiFetch<{ isPinned: boolean }>(`/api/comments/${id}/pin`, { method: "PATCH" });
}

export function deleteComment(id: string) {
  return apiFetch<{ deleted: boolean; removedCount: number }>(`/api/comments/${id}`, { method: "DELETE" });
}
