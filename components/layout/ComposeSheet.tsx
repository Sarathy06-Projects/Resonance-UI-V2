"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageAttachButton, ImageAttachmentsGrid } from "@/components/shared/ImageAttachments";
import { HashtagAutocomplete } from "@/components/shared/comment/HashtagAutocomplete";
import { useHashtagSuggest } from "@/lib/hooks/useHashtagSuggest";
import { useKeyboardInset } from "@/lib/hooks/useKeyboardInset";
import { useAuthStore } from "@/store/useAuthStore";
import { createPost } from "@/lib/api/posts";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;

// This used to carry an "Or create something longer" rail of Showcase /
// Feedback / Resource chips. It is gone: CreateTypeDialog now asks
// post-or-article before this sheet opens, so the composer has one job and
// says so. A second set of destinations two thirds of the way down a
// half-written post was a choice offered after the choice had been made.

interface ComposeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted?: () => void;
}

/**
 * The post composer, at every breakpoint.
 *
 * This was MobileComposeSheet and carried `md:hidden`, which meant the desktop
 * rail's compose button opened a dialog that was then hidden by CSS: the
 * backdrop mounted, the sheet did not paint, and the button read as dead. It
 * is one composer now - full-screen on a phone, a centred modal from md up.
 *
 * Full-screen on mobile rather than a partial sheet: the keyboard already
 * takes roughly half the viewport, and an 85vh sheet under it leaves a strip
 * of dead feed visible at the top that invites a mis-tap dismissing a
 * half-written post. On desktop there is no keyboard eating the viewport and
 * no thumb reach to design around, so it behaves like every other dialog.
 */
export function ComposeSheet({ open, onOpenChange, onPosted }: ComposeSheetProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hashtags = useHashtagSuggest({ value: content, onChange: setContent, textareaRef });
  const keyboardInset = useKeyboardInset();

  const trimmed = content.trim();
  const canPost = trimmed.length > 0 && trimmed.length <= MAX_LENGTH && !isPosting;
  const remaining = MAX_LENGTH - content.length;

  // Grow with the content instead of scrolling inside a fixed box - on a
  // phone the sheet owns the whole screen, so the text can just use it.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  useEffect(() => {
    if (!open) return;
    // iOS only raises the keyboard for a focus that happens inside a user
    // gesture or shortly after the element is actually painted - focusing in
    // the same tick as the open transition silently does nothing.
    const id = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [open]);

  const close = () => {
    onOpenChange(false);
    setContent("");
    setImages([]);
    setError(null);
  };

  const handlePost = async () => {
    if (!canPost || !isAuthenticated) return;
    setIsPosting(true);
    setError(null);
    try {
      await createPost({ type: "discussion", content: trimmed, images: images.length ? images : undefined });
      onPosted?.();
      close();
    } catch {
      // Keep the draft on screen - losing typed content to a dropped
      // connection is the worst thing a composer can do.
      setError("Couldn't post. Check your connection and try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-white outline-none dark:bg-zinc-950",
            // Centred, bounded and detached from the edges once there is room
            // for it. max-h + the scroll region below keep a long draft inside
            // the viewport instead of growing the dialog off-screen.
            "md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85vh] md:w-full md:max-w-xl",
            "md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-hidden md:rounded-2xl md:border md:border-zinc-200 md:shadow-2xl dark:md:border-zinc-800",
            // Slides up from the bottom edge on a phone, where it comes from
            // the tab bar; a centred dialog that slid would just look loose.
            "duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
            "md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95 md:data-closed:zoom-out-95 md:data-closed:slide-out-to-bottom-0"
          )}
        >
          {/* Cancel / title / Post - the standard mobile modal contract:
              the commit action is top-right and always reachable with the
              keyboard up, unlike a button pinned below the fold. */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 pt-safe dark:border-zinc-800">
            <button
              type="button"
              onClick={close}
              className="-ml-2 flex h-14 items-center px-2 text-[16px] text-zinc-600 active:opacity-60 dark:text-zinc-300"
            >
              Cancel
            </button>
            <DialogPrimitive.Title className="text-[16px] font-semibold tracking-tight dark:text-white">
              New post
            </DialogPrimitive.Title>
            <button
              type="button"
              onClick={handlePost}
              disabled={!canPost}
              className={cn(
                "-mr-2 flex h-14 items-center gap-1.5 px-2 text-[16px] font-semibold transition-opacity",
                canPost ? "text-blue-600 active:opacity-60 dark:text-blue-400" : "text-zinc-300 dark:text-zinc-600"
              )}
            >
              {isPosting && <Loader2 className="h-4 w-4 animate-spin" />}
              Post
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0 border border-zinc-100 dark:border-zinc-800">
                <AvatarImage src={user?.avatar} alt="" />
                <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800">{user?.name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold dark:text-zinc-100">{user?.name}</div>
                {/* relative so the suggestion list positions against the
                    textarea rather than the sheet. */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={hashtags.handleChange}
                    onKeyDown={hashtags.handleKeyDown}
                    onBlur={hashtags.handleBlur}
                    placeholder="What's on your mind?"
                    rows={1}
                    // 16px minimum: anything smaller and iOS Safari zooms the
                    // whole page in on focus and never zooms back out.
                    className="mt-1 w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                  />

                  {hashtags.isOpen && (
                    <HashtagAutocomplete
                      results={hashtags.results}
                      activeIndex={hashtags.activeIndex}
                      onHover={hashtags.setActiveIndex}
                      onSelect={hashtags.apply}
                    />
                  )}
                </div>

                {images.length > 0 && (
                  <div className="mt-3">
                    <ImageAttachmentsGrid images={images} onChange={setImages} />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

          </div>

          {/* Toolbar, kept above the keyboard.
              The old comment here claimed it already did that. It did not: the
              sheet is `fixed inset-0`, which is the layout viewport, and the
              keyboard shrinks only the visual one - so this bar, holding the
              single control for attaching a photo, sat underneath the keyboard
              for the whole time someone was typing.

              interactive-widget=resizes-content (app/layout.tsx) fixes it
              declaratively where supported. keyboardInset is the fallback for
              browsers that ignore it, and reads 0 wherever the hint worked, so
              the two never double-count. */}
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800"
            style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
          >
            <div className={keyboardInset > 0 ? "" : "pb-safe"}>
              <ImageAttachButton images={images} onChange={setImages} label="Photo" />
            </div>
            <span
              className={cn(
                "px-1 text-[13px] tabular-nums",
                keyboardInset > 0 ? "" : "pb-safe",
                remaining < 0 ? "font-semibold text-red-500" : remaining <= 50 ? "text-amber-500" : "text-zinc-400 dark:text-zinc-600"
              )}
            >
              {remaining <= 50 ? remaining : ""}
            </span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
