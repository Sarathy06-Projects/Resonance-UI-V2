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

/**
 * Registers this device's FCM token so the backend can push to it.
 *
 * Called only from the Android shell (components/providers/NativeShell.tsx);
 * there is no browser equivalent - the web app receives notifications over the
 * SSE stream above, which only works while a tab is open, which is the whole
 * reason push exists on mobile.
 *
 * Idempotent by contract: the same token is re-sent on every launch, because a
 * token can be rotated by FCM at any time and the only way to notice is to
 * keep asserting the current one. The backend upserts on (userId, token).
 *
 * Requires POST /api/notifications/devices on the backend - see
 * docs/BACKEND_REQUIREMENTS.md section 14. Until that lands this 404s, which
 * the caller swallows.
 */
export function registerPushToken(token: string, platform: "android" | "ios") {
  return apiFetch<{ ok: true }>("/api/notifications/devices", {
    method: "POST",
    json: { token, platform },
  });
}

/** Drops this device's token, so a signed-out phone stops receiving pushes. */
export function unregisterPushToken(token: string) {
  return apiFetch<{ ok: true }>("/api/notifications/devices", {
    method: "DELETE",
    json: { token },
  });
}
