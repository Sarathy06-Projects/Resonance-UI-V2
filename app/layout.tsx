import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeColorSync } from "@/components/providers/ThemeColorSync";
import { SessionSync } from "@/components/providers/SessionSync";
import { InstallPrompt } from "@/components/providers/InstallPrompt";
import { NativeShell } from "@/components/providers/NativeShell";
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

// viewportFit: "cover" is what makes env(safe-area-inset-*) resolve to real
// non-zero values on notched/gesture-bar devices. Without it those insets are
// always 0, so the mobile tab bar and compose sheet render flush under the
// home indicator no matter what padding they ask for.
export const viewport: Viewport = {
  // Matches the default (light) theme, so the browser's own chrome agrees
  // with the page on first paint. next-themes toggles a class rather than
  // prefers-color-scheme, so this can't be media-matched to the *chosen*
  // theme - ThemeColorSync updates it live when someone switches.
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Shrink the layout viewport when the software keyboard opens, instead of
  // leaving it full-height and only shrinking the visual viewport.
  //
  // The default, resizes-visual, is why anything pinned to the bottom of a
  // `fixed inset-0` panel disappears behind the keyboard: `inset-0` is the
  // *layout* viewport, which the keyboard does not touch. The compose sheet's
  // toolbar - carrying the only control for attaching an image - sat under the
  // keyboard for the entire time someone was typing, which is exactly when
  // they would reach for it.
  //
  // resizes-content makes the bottom edge mean the top of the keyboard, so
  // bottom-anchored chrome stays reachable with no JS. Chrome 108+ and Safari
  // 17.4+; older browsers ignore it and get the visualViewport fallback in
  // ComposeSheet.
  interactiveWidget: "resizes-content",
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
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ThemeColorSync />
          <SessionSync />
          {/* Inert in a browser - see components/providers/NativeShell.tsx.
              Inside the Android shell it owns the back button, deep links,
              push registration, the splash handoff and status bar colour. */}
          <NativeShell />
          {children}
          <InstallPrompt />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
