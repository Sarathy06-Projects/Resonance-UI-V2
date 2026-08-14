"use client";

import { useEffect, useState } from "react";
// lucide dropped brand glyphs, so these are generic stand-ins - the label
// under each circle is what identifies the target, not the icon.
import { Link2, Share2, Sparkles, Check, MessageCircle, Send, Mail, Briefcase, Users, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  WEB_SHARE_TARGETS,
  absoluteUrl,
  canNativeShare,
  canShareFiles,
  copyToClipboard,
  shareStoryImage,
  storyImageUrl,
  type ShareContent,
} from "@/lib/share";
import { getOrCreateShortCode } from "@/lib/api/posts";
import {
  blobToBase64,
  canShareToInstagram,
  isNative,
  shareStoryToSystemSheet,
  shareToInstagramStory,
} from "@/lib/native";

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ShareContent;
  /** Post id, when the thing being shared is a post. Used to swap in the
   *  short /p/:code link, which is what makes the URL printed on a story card
   *  short enough to read and retype. Articles have no short link yet, so
   *  they share their canonical URL. */
  postId?: string;
}

const TARGET_ICONS: Record<string, typeof Link2> = {
  whatsapp: MessageCircle,
  x: Share2,
  telegram: Send,
  linkedin: Briefcase,
  facebook: Users,
  email: Mail,
};

