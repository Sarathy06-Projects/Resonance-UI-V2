"use client";

// Sharing helpers.
//
// A note on what the web can and cannot do here, because it shapes the whole
// feature: Threads is a native app, so it can hand Instagram a story image
// *and* a destination URL through the instagram-stories:// scheme, which is
// what makes its shared stories tappable. That scheme only accepts a payload
// from native code - a mobile browser cannot drive it. So the closest a web
// app can get is:
//
//   1. navigator.share()            -> the real OS sheet, every installed app
//   2. navigator.share({ files })   -> hands a story-sized image to that same
//                                      sheet, so Instagram / WhatsApp appear
//                                      and the user picks Story / Status
//   3. the destination URL rendered *onto* the image, and copied to the
//      clipboard at the same time, so it can be pasted into a link sticker
//
// Nothing here can make an Instagram story tappable on its own; only the
// person posting it can, via Instagram's own link sticker.

export interface ShareContent {
  /** Absolute, canonical URL of the thing being shared. */
  url: string;
  /** Short title - used as the native sheet's subject line. */
  title: string;
  /** Longer body used by text-based targets (email, SMS, X). */
  text: string;
}

/** Absolute URL for a path, from the browser's own origin. */
export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

/** True once we know the browser can open a native share sheet. */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** True when the browser can put an actual *file* into that sheet, which is
 *  what makes "add to story" possible at all. Android Chrome and iOS Safari
 *  support this; most desktop browsers do not. */
export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Falls through to the legacy path below - clipboard.writeText rejects
    // outright when the document isn't focused or the page isn't secure.
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// Web intent URLs for targets worth reaching directly. These matter most on
// desktop, where navigator.share generally doesn't exist, but they're also a
// deliberate shortcut on mobile: two taps instead of four for the apps people
// actually use.
export interface WebShareTarget {
  id: string;
  label: string;
  href: (c: ShareContent) => string;
}

export const WEB_SHARE_TARGETS: WebShareTarget[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: ({ title, url }) => `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    id: "x",
    label: "X",
    href: ({ title, url }) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: ({ title, url }) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    href: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "email",
    label: "Email",
    href: ({ title, text, url }) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
];

/** URL of the 1080x1920 story card for a piece of content. */
export function storyImageUrl(shareUrl: string): string {
  return `/api/share-image?url=${encodeURIComponent(shareUrl)}`;
}

/**
 * Fetches the story card and hands it to the OS share sheet as a file.
 * Returns why it failed so the caller can fall back rather than fail silently.
 */
export async function shareStoryImage(
  content: ShareContent
): Promise<"shared" | "cancelled" | "unsupported" | "failed"> {
  try {
    const res = await fetch(storyImageUrl(content.url));
    if (!res.ok) return "failed";
    const blob = await res.blob();
    const file = new File([blob], "resonance.png", { type: blob.type || "image/png" });

    if (!canShareFiles([file])) return "unsupported";

    // The URL rides along with the image: some targets keep it as caption
    // text, which is the only way the destination survives the handoff.
    await navigator.share({ files: [file], title: content.title, text: `${content.title}\n${content.url}` });
    return "shared";
  } catch (err) {
    // An AbortError means the user dismissed the OS sheet. Reported
    // separately from success so the caller doesn't tell someone who backed
    // out to go add a link sticker to a story they never posted.
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    return "failed";
  }
}
