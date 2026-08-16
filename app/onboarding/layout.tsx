"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/shared/Logo";
import { useAuthStore } from "@/store/useAuthStore";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
      <header className="p-6 flex items-center justify-center relative border-b border-zinc-100 dark:border-zinc-800">
        <Wordmark size={30} />
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>
      <main className="flex-1 flex flex-col items-center p-6 sm:p-10 max-w-3xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
