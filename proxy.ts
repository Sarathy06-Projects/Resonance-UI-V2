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
const PROTECTED_PREFIXES = ["/settings", "/create", "/notifications", "/drafts", "/collections", "/onboarding"];

const AUTH_PAGES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cheap presence/signature check only - no DB round trip. This is
  // sufficient to gate navigation; every actual data request still goes
  // through the backend's requireAuth middleware, which does the real
  // session verification against the database.
  const hasSession = Boolean(getSessionCookie(request));

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
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
