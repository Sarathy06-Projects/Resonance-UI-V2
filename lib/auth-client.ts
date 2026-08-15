import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  // Mirrors the emailOTP() server plugin in lib/auth.ts - this is what types
  // and exposes authClient.emailOtp.* (sendVerificationOtp, verifyEmail,
  // requestPasswordReset, resetPassword) and refreshes the session atom once
  // verification completes.
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
