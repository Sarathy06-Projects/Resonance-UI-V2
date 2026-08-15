// Transactional email bodies for the code-based verification flows.
//
// Written as inline-styled tables on purpose: Gmail strips <style> blocks,
// Outlook's Word renderer ignores flexbox and most modern CSS, and neither
// honours prefers-color-scheme reliably. The palette below is the light-mode
// Resonance palette from app/globals.css hard-coded to hex, since email
// clients can't resolve CSS custom properties either.

/** 10 minutes. Shared with lib/auth.ts so the copy can't drift from the config. */
export const OTP_EXPIRY_SECONDS = 10 * 60;

const EXPIRY_MINUTES = Math.round(OTP_EXPIRY_SECONDS / 60);

const BRAND = {
  ink: "#09090b", // zinc-950
  body: "#52525b", // zinc-600
  faint: "#a1a1aa", // zinc-400
  border: "#e4e4e7", // zinc-200
  surface: "#fafafa", // zinc-50
  white: "#ffffff",
} as const;

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.resonance.org.in";
}

/**
 * Renders the code as widely-spaced digits in a bordered panel.
 *
 * Deliberately plain text rather than an image: iOS and Android both scrape
 * one-time codes out of message text to offer AutoFill, and neither can read
 * a code baked into a PNG. The letter-spacing is what makes it look
 * deliberate without costing that.
 */
function codePanel(otp: string): string {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:32px 0;">
          <tr>
            <td align="center" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:14px;padding:24px 16px;">
              <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;line-height:1.1;font-weight:700;color:${BRAND.ink};letter-spacing:10px;text-indent:10px;">${otp}</div>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.faint};margin-top:10px;">Expires in ${EXPIRY_MINUTES} minutes</div>
            </td>
          </tr>
        </table>`;
}

function shell(opts: { heading: string; intro: string; otp: string; security: string }): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${BRAND.surface};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.heading} — code ${opts.otp}, expires in ${EXPIRY_MINUTES} minutes.</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.surface};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:18px;padding:36px 32px;">
            <tr>
              <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <div style="font-size:19px;font-weight:700;letter-spacing:-0.4px;color:${BRAND.ink};">Resonance</div>
                <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.5px;color:${BRAND.ink};margin:28px 0 0;">${opts.heading}</h1>
                <p style="font-size:15px;line-height:1.6;color:${BRAND.body};margin:12px 0 0;">${opts.intro}</p>
                ${codePanel(opts.otp)}
                <p style="font-size:13px;line-height:1.6;color:${BRAND.faint};margin:0;">${opts.security}</p>
                <div style="border-top:1px solid ${BRAND.border};margin:28px 0 0;padding-top:18px;">
                  <p style="font-size:12px;line-height:1.6;color:${BRAND.faint};margin:0;">
                    Resonance never asks for this code by email, phone, or chat. Anyone who does is not us.
                  </p>
                  <p style="font-size:12px;line-height:1.6;color:${BRAND.faint};margin:10px 0 0;">
                    <a href="${appUrl()}" style="color:${BRAND.faint};text-decoration:underline;">${appUrl().replace(/^https?:\/\//, "")}</a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationOtpEmail(otp: string): { subject: string; html: string } {
  return {
    subject: "Verify your Resonance email",
    html: shell({
      heading: "Verify your email",
      intro:
        "Welcome to Resonance. Enter this code in the app to finish setting up your account.",
      otp,
      security:
        "If you didn't create a Resonance account, you can ignore this email — no account will be activated without this code.",
    }),
  };
}

export function passwordResetOtpEmail(otp: string): { subject: string; html: string } {
  return {
    subject: "Your Resonance password reset code",
    html: shell({
      heading: "Reset your password",
      intro:
        "Enter this code in the app to choose a new password for your Resonance account.",
      otp,
      security:
        "If you didn't request a password reset, you can ignore this email — your current password will keep working and nothing has changed.",
    }),
  };
}
