import { apiFetch } from "./client";
import type { Article, Draft, Post } from "./types";

export interface SaveDraftInput {
  mode: "discussion" | "showcase" | "feedback" | "article";
  title?: string;
  content?: string;
  coverImage?: string;
  meta?: Record<string, unknown>;
}

export function getDrafts() {
  return apiFetch<{ drafts: Draft[] }>("/api/drafts");
}

export function getDraft(id: string) {
  return apiFetch<Draft>(`/api/drafts/${id}`);
}

export function createDraft(input: SaveDraftInput) {
  return apiFetch<Draft>("/api/drafts", { method: "POST", json: input });
}

export function updateDraft(id: string, input: SaveDraftInput) {
  return apiFetch<Draft>(`/api/drafts/${id}`, { method: "PUT", json: input });
}

export function deleteDraft(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/drafts/${id}`, { method: "DELETE" });
}

export function publishDraft(id: string) {
  return apiFetch<({ resultType: "post" } & Post) | ({ resultType: "article" } & Article)>(`/api/drafts/${id}/publish`, {
    method: "POST",
  });
}
