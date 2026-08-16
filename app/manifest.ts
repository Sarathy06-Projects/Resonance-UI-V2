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
    // The two purposes need genuinely different artwork, not one file listed
    // twice. A maskable icon is cropped to whatever shape the launcher uses,
    // so it has to be full-bleed and keep the mark inside the centre 80% -
    // and an icon padded that defensively looks lost on a home screen when
    // nothing crops it. So `any` gets the app's own rounded square with the
    // mark sized to fill it, and `maskable` gets the full-bleed plate.
    icons: [
      { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/logo-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
