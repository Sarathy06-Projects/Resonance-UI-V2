import { apiFetch, apiUrl } from "./client";
import type { Comment, CommentReportReason, CommentSort } from "./types";

export function createComment(input: { targetType: "post" | "article"; targetId: string; parentId?: string; content: string }) {
  return apiFetch<Comment>("/api/comments", { method: "POST", json: input });
}

export function editComment(id: string, content: string) {
  return apiFetch<{ id: string; content: string; editedAt: string; hashtags: string[] }>(`/api/comments/${id}`, {
    method: "PATCH",
    json: { content },
  });
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
  return apiFetch<{ deleted: boolean }>(`/api/comments/${id}`, { method: "DELETE" });
}

export function restoreComment(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/comments/${id}/restore`, { method: "POST" });
}

export function reportComment(id: string, reason: CommentReportReason, details?: string) {
  return apiFetch<{ reported: true }>(`/api/comments/${id}/report`, { method: "POST", json: { reason, details } });
}

export interface RepliesPage {
  replies: Comment[];
  nextCursor: string | null;
}

export function getCommentReplies(id: string, opts: { cursor?: string | null; sort?: "newest" | "oldest"; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiFetch<RepliesPage>(`/api/comments/${id}/replies${qs ? `?${qs}` : ""}`);
}

export function commentsStreamUrl(targetType: "post" | "article", targetId: string) {
  return apiUrl(`/api/comments/stream?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`);
}

export type { CommentSort };
