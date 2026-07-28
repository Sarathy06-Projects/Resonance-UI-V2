import type { NextConfig } from "next";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:4000";

const nextConfig: NextConfig = {
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
