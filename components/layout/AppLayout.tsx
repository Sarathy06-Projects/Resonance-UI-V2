"use client";

import dynamic from "next/dynamic";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";
import { RightPanel } from "./RightPanel";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

// Code-split out of the shared layout bundle - the modal (and the Dialog +
// framer-motion it pulls in) is only ever needed once a visitor actually
// triggers it, not on every page load.
const AuthModal = dynamic(() => import("../shared/AuthModal").then((m) => m.AuthModal), { ssr: false });

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAuthModalOpen = useAuthStore((s) => s.isAuthModalOpen);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
      {isAuthModalOpen && <AuthModal />}

      <TopNav className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 w-full" />
      
      <div className={cn("w-full max-w-5xl mx-auto flex flex-1 relative pt-0 gap-6 lg:gap-8 px-0 sm:px-4 md:px-6", !isHome && "md:pt-6 justify-center")}>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen relative md:bg-white dark:md:bg-zinc-950 bg-transparent max-w-5xl w-full">
          <main className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
        </div>

      </div>

      {/* Bottom Nav (Mobile) */}
      <BottomNav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800" />
    </div>
  );
}
