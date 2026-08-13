"use client";

import { useEffect, useState } from "react";
// lucide dropped brand glyphs, so these are generic stand-ins - the label
// under each circle is what identifies the target, not the icon.
import { Link2, Share2, Sparkles, Check, MessageCircle, Send, Mail, Briefcase, Users, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  WEB_SHARE_TARGETS,
  canNativeShare,
  canShareFiles,
  copyToClipboard,
  shareStoryImage,
  type ShareContent,
} from "@/lib/share";

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ShareContent;
}

const TARGET_ICONS: Record<string, typeof Link2> = {
  whatsapp: MessageCircle,
  x: Share2,
  telegram: Send,
  linkedin: Briefcase,
  facebook: Users,
  email: Mail,
};

export function ShareSheet({ open, onOpenChange, content }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [storyState, setStoryState] = useState<"idle" | "working" | "shared" | "unsupported" | "failed">("idle");
  // Capability checks have to run after mount: navigator doesn't exist during
  // SSR, and rendering a different set of buttons on the server than the
  // client would hydrate mismatched.
  const [caps, setCaps] = useState({ native: false, files: false });

  useEffect(() => {
    const probe = new File([new Blob([""], { type: "image/png" })], "probe.png", { type: "image/png" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser capability (an external system) once on mount; it can't be computed during render because navigator doesn't exist during SSR
    setCaps({ native: canNativeShare(), files: canShareFiles([probe]) });
  }, []);

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
    // Copy the link as part of the same action. An Instagram story shared
    // from the web can't carry a tappable link - only Instagram's own link
    // sticker can, added by the poster - so having the URL already on the
    // clipboard is what makes that possible without hunting for it.
    await copyToClipboard(content.url);
    const result = await shareStoryImage(content);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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

          {caps.files && (
            <CircleAction
              label="Add to story"
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
