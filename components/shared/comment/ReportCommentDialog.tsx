"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CommentReportReason } from "@/lib/api/types";

const REASONS: { value: CommentReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

interface ReportCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: CommentReportReason, details?: string) => Promise<void>;
}

export function ReportCommentDialog({ open, onOpenChange, onSubmit }: ReportCommentDialogProps) {
  const [reason, setReason] = useState<CommentReportReason>("spam");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(reason, details.trim() || undefined);
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setDetails("");
        setReason("spam");
      }, 900);
    } catch {
      // Dialog stays open so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report comment</DialogTitle>
          <DialogDescription>Help us understand what&apos;s wrong with this comment.</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-4 text-center text-sm font-medium text-zinc-700 dark:text-zinc-200">Thanks — we&apos;ll take a look.</div>
        ) : (
          <>
            <div role="radiogroup" aria-label="Report reason" className="flex flex-col gap-1 py-1">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.value}
                  onClick={() => setReason(r.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    reason === r.value ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 rounded-full border-2",
                      reason === r.value ? "border-blue-600 bg-blue-600" : "border-zinc-300 dark:border-zinc-600"
                    )}
                  />
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              placeholder="Additional details (optional)"
              aria-label="Additional details"
              className="min-h-16 w-full resize-none rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-800 dark:focus-visible:ring-zinc-700"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Reporting…" : "Submit report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
