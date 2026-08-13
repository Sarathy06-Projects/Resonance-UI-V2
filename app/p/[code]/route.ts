import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { resolveShortLink } from "@/lib/api/posts";
import { postUrl } from "@/lib/urls";

// /p/:code - the short share link.
//
// Exists because the canonical /@username/slug URL runs past 100 characters
// (slugs are derived from a post's first ten words), which is unreadable
// printed on a story card and impossible to retype. This is an alias that
// redirects to the canonical URL, never a second address for the content:
// the redirect is what keeps one canonical URL for SEO and for sharing.
//
// 308 rather than 302 so the permanence is explicit to crawlers - a code is
// minted once and never reassigned.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const resolved = await resolveShortLink(code).catch(() => null);
  if (!resolved) notFound();

  redirect(postUrl({ slug: resolved.slug, id: resolved.id, author: { username: resolved.username } }));
}
