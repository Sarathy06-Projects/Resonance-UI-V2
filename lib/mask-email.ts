/**
 * Masks an address down to something recognisable-but-not-reusable:
 * `sarathy@gmail.com` -> `s•••••y@gmail.com`.
 *
 * Used in two places with the same intent: the verification screen, so the
 * user can confirm which inbox to open without the full address sitting on a
 * shared screen, and the auth logs, where it keeps a support ticket
 * correlatable without turning the log drain into a mailing list.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "•••";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 2) return `${local[0] ?? "•"}•••@${domain}`;
  return `${local[0]}${"•".repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
}
