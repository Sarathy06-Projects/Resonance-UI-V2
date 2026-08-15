"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleButton } from "@/components/auth/GoogleButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLastAuthMethod } from "@/lib/hooks/useLastAuthMethod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { lastMethod, remember } = useLastAuthMethod();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setFormError(null);
    const username = data.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");

    try {
      const { error } = await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        username,
      } as Parameters<typeof authClient.signUp.email>[0]);

      if (error) {
        setFormError(error.message ?? "Unable to create your account.");
        return;
      }

      remember("email");
      // requireEmailVerification (lib/auth.ts) means signup deliberately
      // does not sign the user in - the account exists but is unverified
      // and holds no session. The code just emailed is the way through, and
      // clearing it both verifies the address and starts the session.
      //
      // Better Auth also returns this same success shape when the address is
      // already registered, rather than "user already exists" - so this path
      // can't be used to test whether an email has an account.
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      router.refresh();
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const onGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    remember("google");
    // newUserCallbackURL: better-auth itself knows, server-side, whether this
    // OAuth flow just created a brand-new account - a first-time Google
    // sign-up lands on /create-password instead of going straight in.
    await authClient.signIn.social({ provider: "google", callbackURL: "/onboarding", newUserCallbackURL: "/create-password" });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Create your account</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Join Resonance and start publishing today.
        </p>
      </div>

      {/* Google first, for the same reason as on the login screen - and here
          it also skips email verification entirely, since Google's own
          email_verified claim is what the account is created from. */}
      <GoogleButton
        onClick={onGoogleSignIn}
        loading={isGoogleLoading}
        lastUsed={lastMethod === "google"}
        label="Sign up with Google"
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
          <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Full name
          </label>
          <Input
            {...register("name")}
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>

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
          <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <Input
            {...register("password")}
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Confirm password
          </label>
          <Input
            {...register("confirmPassword")}
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        {formError && (
          <p className="text-sm text-red-500" role="alert">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl text-base font-semibold shadow-sm dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Creating account..." : "Continue"}
        </Button>

        <p className="text-center text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
          We&apos;ll email you a 6-digit code to confirm your address.
        </p>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-zinc-950 hover:underline dark:text-white">
          Log in
        </Link>
      </p>
    </div>
  );
}
