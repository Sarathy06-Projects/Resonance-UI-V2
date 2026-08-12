import { NextResponse } from "next/server";
import { getArticleRedirectTarget } from "@/lib/api/articles";
import { ApiError } from "@/lib/api/client";

// This segment no longer renders anything - every article now lives at
// /@username/slug (see app/(main)/u/[username]/[slug]/page.tsx, reached via
// proxy.ts's rewrite). This is a permanent redirect layer, not a temporary
// migration shim: real external backlinks and search-engine-cached URLs
// point at /article/:id indefinitely, so this route - and robots.ts still
// allowing it - stays forever.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const target = await getArticleRedirectTarget(id);
    if (!target.username) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(new URL(`/@${target.username}/${target.slug}`, request.url), 308);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return new NextResponse("Not found", { status: 404 });
    throw err;
  }
}
