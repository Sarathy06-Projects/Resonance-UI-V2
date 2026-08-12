import { apiFetch, apiUpload } from "./client";
import type { Article, Author, Post, Profile } from "./types";

export function getProfile(username: string) {
  return apiFetch<Profile>(`/api/users/${username}`);
}

// For app/sitemap.ts only.
export function getUsersSitemapFeed(cursor?: string | null) {
  const params = new URLSearchParams({ limit: "100" });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ users: { username: string; updatedAt: string; id: string }[]; nextCursor: string | null }>(
    `/api/users/sitemap-feed?${params.toString()}`
  );
}

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  company?: string;
  location?: string;
  websiteUrl?: string;
  toolbox?: string[];
  interests?: string[];
}

export function updateProfile(input: UpdateProfileInput) {
  return apiFetch<Profile>("/api/users/me", { method: "PATCH", json: input });
}

export function checkUsername(value: string) {
  return apiFetch<{ available: boolean; reason?: string }>(`/api/users/check-username?value=${encodeURIComponent(value)}`);
}

export function getRecommendedUsers(limit = 6) {
  return apiFetch<{ users: (Author & { followersCount: number; mutualCount?: number })[] }>(`/api/users/recommended?limit=${limit}`);
}

export function getFollowers(userId: string) {
  return apiFetch<{ followers: Author[] }>(`/api/users/${userId}/followers`);
}

export function getFollowing(userId: string) {
  return apiFetch<{ following: Author[] }>(`/api/users/${userId}/following`);
}

export function followUser(userId: string) {
  return apiFetch<{ following: true }>(`/api/users/${userId}/follow`, { method: "POST" });
}

export function unfollowUser(userId: string) {
  return apiFetch<{ following: false }>(`/api/users/${userId}/follow`, { method: "DELETE" });
}

export function uploadAvatar(file: File) {
  return apiUpload<{ image: string }>("/api/users/me/avatar", file);
}

export function uploadCover(file: File) {
  return apiUpload<{ coverImage: string }>("/api/users/me/cover", file);
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ ok: true }>("/api/users/me/password", { method: "PATCH", json: { currentPassword, newPassword } });
}

export function deleteAccount() {
  return apiFetch<{ deleted: boolean }>("/api/users/me", { method: "DELETE" });
}

export function getBookmarkedPosts() {
  return apiFetch<{ posts: Post[] }>("/api/users/me/bookmarks?type=posts");
}

export function getBookmarkedArticles() {
  return apiFetch<{ articles: Article[] }>("/api/users/me/bookmarks?type=articles");
}

export function getLikedPosts(cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return apiFetch<{ posts: Post[]; nextCursor: string | null }>(`/api/users/me/liked-posts${qs ? `?${qs}` : ""}`);
}

export function getCommentedPosts(cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return apiFetch<{ posts: Post[]; nextCursor: string | null }>(`/api/users/me/commented-posts${qs ? `?${qs}` : ""}`);
}
