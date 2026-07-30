import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Resonance - Design Community",
    short_name: "Resonance",
    description: "A modern design community platform where designers share ideas, validate concepts, and discuss design.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
