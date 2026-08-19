"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSWRConfig } from "swr";
import { DesktopRail } from "./DesktopRail";
import { MobileShell } from "./mobile/MobileShell";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { resolveMobileChrome, hidesMobileChrome } from "@/lib/mobile/nav";

// Code-split out of the shared layout bundle - the modal (and the Dialog +
// framer-motion it pulls in) is only ever needed once a visitor actually
// triggers it, not on every page load.
const AuthModal = dynamic(() => import("../shared/AuthModal").then((m) => m.AuthModal), { ssr: false });
const ComposeSheet = dynamic(() => import("./ComposeSheet").then((m) => m.ComposeSheet), {
  ssr: false,
});
const CreateTypeDialog = dynamic(() => import("./CreateTypeDialog").then((m) => m.CreateTypeDialog), {
  ssr: false,
});

// One information architecture, two presentations.
//
// Desktop and mobile now offer the same five destinations, resolved from the
// same route table (lib/mobile/nav.ts): a fixed left rail on desktop, a bottom
// tab bar on mobile. They used to disagree - the old top nav had its own set of
// links plus a search box, a write dropdown and an avatar menu - so the app
// taught two different maps depending on window width.
//
// Which chrome shows is decided by CSS breakpoints rather than a JS media
// query, so the server renders the correct thing for both and neither flashes
// the other's layout during hydration.
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthModalOpen = useAuthStore((s) => s.isAuthModalOpen);
  const { mutate } = useSWRConfig();

  // Held here rather than in either shell, so the rail's compose button and the
  // tab bar's centre button drive the same one flow.
  //
  // Compose is two steps now: pick what you're making, then make it. "choose"
  // is what both buttons open; "post" is the composer, reached either by
  // picking Post or - once that choice is behind you - directly. Picking
  // Article leaves the layout entirely and navigates to /create.
  const [composeStep, setComposeStep] = useState<null | "choose" | "post">(null);

  const chrome = resolveMobileChrome(pathname);
  const isFullBleed = hidesMobileChrome(pathname);

  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      {isAuthModalOpen && <AuthModal />}

      {!isFullBleed && <DesktopRail onCompose={() => setComposeStep("choose")} />}
      <MobileShell onCompose={() => setComposeStep("choose")} />

      {composeStep === "choose" && (
        <CreateTypeDialog
          open
          onOpenChange={(next) => !next && setComposeStep(null)}
          onChoosePost={() => setComposeStep("post")}
        />
      )}

      {composeStep === "post" && (
        <ComposeSheet
          open
          onOpenChange={(next) => !next && setComposeStep(null)}
          onPosted={() => {
            // Refresh every cached feed variant rather than one key - the user
            // could be on "For you", "Following", a profile or search when they
            // post. useFeed keys are the tuple [`feed-${tab}`, cursor].
            void mutate((key) => Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("feed-"));
          }}
        />
      )}

      {/* Offset by the rail's width on desktop so the reading column is centred
          in the space that remains, not in the viewport - otherwise the rail
          pushes it visibly off-centre. */}
      <div className={cn("flex min-h-screen flex-col", !isFullBleed && "md:pl-[72px]")}>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col md:border-x md:border-zinc-100 dark:md:border-zinc-800/80">
          <main
            className={cn(
              "flex-1",
              // Clear the fixed tab bar on mobile so the last item in any list
              // is reachable. Pushed screens pin their own bottom bar (reply
              // composer, publish action) and pad for it themselves, and
              // /create owns the whole viewport.
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
