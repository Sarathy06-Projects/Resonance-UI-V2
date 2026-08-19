"use client";

import { useEffect, useState } from "react";

// Tailwind's `sm`. Kept as a number so the media query and any arithmetic
// stay in one place rather than being restated as a magic string.
const SM_BREAKPOINT = 640;

/**
 * True below Tailwind's `sm`, for the cases where a CSS breakpoint is not
 * enough and the component tree itself has to differ.
 *
 * Most responsive work here should stay in CSS - `hidden sm:block` and the
 * like - because it renders correctly on the server and needs no JS. This
 * exists for the narrower case where both branches must not exist at once:
 * two mounted copies of a composer means two autofocus targets fighting over
 * the caret and two instances writing the same localStorage draft key.
 *
 * Returns false on the server and on the first client render, then corrects
 * after mount. That ordering is deliberate - reading matchMedia during render
 * would hydrate mismatched - so treat false as "not yet known to be mobile"
 * and make the desktop branch the safe default.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`);
    const sync = () => setIsMobile(query.matches);
    sync();
    // Rotating a phone or dragging a desktop window across the breakpoint has
    // to move the composer with it, or someone ends up typing into a sheet
    // that the layout no longer accounts for.
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
