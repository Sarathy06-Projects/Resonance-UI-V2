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

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
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
