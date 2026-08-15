// Structured, deliberately-boring logging for the auth flows.
//
// The rule this file exists to enforce: an auth log line may record that
// something happened and roughly to whom, and nothing else. No OTP codes,
// no reset tokens, no session tokens, no passwords, no provider API keys.
// Callers pass whatever context they have and this module decides what is
// safe to keep, so a new call site can't accidentally widen what gets
// written by passing an extra field.

import { maskEmail } from "@/lib/mask-email";

/** Keys whose values are never safe to write, whatever the call site thinks. */
const REDACTED_KEYS =
  /^(otp|code|token|password|newPassword|secret|apiKey|authorization|cookie|session)$/i;

type LogValue = string | number | boolean | null | undefined | unknown;

function sanitize(context: Record<string, LogValue>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (REDACTED_KEYS.test(key)) continue;
    if (key === "email" && typeof value === "string") {
      safe.email = maskEmail(value);
      continue;
    }
    if (value instanceof Error) {
      // Message only. Stacks from a mail provider SDK have been known to
      // embed the request body, which would put the code back in the log.
      safe[key] = value.message;
      continue;
    }
    if (value === undefined) continue;
    safe[key] = value;
  }
  return safe;
}

/**
 * Events used across the verification flows:
 *   otp.sent, otp.send_failed, otp.requested, otp.rate_limited,
 *   verification.succeeded, verification.failed, verification.expired,
 *   password_reset.requested, password_reset.succeeded
 */
export function authLog(event: string, context: Record<string, LogValue> = {}): void {
  const payload = { event, at: new Date().toISOString(), ...sanitize(context) };
  // Single-line JSON so Vercel's log drain can parse it without a custom
  // rule. console.error for failures keeps them in the error stream where
  // alerting already looks.
  const line = JSON.stringify(payload);
  if (event.endsWith("_failed") || event.endsWith(".failed")) {
    console.error(`[auth] ${line}`);
  } else {
    console.log(`[auth] ${line}`);
  }
}
