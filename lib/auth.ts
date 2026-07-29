import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Resonance password",
        html: `<p>Hi ${user.name || ""},</p><p>Someone requested a password reset for your Resonance account. If this was you, click the link below to choose a new password. This link expires shortly.</p><p><a href="${url}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
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
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
