import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionSync } from "@/components/providers/SessionSync";
import { InstallPrompt } from "@/components/providers/InstallPrompt";
import { Analytics } from "@vercel/analytics/next";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/siteUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({ canonical: "/" });

export const viewport: Viewport = {
  themeColor: "#09090b",
};

// Site-wide brand entity signal - present on every page (not just the
// homepage) since Organization describes the site operator, not a single
// page's content. Only real, verifiable fields: no sameAs (no confirmed
// live social profile to point at - see the SEO audit report), no founder/
// award/rating fields, none of which exist as real data today.
const siteUrl = getSiteUrl();
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Resonance",
  url: siteUrl,
  logo: `${siteUrl}/logo-512.png`,
  description: "A modern design community platform where designers share ideas, validate concepts, and discuss design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans" suppressHydrationWarning>
        <JsonLd id="organization-json-ld" data={organizationJsonLd} />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionSync />
          {children}
          <InstallPrompt />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
