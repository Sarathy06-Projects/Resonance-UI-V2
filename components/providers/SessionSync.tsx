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
  const { data, isPending } = useSession();
  const syncSession = useAuthStore((s) => s.syncSession);

  useEffect(() => {
    if (isPending) return;

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
  }, [data, isPending, syncSession]);

  return null;
}
