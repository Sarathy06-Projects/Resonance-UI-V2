// Pluggable email sender, mirroring Resonancebackendv2/src/lib/email.ts.
// EMAIL_DRIVER=console (default) just logs - good enough for local dev
// without any account. Set EMAIL_DRIVER=resend and RESEND_API_KEY to send
// real email (currently just password resets).

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

async function sendViaResend(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("EMAIL_DRIVER=resend but RESEND_API_KEY is not set.");
  }
  // No default sender. This used to fall back to noreply@resonance.app - a
  // domain Resonance does not own and never verified in Resend, so a
  // forgotten EMAIL_FROM meant every send was rejected at the provider with
  // nothing in the app to say why. Failing here names the missing variable
  // instead, matching how the backend's env.ts refuses to guess CORS_ORIGINS.
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error(
      "EMAIL_DRIVER=resend but EMAIL_FROM is not set. Use an address on a domain verified in Resend, e.g. \"Resonance <noreply@resonance.org.in>\".",
    );
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

/**
 * Pulls the six-digit code out of a rendered email.
 *
 * Matches the code panel in lib/email-templates.ts. Returns null for mail
 * that has no code (the legacy link-based password reset), which is the
 * signal to fall back to logging the body.
 */
function extractOtp(html: string): string | null {
  return /text-indent:10px;">(\d{6})</.exec(html)?.[1] ?? null;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (process.env.EMAIL_DRIVER === "resend") {
    await sendViaResend(input);
    return;
  }

  // Console driver - development only.
  //
  // This used to dump the whole HTML body, which meant the one thing anyone
  // actually wanted (the code) was buried in ~3KB of inline-styled table
  // markup and easy to miss entirely. Now the code is printed on its own,
  // plus a single machine-readable line that `npm run otp` and
  // scripts/verify-email-e2e.mjs parse instead of regexing the markup.
  //
  // Set EMAIL_DEBUG_HTML=1 to get the full body back when working on the
  // template itself.
  const otp = extractOtp(input.html);

  console.log(`[email:console] to=${input.to} subject="${input.subject}"${otp ? ` code=${otp}` : ""}`);

  if (otp) {
    const line = "─".repeat(46);
    console.log(
      `\n  ${line}\n` +
        `   ${input.subject}\n` +
        `   to: ${input.to}\n\n` +
        `   CODE:  ${otp.split("").join(" ")}\n\n` +
        `   expires in 10 minutes\n` +
        `  ${line}\n`,
    );
  }

  if (!otp || process.env.EMAIL_DEBUG_HTML === "1") {
    console.log(input.html);
  }
}
