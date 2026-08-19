// Server-side (generateMetadata, etc.) talks to the backend directly - there's
// no browser to resolve a relative URL against. In the browser, requests go
// through this app's own `/proxy/api` rewrite (next.config.ts) instead of
// NEXT_PUBLIC_API_URL directly: the session cookie is set by *this app's*
// /api/auth on *this app's* origin, so a cross-origin fetch straight to the
// backend's own domain would never carry it, no matter what `credentials`
// option is passed - cookies are scoped to the domain that set them. Routing
// same-origin through the rewrite sidesteps that entirely.
const API_URL = typeof window === "undefined"
  ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  : "/proxy";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiFetchOptions extends RequestInit {
  json?: unknown;
}

/**
 * Rejects a path that could aim the request somewhere other than the API route
 * it looks like.
 *
 * Nearly every helper in this directory builds its path by interpolation -
 * `/api/posts/${id}`, `/api/users/${username}` - and those values routinely
 * come straight from a URL segment, which the caller does not control. The
 * request URL is then just `${API_URL}${path}`, and fetch() resolves dot
 * segments the same way a browser address bar does: a `username` of
 * "../../health" makes `/api/users/../../health` collapse to `/health`.
 *
 * That matters most on the server, where apiFetch forwards the visitor's whole
 * cookie header - so a crafted profile URL could point an authenticated
 * server-side call at a backend path the page never meant to call, and render
 * whatever came back. Encoding at each call site fixes each call site; checking
 * here fixes the shape of the mistake, including in helpers not yet written.
 */
function assertSafePath(path: string): void {
  if (!path.startsWith("/api/") && !path.startsWith("/uploads/")) {
    throw new ApiError(400, `Refusing to call a non-API path: ${path}`);
  }
  // Split on both separators: a %2e%2e that survived a single decode, or a
  // backslash on a path a Windows-side normaliser might fold, are the same
  // request as a plain "..".
  const [withoutQuery] = path.split(/[?#]/);
  if (withoutQuery.split(/[/\\]/).includes("..")) {
    throw new ApiError(400, "Refusing to call a path containing a parent-directory segment.");
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  assertSafePath(path);
  const { json, headers, ...rest } = options;

  // `credentials: "include"` (below) only does anything in a real browser -
  // there's no cookie jar for a server-side fetch, so without this, every
  // Server Component call was silently "logged out" to the backend (fine
  // for generateMetadata, which never needed viewer state; wrong for a
  // page body rendering isLiked/isFollowing/isSelf for a real signed-in
  // visitor). Dynamic import, not a top-level one - this file is also
  // imported by Client Components, and next/headers can only be referenced
  // on a code path that's actually server-only.
  let forwardedCookie: string | undefined;
  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieHeader) forwardedCookie = cookieHeader;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(forwardedCookie ? { cookie: forwardedCookie } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(res.status, body.error || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  assertSafePath(path);
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(res.status, body.error || res.statusText);
  }

  return res.json() as Promise<T>;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

// A stable fetcher for SWR keys that are plain "/api/..." path strings.
export const swrFetcher = <T>(path: string) => apiFetch<T>(path);
