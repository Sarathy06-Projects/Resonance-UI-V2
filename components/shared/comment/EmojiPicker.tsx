"use client";

import { cn } from "@/lib/utils";

// Curated grid, not a full unicode picker - keeps this composer feature
// dependency-free instead of pulling in a large emoji-mart-style bundle.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀", "😂", "🥰", "😅", "😊", "😍", "🤔", "😢", "😮", "😡", "🥳", "😴"] },
  { label: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "👀", "🔥", "💯", "✨"] },
  { label: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💖", "💕", "😘"] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  return (
    <div
      role="menu"
      aria-label="Emoji picker"
      className={cn(
        "max-h-56 w-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
    >
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="mb-2 last:mb-0">
          <div className="mb-1 px-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">{group.label}</div>
          <div className="grid grid-cols-6 gap-0.5">
            {group.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(emoji);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
