"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSWRConfig } from "swr";
import { MobileHeader } from "./MobileHeader";
import { MobileTabBar } from "./MobileTabBar";
import { MobileComposeSheet } from "./MobileComposeSheet";
import { hidesMobileChrome } from "@/lib/mobile/nav";

// Owns the mobile chrome and the compose sheet's open state. The sheet lives
// here rather than inside MobileTabBar so it survives the tab bar being
// scrolled out of view mid-compose, and so a freshly posted item can
// invalidate the feed cache from one place.
export function MobileShell() {
  const pathname = usePathname();
  const { mutate } = useSWRConfig();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  if (hidesMobileChrome(pathname)) return null;

  return (
    <>
      <MobileHeader />
      <MobileTabBar onCompose={() => setIsComposeOpen(true)} />
      <MobileComposeSheet
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        onPosted={() => {
          // Refresh every feed variant that's currently cached rather than a
          // single key - the user could be on "For you", "Following", or a
          // profile when they post, and all of them should show it.
          // useFeed keys are the tuple [`feed-${tab}`, cursor] (see
          // lib/hooks/useFeed.ts), so match on the first element, not on the
          // key being a plain string.
          void mutate((key) => Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("feed-"));
        }}
      />
    </>
  );
}
