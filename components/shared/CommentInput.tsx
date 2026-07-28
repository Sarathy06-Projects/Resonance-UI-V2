"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

interface CommentInputProps {
  onSubmit: (content: string) => void | Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentInput({ onSubmit, placeholder = "Post your reply", autoFocus = false }: CommentInputProps) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } catch {
      // Leave the draft content in place so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-4 p-4">
      <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-800">
        {isAuthenticated && user ? (
          <AvatarImage src={user.avatar} />
        ) : (
          <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">?</AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1">
        <textarea 
          placeholder={placeholder}
          className="w-full bg-transparent resize-none outline-none text-[15px] placeholder:text-zinc-500 dark:text-zinc-100 min-h-[40px] pt-2"
          onClick={() => {
            if (!isAuthenticated) openAuthModal();
          }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus={autoFocus}
        />
        <div className="flex justify-end mt-2">
          <Button
            className="rounded-full px-6 font-semibold shadow-sm h-9 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && isAuthenticated)}
          >
            {isSubmitting ? "Posting..." : "Reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
