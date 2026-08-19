"use client";

import { useEffect, useState } from "react";

/**
 * How many pixels of the layout viewport the software keyboard is covering.
 *
 * Returns 0 on desktop, and 0 on any browser honouring
 * `interactive-widget=resizes-content` (set in app/layout.tsx) - there the
 * layout viewport already shrank, so bottom-anchored chrome is above the
 * keyboard without help and there is nothing to compensate for.
 *
 * This exists for the browsers that ignore that hint, where the keyboard
 * shrinks only the *visual* viewport and a `fixed inset-0` panel keeps its
 * full height with its bottom edge hidden underneath. The difference between
 * the two viewports is exactly the overlap.
 *
 * offsetTop matters: when the page is pinch-zoomed or scrolled within the
 * visual viewport, height alone overstates the overlap.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      // Round and floor at zero: sub-pixel noise from browser chrome
      // animating in and out would otherwise jitter the layout.
      setInset(overlap > 1 ? Math.round(overlap) : 0);
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  return inset;
}
