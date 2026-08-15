# Deploying email verification

Run in this order. Steps 1–3 must land before or with the frontend deploy;
skipping any of them breaks signup rather than degrading it.

## 1. Migrations

Both are in `Resonancebackendv2/drizzle/` and are applied by hand, matching
the precedent set by `0008_chat_rls.sql`.

**`0010_rate_limit_table.sql`** — creates the `rateLimit` table. **Required.**
Better Auth resolves this model by name and throws at runtime once
`rateLimit.storage = "database"` is set, so the app fails on the first auth
request without it. Additive, touches no existing data, safe to re-run.

**`0009_grandfather_email_verified.sql`** — marks pre-existing accounts
verified. Timing-sensitive:

- **before or with the deploy** → correct.
- **well after the deploy** → wrong. Genuine new signups who have not yet
  entered their code get marked verified without proving inbox control.

Raise the cutoff in the file if the deploy slips past its date. Without it
nobody is locked out — existing users are routed to `/verify-email` and
emailed a code — but they are asked to verify an address they registered
long ago.

## 2. Email provider

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for DNS. Verify `resonance.org.in`
in Resend first; an unverified sender is rejected at the provider.

## 3. Environment variables — Vercel

The Next.js app is the Better Auth server. These belong on **Vercel**, not
on the Azure App Service.

```
EMAIL_DRIVER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Resonance <noreply@resonance.org.in>
NEXT_PUBLIC_APP_URL=https://app.resonance.org.in
```

`NEXT_PUBLIC_APP_URL` is the Better Auth `baseURL`. It must be the real
https origin: it decides cookie security attributes and the trusted origin
for CSRF checks.

If `EMAIL_DRIVER` is unset it silently falls back to `console` — codes are
written to the Vercel logs instead of sent, and every signup dead-ends with
no error anywhere. Check this first if signups stop working.

## 4. Azure App Service

No new variables required. Deploy the backend **in the same window** as the
frontend, not after.

The backend mounts `app.all("/api/auth/*")` with the same secret and session
table, so its `/sign-in/email` is a second front door. Until it ships with
`requireEmailVerification`, an unverified account refused by Vercel can sign
in against Azure and get a session the whole platform honours. This was
measured, not theorised: before the fix, one account returned 403 at the
Vercel origin and 200 with a valid session cookie at the Azure one.

Optionally set `APP_PUBLIC_URL=https://app.resonance.org.in` so the footer
link in any mail sent from this service points at production.

## 5. Verify after deploy

1. Sign up with a real address. A code should arrive within seconds.
2. Enter it — you should land on onboarding, already signed in.
3. Sign in with an existing verified account.
4. Sign in with Google.
5. Run a password reset end to end.

Then confirm the limiter is actually shared rather than per-instance:

```sql
SELECT key, count FROM "rateLimit" ORDER BY "lastRequest" DESC LIMIT 5;
```

Keys look like `<ip>|/email-otp/send-verification-otp`. If every key shows
the same IP for different users, or the literal `no-trusted-ip`, then client
IPs are not resolving and all callers share one bucket — see the
`ipAddressHeaders` note in `lib/auth.ts`.

## Rollback

Set `EMAIL_DRIVER=console` to stop sending without touching code — but note
signups will then dead-end, so this is a stop-the-bleeding measure only.

To lift the gate entirely, set `requireEmailVerification: false` in **both**
`lib/auth.ts` and `Resonancebackendv2/src/lib/auth.ts` and redeploy both.
Leaving it on in one and off in the other reopens the bypass in §4.

Both tables can be dropped if the feature is abandoned; neither holds
anything the rest of the app reads.

## Known behaviour

**A failed send still returns success.** Better Auth catches errors from the
send and logs them rather than failing the request, so a user whose mail
bounces sees "check your email" and no code. They are not stuck — the
account exists, unverified, and the resend button works once delivery is
fixed. The failure is recorded as `otp.send_failed` in the structured
`[auth]` log; alert on it, because the user-facing symptom is silence.

**Codes are hashed at rest.** They cannot be recovered from the database to
help a user in support. Resending is the only path, by design.
