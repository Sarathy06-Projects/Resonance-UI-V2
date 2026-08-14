"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bookmark, FileEdit, Heart, Settings, LogOut, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// Mobile's home for everything the desktop TopNav keeps in its avatar
// dropdown. Hiding that nav below `md` (see components/layout/TopNav.tsx)
// left Saved, Drafts, Your activity, Settings and Log out with no entry
// point at all on a phone - reachable only by typing the URL. This is that
// entry point.
//
// It lives on your own profile rather than in the tab bar because the tab
// bar is five destinations wide already, and "the things that are mine"
// is what the profile tab means.
//
// Account deletion deliberately isn't listed: it stays inside Settings
// behind its existing confirm step, rather than sitting one tap away in a
// sheet you might open by accident.
const LINKS = [
  { href: "/collections", label: "Saved", icon: Bookmark },
  { href: "/drafts", label: "Drafts", icon: FileEdit },
  { href: "/activity", label: "Your activity", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function ProfileMenuSheet() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.push("/");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        // Mirrors the back chevron on someone else's profile: floated over
        // the cover image, which is the only chrome this screen has (the
        // route renders no MobileHeader - see lib/mobile/nav.ts).
        className="absolute right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-90 sm:hidden"
        style={{ top: "calc(0.75rem + var(--safe-top))" }}
      >
        <Menu className="h-5 w-5" strokeWidth={2.2} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 pb-[max(1.5rem,var(--safe-bottom))]">
          {/* Visible rather than sr-only: SheetContent floats its close
              button at top-right, which would otherwise land on top of the
              first row's chevron. A real title row gives it somewhere to sit
              and labels the sheet at the same time. */}
          <SheetHeader className="px-2 pb-1">
            <SheetTitle>Your account</SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-[52px] items-center gap-4 rounded-xl px-2 text-[16px] font-medium text-zinc-900 transition-colors active:bg-zinc-100 dark:text-zinc-100 dark:active:bg-zinc-800"
              >
                <Icon className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
              </Link>
            ))}

            <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />

            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex min-h-[52px] items-center gap-4 rounded-xl px-2 text-left text-[16px] font-medium",
                "text-red-600 transition-colors active:bg-red-50 dark:text-red-400 dark:active:bg-red-950/40"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Log out</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
