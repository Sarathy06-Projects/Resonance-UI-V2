"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Author } from "@/lib/api/types";

interface MentionAutocompleteProps {
  results: Author[];
  activeIndex: number;
  onSelect: (author: Author) => void;
  onHover: (index: number) => void;
}

export function MentionAutocomplete({ results, activeIndex, onSelect, onHover }: MentionAutocompleteProps) {
  if (results.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className="absolute bottom-full left-0 z-30 mb-1 max-h-64 w-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
    >
      {results.map((author, i) => (
        <button
          key={author.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(author);
          }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
            i === activeIndex ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          )}
        >
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={author.image ?? undefined} />
            <AvatarFallback className="text-[10px] dark:bg-zinc-800 dark:text-zinc-300">{author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium dark:text-zinc-100">{author.name}</span>
            <span className="truncate text-xs text-zinc-500">@{author.username}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
