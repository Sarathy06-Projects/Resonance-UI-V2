"use client";

import { ArrowDownUp, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CommentSort } from "@/lib/api/types";

const OPTIONS: { value: CommentSort; label: string }[] = [
  { value: "relevant", label: "Most relevant" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "liked", label: "Most liked" },
];

interface CommentSortMenuProps {
  value: CommentSort;
  onChange: (sort: CommentSort) => void;
}

export function CommentSortMenu({ value, onChange }: CommentSortMenuProps) {
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Sort comments"
        className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <ArrowDownUp className="h-3.5 w-3.5" />
        {current.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl dark:border-zinc-800 dark:bg-zinc-900">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="cursor-pointer justify-between dark:focus:bg-zinc-800 dark:focus:text-zinc-100"
          >
            {option.label}
            {option.value === value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
