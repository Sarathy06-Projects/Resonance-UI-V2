"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Matches the emailOTP rateLimit window in lib/auth.ts (3 requests / 60s). */
const COOLDOWN_SECONDS = 60;

/**
 * Countdown that disables a "resend code" control after it's used.
 *
 * Purely a UX affordance - it makes the wait visible instead of letting the
 * user hammer a button that will start failing. The actual limit is enforced
 * server-side by the emailOTP plugin's rate limiter, which is what a client
 * skipping this hook entirely would still hit.
 */
export function useResendCooldown(seconds: number = COOLDOWN_SECONDS) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    setSecondsLeft(seconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clear();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clear, seconds]);

  useEffect(() => clear, [clear]);

  return { secondsLeft, start };
}