export function ShareSheet({ open, onOpenChange, content: canonical, postId }: ShareSheetProps) {
  // Starts as the canonical URL and upgrades to the short one once it
  // resolves. Sharing must never be blocked on that request - a slow or
  // failed short-link lookup silently leaves the full URL in place, which
  // works perfectly well, just longer.
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const content: ShareContent = shortUrl ? { ...canonical, url: shortUrl } : canonical;
  const [copied, setCopied] = useState(false);
  const [storyState, setStoryState] = useState<"idle" | "working" | "shared" | "unsupported" | "failed">("idle");
  // Capability checks have to run after mount: navigator doesn't exist during
  // SSR, and rendering a different set of buttons on the server than the
  // client would hydrate mismatched. `instagram` is the same kind of check,
  // one layer down - inside the Android app we can ask the OS whether
  // Instagram is actually installed, which no browser can answer.
  const [caps, setCaps] = useState({ native: false, files: false, inApp: false, instagram: false });

  useEffect(() => {
    const probe = new File([new Blob([""], { type: "image/png" })], "probe.png", { type: "image/png" });
    const inApp = isNative();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser capability (an external system) once on mount; it can't be computed during render because navigator doesn't exist during SSR
    setCaps({ native: canNativeShare(), files: canShareFiles([probe]), inApp, instagram: false });

    if (!inApp) return;
    let cancelled = false;
    void canShareToInstagram().then((available) => {
      if (!cancelled) setCaps((prev) => ({ ...prev, instagram: available }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    getOrCreateShortCode(postId)
      .then(({ shortCode }) => {
        if (!cancelled) setShortUrl(absoluteUrl(`/p/${shortCode}`));
      })
      .catch(() => {
        // Keep the canonical URL. A share that works with a long link beats
        // an error, and the caller never has to know this failed.
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // No reset-on-open effect: callers mount this only while it's open (which
  // is also what keeps the Dialog primitive out of the feed's bundle), so
  // every open starts from fresh initial state already.

  // Auto-dismiss the "Copied" confirmation rather than leaving it stuck on.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = async () => {
    setCopied(await copyToClipboard(content.url));
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: content.title, text: content.text, url: content.url });
      onOpenChange(false);
    } catch {
      // Dismissing the OS sheet rejects; nothing to report.
    }
  };

  const handleStory = async () => {
    setStoryState("working");
    // Copy the link as part of the same action. A shared Instagram story
    // can't carry a tappable link - only Instagram's own link sticker can,
    // added by the poster - so having the URL already on the clipboard is
    // what makes that possible without hunting for it.
    await copyToClipboard(content.url);

    // Inside the Android app, the same card goes to Instagram's story
    // composer directly rather than through the OS sheet. Two taps become
    // none: no "share with" list to pick Instagram from, no "Feed / Story"
    // choice afterwards. The web path below is unchanged and is still what
    // every browser gets.
    const result = isNative() ? await shareStoryNatively() : await shareStoryImage(content);

    if (result === "cancelled") {
      setStoryState("idle");
      return;
    }
    // Deliberately does *not* close on success. The story itself can't carry
    // a tappable link - only Instagram's link sticker can, and only the
    // person posting can add it - so closing here would hand off the image
    // and leave the destination silently lost. Staying open to show the
    // three-step instruction is the whole difference between a story that
    // leads back here and one that doesn't.
    setStoryState(result);
  };

  /** The Android path: fetch the card, hand it straight to Instagram. */
  const shareStoryNatively = async (): Promise<"shared" | "cancelled" | "unsupported" | "failed"> => {
    let base64: string;
    try {
      const res = await fetch(storyImageUrl(content.url));
      if (!res.ok) return "failed";
      base64 = await blobToBase64(await res.blob());
    } catch {
      return "failed";
    }

    if (caps.instagram) {
      const result = await shareToInstagramStory(base64, content.url);
      if (result?.shared) return "shared";
      // Instagram was there a moment ago but couldn't take it. Fall through
      // to the system sheet rather than dead-ending.
    }

    // No Instagram installed, or it refused the intent: the Android share
    // sheet still reaches WhatsApp status, Telegram, Files and the rest.
    const fallback = await shareStoryToSystemSheet(base64, `${content.title}\n${content.url}`);
    if (fallback?.shared) return "shared";
    return fallback === null ? "unsupported" : "failed";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 pb-[max(1.5rem,var(--safe-bottom))]">
        <SheetHeader className="px-2 pb-3">
          <SheetTitle>Share</SheetTitle>
        </SheetHeader>

        {/* Primary row, Threads-style: a horizontally scrolling rail of round
            targets. Copy link leads because it's the one action that always
            works, on every browser, with no app installed. */}
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar rail-x">
          <CircleAction
            label={copied ? "Copied" : "Copy link"}
            icon={copied ? Check : Link2}
            onClick={handleCopy}
            highlight={copied}
          />

          {/* caps.inApp is an independent gate, not a duplicate of caps.files:
              the Android WebView reports navigator.canShare({files}) as false
              even though the shell can hand a file to any app on the device,
              so keying only off `files` would hide this exactly where it
              works best. Label names the real destination when we know
              Instagram is installed - it is one tap to the story composer
              there, not a share sheet to choose from. */}
          {(caps.files || caps.inApp) && (
            <CircleAction
              label={caps.instagram ? "Instagram story" : "Add to story"}
              icon={storyState === "working" ? Loader2 : Sparkles}
              spinning={storyState === "working"}
              onClick={handleStory}
            />
          )}

          {caps.native && <CircleAction label="More" icon={Share2} onClick={handleNativeShare} />}

          {WEB_SHARE_TARGETS.map((target) => {
            const Icon = TARGET_ICONS[target.id] ?? Share2;
            return (
              <CircleAction
                key={target.id}
                label={target.label}
                icon={Icon}
                href={target.href(content)}
                onClick={() => onOpenChange(false)}
              />
            );
          })}
        </div>

        {/* The step that makes a shared story lead anywhere. Instagram only
            renders a tappable link if the poster adds a link sticker, so this
            spells out where it is - the link is already on the clipboard,
            waiting to be pasted into it. */}
        {storyState === "shared" && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-blue-900 dark:text-blue-200">
              <Check className="h-4 w-4 shrink-0" />
              Link copied — one more step to make it tappable
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-blue-900/80 dark:text-blue-200/70">
              <li>In Instagram, tap the sticker icon at the top</li>
              <li>Choose <span className="font-semibold">Link</span></li>
              <li>Paste, then place it over the card</li>
            </ol>
          </div>
        )}

        {storyState === "unsupported" && (
          <p className="mt-3 px-2 text-[13px] text-zinc-500 dark:text-zinc-400">
            This browser can&apos;t hand images to other apps. The link is copied — paste it wherever you like.
          </p>
        )}
        {storyState === "failed" && (
          <p role="alert" className="mt-3 px-2 text-[13px] text-red-600 dark:text-red-400">
            Couldn&apos;t build the story image. The link is copied instead.
          </p>
        )}

        {/* The URL, visible and selectable. Worth the row: it's the fallback
            when every share target above is the wrong one. */}
        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-zinc-200 px-3 py-3 text-left transition-colors active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-800"
        >
          <Link2 className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="min-w-0 flex-1 truncate text-[14px] text-zinc-600 dark:text-zinc-300">{content.url}</span>
          <span className="shrink-0 text-[13px] font-semibold text-blue-600 dark:text-blue-400">
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </SheetContent>
    </Sheet>
  );
}

interface CircleActionProps {
  label: string;
  icon: typeof Link2;
  onClick?: () => void;
  href?: string;
  highlight?: boolean;
  spinning?: boolean;
}

function CircleAction({ label, icon: Icon, onClick, href, highlight, spinning }: CircleActionProps) {
  const inner = (
    <>
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
          highlight
            ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        )}
      >
        <Icon className={cn("h-6 w-6", spinning && "animate-spin")} />
      </span>
      <span className="w-[72px] text-center text-[12px] leading-tight text-zinc-600 dark:text-zinc-400">{label}</span>
    </>
  );

  const className = "flex w-[72px] shrink-0 flex-col items-center gap-2 transition-transform active:scale-90";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
