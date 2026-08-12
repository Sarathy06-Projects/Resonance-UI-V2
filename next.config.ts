import type { NextConfig } from "next";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:4000";

const nextConfig: NextConfig = {
  experimental: {
    // Turbopack's persistent on-disk dev cache is known to corrupt on
    // long-running sessions (Windows especially) - symptom is every route
    // except "/" silently 404ing at the framework level while the server
    // still prints "Ready". Disabling it trades a little rebuild speed for
    // not needing a `rm -rf .next` + restart to recover mid-session.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.resonance.org.in" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Proxies backend calls through this app's own domain. The backend lives
  // on a different domain (Render) than the frontend (Vercel), and browsers
  // never send a cookie scoped to one domain to a fetch() targeting another
  // - `credentials: "include"` only forwards a cookie the browser already
  // has for the *target* origin, it can't bypass that boundary. Routing
  // through a same-origin rewrite means the browser only ever talks to its
  // own domain, so the session cookie is attached normally, and Vercel's
  // edge forwards it (and the request) server-side to the real backend.
  async rewrites() {
    return [
      { source: "/proxy/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
      { source: "/proxy/uploads/:path*", destination: `${BACKEND_ORIGIN}/uploads/:path*` },
    ];
  },
  // Permanent - real external backlinks and search-engine-cached URLs point
  // at /profile/:username indefinitely. Not a temporary migration shim, so
  // never remove this even once nothing internal links here anymore.
  // (/article/:id, /post/:id, /series/:id redirect too, but those need a DB
  // lookup to resolve to a slug - handled by route.ts handlers at those
  // paths instead, since redirects() only supports static/pattern
  // destinations.)
  async redirects() {
    return [
      { source: "/profile/:username", destination: "/@:username", permanent: true },
      // Routes to the exact content the old page showed (least surprise) -
      // /topics/:tag itself is the new, broader hub page, not an alias.
      { source: "/hashtag/:tag", destination: "/topics/:tag/discussions", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
