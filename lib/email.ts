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
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Resonance <noreply@resonance.app>",
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

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (process.env.EMAIL_DRIVER === "resend") {
    await sendViaResend(input);
    return;
  }
  // console driver
  console.log(`[email:console] to=${input.to} subject="${input.subject}"\n${input.html}`);
}
