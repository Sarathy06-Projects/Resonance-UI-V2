"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
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
    try {
      const { error } = await authClient.emailOtp.requestPasswordReset({
        email: data.email,
      });

      if (error) {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      // Better Auth answers this endpoint identically whether or not the
      // address has an account, so moving straight to the code screen
      // doesn't disclose anything - someone probing for registered emails
      // sees this same screen either way, and simply never receives a code.
      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Forgot password?</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Enter your email and we&apos;ll send you a 6-digit reset code.
        </p>
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
          {isSubmitting ? "Sending..." : "Send reset code"}
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
