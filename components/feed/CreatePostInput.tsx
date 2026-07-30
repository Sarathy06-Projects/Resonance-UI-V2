"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Smile, List, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { createPost } from "@/lib/api/posts";
import { ImageAttachButton, ImageAttachmentsGrid } from "@/components/shared/ImageAttachments";
import { ThreadComposer } from "@/components/shared/ThreadComposer";

const placeholders = [
  "Share an idea...",
  "Ask for design feedback...",
  "What are you designing today?",
  "Validate your concept...",
  "Share your latest work...",
  "Start a design discussion...",
  "What inspired you today?"
];

interface CreatePostInputProps {
  onPosted?: () => void;
}

export function CreatePostInput({ onPosted }: CreatePostInputProps) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleInteraction = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openAuthModal();
    }
  };

  const handlePost = async () => {
    if (!isAuthenticated || !user) {
      openAuthModal();
      return;
    }
    if (!content.trim()) return;

    setIsPosting(true);
    try {
      await createPost({ type: "discussion", content: content.trim(), images: images.length ? images : undefined });
      setContent("");
      setImages([]);
      onPosted?.();
    } catch {
      // Leave content in place so the user can retry.
    } finally {
      setIsPosting(false);
    }
  };

  const openThreadComposer = () => {
    if (!isAuthenticated || !user) {
      openAuthModal();
      return;
    }
    setIsThreadOpen(true);
  };

  return (
    <div className={cn(
      "flex gap-4 p-5 rounded-3xl border transition-all duration-300",
      isFocused ? "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm" : "border-transparent bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
    )}>
      <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-800 shrink-0 shadow-sm">
        {isAuthenticated && user ? (
          <AvatarImage src={user.avatar} />
        ) : (
          <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">?</AvatarFallback>
        )}
      </Avatar>

      <div className="flex-1">
        <div className="relative min-h-[60px]">
          <textarea
            placeholder={placeholders[placeholderIndex]}
            className="w-full bg-transparent resize-none outline-none text-[17px] placeholder:text-zinc-500 dark:text-zinc-200 dark:placeholder:text-zinc-500 pt-1.5 transition-all duration-500 ease-in-out z-10 relative"
            onClick={handleInteraction}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {isAuthenticated && (
          <div className="mt-3">
            <ImageAttachmentsGrid images={images} onChange={setImages} />
          </div>
        )}

        <div className={cn("flex items-center justify-between pt-3 mt-1 border-t border-zinc-100 dark:border-zinc-800/60 transition-opacity duration-300", content || isFocused ? "opacity-100" : "opacity-60 hover:opacity-100")}>
          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
            {isAuthenticated ? (
              <ImageAttachButton images={images} onChange={setImages} />
            ) : (
              <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors dark:hover:text-zinc-200" onClick={handleInteraction}>
                <ImageIcon className="w-[18px] h-[18px]" />
              </button>
            )}
            <button
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors dark:hover:text-zinc-200"
              onClick={isAuthenticated ? openThreadComposer : handleInteraction}
              aria-label="Start a thread"
              title="Start a thread"
            >
              <Layers className="w-[18px] h-[18px]" />
            </button>
            <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors dark:hover:text-zinc-200" onClick={handleInteraction}>
              <List className="w-[18px] h-[18px]" />
            </button>
            <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors dark:hover:text-zinc-200" onClick={handleInteraction}>
              <Smile className="w-[18px] h-[18px]" />
            </button>
          </div>

          <Button
            className="rounded-full px-6 font-semibold shadow-sm dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && isAuthenticated)}
          >
            {isPosting ? "Posting..." : "Post"}
          </Button>
        </div>

        <ThreadComposer
          open={isThreadOpen}
          onClose={() => setIsThreadOpen(false)}
          onPosted={() => {
            setIsThreadOpen(false);
            onPosted?.();
          }}
        />
      </div>
    </div>
  );
}
