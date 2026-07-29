"use client";

import { useCallback, useRef, useState } from "react";

const THRESHOLD = 64;
const MAX_DRAG = 80;

// Touch-only swipe-left-to-reply gesture for a comment row.
export function useSwipeReply(onTrigger: () => void) {
  const startX = useRef<number | null>(null);
  const [translateX, setTranslateX] = useState(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    startX.current = e.clientX;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    setTranslateX(Math.max(-MAX_DRAG, Math.min(0, delta)));
  }, []);

  const onPointerUp = useCallback(
    (_e?: React.PointerEvent) => {
      if (startX.current === null) return;
      if (translateX <= -THRESHOLD) onTrigger();
      startX.current = null;
      setTranslateX(0);
    },
    [translateX, onTrigger]
  );

  return {
    translateX,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp },
  };
}
