import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Pages that require a signed-in user. This is the primary access-control
// gate - it runs before any page component renders, so an unauthenticated
// visitor typing the URL directly never sees protected content flash on
// screen even for a moment (a client-side-only check in the page component
// can't guarantee that). Individual pages still keep their own auth checks
// too, as a second layer in case a route is ever added here without being
// listed below.
//
// Note: this file's name ("proxy.ts") is Next.js 16's file convention for
// what used to be middleware.ts - unrelated to the "/proxy/*" URL prefix
// used for backend API rewrites in next.config.ts. Same word, two
// unconnected things; not a conflict, just a naming coincidence.
const PROTECTED_PREFIXES = ["/settings", "/create", "/notifications", "/drafts", "/collections", "/onboarding", "/create-password"];

// Deliberately excludes /verify-email and /reset-password. Both are reached
// with no session by design - requireEmailVerification (lib/auth.ts) means a
// freshly signed-up account holds no session until its code is entered, and
// someone resetting a forgotten password has no session either. Both screens
// authenticate on the emailed code instead, so gating them on a cookie would
// lock out exactly the people they exist to serve.
//
// They are equally not "auth pages a signed-in user should be bounced off":
// a session cookie is not evidence the address is verified for accounts that
// predate this flow, and bouncing those users off /verify-email would leave
// them with no way to clear it.

// Sending an already-signed-in visitor away from /login and /signup is
// deliberately *not* done here, even though it looks like it belongs next to
// the check above. The only signal available at this layer is
// getSessionCookie(), which is a bare presence check - it reads the cookie
// jar, verifies nothing, expires nothing and never touches the database. So
// it says "signed in" for a cookie whose session was revoked (a password
// reset revokes every session, lib/auth.ts), signed out on another device, or
// simply outlived server-side.
//
// Bouncing on that signal produced a bug that read as "the Join button
// doesn't work". The header shows Join whenever the client believes it is
// signed out, which is correct for a revoked-but-still-present cookie - and
// also true for the second or two before /get-session answers on any load.
// Clicking it navigated to /signup, this rule answered 307 -> "/", and Next
// followed the redirect back to the page the click started on. No error, no
// URL change, nothing: a dead button, "sometimes", depending entirely on
// cookie state and how slow the session request was.
//
// AuthPageGuard (mounted in app/(auth)/layout.tsx) does the redirect instead,
// off the resolved session - the same state the Join button reads, so the two
// can no longer disagree. The cost is a brief flash of the form for a
// signed-in user who navigates to /login on purpose, which is the same
// trade-off the onboarding note below already accepts.

// Onboarding completion is deliberately *not* gated here too. A middleware
// fast-path would need to read the session-cache cookie without a DB round
// trip, but /api/onboarding/complete updates the user via a raw DB write on
// the backend (bypassing better-auth's own update path) - the onboarding
// page forces a disableCookieCache session refetch right after that write
// succeeds (see app/onboarding/page.tsx's handleFinish) specifically so the
// cache cookie itself ends up correct, not just this tab's in-memory state,
// but that's still one extra request the middleware would otherwise need to
// duplicate on every navigation just to be sure. OnboardingGuard
// (components/providers/OnboardingGuard.tsx, mounted in
// app/(main)/layout.tsx) stays the single source of truth here instead: it
// reads live zustand state that the onboarding page updates the moment
// completion succeeds, so it doesn't need a DB round trip in middleware at
// all. The trade-off is a possible one-frame flash of a protected page
// before the client-side redirect fires - acceptable here since, unlike
// PROTECTED_PREFIXES above, this isn't a real access-control boundary.
// /@username/... is the public-facing URL scheme; internally it's served by
// app/(main)/u/[username]/... - a literal "@[username]" folder is not
// possible, Next.js reserves the "@" prefix for parallel-route slots and
// would silently strip it from the URL instead of matching it as a path
// segment. Pure pathname string-splitting, no DB call - middleware runs on
// nearly every request, so this has to stay O(1).
function rewriteAtUsername(request: NextRequest, pathname: string): NextResponse | null {
  if (!pathname.startsWith("/@")) return null;

  const segments = pathname.slice(1).split("/"); // "/@alex/slug" -> ["@alex", "slug"]
  const username = segments[0].slice(1);
  if (!username) return null;

  if (segments.length === 1) {
    return NextResponse.rewrite(new URL(`/u/${username}`, request.url));
  }
  if (segments.length === 3 && segments[1] === "series" && segments[2]) {
    return NextResponse.rewrite(new URL(`/u/${username}/series/${segments[2]}`, request.url));
  }
  if (segments.length === 2 && segments[1]) {
    return NextResponse.rewrite(new URL(`/u/${username}/${segments[1]}`, request.url));
  }

  // Malformed shape (e.g. /@alex/a/b/c) - fall through to normal 404
  // handling rather than guessing.
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const atUsernameRewrite = rewriteAtUsername(request, pathname);
  if (atUsernameRewrite) return atUsernameRewrite;

  // Cheap presence check only - no signature check, no expiry check, no DB
  // round trip. Sufficient in this direction: the absence of a cookie is
  // conclusive, so no-cookie -> /login never turns anyone away wrongly, and
  // every actual data request still goes through the backend's requireAuth
  // middleware, which does the real session verification against the
  // database. The converse ("a cookie is here, therefore signed in") is *not*
  // sound, which is why nothing above redirects on it - see the AUTH_PAGES
  // note near the top of this file.
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and Next.js internals, so
     * the protected/auth-page checks above apply to every real navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
