import { apiFetch } from "./client";
import type { Author } from "./types";

export interface CompleteOnboardingInput {
  role: string;
  topics: string[];
  name?: string;
  username?: string;
  bio?: string;
}

export function completeOnboarding(input: CompleteOnboardingInput) {
  return apiFetch<Author>("/api/onboarding/complete", { method: "POST", json: input });
}
