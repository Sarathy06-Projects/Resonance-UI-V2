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
