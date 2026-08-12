import { NextResponse } from "next/server";
import { getSeriesRedirectTarget } from "@/lib/api/series";
import { ApiError } from "@/lib/api/client";

// Every series always has a slug (unlike posts), so - like article/[id] -
// this is a pure permanent redirect stub with no rendering fallback. See
// app/(main)/article/[id]/route.ts's comment for why this stays forever.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const target = await getSeriesRedirectTarget(id);
    if (!target.username) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(new URL(`/@${target.username}/series/${target.slug}`, request.url), 308);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return new NextResponse("Not found", { status: 404 });
    throw err;
  }
}
