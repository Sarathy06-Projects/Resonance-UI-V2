import { betterAuth } from "better-auth";
import { bearer, emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { authLog } from "@/lib/auth-log";
import {
  OTP_EXPIRY_SECONDS,
  passwordResetOtpEmail,
  verificationOtpEmail,
} from "@/lib/email-templates";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Lets native clients (no cookie jar - the Android app) authenticate via
  // `Authorization: Bearer <token>` instead of a session cookie. Purely
  // additive: browser sign-in still uses cookies exactly as before.
  plugins: [
    bearer(),
    // Six-digit codes rather than click-through links, for both email
    // verification and password reset. A code is typed into whatever
    // browser or app the user is already standing in, so it works
    // identically on desktop, mobile web, and inside the Capacitor shell
    // without needing deep links or App Links to route a tap back.
    emailOTP({
      otpLength: 6,
      // 10 minutes. Shorter than the 30-60 the link-based flow would use:
      // a 6-digit code is a far smaller search space than a 32-byte token,
      // so the window it stays guessable in should be correspondingly
      // narrower. `allowedAttempts` below is the other half of that.
      expiresIn: OTP_EXPIRY_SECONDS,
      // Codes are hashed before they touch Neon - the row stores a digest,
      // never the digits themselves. The plaintext code exists only in the
      // outbound email.
      storeOTP: "hashed",
      // 5 wrong guesses burns the code entirely. Combined with the 6-digit
      // space and the 10 minute window, brute force is not viable.
      allowedAttempts: 5,
      // "rotate" (the default, and the only option compatible with hashed
      // storage) means every resend mints a fresh code and the previous one
      // stops working - stated explicitly so the guarantee is visible here.
      resendStrategy: "rotate",
      // Replaces better-auth's built-in link-based verification email with
      // this OTP flow, so there is exactly one way to verify an address and
      // no stray /verify-email?token=... links get sent.
      overrideDefaultEmailVerification: true,
      // Per-endpoint ceiling on top of the global rateLimit below: 3 code
      // requests per minute per IP for the OTP routes specifically.
      rateLimit: { window: 60, max: 3 },
      sendVerificationOTP: async ({ email, otp, type }) => {
        const { subject, html } =
          type === "forget-password"
            ? passwordResetOtpEmail(otp)
            : verificationOtpEmail(otp);
        try {
          await sendEmail({ to: email, subject, html });
          authLog("otp.sent", { email, type });
        } catch (error) {
          // Surfaced to the caller so signup/resend can tell the user the
          // mail failed instead of silently claiming it was sent. The
          // account is left unverified and the code stays valid, so the
          // user can simply retry from the resend button.
          authLog("otp.send_failed", { email, type, error });
          throw error;
        }
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Unverified email/password accounts cannot hold a session: sign-in
    // returns 403 EMAIL_NOT_VERIFIED and signup deliberately does not
    // auto-sign-in. The /verify-email screen is the only way through, and
    // clearing it signs the user in (autoSignInAfterVerification below).
    //
    // Google accounts are unaffected - better-auth trusts Google's
    // email_verified claim and stamps emailVerified at account creation,
    // so an OAuth user never meets this gate.
    requireEmailVerification: true,
    // A password reset is the recovery path someone uses when they think an
    // account is compromised, so it has to actually evict whoever is already
    // in there - otherwise a stolen session survives the reset that was
    // meant to end it.
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: async ({ user }) => {
      authLog("password_reset.succeeded", { email: user.email });
    },
    // Retained for any reset links already in flight from before the switch
    // to codes. New resets go through the OTP path (/email-otp/*).
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Resonance password",
        html: `<p>Hi ${user.name || ""},</p><p>Someone requested a password reset for your Resonance account. If this was you, click the link below to choose a new password. This link expires shortly.</p><p><a href="${url}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    },
  },
  emailVerification: {
    // Entering a correct code both verifies the address and starts the
    // session, so a new user goes signup -> code -> onboarding without
    // having to re-type the password they typed 30 seconds ago.
    autoSignInAfterVerification: true,
    afterEmailVerification: async (user) => {
      authLog("verification.succeeded", { email: user.email });
    },
  },
  // Enabled in every environment (not just production) - better-auth's
  // default of only turning this on when NODE_ENV=production means dev
  // and test runs would otherwise have zero brute-force protection.
  // Sign-in/sign-up already get a stricter built-in rule (3 req/10s);
  // this just sets the general baseline.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    // Counters live in Neon, not in process memory.
    //
    // The default is an in-process Map. That is fine for one long-lived
    // server and wrong for Vercel: each serverless instance keeps its own
    // Map, so the effective limit is (configured limit x instances) and
    // resets whenever an instance recycles. Concurrency is exactly what an
    // attacker brings, so the memory limiter is weakest at the moment it
    // matters. Costs one round trip per auth request.
    //
    // Note this is not the brute-force control for the codes themselves -
    // emailOTP's allowedAttempts is stored on the verification row and was
    // always database-backed, so guessing a code stayed capped at 5 tries
    // globally even before this.
    storage: "database",
  },
  advanced: {
    ipAddress: {
      // Without this, rate limiting silently collapses into a single global
      // bucket in production.
      //
      // better-auth resolves the client IP from x-forwarded-for, but when
      // no trustedProxies are configured it deliberately refuses a header
      // carrying more than one hop (getIp -> getIPFromHeader: "if
      // (forwardedIps.length !== 1) return null"), since the leftmost entry
      // is attacker-controlled. An unresolved IP then falls back to the
      // shared "no-trusted-ip" key - meaning 3 OTP sends per minute across
      // every user at once, which is a signup outage rather than a defence.
      //
      // app.resonance.org.in resolves to Cloudflare and responds with
      // CF-RAY plus x-vercel-id, so the real chain is
      // client -> Cloudflare -> Vercel. That makes x-forwarded-for
      // multi-hop in production and therefore exactly the header better-auth
      // refuses, which is why cf-connecting-ip leads here: Cloudflare sets
      // it to the single client address and overwrites any inbound value.
      // The Vercel headers follow for a direct-to-Vercel request, and plain
      // x-forwarded-for is the last resort for local and other hosts.
      //
      // Worth knowing: cf-connecting-ip is only trustworthy on traffic that
      // actually passed through Cloudflare. A request sent straight to the
      // *.vercel.app origin can forge it and mint itself a fresh bucket per
      // fake IP. Closing that off means restricting the Vercel origin to
      // Cloudflare (deployment protection, or an allowlist of Cloudflare
      // ranges) - infrastructure config, not something this file can fix.
      ipAddressHeaders: [
        "cf-connecting-ip",
        "x-vercel-forwarded-for",
        "x-real-ip",
        "x-forwarded-for",
      ],
    },
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Always show Google's account chooser.
            //
            // Without this, Google silently reuses whichever account the
            // browser is already signed into and auto-approves an app that
            // has been consented to before. The redirect back completes and
            // a session is minted the instant "Continue with Google" is
            // clicked - so closing the window afterwards cancels nothing,
            // and the visitor lands signed in as an account they were never
            // asked to confirm. On a shared or handed-over device that is
            // how one person ends up in another person's account.
            //
            // Reported as "I closed the popup, reloaded, and it logged me
            // into a previous session" - which is exactly this: the flow had
            // already finished before the window was closed.
            //
            // The backend's socialProviders block has carried this setting
            // all along, with a comment claiming it mirrored this file. It
            // did not; this is the side that actually starts the browser
            // redirect, and it was the side missing the option.
            prompt: "select_account",
          },
        }
      : undefined,
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      bio: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
      },
      // Not user-settable input - stamped server-side by
      // POST /api/onboarding/complete. Declared here purely so it's
      // included in the session payload, letting the client gate on
      // "has this user finished onboarding" without an extra request.
      onboardedAt: {
        type: "date",
        required: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
