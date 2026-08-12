import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design";
  
  return {
    rules: {
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
        "/hashtag/*"
      ],
      disallow: [
        "/settings", 
        "/notifications", 
        "/drafts", 
        "/collections", 
        "/create", 
        "/login", 
        "/signup",
        "/onboarding",
        "/api/*"
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
