"use client";

import { useCallback, useRef } from "react";

// Touch-only long-press detector - used to open a comment's actions menu on
// mobile as an alternative to tapping the small "..." trigger.
export function useLongPress(onLongPress: () => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      moved.current = false;
      timer.current = setTimeout(() => {
        if (!moved.current) onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const cancel = useCallback((_e?: React.PointerEvent) => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      moved.current = true;
      cancel(e);
    },
    [cancel]
  );

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerMove: onMove,
  };
}
