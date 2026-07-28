import { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design";

export function constructMetadata({
  title = "Resonance - Design Community",
  description = "A modern design community platform where designers share ideas, validate concepts, and discuss design.",
  image = "/og-image.png",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image }],
      type: "website",
      url: siteUrl,
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
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
