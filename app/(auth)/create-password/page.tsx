"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
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

export default function CreatePasswordPage() {
  const router = useRouter();
  // useSession() directly, not useAuthStore: the store's isAuthenticated
  // flag is only populated once SessionSync's own async session check
  // resolves, which hasn't necessarily happened yet on this page's very
  // first render right after the OAuth redirect - trusting the store here
  // caused a false "not authenticated" read that bounced real, freshly
  // logged-in Google sign-ups straight back out to /login. useSession()
  // carries its own isPending flag, so we can tell "still checking" apart
  // from "confirmed no session" instead of guessing.
  const { data, isPending } = useSession();
  const user = data?.user;
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreatePasswordFormValues>({
    resolver: zodResolver(createPasswordSchema),
  });

  // This page only makes sense right after a fresh Google sign-up, which
  // already leaves the user authenticated (better-auth establishes the
  // session before redirecting here). Anyone landing here without a session
  // - e.g. a stale bookmark - has nothing to do here.
  useEffect(() => {
    if (!isPending && !user) router.replace("/login");
  }, [isPending, user, router]);

  if (isPending) return null;

  const onSubmit = async (data: CreatePasswordFormValues) => {
    setFormError(null);
    const res = await fetch("/api/create-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: data.password }),
    });

    if (res.ok) {
      router.push("/onboarding");
      return;
    }

    const body = await res.json().catch(() => ({}) as { code?: string; error?: string });
    if (body.code === "PASSWORD_ALREADY_SET") {
      // Already done (e.g. navigated back after completing this once) -
      // nothing to show an error about, just move them along.
      router.push("/onboarding");
      return;
    }
    setFormError(body.error || "Unable to set your password. Please try again.");
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
