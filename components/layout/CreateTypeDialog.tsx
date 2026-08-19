"use client";

import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { MessageSquare, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chose "Post" - the caller opens the composer. */
  onChoosePost: () => void;
}

/**
 * Asks what you are making before it commits you to a surface.
 *
 * Compose used to drop straight into the short-post sheet, with the long-form
 * types tucked into a horizontal rail two thirds of the way down it. So the
 * two things people actually come here to write were not peers: one was the
 * default and the other was a chip you had to scroll to find. Now the button
 * asks, and both answers are one tap from the same place.
 *
 * Two options only, deliberately. Showcase / Feedback / Resource are variants
 * of a post rather than a third kind of thing, and they stay where they were -
 * the composer's handoff rail and /create's own mode switcher. A chooser with
 * five entries is a menu, and a menu in front of the compose button is a tax
 * on the common case.
 *
 * Same dialog at every breakpoint: a bottom sheet on a phone, a centred modal
 * from md up.
 */
export function CreateTypeDialog({ open, onOpenChange, onChoosePost }: CreateTypeDialogProps) {
  const router = useRouter();

  const choosePost = () => {
    onOpenChange(false);
    onChoosePost();
  };

  const chooseArticle = () => {
    onOpenChange(false);
    router.push("/create?type=article");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            // Bottom sheet on a phone - it rises from the tab bar the tap came
            // from, and lands within thumb reach rather than mid-screen.
            "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,var(--safe-bottom))] outline-none dark:bg-zinc-950",
            "duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
            // Centred card once there is room.
            "md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-zinc-200 md:p-6 md:shadow-2xl dark:md:border-zinc-800",
            "md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95 md:data-closed:zoom-out-95 md:data-closed:slide-out-to-bottom-0"
          )}
        >
          {/* Grab handle, phone only - the affordance that says this panel
              came from the bottom edge and goes back there. */}
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-zinc-200 md:hidden dark:bg-zinc-800" />

          <DialogPrimitive.Title className="text-center text-[19px] font-bold tracking-tight md:text-left dark:text-white">
            Create
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-center text-[14px] text-zinc-500 md:text-left dark:text-zinc-400">
            What are you making?
          </DialogPrimitive.Description>

          <div className="mt-5 flex flex-col gap-2.5">
            <Choice
              icon={MessageSquare}
              title="Post"
              blurb="A short thought, a question, or work to share."
              onClick={choosePost}
            />
            <Choice
              icon={FileText}
              title="Article"
              blurb="Long-form writing with a cover, tags and a series."
              onClick={chooseArticle}
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-4 h-11 w-full rounded-xl text-[15px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 active:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
          >
            Cancel
          </button>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Choice({
  icon: Icon,
  title,
  blurb,
  onClick,
}: {
  icon: typeof MessageSquare;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
        <Icon className="h-[21px] w-[21px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold dark:text-zinc-100">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-zinc-500 dark:text-zinc-400">{blurb}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-500" />
    </button>
  );
}
