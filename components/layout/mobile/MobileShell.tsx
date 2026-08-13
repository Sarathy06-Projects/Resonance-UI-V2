"use client";

import { usePathname } from "next/navigation";
import { MobileHeader } from "./MobileHeader";
import { MobileTabBar } from "./MobileTabBar";
import { hidesMobileChrome } from "@/lib/mobile/nav";

// The mobile chrome: a contextual header and the tab bar.
//
// The compose sheet used to live here, but the desktop rail needs to open the
// same one - so its state moved up to AppLayout and this takes the trigger as a
// prop. One sheet, two entry points, no duplicated open state to drift.
export function MobileShell({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();

  if (hidesMobileChrome(pathname)) return null;

  return (
    <>
      <MobileHeader />
      <MobileTabBar onCompose={onCompose} />
    </>
  );
}
