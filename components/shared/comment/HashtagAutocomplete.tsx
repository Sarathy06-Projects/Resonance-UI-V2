"use client";

import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/formatCount";
import type { HashtagStat } from "@/lib/api/types";

interface HashtagAutocompleteProps {
  results: HashtagStat[];
  activeIndex: number;
  onSelect: (tag: HashtagStat) => void;
  onHover: (index: number) => void;
}

// "12 posts · 3 articles", dropping whichever side is zero so a tag used only
// in articles does not advertise "0 posts". The count is the whole point of
// the suggestion - it is what tells you whether you are joining an existing
// conversation or inventing a tag nobody follows.
function usageLabel({ postsCount, articlesCount }: HashtagStat): string {
  const parts = [
    postsCount > 0 && `${formatCount(postsCount)} ${postsCount === 1 ? "post" : "posts"}`,
    articlesCount > 0 && `${formatCount(articlesCount)} ${articlesCount === 1 ? "article" : "articles"}`,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : "Not used yet";
}

export function HashtagAutocomplete({ results, activeIndex, onSelect, onHover }: HashtagAutocompleteProps) {
  if (results.length === 0) return null;

  return (
    // Drops *below* the field, unlike MentionAutocomplete which sits above it.
    // That one lives in the comment composer at the foot of a thread, where
    // there is no room underneath. These two live in post composers pinned to
    // the top of the feed card and the top of the compose sheet, so opening
    // upward puts the list off the top of the page - the first and best-ranked
    // suggestion was the one clipped out of view.
    <div
      role="listbox"
      aria-label="Hashtag suggestions"
      // Spans the field on a phone, fixed 18rem from sm up. A fixed width ran
      // off the right of a 390px viewport - not because 18rem is too wide on
      // its own, but because the list anchors to the textarea's left edge,
      // which is already indented past the avatar. Capping the width could not
      // fix that; matching the field's own box does.
      className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg sm:right-auto sm:w-72 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {results.map((tag, i) => (
        <button
          key={tag.tag}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          onMouseEnter={() => onHover(i)}
          // mouseDown, not click: the textarea's blur handler closes the
          // suggestion list, and blur fires before click would.
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(tag);
          }}
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors",
            i === activeIndex ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <Hash className="h-3.5 w-3.5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium text-blue-600 dark:text-blue-400">{tag.tag}</span>
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{usageLabel(tag)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
