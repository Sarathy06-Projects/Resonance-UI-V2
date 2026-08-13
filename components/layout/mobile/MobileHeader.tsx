"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { resolveMobileChrome, type MobileTab } from "@/lib/mobile/nav";

// Where "up one level" lands for each tab, used when there is no history to
// go back to.
const TAB_ROOTS: Record<Exclude<MobileTab, null>, string> = {
  home: "/",
  search: "/explore",
  activity: "/notifications",
  profile: "/",
};

// One header component that renders the treatment the route asked for (see
// lib/mobile/nav.ts). Tab roots get a brand or large-title header; pushed
// screens get a compact centred title with a back chevron, which is what
// tells you at a glance that you're one level down rather than on a tab.
export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const headerRef = useRef<HTMLElement>(null);

  const chrome = resolveMobileChrome(pathname);

  // "none" = the screen paints its own header (profile, over its cover
  // image); "search" = the screen's search field *is* the header. Either way
  // this component renders nothing.
  const hasHeader = chrome.header !== "none" && chrome.header !== "search";

  // Same contract as MobileTabBar: publish the measured height (including the
  // top safe-area inset) so sticky sub-headers - the notifications filter
  // rail, the profile tab rail - can pin directly beneath this instead of
  // hardcoding an offset.
  //
  // Publish 0 whenever nothing is pinned up there: no header at all, or a
  // header that scrolls away with the content. In both cases the screen's own
  // sub-header owns the top edge, and any leftover value from the previous
  // route would leave it floating over a gap.
  const occupiesTop = hasHeader && chrome.stickyHeader;

  useEffect(() => {
    const root = document.documentElement;
    if (!occupiesTop) {
      root.style.setProperty("--mobile-header-height", "0px");
      return;
    }
    const el = headerRef.current;
    if (!el) return;
    const publish = () => root.style.setProperty("--mobile-header-height", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [occupiesTop, chrome.header]);

  // Deep links (a shared post opened cold, a push notification) have nothing
  // behind them in the history stack, so a bare router.back() would walk the
  // user straight out of the site. Fall back to the route this screen sits
  // under in the IA instead - the back chevron then always means "up one
  // level", which is what it looks like it means.
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(TAB_ROOTS[chrome.tab ?? "home"]);
  };

  if (!hasHeader) return null;

  return (
    <header
      ref={headerRef}
      className={cn(
        "z-30 md:hidden",
        "border-b border-zinc-200/60 bg-white/85 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/85",
        "pt-safe",
        // Pinned for screens whose title has to stay reachable; static (so it
        // scrolls off) for the home feed, where the sticky feed switcher
        // takes over the top edge.
        chrome.stickyHeader ? "sticky top-0" : "relative"
      )}
    >
      {chrome.header === "home" && <HomeHeader isAuthenticated={isAuthenticated} />}

      {chrome.header === "large-title" && (
        <div className="flex h-14 items-center gap-1 px-2">
          {!chrome.isRoot && <BackButton onClick={goBack} />}
          <h1 className={cn("text-[22px] font-bold tracking-tight dark:text-white", chrome.isRoot ? "px-2" : "")}>
            {chrome.title}
          </h1>
        </div>
      )}

      {chrome.header === "title" && (
        <div className="grid h-14 grid-cols-[3rem_1fr_3rem] items-center">
          <BackButton onClick={goBack} />
          <h1 className="truncate text-center text-[16px] font-semibold tracking-tight dark:text-white">
            {chrome.title}
          </h1>
          <span aria-hidden />
        </div>
      )}
    </header>
  );
}

function HomeHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="flex h-14 items-center justify-between px-4">
      <Link href="/" aria-label="Resonance home" className="flex items-center gap-2">
        <Logo size={28} />
        <span className="text-lg font-bold tracking-tight dark:text-white">Resonance</span>
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        {!isAuthenticated && (
          <Button size="sm" nativeButton={false} className="h-8 rounded-full px-4 text-[13px] font-semibold" render={<Link href="/signup" />}>
            Join
          </Button>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="flex h-12 w-12 items-center justify-center rounded-full text-zinc-900 transition-colors active:bg-zinc-100 dark:text-zinc-100 dark:active:bg-zinc-800"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
    </button>
  );
}
