import Link from "next/link";
import { Metadata } from "next";
import { Logo } from "@/components/shared/Logo";
import { constructMetadata } from "@/lib/seo";

// Applies to every route in this group (login, signup, reset-password,
// create-password) in one place - none of them have unique per-visitor
// content worth indexing, and reset/create-password additionally carry
// sensitive one-time tokens in the query string that should never end up
// in a search index regardless of crawl access.
export const metadata: Metadata = constructMetadata({ noIndex: true });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-xl font-bold tracking-tight hidden sm:block dark:text-white">Resonance</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
