"use client";

import { useRef, useState } from "react";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadPostImage } from "@/lib/api/uploads";

interface ImageAttachmentsProps {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

// The composer's "attach image" button - handles the file picker + upload,
// leaves rendering the resulting grid to ImageAttachmentsGrid so callers can
// place the button and the preview grid separately in their layout.
export function ImageAttachButton({ images, onChange, max = 4 }: ImageAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const remaining = max - images.length;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    e.target.value = "";
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadPostImage(file)));
      onChange([...images, ...uploaded.map((u) => u.url)]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
        disabled={remaining <= 0}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={remaining <= 0 || isUploading}
        aria-label="Add image"
        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isUploading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <ImagePlus className="w-[18px] h-[18px]" />}
      </button>
    </>
  );
}

// Composer preview: a single image fills the width; 2+ images become a
// horizontally-scrollable strip of thumbnails (each individually removable)
// so it matches how PostImageGrid will actually display them once posted,
// rather than a photo-grid that doesn't reflect the published layout.
export function ImageAttachmentsGrid({ images, onChange }: ImageAttachmentsProps) {
  if (images.length === 0) return null;

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  if (images.length === 1) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" className="w-full h-auto max-h-[400px] object-cover" />
        <button
          type="button"
          onClick={() => remove(0)}
          aria-label="Remove image"
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {images.map((src, idx) => (
        <div
          key={src + idx}
          className="relative shrink-0 w-32 aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => remove(idx)}
            aria-label="Remove image"
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Read-only, for rendering a published post/article's attached images.
// Instagram-style: a single image just fills the width; 2+ images become a
// horizontally-swipeable, scroll-snapped carousel (one image per screen at a
// time) with dot indicators tracking the current slide - instead of a photo
// grid, which forces every image into a small, cramped tile.
export function PostImageGrid({ images }: { images: string[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" loading="lazy" className="w-full h-auto object-cover max-h-[400px]" />
      </div>
    );
  }

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-2xl border border-zinc-100 dark:border-zinc-800/60"
      >
        {images.map((src, idx) => (
          <div
            key={src + idx}
            className="relative shrink-0 basis-full snap-center aspect-[4/5] max-h-[550px] bg-zinc-100 dark:bg-zinc-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
        {activeIndex + 1}/{images.length}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-2">
        {images.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1.5 rounded-full transition-all",
              idx === activeIndex ? "w-4 bg-zinc-900 dark:bg-white" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
            )}
          />
        ))}
      </div>
    </div>
  );
}
