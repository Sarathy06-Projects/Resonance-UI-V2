import { apiFetch } from "./client";
import type { Author } from "./types";

// Client for the private messaging API.
//
// Nothing here is a security boundary - every one of these calls is
// re-authorized server-side against the session (see the backend's
// lib/chatAuth.ts). The types below describe what the server chooses to
// return, not what the client is allowed to ask for.

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  /** Empty string when isDeleted - the server never sends a deleted body. */
  body: string;
  replyToId: string | null;
  editedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  reactions?: { emoji: string; userId: string }[];
}

export interface ChatConversation {
  id: string;
  type: string;
  lastMessageAt: string;
  isMuted: boolean;
  unreadCount: number;
  participants: Author[];
  lastMessage: {
    id: string;
    senderId: string;
    body: string;
    isDeleted: boolean;
    createdAt: string;
  } | null;
}

export function getConversations(cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ conversations: ChatConversation[]; nextCursor: string | null }>(
    `/api/chat/conversations?${params.toString()}`
  );
}

export function getChatUnreadCount() {
  return apiFetch<{ count: number }>("/api/chat/unread-count");
}

/** Idempotent server-side: the same pair always resolves to one thread. */
export function openConversation(recipientId: string) {
  return apiFetch<{ id: string }>("/api/chat/conversations", {
    method: "POST",
    json: { recipientId },
  });
}

export function getMessages(conversationId: string, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ messages: ChatMessage[]; nextCursor: string | null }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`
  );
}

export function sendMessage(conversationId: string, body: string, replyToId?: string) {
  return apiFetch<ChatMessage>(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    json: { body, ...(replyToId ? { replyToId } : {}) },
  });
}

export function editMessage(id: string, body: string) {
  return apiFetch<ChatMessage>(`/api/chat/messages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: { body },
  });
}

export function deleteMessage(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/chat/messages/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function markConversationRead(id: string) {
  return apiFetch<{ ok: true }>(`/api/chat/conversations/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export function blockUser(userId: string) {
  return apiFetch<{ blocked: boolean }>("/api/chat/blocks", { method: "POST", json: { userId } });
}

export function reportMessage(id: string, reason: string, detail?: string) {
  return apiFetch<{ reported: boolean }>(`/api/chat/messages/${encodeURIComponent(id)}/report`, {
    method: "POST",
    json: { reason, ...(detail ? { detail } : {}) },
  });
}
