import Link from "next/link";
import { Metadata } from "next";
import { Wordmark } from "@/components/shared/Logo";
import { AuthPageGuard } from "@/components/providers/AuthPageGuard";
import { constructMetadata } from "@/lib/seo";

// Applies to every route in this group (login, signup, verify-email,
// reset-password, create-password) in one place - none of them have unique
// per-visitor content worth indexing, and reset/create-password additionally
// carry sensitive one-time tokens in the query string that should never end
// up in a search index regardless of crawl access.
export const metadata: Metadata = constructMetadata({ noIndex: true });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-950 lg:grid lg:grid-cols-2 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Scoped to this group, so /login and /signup send a signed-in visitor
          home without a cookie-presence check in proxy.ts deciding it for
          them. See the component. */}
      <AuthPageGuard />

      {/* Form column. Full width below lg - the panel opposite is decoration,
          and a phone should spend its pixels on the thing being filled in. */}
      <div className="flex min-h-screen flex-col">
        {/* pt-safe, not plain padding: the root viewport is viewport-fit=cover
            and the Android WebView reports its inset through
            --android-inset-top (see globals.css). Without it the wordmark
            sits under the status bar on a notched phone and in the Capacitor
            shell - every other screen in the app already does this. */}
        <header className="px-5 pt-safe sm:px-8">
          <div className="flex h-16 items-center sm:h-20">
            {/* Height in CSS rather than the size prop alone, so the lockup
                still steps up on wider screens the way the old logo+label
                pair did. The width/height props stay as the aspect hint. */}
            <Link href="/" className="inline-flex items-center">
              <Wordmark size={30} className="h-[26px] w-auto sm:h-[30px]" />
            </Link>
          </div>
        </header>

        {/* justify-center rather than items-center on a min-h (not fixed-h)
            column: the column grows past the viewport when a form is taller
            than the screen - a short landscape phone meeting the four-field
            signup - so the top stays reachable instead of being centred out
            of the scrollable area. */}
        <main className="flex flex-1 flex-col justify-center px-5 pb-safe sm:px-8">
          <div className="mx-auto w-full max-w-[400px] py-8 sm:py-10">{children}</div>
        </main>
      </div>

      {/* Brand column. aria-hidden because it carries no information the form
          column doesn't already give - a screen reader announcing a
          decorative gradient and a tagline is noise, not context. */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-zinc-50 lg:block dark:bg-zinc-900"
      >
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 bg-[length:200%_200%] dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950" />
        {/* Soft light sources - keep the flat gradient from reading as a solid
            block on a large display. */}
        <div className="absolute -left-24 top-1/4 size-[28rem] rounded-full bg-white/40 blur-3xl dark:bg-white/5" />
        <div className="absolute -right-16 bottom-0 size-[24rem] rounded-full bg-purple-300/30 blur-3xl dark:bg-purple-500/10" />

        {/* Pinned to the viewport so the panel stays composed when a tall form
            grows the grid row past one screen, instead of the tagline drifting
            far below the fold. */}
        <div className="sticky top-0 flex h-screen flex-col justify-end p-10 xl:p-16">
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
