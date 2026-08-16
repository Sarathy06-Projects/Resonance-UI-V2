import { getSiteUrl } from "@/lib/siteUrl";

/**
 * The Resonance wordmark, for cards rasterised by Satori (next/og).
 *
 * Satori can't reach into the component tree the app renders - it draws a
 * standalone document - so the shared <Wordmark> component is no use here and
 * the artwork has to be inlined as a data URI instead.
 */

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  // Chunked: spreading a hundred-KB array into String.fromCharCode in one
  // call blows the argument limit and throws.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// Per-instance memo. These cards are re-rendered on every crawler hit, and the
// artwork never changes between them. `null` is cached too - one failed fetch
// shouldn't make every later render retry a URL that isn't working.
const cache = new Map<string, Promise<string | null>>();

/**
 * `variant` follows the *card's* surface, not the reader's theme: a card is a
 * flat image with a background baked in, so the dark cards take the dark
 * artwork and the white share card takes the light one.
 *
 * Fetched over HTTP rather than read off disk because `public/` ships to the
 * CDN, not into the function bundle - `fs` reads of it are not reliably
 * available at runtime. Pass `origin` where the request already provides one
 * (the edge share-image route); otherwise the configured site URL is used.
 *
 * Returns null rather than throwing, so a brand asset that fails to load
 * degrades to the text lockup instead of failing the whole card.
 */
export function loadWordmark(variant: "light" | "dark", origin?: string): Promise<string | null> {
  const base = origin ?? getSiteUrl();
  const url = `${base}/logo-wordmark-${variant}.png`;

  let hit = cache.get(url);
  if (!hit) {
    hit = (async () => {
      try {
        // Fetched raw rather than through /_next/image: the optimizer answers
        // with WebP unless talked out of it, and Satori has no WebP decoder -
        // it would draw an empty box instead of erroring.
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return null;
        return `data:image/png;base64,${toBase64(await res.arrayBuffer())}`;
      } catch {
        return null;
      }
    })();
    cache.set(url, hit);
  }
  return hit;
}

/** Aspect ratio of public/logo-wordmark-*.png - both variants share one box. */
const WORDMARK_ASPECT = 1018 / 220;

/**
 * Renders the wordmark, falling back to the typographic lockup these cards
 * used before the artwork existed if it couldn't be loaded.
 */
export function Wordmark({
  src,
  height,
  color,
}: {
  src: string | null;
  height: number;
  /** Fallback text colour, used only when `src` is null. */
  color: string;
}) {
  if (!src) {
    return (
      <div
        style={{
          display: "flex",
          fontSize: Math.round(height * 0.7),
          fontWeight: 700,
          letterSpacing: 3,
          color,
        }}
      >
        RESONANCE
      </div>
    );
  }

  const width = Math.round(height * WORDMARK_ASPECT);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Satori renders to a static PNG; next/image has no meaning here
    <img src={src} alt="Resonance" width={width} height={height} style={{ width, height }} />
  );
}
