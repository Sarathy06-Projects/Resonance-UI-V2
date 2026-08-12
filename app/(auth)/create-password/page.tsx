"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";

const createPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type CreatePasswordFormValues = z.infer<typeof createPasswordSchema>;

// Same rule as /login's safeRedirectTarget: `next` comes from a query param
// anyone can craft, so only ever honor a same-site path.
function safeRedirectTarget(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[400px]" />}>
      <CreatePasswordPageInner />
    </Suspense>
  );
}

function CreatePasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectTarget(searchParams.get("next"));
  // useSession() directly, not useAuthStore: the store's isAuthenticated
  // flag is only populated once SessionSync's own async session check
  // resolves, which hasn't necessarily happened yet on this page's very
  // first render right after the OAuth redirect - trusting the store here
  // caused a false "not authenticated" read that bounced real, freshly
  // logged-in Google sign-ins straight back out to /login. useSession()
  // carries its own isPending flag, so we can tell "still checking" apart
  // from "confirmed no session" instead of guessing.
  const { data, isPending } = useSession();
  const user = data?.user;
  const [formError, setFormError] = useState<string | null>(null);
  // null = still checking; this page is reached from *every* Google
  // sign-in (both /login and /signup point their button here), not just
  // first-time ones, specifically so an account that exists but somehow
  // never finished password setup (e.g. the tab was closed mid-flow) gets
  // caught here too instead of silently skipping straight into the app.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreatePasswordFormValues>({
    resolver: zodResolver(createPasswordSchema),
  });

  // This page only makes sense right after a fresh Google sign-in, which
  // already leaves the user authenticated (better-auth establishes the
  // session before redirecting here). Anyone landing here without a session
  // - e.g. a stale bookmark - has nothing to do here.
  useEffect(() => {
    if (!isPending && !user) router.replace("/login");
  }, [isPending, user, router]);

  // Once we know who's signed in, ask whether they actually need this page.
  // A user who already has a password set (returning Google sign-in on an
  // account that completed this before) skips the form entirely and moves
  // straight on - OnboardingGuard, mounted app-wide, still catches them if
  // onboarding itself isn't done yet, so redirecting to `next` (or "/") here
  // is always safe regardless of that status.
  useEffect(() => {
    if (isPending || !user) return;
    let cancelled = false;
    fetch("/api/auth/account-status", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: { hasPassword: boolean }) => {
        if (cancelled) return;
        if (body.hasPassword) {
          router.replace(redirectTo);
        } else {
          setHasPassword(false);
        }
      })
      .catch(() => {
        // Status check itself failed (network blip) - fail toward showing
        // the form rather than silently stranding the user on a blank page;
        // worst case they see PASSWORD_ALREADY_SET on submit and get routed
        // through normally from there.
        if (!cancelled) setHasPassword(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPending, user, router, redirectTo]);

  if (isPending || hasPassword === null) return null;

  const onSubmit = async (data: CreatePasswordFormValues) => {
    setFormError(null);
    try {
      const res = await fetch("/api/create-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: data.password }),
      });

      if (res.ok) {
        router.push(redirectTo);
        return;
      }

      const body = await res.json().catch(() => ({}) as { code?: string; error?: string });
      if (body.code === "PASSWORD_ALREADY_SET") {
        // Already done (e.g. navigated back after completing this once) -
        // nothing to show an error about, just move them along.
        router.push(redirectTo);
        return;
      }
      setFormError(body.error || "Unable to set your password. Please try again.");
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Create a password</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          {user?.name ? `Welcome, ${user.name.split(" ")[0]}! ` : ""}
          Set a password so you can also sign in with your email, not just Google.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Input
            {...register("password")}
            type="password"
            placeholder="Password"
            autoFocus
            className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Input
            {...register("confirmPassword")}
            type="password"
            placeholder="Confirm password"
            className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl text-base font-semibold shadow-sm mt-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}
