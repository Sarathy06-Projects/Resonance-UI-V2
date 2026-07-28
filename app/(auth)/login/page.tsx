"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setFormError(error.message ?? "Unable to sign in. Check your credentials.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  const onGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Welcome back</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Enter your email to sign in to your account</p>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Link href="/reset-password" className="text-sm font-medium text-blue-600 dark:text-blue-500 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            {...register("password")}
            type="password"
            placeholder="••••••••"
            className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl text-base font-semibold shadow-sm mt-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500 dark:text-zinc-400">Or continue with</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          type="button"
          disabled={isGoogleLoading}
          onClick={onGoogleSignIn}
          className="h-12 rounded-xl font-medium w-full dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
        </Button>
      </div>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-zinc-950 dark:text-white hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
