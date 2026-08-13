"use client";

import dynamic from "next/dynamic";
import { TopNav } from "./TopNav";
import { MobileShell } from "./mobile/MobileShell";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { resolveMobileChrome, hidesMobileChrome } from "@/lib/mobile/nav";

// Code-split out of the shared layout bundle - the modal (and the Dialog +
// framer-motion it pulls in) is only ever needed once a visitor actually
// triggers it, not on every page load.
const AuthModal = dynamic(() => import("../shared/AuthModal").then((m) => m.AuthModal), { ssr: false });

// Two genuinely different shells over one set of screens.
//
// Desktop is a persistent top nav with a centred column. Mobile is a
// tab-rooted stack: a contextual header per route, a five-target tab bar, and
// a compose action that opens over the current screen (see mobile/).
//
// Which chrome shows is decided by CSS breakpoints (`md:hidden` /
// `hidden md:block`) rather than by a JS media query, so the server renders
// the correct thing for both and neither one flashes the other's layout
// during hydration.
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthModalOpen = useAuthStore((s) => s.isAuthModalOpen);

  const chrome = resolveMobileChrome(pathname);
  const isFullBleed = hidesMobileChrome(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      {isAuthModalOpen && <AuthModal />}

      <TopNav className="sticky top-0 z-20 hidden w-full border-b border-zinc-100 bg-white/90 backdrop-blur-xl md:block dark:border-zinc-800 dark:bg-zinc-950/90" />

      <MobileShell />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 gap-6 px-0 sm:px-4 md:px-6 lg:gap-8">
        <div className="relative flex min-h-screen w-full max-w-5xl min-w-0 flex-1 flex-col bg-transparent md:bg-white dark:md:bg-zinc-950">
          <main
            className={cn(
              "flex-1",
              // Clear the fixed tab bar on mobile so the last item in any
              // list is fully reachable. Pushed screens pin their own bottom
              // bar (reply composer, publish action) and pad for it
              // themselves, and /create owns the whole viewport.
              !isFullBleed && chrome.isRoot && "pb-[calc(var(--mobile-tabbar-height)+0.5rem)] md:pb-0"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
