"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

// Shows an install banner on every fresh load of the app (page reload, or
// landing on a page right after login) unless it's already running as an
// installed PWA. Chromium browsers get a real native install prompt; iOS
// Safari has no such API, so it gets manual "Add to Home Screen" steps
// instead - there's no programmatic install trigger there at all.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[pwa] service worker registration failed", err);
      });
    }

    if (isStandalone()) return;

    if (isIos()) {
      setShowIosInstructions(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (dismissed || (!deferredPrompt && !showIosInstructions)) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-40 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-4 flex items-start gap-3">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-950 dark:bg-white flex items-center justify-center text-white dark:text-zinc-950 font-bold">
        R
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Install Resonance</p>
        {showIosInstructions ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tap the Share icon, then &quot;Add to Home Screen&quot; to install the app.
          </p>
        ) : (
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Get the app for a faster, full-screen experience.</p>
            <Button size="sm" className="mt-3 h-8 rounded-lg text-xs font-semibold" onClick={onInstallClick}>
              <Download className="h-3.5 w-3.5" />
              Install app
            </Button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
