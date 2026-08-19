"use client";

import { useCallback, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommentDraft } from "@/lib/hooks/useCommentDraft";
import { useMentionSearch } from "@/lib/hooks/useMentionSearch";
import { MentionAutocomplete } from "@/components/shared/comment/MentionAutocomplete";
import { EmojiPicker } from "@/components/shared/comment/EmojiPicker";
import { cn } from "@/lib/utils";
import { Smile } from "lucide-react";
import type { Author } from "@/lib/api/types";

const MAX_LENGTH = 3000;
const WARN_THRESHOLD = 200; // start showing the counter once this close to the limit

interface CommentInputProps {
  targetType: "post" | "article";
  targetId: string;
  parentId?: string | null;
  onSubmit: (content: string) => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  initialContent?: string;
  submitLabel?: string;
  isEdit?: boolean;
}

function findMentionQuery(value: string, cursor: number): { start: number; query: string } | null {
  const uptoCursor = value.slice(0, cursor);
  const match = uptoCursor.match(/(?:^|\s)@([a-zA-Z0-9_]{0,30})$/);
  if (!match) return null;
  const query = match[1];
  const start = cursor - query.length - 1;
  return { start, query };
}

export function CommentInput({
  targetType,
  targetId,
  parentId = null,
  onSubmit,
  onCancel,
  placeholder = "Post your reply",
  autoFocus = false,
  initialContent,
  submitLabel = "Reply",
  isEdit = false,
}: CommentInputProps) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const draft = useCommentDraft(targetType, targetId, isEdit ? `edit:${parentId ?? "root"}` : parentId);
  const [localContent, setLocalContent] = useState(initialContent ?? "");
  const content = isEdit ? localContent : draft.content;
  const setContent = isEdit ? setLocalContent : draft.setContent;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  const { results: mentionResults } = useMentionSearch(mention?.query ?? "");

  const remaining = MAX_LENGTH - content.length;
  const overLimit = remaining < 0;

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    const trimmed = content.trim();
    if (!trimmed || overLimit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent("");
      if (!isEdit) draft.clear();
    } catch {
      // Leave the draft content in place so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, openAuthModal, content, overLimit, isSubmitting, onSubmit, setContent, isEdit, draft]);

  const applyMention = useCallback(
    (author: Author) => {
      if (!mention || !author.username) return;
      const el = textareaRef.current;
      const before = content.slice(0, mention.start);
      const after = content.slice(el?.selectionStart ?? mention.start + mention.query.length + 1);
      const next = `${before}@${author.username} ${after}`;
      setContent(next);
      setMention(null);
      requestAnimationFrame(() => {
        const pos = before.length + author.username!.length + 2;
        el?.focus();
        el?.setSelectionRange(pos, pos);
      });
    },
    [mention, content, setContent]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    const cursor = e.target.selectionStart;
    const found = findMentionQuery(value, cursor);
    setMention(found);
    setActiveMentionIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && mentionResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMentionIndex((i) => (i + 1) % mentionResults.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(mentionResults[activeMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
      return;
    }
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="flex gap-4 p-4">
      <Avatar className="h-10 w-10 border border-zinc-100 dark:border-zinc-800">
        {isAuthenticated && user ? (
          <AvatarImage src={user.avatar} />
        ) : (
          <AvatarFallback className="bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">?</AvatarFallback>
        )}
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            aria-label={isEdit ? "Edit comment" : placeholder}
            // 16px on mobile: anything smaller and iOS Safari zooms the page
            // in on focus and never zooms back out, which on a nested reply
            // leaves the thread scrolled sideways.
            className="field-sizing-content min-h-[40px] w-full resize-none bg-transparent pt-2 text-[16px] outline-none placeholder:text-zinc-500 sm:text-[15px] dark:text-zinc-100"
            onClick={() => {
              if (!isAuthenticated) openAuthModal();
            }}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setMention(null), 120)}
            autoFocus={autoFocus}
            maxLength={MAX_LENGTH + 200}
          />

          {mention && mentionResults.length > 0 && (
            <MentionAutocomplete
              results={mentionResults}
              activeIndex={activeMentionIndex}
              onHover={setActiveMentionIndex}
              onSelect={applyMention}
            />
          )}

          {showEmoji && (
            <div className="absolute bottom-full left-0 z-30 mb-1">
              <EmojiPicker onSelect={insertEmoji} />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={showEmoji ? "Close emoji picker" : "Insert emoji"}
              onClick={() => setShowEmoji((v) => !v)}
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <Smile className="h-4 w-4" />
            </button>
            {/* The eye/pencil preview toggle used to sit here. It was a
                markdown preview, but next to a composer an eye reads as a
                visibility control - "who can see this" - which comments do not
                have and should not appear to. A preview also earns very little
                on content this short, where the only markup is bold, italic,
                code, mentions and links, all of which are legible as typed. */}
            {remaining <= WARN_THRESHOLD && (
              <span className={cn("ml-1 text-xs tabular-nums", overLimit ? "font-semibold text-red-500" : "text-zinc-400")}>{remaining}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              className="h-9 rounded-full px-6 font-semibold shadow-sm dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={handleSubmit}
              disabled={isSubmitting || overLimit || (!content.trim() && isAuthenticated)}
            >
              {isSubmitting ? "Posting…" : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
