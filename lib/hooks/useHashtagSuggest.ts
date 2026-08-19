"use client";

import { useCallback, useState, type RefObject } from "react";
import { useHashtagSearch, findHashtagQuery } from "./useHashtagSearch";
import type { HashtagStat } from "@/lib/api/types";

interface UseHashtagSuggestOptions {
  value: string;
  onChange: (next: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * Everything a plain textarea needs to offer `#tag` suggestions: caret
 * tracking, the debounced lookup, keyboard navigation and insertion.
 *
 * A hook rather than copied blocks because both post composers - the inline
 * one on the feed and the sheet - need identical behaviour, and autocomplete
 * is the kind of thing that silently diverges when duplicated. CommentInput
 * keeps its own inline handling for @mentions; comments deliberately do not
 * get tag suggestions.
 *
 * Spread `handleChange` and `handleKeyDown` onto the textarea, render
 * <HashtagAutocomplete> inside a `relative` parent when `isOpen`.
 */
export function useHashtagSuggest({ value, onChange, textareaRef }: UseHashtagSuggestOptions) {
  const [token, setToken] = useState<{ start: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { results } = useHashtagSearch(token?.query ?? "");
  const isOpen = token !== null && results.length > 0;

  const apply = useCallback(
    (tag: HashtagStat) => {
      if (!token) return;
      const el = textareaRef.current;
      const before = value.slice(0, token.start);
      // Slice from the live caret, not from the recorded token length - the
      // caret is authoritative if anything shifted between keystroke and click.
      const after = value.slice(el?.selectionStart ?? token.start + token.query.length + 1);
      // Trailing space so the next word does not run into the tag and extend
      // it, which is the usual way an autocompleted tag ends up wrong.
      const next = `${before}${tag.tag} ${after}`;
      onChange(next);
      setToken(null);
      requestAnimationFrame(() => {
        const pos = before.length + tag.tag.length + 1;
        el?.focus();
        el?.setSelectionRange(pos, pos);
      });
    },
    [token, value, onChange, textareaRef]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setToken(findHashtagQuery(e.target.value, e.target.selectionStart));
      setActiveIndex(0);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
        return true;
      }
      // Tab and Enter both accept. Enter is the reflex; Tab is what people who
      // use autocomplete a lot reach for, and leaving it to insert a tab
      // character inside a composer helps nobody.
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        apply(results[activeIndex]);
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setToken(null);
        return true;
      }
      return false;
    },
    [isOpen, results, activeIndex, apply]
  );

  // The list is dismissed on blur, but only after a tick, so a mousedown on a
  // suggestion still lands.
  const handleBlur = useCallback(() => {
    setTimeout(() => setToken(null), 120);
  }, []);

  return { results, activeIndex, setActiveIndex, isOpen, apply, handleChange, handleKeyDown, handleBlur };
}
