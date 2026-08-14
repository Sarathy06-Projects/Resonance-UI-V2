"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  applySafeArea,
  exitApp,
  getLaunchUrl,
  getSafeArea,
  hideSplash,
  isNative,
  onAppStateChange,
  onBackButton,
  onDeepLink,
  onNetworkChange,
  onPushAction,
  onPushToken,
  onSafeAreaChange,
  registerForPush,
  requestPushPermission,
  syncStatusBar,
} from "@/lib/native";
import { registerPushToken } from "@/lib/api/notifications";

// Everything the Android shell needs from the web layer, in one mount.
//
// Renders nothing and does nothing at all in a browser: every hook below
// early-returns on !isNative(), and lib/native's helpers are no-ops anyway.
// Kept as a single component rather than five, because the ordering between
// some of these matters (the splash must not be hidden before the status bar
// is correct, or the first frame flashes the wrong bar colour) and because a
// browser visitor should pay for exactly one no-op effect, not five.

const HOME = "/";

export function NativeShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  // Read by the back handler without re-subscribing it on every navigation.
  // The listener is registered once; re-registering it per route would drop
  // presses that land during the gap between removal and re-registration.
  //
  // Written in an effect rather than during render: a ref mutation during
  // render is not safe under concurrent rendering, where a render can be
  // thrown away, leaving the ref describing a route that was never committed.
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // --- Safe areas -----------------------------------------------------------
  // Must run before the splash is hidden, or the first visible frame has the
  // header tucked under the status bar and then jumps down.
  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    // Pull once on mount. The native side publishes these too, but it does so
    // against the document that existed at plugin-load time - which is not
    // this one, because loading the real page replaced it.
    void getSafeArea().then((insets) => {
      if (!cancelled && insets) applySafeArea(insets);
    });

    // And keep them current: rotation, the keyboard opening, and switching
    // between gesture and 3-button navigation all change the insets while the
    // app is running.
    const remove = onSafeAreaChange((insets) => applySafeArea(insets));

    return () => {
      cancelled = true;
      remove();
    };
  }, []);

  // --- Status bar, then splash ---------------------------------------------
  useEffect(() => {
    if (!isNative()) return;
    syncStatusBar(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme]);

  useEffect(() => {
    if (!isNative()) return;
    // One frame after mount: the app has rendered, but letting the browser
    // paint first means the splash is replaced by real content rather than by
    // an empty background for a frame.
    const id = requestAnimationFrame(() => hideSplash());
    return () => cancelAnimationFrame(id);
  }, []);

  // --- Hardware back button -------------------------------------------------
  useEffect(() => {
    if (!isNative()) return;

    // Two back presses on a tab root exit; one shows nothing and feels broken,
    // and exiting on the first press loses the app to a stray palm touch.
    let armedForExit = false;
    let armedTimer: ReturnType<typeof setTimeout> | undefined;

    const remove = onBackButton(() => {
      // 1. An open sheet or dialog takes the press first. Base UI closes on
      //    Escape, so dispatching one is what any open overlay is already
      //    listening for - which means this keeps working for overlays added
      //    later without them having to register anything here.
      const overlay = document.querySelector('[role="dialog"][data-open], [data-open][data-slot$="-content"]');
      if (overlay) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }

      // 2. A focused input gives the press to the keyboard, not to navigation.
      //    Android dismisses the keyboard itself; blurring is what stops the
      //    same press also popping the route behind it.
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        active.blur();
        return;
      }

      // 3. Anywhere that isn't a tab root pops the stack. history.length is
      //    deliberately not consulted: it counts entries from before the app
      //    was launched (a deep link arrives with a length of 1 but a real
      //    parent screen), and Next's client router pushes entries the
      //    WebView does not always report.
      if (pathRef.current !== HOME) {
        router.back();
        return;
      }

      // 4. Home. Confirm before leaving.
      if (armedForExit) {
        exitApp();
        return;
      }
      armedForExit = true;
      clearTimeout(armedTimer);
      armedTimer = setTimeout(() => {
        armedForExit = false;
      }, 2000);
    });

    return () => {
      clearTimeout(armedTimer);
      remove();
    };
  }, [router]);

  // --- Deep links -----------------------------------------------------------
  useEffect(() => {
    if (!isNative()) return;

    // Only ever navigate within our own origin. An appUrlOpen can carry any
    // URL that resolved to this app, and handing an arbitrary one to the
    // router would let a crafted link push a path of the attacker's choosing
    // - or, with a javascript: URL, something worse than that.
    const navigateIfOurs = (url: string) => {
      let target: URL;
      try {
        target = new URL(url);
      } catch {
        return;
      }
      if (target.protocol !== "https:") return;
      if (target.hostname !== window.location.hostname) return;

      const path = `${target.pathname}${target.search}${target.hash}`;
      // Capacitor always loads server.url first and *then* reports the deep
      // link, so a cold start is already sitting on "/" - replace rather than
      // push, or the back button returns to a home screen the user never
      // asked for and never saw.
      if (window.location.pathname === "/" && path !== "/") {
        router.replace(path);
      } else {
        router.push(path);
      }
    };

    // Warm start: the app is already running when the link is tapped.
    const remove = onDeepLink(({ url }) => navigateIfOurs(url));

    // Cold start: the intent was consumed while the activity was being
    // created, long before this effect ran, so the listener above never sees
    // it. Without this, tapping a Resonance link from a cold app lands on the
    // home feed instead of the linked post - the single most visible way deep
    // linking "works" in testing and fails in real use, because a tester
    // almost always has the app already open.
    let cancelled = false;
    void getLaunchUrl().then((url) => {
      if (!cancelled && url) navigateIfOurs(url);
    });

    return () => {
      cancelled = true;
      remove();
    };
  }, [router]);

  // --- Push notifications ---------------------------------------------------
  useEffect(() => {
    if (!isNative()) return;

    const removeToken = onPushToken(({ token }) => {
      // The token goes to the backend and nowhere else - never to console,
      // never into an error message. Anyone holding it can send this device a
      // notification that looks like it came from Resonance.
      void registerPushToken(token, "android").catch(() => {
        // A failed registration means no pushes until the next launch, which
        // is a degradation rather than a fault worth interrupting anyone over.
      });
    });

    const removeAction = onPushAction(({ notification }) => {
      // Server decides where a notification leads, but the client decides
      // whether that destination is legitimate: same-origin relative paths
      // only. A push payload is attacker-influenceable if the backend ever
      // reflects user content into it.
      const path = notification?.data?.path;
      if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
        router.push(path);
      }
    });

    return () => {
      removeToken();
      removeAction();
    };
  }, [router]);

  // Permission is requested once the user is signed in and looking at their
  // own activity - not at launch. Android 13's prompt is one-shot: dismissed
  // without context, it is permanently denied and only recoverable through
  // system settings.
  useEffect(() => {
    if (!isNative()) return;
    if (pathname !== "/notifications") return;

    let cancelled = false;
    void (async () => {
      const state = await requestPushPermission();
      if (!cancelled && state === "granted") registerForPush();
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // --- Reconnection ---------------------------------------------------------
  useEffect(() => {
    if (!isNative()) return;

    // Both paths do the same thing, for the same reason: an SSE stream held
    // open across a backgrounding or a network drop is usually dead without
    // having fired an error, so the chat and notification hooks are told to
    // re-establish rather than left waiting on a socket nothing will arrive
    // on. `online` is what those hooks (and SWR) already listen for, so this
    // reuses the existing recovery path instead of adding a second one.
    const wake = () => window.dispatchEvent(new Event("online"));

    const removeState = onAppStateChange(({ isActive }) => {
      if (isActive) wake();
    });
    const removeNetwork = onNetworkChange(({ connected }) => {
      if (connected) wake();
    });

    return () => {
      removeState();
      removeNetwork();
    };
  }, []);

  return null;
}
