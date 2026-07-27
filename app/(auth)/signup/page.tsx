"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { mockUsers } from "@/lib/mock-data";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "newuser@example.com",
      password: "password123",
      confirmPassword: "password123"
    }
  });

  const onSubmit = async (data: SignupFormValues) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Log user in automatically with a dummy profile and redirect to onboarding
    login(mockUsers[0]);
    router.push("/onboarding");
  };

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Create an account</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Enter your details below to create your account</p>
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
          <Input 
            {...register("password")}
            type="password" 
            placeholder="Password" 
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

        <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl text-base font-semibold shadow-sm mt-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
          {isSubmitting ? "Creating account..." : "Sign up (Demo)"}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-zinc-950 dark:text-white hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
