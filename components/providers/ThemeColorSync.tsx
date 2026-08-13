"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

// Keeps <meta name="theme-color"> in step with the chosen theme.
//
// The static value in app/layout.tsx's viewport export can only describe one
// theme, and next-themes switches by toggling a class rather than by
// prefers-color-scheme - so a media-matched themeColor would follow the OS
// setting, not the user's actual choice. Without this, switching to dark
// leaves the mobile browser's address bar and status area white above a dark
// app, which reads as a rendering bug rather than a theme.
const THEME_COLORS = {
  // zinc-950 / white - the same values app/globals.css paints the body with.
  dark: "#09090b",
  light: "#ffffff",
} as const;

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;

    // Update every tag, not just the first: Next renders one from the
    // viewport export, and leaving a stale duplicate behind would let the
    // browser pick the wrong one.
    const existing = document.querySelectorAll('meta[name="theme-color"]');
    if (existing.length === 0) {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", color);
      document.head.appendChild(meta);
      return;
    }
    existing.forEach((meta) => meta.setAttribute("content", color));
  }, [resolvedTheme]);

  return null;
}
