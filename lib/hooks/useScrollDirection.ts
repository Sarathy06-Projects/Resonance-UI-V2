"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  /** Ignore jitter below this many px of travel. */
  threshold?: number;
  /** Always report "up" while within this distance of the top, so the chrome
   *  is never left hidden over the start of a feed. */
  topOffset?: number;
  /** Skip the listener entirely (e.g. on a screen that doesn't collapse). */
  enabled?: boolean;
}

export type ScrollDirection = "up" | "down";

// Drives the iOS-style "chrome hides as you read, returns the moment you
// reach back up" behaviour on mobile headers and the tab bar.
//
// The threshold matters more than it looks: without it, the 1-2px of scroll
// that iOS Safari emits while its own URL bar collapses is enough to flap the
// direction on every frame, so the header visibly strobes on the first swipe
// of every page.
export function useScrollDirection({ threshold = 8, topOffset = 24, enabled = true }: Options = {}): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>("up");
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting to the visible state when collapsing is switched off, not syncing external state
      setDirection("up");
      return;
    }

    lastY.current = window.scrollY;

    const update = () => {
      const y = Math.max(0, window.scrollY);

      if (y <= topOffset) {
        setDirection("up");
      } else if (Math.abs(y - lastY.current) >= threshold) {
        setDirection(y > lastY.current ? "down" : "up");
      }

      // Only advance the reference point once we've actually acted on the
      // delta - otherwise a slow scroll never accumulates past the threshold
      // and the direction never updates at all.
      if (Math.abs(y - lastY.current) >= threshold) lastY.current = y;
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, topOffset, enabled]);

  return direction;
}
