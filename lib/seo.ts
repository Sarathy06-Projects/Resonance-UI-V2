import { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design";

export function constructMetadata({
  title = "Resonance - Design Community",
  description = "A modern design community platform where designers share ideas, validate concepts, and discuss design.",
  image = "/og-image.png",
  // Absolute or site-relative (e.g. "/@alex/slug") - always resolved
  // against siteUrl below. Pass the canonical path built from route params,
  // never recovered from the incoming request URL (which, for content
  // under /@username/..., is the post-proxy.ts-rewrite /u/... path, not
  // the public-facing one).
  canonical,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      title,
      description,
      images: [{ url: image }],
      type: "website",
      url: canonical ?? siteUrl,
      siteName: "Resonance",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@ResonanceDesign",
    },
    metadataBase: new URL(siteUrl),
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Resonance",
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
