import { apiFetch, apiUrl } from "./client";
import type { NotificationItem } from "./types";

export interface NotificationsPage {
  notifications: NotificationItem[];
  nextCursor: string | null;
}

export function getNotifications(category: string, cursor?: string | null) {
  const params = new URLSearchParams({ category });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<NotificationsPage>(`/api/notifications?${params.toString()}`);
}

export function getUnreadCount() {
  return apiFetch<{ count: number }>("/api/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiFetch<{ ok: true }>(`/api/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return apiFetch<{ ok: true }>("/api/notifications/read-all", { method: "POST" });
}

export function notificationsStreamUrl() {
  return apiUrl("/api/notifications/stream");
}
