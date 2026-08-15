"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Google's mark, inline rather than an <img>.
 *
 * Their brand guidelines require the four-colour "G" be reproduced exactly,
 * so it is not tinted with currentColor and does not change between light
 * and dark mode - it sits on a neutral surface in both.
 */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5", className)}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l4 3.09C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}

interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Renders the "Last used" tag, so a returning visitor sees their route in immediately. */
  lastUsed?: boolean;
  label?: string;
}

export function GoogleButton({
  onClick,
  loading = false,
  disabled = false,
  lastUsed = false,
  label = "Continue with Google",
}: GoogleButtonProps) {
  return (
    <div className="relative">
      {lastUsed && (
        <span
          className="absolute -top-2.5 right-3 z-10 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
          // Decorative echo of state the button already conveys to AT users
          // through nothing else - so it is announced, not hidden.
        >
          Last used
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          "h-12 w-full justify-center gap-3 rounded-xl text-base font-medium",
          "border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50",
          "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
          lastUsed && "border-zinc-300 dark:border-zinc-700",
        )}
      >
        <GoogleMark />
        {loading ? "Redirecting..." : label}
      </Button>
    </div>
  );
}
