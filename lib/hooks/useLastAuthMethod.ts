"use client";

import { useCallback, useSyncExternalStore } from "react";

export type AuthMethod = "google" | "email";

const KEY = "resonance:last-auth-method";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // `storage` only fires in *other* tabs, so the local set below notifies
  // this one directly. Both paths are needed for the badge to be correct
  // whichever tab was used to sign in.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): AuthMethod | null {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "google" || stored === "email" ? stored : null;
  } catch {
    // Private mode and blocked-storage settings both throw. The badge is a
    // convenience, so losing it is not worth surfacing.
    return null;
  }
}

/** There is no localStorage during SSR, and pretending otherwise is the bug. */
const getServerSnapshot = (): AuthMethod | null => null;

/**
 * Remembers which sign-in route was used last, so a returning visitor sees
 * it marked rather than re-deciding between Google and a password.
 *
 * useSyncExternalStore rather than useEffect + setState: localStorage is
 * exactly the "external store" this hook is designed for. It renders the
 * server snapshot (null) during hydration and swaps to the real value
 * afterwards, so the badge cannot cause a hydration mismatch - and it does
 * so without the cascading render that setState-in-an-effect produces.
 *
 * Stores a preference, never an identity: no email, no name, nothing that
 * discloses who used this browser.
 */
export function useLastAuthMethod() {
  const lastMethod = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const remember = useCallback((method: AuthMethod) => {
    try {
      window.localStorage.setItem(KEY, method);
    } catch {
      /* see getSnapshot */
    }
    for (const listener of listeners) listener();
  }, []);

  return { lastMethod, remember };
}
