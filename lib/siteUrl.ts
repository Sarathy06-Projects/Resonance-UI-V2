// Fails loudly rather than silently falling back to a placeholder domain.
// Every caller here feeds SEO-critical output (canonical tags, sitemap
// URLs, Open Graph, JSON-LD) - a wrong-domain URL served to Google is a
// much worse, much harder to notice failure than a visible error during
// build/render. Never add a `|| "https://..."` fallback back onto this.
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set - refusing to generate canonical/sitemap/OG URLs against a guessed domain."
    );
  }
  return url;
}
