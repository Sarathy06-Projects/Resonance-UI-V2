import { apiFetch } from "./client";
import type { Community, DesignChallenge, EventItem, Resource } from "./types";

export function getTopics() {
  return apiFetch<{ topics: string[] }>("/api/topics");
}

export function getSuggestedCommunities(limit = 4) {
  return apiFetch<{ communities: Community[] }>(`/api/communities/suggested?limit=${limit}`);
}

export function getUpcomingEvents(limit = 4) {
  return apiFetch<{ events: EventItem[] }>(`/api/events/upcoming?limit=${limit}`);
}

export function getCurrentChallenges(limit = 3) {
  return apiFetch<{ challenges: DesignChallenge[] }>(`/api/challenges/current?limit=${limit}`);
}

export function getPopularResources(limit = 6) {
  return apiFetch<{ resources: Resource[] }>(`/api/resources/popular?limit=${limit}`);
}
