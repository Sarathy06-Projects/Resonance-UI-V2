"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { createThread } from "@/lib/api/posts";
import { ImageAttachButton, ImageAttachmentsGrid } from "@/components/shared/ImageAttachments";

interface ThreadSegment {
  content: string;
  images: string[];
}

function emptySegment(): ThreadSegment {
  return { content: "", images: [] };
}

interface ThreadComposerProps {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
}

// A Threads/X-style chain composer: a stack of connected post boxes
// published together as one linked thread (see POST /api/posts/thread).
export function ThreadComposer({ open, onClose, onPosted }: ThreadComposerProps) {
  const { user } = useAuthStore();
  const [segments, setSegments] = useState<ThreadSegment[]>([emptySegment(), emptySegment()]);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSegment = (idx: number, patch: Partial<ThreadSegment>) => {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSegment = (idx: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSegment = () => setSegments((prev) => [...prev, emptySegment()]);

  const reset = () => {
    setSegments([emptySegment(), emptySegment()]);
    setError(null);
  };

  const canPost = segments.length >= 2 && segments.every((s) => s.content.trim().length > 0) && !isPosting;

  const handlePostThread = async () => {
    if (!canPost) return;
    setIsPosting(true);
    setError(null);
    try {
      await createThread({
        posts: segments.map((s) => ({ content: s.content.trim(), images: s.images.length ? s.images : undefined })),
      });
      reset();
      onPosted?.();
    } catch {
      setError("Couldn't post this thread. Try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto rounded-2xl dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          {segments.map((segment, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Avatar className="w-9 h-9 border border-zinc-100 dark:border-zinc-800 shrink-0">
                  {user?.avatar ? <AvatarImage src={user.avatar} /> : <AvatarFallback>{user?.name?.[0] ?? "?"}</AvatarFallback>}
                </Avatar>
                {idx < segments.length - 1 && <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-800 my-1" />}
              </div>

              <div className="flex-1 pb-5 min-w-0">
                <textarea
                  autoFocus={idx === 0}
                  placeholder={idx === 0 ? "Start a thread..." : "Add another post..."}
                  className="w-full bg-transparent resize-none outline-none text-[15px] placeholder:text-zinc-500 dark:text-zinc-200 dark:placeholder:text-zinc-500 min-h-[44px]"
                  value={segment.content}
                  onChange={(e) => updateSegment(idx, { content: e.target.value })}
                />
                <div className="mt-2">
                  <ImageAttachmentsGrid images={segment.images} onChange={(images) => updateSegment(idx, { images })} />
                </div>
                <div className="flex items-center gap-1 mt-2 text-zinc-500 dark:text-zinc-400">
                  <ImageAttachButton images={segment.images} onChange={(images) => updateSegment(idx, { images })} />
                  {segments.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeSegment(idx)}
                      aria-label="Remove post from thread"
                      className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="w-[16px] h-[16px]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSegment}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 pl-1 pb-2"
          >
            <Plus className="w-4 h-4" /> Add to thread
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            className="rounded-full px-6 font-semibold shadow-sm dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 mt-3"
            onClick={handlePostThread}
            disabled={!canPost}
          >
            {isPosting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Posting...
              </span>
            ) : (
              "Post all"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
