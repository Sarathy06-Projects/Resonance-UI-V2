"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /** One line of context. Omit it rather than pad it - most pages don't need one. */
  description?: string;
  /** Right-aligned actions: a button, a filter, a menu. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The desktop page header.
 *
 * Every secondary screen had been rolling its own - different sizes, different
 * weights, different spacing above the content - which is most of why the app
 * read as a set of pages rather than one product. This is the single
 * definition of that treatment.
 *
 * Hidden below `md` on purpose: mobile screens get their title from
 * MobileHeader (see lib/mobile/nav.ts), so rendering this too would stack two
 * titles on a phone.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "hidden items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 md:flex dark:border-zinc-800",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-zinc-950 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[14px] leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
