"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the final digit lands, so the form can submit without a click. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Renders the boxes in the destructive state after a rejected code. */
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
}

/**
 * Segmented one-time-code field.
 *
 * Implemented as a single transparent <input> stretched across the row with
 * the boxes drawn underneath, rather than six separate inputs. That keeps
 * every native behaviour for free - paste, iOS/Android one-time-code
 * autofill, backspace, arrow keys, undo, screen-reader announcement - all of
 * which have to be hand-reimplemented (and usually half-broken) in the
 * six-inputs approach.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
  label = "Verification code",
}: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const id = useId();
  // Guards against onComplete firing twice for the same code - e.g. when a
  // re-render or a blur/focus round trip re-runs the effect with an
  // unchanged, already-complete value.
  const completedFor = useRef<string | null>(null);

  useEffect(() => {
    if (value.length === length && completedFor.current !== value) {
      completedFor.current = value;
      onComplete?.(value);
    }
    if (value.length < length) completedFor.current = null;
  }, [value, length, onComplete]);

  // The caret is invisible, so a click landing mid-string would silently put
  // the next digit in the wrong place. Always collapse to the end instead.
  const selectEnd = () => {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  };

  const activeIndex = focused ? Math.min(value.length, length - 1) : -1;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className="relative"
        onClick={() => {
          inputRef.current?.focus();
          selectEnd();
        }}
      >
        <input
          ref={inputRef}
          id={id}
          // "one-time-code" is what lets iOS surface the code above the
          // keyboard and Android offer it from the notification.
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          disabled={disabled}
          autoFocus={autoFocus}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(e) => {
            // Strips the spaces and dashes people paste along with a code
            // ("492 017"), and anything non-numeric.
            const next = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(next);
          }}
          onFocus={() => {
            setFocused(true);
            selectEnd();
          }}
          onBlur={() => setFocused(false)}
          onSelect={selectEnd}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none select-none disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between gap-2">
          {Array.from({ length }).map((_, i) => {
            const char = value[i];
            const isActive = i === activeIndex;
            return (
              <div
                key={i}
                aria-hidden
                className={cn(
                  "flex h-12 w-full items-center justify-center rounded-xl border text-lg font-semibold tabular-nums transition-all",
                  "bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white",
                  invalid
                    ? "border-red-500/60 dark:border-red-500/50"
                    : "border-zinc-200 dark:border-zinc-800",
                  isActive && !invalid && "border-zinc-950 dark:border-white ring-2 ring-zinc-950/10 dark:ring-white/20",
                  disabled && "opacity-50",
                )}
              >
                {char ? (
                  char
                ) : isActive ? (
                  <span className="h-5 w-px animate-pulse bg-zinc-950 dark:bg-white" />
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
