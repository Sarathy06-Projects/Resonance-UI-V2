"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setFormError(null);
    const { error } = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: "/reset-password",
    });

    if (error) {
      setFormError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="w-full max-w-[400px] flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight dark:text-white">Check your email</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          If an account exists for that email address, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/login" className="text-sm font-semibold text-zinc-950 dark:text-white hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Forgot password?</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Input
            {...register("email")}
            type="email"
            placeholder="m@example.com"
            className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-sm mt-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-zinc-950 dark:text-white hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
