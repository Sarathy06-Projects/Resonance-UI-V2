import { NextRequest, NextResponse } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

// This route only exists because setPassword is a serverOnly better-auth
// endpoint (not exposed on the auto-mounted /api/auth/* router or the
// authClient SDK) - see src/api/routes/update-user.ts in better-auth's own
// source. It must be invoked from our own server code via auth.api, using
// whatever session the request's cookies resolve to; there is no user id in
// the request body, so this can never be used to touch another account.

// Same in-memory sliding-window shape as the backend's src/lib/rateLimit.ts,
// just not worth importing cross-repo for a single route. This sits outside
// better-auth's own /api/auth/* rate limiting (that only wraps requests
// dispatched through toNextJsHandler), so it needs its own guard.
const buckets = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

function withinRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  // Rate-limit key is the session cookie itself (not IP) - this endpoint
  // only matters to someone who already holds a valid session, and keying
  // on the cookie avoids one shared IP (NAT, office network) throttling
  // unrelated users.
  const cookie = request.headers.get("cookie") || request.headers.get("x-forwarded-for") || "anonymous";
  if (!withinRateLimit(cookie)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : null;
  if (!newPassword) {
    return NextResponse.json({ error: "newPassword is required." }, { status: 400 });
  }

  try {
    await auth.api.setPassword({ headers: request.headers, body: { newPassword } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof APIError) {
      const code = (err.body as { code?: string } | undefined)?.code;
      return NextResponse.json({ error: err.message, code }, { status: err.statusCode ?? 400 });
    }
    console.error("[create-password] unexpected error", err);
    return NextResponse.json({ error: "Unable to set your password." }, { status: 500 });
  }
}
