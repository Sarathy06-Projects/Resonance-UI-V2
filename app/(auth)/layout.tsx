import Link from "next/link";
import { Metadata } from "next";
import { Logo } from "@/components/shared/Logo";
import { constructMetadata } from "@/lib/seo";

// Applies to every route in this group (login, signup, verify-email,
// reset-password, create-password) in one place - none of them have unique
// per-visitor content worth indexing, and reset/create-password additionally
// carry sensitive one-time tokens in the query string that should never end
// up in a search index regardless of crawl access.
export const metadata: Metadata = constructMetadata({ noIndex: true });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] dark:bg-zinc-950 dark:text-zinc-50">
      {/* Form side. Full width below lg - the panel opposite is decoration,
          and a phone should spend its pixels on the thing being filled in. */}
      <div className="flex min-h-screen flex-col lg:min-h-0">
        <header className="p-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <Logo size={32} />
            <span className="text-xl font-bold tracking-tight dark:text-white">Resonance</span>
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-20 pt-2 sm:px-6">
          {children}
        </main>
      </div>

      {/* Brand side. aria-hidden because it carries no information the form
          side doesn't already give - a screen reader announcing a decorative
          gradient and a tagline twice is noise, not context. */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-zinc-50 lg:block dark:bg-zinc-900"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 bg-[length:200%_200%] animate-gradient dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950" />
        {/* Soft light source, keeps the flat gradient from reading as a
            solid block at large sizes. */}
        <div className="absolute -left-24 top-1/4 size-[28rem] rounded-full bg-white/40 blur-3xl dark:bg-white/5" />
        <div className="absolute -right-16 bottom-0 size-[24rem] rounded-full bg-purple-300/30 blur-3xl dark:bg-purple-500/10" />

        <div className="relative flex h-full min-h-screen flex-col justify-end p-12 xl:p-16">
          <blockquote className="max-w-md">
            <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-900 xl:text-4xl dark:text-white">
              Ideas worth returning to.
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
              Write, publish, and find the people already thinking about what
              you are thinking about.
            </p>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
