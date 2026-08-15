"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleButton } from "@/components/auth/GoogleButton";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useLastAuthMethod } from "@/lib/hooks/useLastAuthMethod";
import { useRouter, useSearchParams } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Only ever redirect to a same-site path after login. `next` comes from a
// URL query param, which anyone can craft - without this check, a link like
// /login?next=https://evil.example would send a freshly-authenticated user
// straight to an attacker's site (a classic open-redirect phishing vector).
function safeRedirectTarget(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[400px]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectTarget(searchParams.get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { lastMethod, remember } = useLastAuthMethod();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    try {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // The password was right but the address was never confirmed.
        // Better Auth refuses the session (403) rather than letting an
        // unverified account in - so mint a fresh code and hand the user
        // straight to the screen that can clear it, instead of showing a
        // dead end they have no obvious way out of.
        if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) {
          await authClient.emailOtp.sendVerificationOtp({
            email: data.email,
            type: "email-verification",
          });
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        setFormError(error.message ?? "Unable to sign in. Check your credentials.");
        return;
      }

      remember("email");
      router.push(redirectTo);
      router.refresh();
    } catch {
      // authClient normally resolves { error } rather than throwing, even
      // for network failures - this only catches truly unexpected cases
      // (e.g. the request never reached the network layer at all), so a
      // failure here never leaves the user staring at a stuck button with
      // no explanation at all.
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const onGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    remember("google");
    // newUserCallbackURL: better-auth itself knows, server-side, whether this
    // OAuth flow just created a brand-new account - a first-time Google
    // sign-up lands on /create-password instead of going straight in.
    await authClient.signIn.social({ provider: "google", callbackURL: redirectTo, newUserCallbackURL: "/create-password" });
  };

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Log in</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back. Pick up where you left off.
        </p>
      </div>

      {/* Google leads. It is one tap, needs no password, and arrives already
          verified - so it is offered before the form rather than beneath it. */}
      <GoogleButton
        onClick={onGoogleSignIn}
        loading={isGoogleLoading}
        lastUsed={lastMethod === "google"}
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
            or
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <Input
            {...register("email")}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-950 hover:underline dark:text-zinc-400 dark:hover:text-white"
            >
              Forgot?
            </Link>
          </div>
          <Input
            {...register("password")}
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        {formError && (
          <p className="text-sm text-red-500" role="alert">
            {formError}
          </p>
        )}

        <div className="relative">
          {lastMethod === "email" && (
            <span className="absolute -top-2.5 right-3 z-10 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              Last used
            </span>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl text-base font-semibold shadow-sm dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Signing in..." : "Continue"}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-zinc-950 hover:underline dark:text-white">
          Create your account
        </Link>
      </p>
    </div>
  );
}
