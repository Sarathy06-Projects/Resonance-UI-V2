"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { maskEmail } from "@/lib/mask-email";
import { useResendCooldown } from "@/lib/hooks/useResendCooldown";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[400px]" />}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  // Reset links minted before the switch to codes still carry ?token= and
  // still work - better-auth's link-based reset endpoint is untouched. Only
  // links already sitting in someone's inbox take this path; every new reset
  // arrives here with ?email= instead.
  const legacyToken = searchParams.get("token");
  const invalidToken = searchParams.get("error") === "INVALID_TOKEN";

  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { secondsLeft, start: startCooldown } = useResendCooldown();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setFormError(null);
    setNotice(null);

    if (!legacyToken && code.length !== 6) {
      setFormError("Enter the 6-digit code from your email.");
      return;
    }

    try {
      const { error } = legacyToken
        ? await authClient.resetPassword({ newPassword: data.password, token: legacyToken })
        : await authClient.emailOtp.resetPassword({
            email: email as string,
            otp: code,
            password: data.password,
          });

      if (error) {
        // Same flat wording as the verification screen, for the same reason:
        // not distinguishing "wrong code" from "expired" from "too many
        // attempts" denies a prober the signal they'd tune against.
        setFormError(
          legacyToken
            ? "Couldn't reset your password. The link may have expired."
            : "That code isn't valid or has expired. Request a new one below.",
        );
        setCode("");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const onResend = async () => {
    if (!email || secondsLeft > 0) return;
    setFormError(null);
    setNotice(null);
    try {
      const { error } = await authClient.emailOtp.requestPasswordReset({ email });
      if (error) {
        setFormError("Couldn't send a new code right now. Wait a moment and try again.");
        return;
      }
      setCode("");
      setNotice("A new code is on its way. The previous one no longer works.");
      startCooldown();
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  // No code target and no legacy token - nothing to act on.
  if ((!email && !legacyToken) || invalidToken) {
    return (
      <div className="w-full max-w-[400px] flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight dark:text-white">Request expired</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          This password reset request is invalid or has expired. Start again to continue.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-zinc-950 dark:text-white hover:underline"
        >
          Request a new code
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-[400px] flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight dark:text-white">Password updated</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Choose a new password</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          {email ? (
            <>
              Enter the code we sent to{" "}
              <span className="font-medium text-zinc-950 dark:text-white">{maskEmail(email)}</span>,
              then pick a new password.
            </>
          ) : (
            "Make it at least 8 characters."
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!legacyToken && (
          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (formError) setFormError(null);
            }}
            disabled={isSubmitting}
            invalid={Boolean(formError)}
            autoFocus
            label="Password reset code"
          />
        )}

        <div className="space-y-2">
          <Input
            {...register("password")}
            type="password"
            placeholder="New password"
            className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Input
            {...register("confirmPassword")}
            type="password"
            placeholder="Confirm new password"
            className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {formError && (
          <p className="text-sm text-red-500" role="alert">
            {formError}
          </p>
        )}
        {notice && <p className="text-sm text-emerald-600 dark:text-emerald-500">{notice}</p>}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-sm mt-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </form>

      {email && !legacyToken && (
        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={secondsLeft > 0}
            className="font-semibold text-zinc-950 dark:text-white hover:underline disabled:no-underline disabled:text-zinc-400 dark:disabled:text-zinc-600"
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
          </button>
        </div>
      )}
    </div>
  );
}
