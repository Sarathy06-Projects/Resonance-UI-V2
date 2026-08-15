"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { authClient } from "@/lib/auth-client";
import { maskEmail } from "@/lib/mask-email";
import { useResendCooldown } from "@/lib/hooks/useResendCooldown";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[400px]" />}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { secondsLeft, start: startCooldown } = useResendCooldown();

  // Landing here without an address means there's nothing to verify against
  // - the code is keyed to the email, not to a session. Send them back to
  // sign in rather than showing a form that can't succeed.
  useEffect(() => {
    if (!email) router.replace("/login");
  }, [email, router]);

  const onVerify = useCallback(
    async (submitted: string) => {
      if (submitted.length !== 6 || isVerifying) return;
      setIsVerifying(true);
      setFormError(null);
      setNotice(null);
      try {
        const { error } = await authClient.emailOtp.verifyEmail({
          email,
          otp: submitted,
        });

        if (error) {
          // Deliberately flat wording. The server distinguishes "wrong
          // code", "expired", and "too many attempts", but repeating that
          // distinction back would tell someone probing codes which of the
          // three they hit and let them tune the attack.
          setFormError("That code isn't valid or has expired. Request a new one below.");
          setCode("");
          return;
        }

        // requireEmailVerification means signup never issued a session;
        // autoSignInAfterVerification (lib/auth.ts) just created one, so
        // this lands on onboarding already signed in.
        router.push("/onboarding");
        router.refresh();
      } catch {
        setFormError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        setIsVerifying(false);
      }
    },
    [email, isVerifying, router],
  );

  const onResend = async () => {
    if (secondsLeft > 0 || isResending) return;
    setIsResending(true);
    setFormError(null);
    setNotice(null);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) {
        // Covers the rate limiter as well as a genuine mail-provider
        // failure; either way the useful advice is the same.
        setFormError("Couldn't send a new code right now. Wait a moment and try again.");
        return;
      }
      setCode("");
      setNotice("A new code is on its way. The previous one no longer works.");
      startCooldown();
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return <div className="w-full max-w-[400px]" />;

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Check your email</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-zinc-950 dark:text-white">{maskEmail(email)}</span>
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onVerify(code);
        }}
        className="space-y-4"
      >
        <OtpInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (formError) setFormError(null);
          }}
          onComplete={(next) => void onVerify(next)}
          disabled={isVerifying}
          invalid={Boolean(formError)}
          autoFocus
          label="Email verification code"
        />

        {formError && (
          <p className="text-sm text-red-500" role="alert">
            {formError}
          </p>
        )}
        {notice && <p className="text-sm text-emerald-600 dark:text-emerald-500">{notice}</p>}

        <Button
          type="submit"
          disabled={isVerifying || code.length !== 6}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-sm mt-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isVerifying ? "Verifying..." : "Verify email"}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={secondsLeft > 0 || isResending}
          className="font-semibold text-zinc-950 dark:text-white hover:underline disabled:no-underline disabled:text-zinc-400 dark:disabled:text-zinc-600"
        >
          {isResending
            ? "Sending..."
            : secondsLeft > 0
              ? `Resend in ${secondsLeft}s`
              : "Resend code"}
        </button>
      </div>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Wrong address?{" "}
        <Link href="/signup" className="font-semibold text-zinc-950 dark:text-white hover:underline">
          Use a different email
        </Link>
      </div>
    </div>
  );
}
