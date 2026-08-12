import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";
import { SITEMAP_IDS } from "./sitemap";

// AI-training crawlers, explicitly disallowed per product policy (search
// engines: allow; AI training: do not allow). Kept as separate userAgent
// blocks below the general "*" rule - Googlebot/Bingbot match "*" and are
// unaffected, since a bot only follows the rule for its own exact
// User-agent when one is present, never the general one too.
const AI_TRAINING_CRAWLERS = ["GPTBot", "CCBot", "Google-Extended", "ClaudeBot", "anthropic-ai", "Bytespider", "Diffbot", "cohere-ai"];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/explore",
          "/@*",
          "/topics/*",
          // Legacy URLs - all permanently redirect (308) to /@username/...
          // now, but must stay crawlable so Googlebot can actually follow
          // the redirect and consolidate its index, rather than orphaning
          // whatever already points at the old URL.
          "/article/*",
          "/profile/*",
          "/post/*",
          "/series/*",
          "/hashtag/*",
        ],
        disallow: [
          "/settings",
          "/notifications",
          "/drafts",
          "/collections",
          "/create",
          "/login",
          "/signup",
          "/reset-password",
          "/create-password",
          "/onboarding",
          // No standalone /search route exists - search lives inline on
          // /explore (client-side, no query-param results URL), so there's
          // nothing here to disallow. If a dedicated /search page is ever
          // added, it belongs in this list (Part 10 of the SEO spec).
          "/api/*",
          // /u/* is the internal route tree proxy.ts rewrites /@username/...
          // onto - never linked anywhere (every internal link and every
          // generateMetadata canonical points at /@username/... instead),
          // but still directly reachable if requested. Disallowed here as
          // defense-in-depth against duplicate-content crawling on top of
          // the canonical tag already pointing every /u/* page back at its
          // real /@username/... URL.
          "/u/*",
        ],
      },
      ...AI_TRAINING_CRAWLERS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    // No single /sitemap.xml index exists - app/sitemap.ts uses
    // generateSitemaps() to split by content type, which Next.js serves as
    // one file per id (/sitemap/0.xml, /sitemap/1.xml, ...) with no
    // auto-generated index route. List every one explicitly instead -
    // Robots.sitemap accepts string[], and every crawler that matters here
    // (Google, Bing) supports multiple Sitemap: lines.
    sitemap: SITEMAP_IDS.map((_, id) => `${siteUrl}/sitemap/${id}.xml`),
  };
}
