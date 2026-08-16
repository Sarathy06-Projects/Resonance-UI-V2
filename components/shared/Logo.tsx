import Image from "next/image";
import { cn } from "@/lib/utils";

// Intrinsic proportions of the exported brand art in public/. Both lockups are
// sized by height and let width follow - the mark is a touch taller than it is
// wide, and the wordmark is a long horizontal lockup, so height is the only
// dimension that stays meaningful across the places each one is used.
const MARK_ASPECT = 205 / 220;
const WORDMARK_ASPECT = 1018 / 220;

interface LogoProps {
  /** Rendered height in px; width follows the artwork's aspect ratio. */
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Both themes ship as separate artwork - the wordmark's type and its tallest
 * bar invert between them, which no CSS filter reproduces faithfully.
 *
 * Both files are rendered and swapped by the `dark` class rather than read off
 * the resolved theme in JS: next-themes only knows the real theme after mount,
 * so branching in React would either mismatch during hydration or blink the
 * wrong logo on first paint. A CSS swap is correct in the server HTML, and the
 * two files together cost a few kB once optimised at these sizes. Exactly one
 * is ever `display: block`, so screen readers only ever see a single copy.
 */
function ThemedLockup({
  light,
  dark,
  aspect,
  size,
  className,
  priority = true,
}: { light: string; dark: string; aspect: number } & LogoProps) {
  const height = size ?? 32;
  const width = Math.round(height * aspect);
  // Explicitly `block` so the visible copy lays out identically in both
  // themes - the dark one has to be `dark:block` to beat its own `hidden`,
  // and an inline light counterpart would ignore centring like `mx-auto`.
  const shared = "block shrink-0 select-none";

  return (
    <>
      <Image
        src={light}
        alt="Resonance"
        width={width}
        height={height}
        priority={priority}
        className={cn(shared, "dark:hidden", className)}
      />
      <Image
        src={dark}
        alt="Resonance"
        width={width}
        height={height}
        priority={priority}
        className={cn(shared, "hidden dark:block", className)}
      />
    </>
  );
}

/**
 * The bar mark on its own. For square or narrow slots - the desktop rail, the
 * auth modal - where the full lockup would have to shrink to fit its width.
 */
export function Logo({ size = 32, className, priority }: LogoProps) {
  return (
    <ThemedLockup
      light="/logo-mark-light.png"
      dark="/logo-mark-dark.png"
      aspect={MARK_ASPECT}
      size={size}
      className={className}
      priority={priority}
    />
  );
}

/**
 * Mark plus "Resonance". Use wherever the brand needs to be named - it already
 * carries the word, so it replaces (never sits beside) a text label.
 */
export function Wordmark({ size = 30, className, priority }: LogoProps) {
  return (
    <ThemedLockup
      light="/logo-wordmark-light.png"
      dark="/logo-wordmark-dark.png"
      aspect={WORDMARK_ASPECT}
      size={size}
      className={className}
      priority={priority}
    />
  );
}
