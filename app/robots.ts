import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design";
  
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/", 
        "/explore", 
        "/article/*", 
        "/profile/*", 
        "/post/*", 
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
