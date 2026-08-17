"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useAuthStore } from "@/store/useAuthStore";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
  bio?: string | null;
  role?: string | null;
  onboardedAt?: string | Date | null;
};

export function SessionSync() {
  const { data, isPending, error } = useSession();
  const syncSession = useAuthStore((s) => s.syncSession);
  const markSessionResolved = useAuthStore((s) => s.markSessionResolved);

  useEffect(() => {
    if (isPending) return;

    // A request that never landed is not a sign-out. /get-session answers 200
    // with a null session when there genuinely isn't one, so `error` only ever
    // means we couldn't ask: offline, a 429 from the auth rate limiter (30/min
    // per IP, see lib/auth.ts), a cold database. Clearing the user here would
    // sign someone out of their own UI over a network blip and leave them
    // there until the next successful poll.
    if (error) {
      markSessionResolved();
      return;
    }

    const sessionUser = data?.user as SessionUser | undefined;
    if (!sessionUser) {
      syncSession(null);
      return;
    }

    syncSession({
      id: sessionUser.id,
      name: sessionUser.name,
      username: sessionUser.username || sessionUser.email.split("@")[0],
      avatar: sessionUser.image || `https://api.dicebear.com/9.x/glass/svg?seed=${sessionUser.id}`,
      email: sessionUser.email,
      bio: sessionUser.bio ?? undefined,
      role: sessionUser.role ?? undefined,
      hasOnboarded: Boolean(sessionUser.onboardedAt),
    });
  }, [data, isPending, error, syncSession, markSessionResolved]);

  return null;
}
