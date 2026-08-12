import { apiFetch } from "./client";
import type { Series, SeriesWithArticles } from "./types";

export interface CreateSeriesInput {
  title: string;
  description?: string;
  coverImage?: string;
}

export function createSeries(input: CreateSeriesInput) {
  return apiFetch<Series>("/api/series", { method: "POST", json: input });
}

export function getUserSeries(authorId: string) {
  return apiFetch<{ series: Series[] }>(`/api/series?authorId=${encodeURIComponent(authorId)}`);
}

export function getSeries(id: string) {
  return apiFetch<SeriesWithArticles>(`/api/series/${id}`);
}

// For the legacy /series/:id route.ts redirect handler only.
export function getSeriesRedirectTarget(id: string) {
  return apiFetch<{ username: string | null; slug: string }>(`/api/series/${id}/redirect-target`);
}

// For app/sitemap.ts only.
export function getSeriesSitemapFeed(cursor?: string | null) {
  const params = new URLSearchParams({ limit: "100" });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ series: { slug: string; username: string; updatedAt: string; id: string }[]; nextCursor: string | null }>(
    `/api/series/sitemap-feed?${params.toString()}`
  );
}

// Unlike getSeries() above, this joins author info and each article's
// slug - see GET /api/series/by-slug/:username/:slug on the backend.
export function getSeriesBySlug(username: string, slug: string) {
  return apiFetch<Required<Pick<SeriesWithArticles, "author">> & SeriesWithArticles>(
    `/api/series/by-slug/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`
  );
}
