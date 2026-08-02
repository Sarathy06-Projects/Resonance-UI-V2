"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

// Mounted only inside app/(main)/layout.tsx - that scoping is what keeps
// this from ever firing on /onboarding itself or any (auth) page (login,
// signup, create-password, ...), since none of those share this layout.
// No exemption list needed as a result.
//
// Only checks the *positive* confirmed case (isAuthenticated true AND
// hasOnboarded false) - isAuthenticated starts false during SessionSync's
// async session check, so this simply won't fire until real state is
// known. Checking the inverse ("not confirmed authenticated yet") is what
// caused the /create-password race-condition bug earlier - same class of
// mistake, avoided here by construction.
export function OnboardingGuard() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isAuthenticated && user && !user.hasOnboarded) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, user, router]);

  return null;
}
