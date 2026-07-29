"use client";

import { useCallback, useEffect, useState } from "react";

function draftKey(targetType: string, targetId: string, parentId?: string | null): string {
  return `resonance:comment-draft:${targetType}:${targetId}:${parentId ?? "root"}`;
}

function readDraft(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

// localStorage-backed autosave for the comment composer, keyed per
// target+parent so a reply draft and a top-level draft on the same post
// don't clobber each other, and a draft survives an accidental navigation.
// targetType/targetId/parentId are identity props for a given composer
// instance (a new target means a fresh mounted component), so the initial
// value only needs to be read once via a lazy initializer - no load effect.
export function useCommentDraft(targetType: "post" | "article", targetId: string, parentId?: string | null) {
  const key = draftKey(targetType, targetId, parentId);
  const [content, setContent] = useState(() => readDraft(key));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      if (content.trim()) window.localStorage.setItem(key, content);
      else window.localStorage.removeItem(key);
    }, 400);
    return () => clearTimeout(timer);
  }, [content, key]);

  const clear = useCallback(() => {
    setContent("");
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  }, [key]);

  return { content, setContent, clear };
}
