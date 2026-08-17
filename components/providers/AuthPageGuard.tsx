"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

// Only these two. The rest of the (auth) group is reached *with* a session on
// purpose - /create-password is where a brand-new Google account lands, and
// /verify-email is entered from a signup that deliberately holds no session
// yet - so a blanket "authenticated users don't belong here" would lock
// people out of the screens that exist to serve them.
const REDIRECT_WHEN_SIGNED_IN = ["/login", "/signup"];

/**
 * Sends an already-signed-in visitor away from /login and /signup.
 *
 * This used to live in proxy.ts, keyed off the presence of a session cookie.
 * That signal can't tell a live session from a revoked or expired one, so it
 * disagreed with what the app itself believed, and the disagreement showed up
 * as a Join button that did nothing when clicked - the header offered it
 * because the client knew it was signed out, and the redirect swallowed the
 * navigation because a cookie was still sitting in the jar. See the long note
 * in proxy.ts.
 *
 * Reading the resolved session here means the redirect and the button that
 * leads here are driven by one piece of state, which is the property that
 * actually fixes it. Like OnboardingGuard, this only acts on the confirmed
 * positive: isAuthenticated starts false while SessionSync is still asking,
 * so it cannot fire early on a visitor who is genuinely signed out.
 */
export function AuthPageGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && REDIRECT_WHEN_SIGNED_IN.includes(pathname)) {
      router.replace("/");
    }
  }, [isAuthenticated, pathname, router]);

  return null;
}
