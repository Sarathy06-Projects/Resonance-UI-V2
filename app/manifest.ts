import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Resonance - Design Community",
    short_name: "Resonance",
    description: "A modern design community platform where designers share ideas, validate concepts, and discuss design.",
    start_url: "/",
    display: "standalone",
    // The installed-app splash and chrome. Light, matching the default theme
    // a first launch lands on - a dark splash followed by a light app is a
    // visible flash on every cold start.
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
