import { apiFetch } from "./client";
import type { ResolvedContent } from "./types";

export function getContentBySlug(username: string, slug: string) {
  return apiFetch<ResolvedContent>(`/api/content/by-slug/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`);
}
