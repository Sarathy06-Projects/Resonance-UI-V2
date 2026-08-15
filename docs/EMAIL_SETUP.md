# Email setup

Signup verification and password reset are code-based: a six-digit OTP is
emailed and typed back into the app. If mail does not arrive, **a new user
cannot finish signing up and an existing user cannot recover an account**.
That makes this the highest-consequence piece of configuration in the
project, and it is the one that fails quietly.

## Who sends what

Two providers, deliberately, doing different jobs:

| | Provider | Purpose |
|---|---|---|
| `noreply@resonance.org.in` | **Resend** | Verification codes, password reset codes. Machine-sent. |
| `support@resonance.org.in` | **Titan** | Human mail — reading and replying. |

Titan is mailbox hosting: it receives mail and lets a person answer it. It is
not a transactional sender. Its sending caps are sized for someone typing
emails, so a burst of signups can hit the limit and dead-end registrations.
Keeping the two separate also keeps their reputations separate — a support
reply marked as spam cannot drag down code delivery, and vice versa.

## The driver

`lib/email.ts` picks a driver from `EMAIL_DRIVER`:

- **`console`** (default) — prints the code to stdout, sends nothing. This is
  the right choice for local development: no rate limits, no deliverability
  problems, nothing to configure. Read codes with `npm run otp`.
- **`resend`** — real send via the Resend API.

There is no default sender. If `EMAIL_DRIVER=resend` and `EMAIL_FROM` is
missing, the send throws and names the variable. The previous fallback was
`noreply@resonance.app` — a domain Resonance does not own, so every send was
rejected at the provider with nothing in the app explaining why.

## DNS

Resend verifies a domain with three records. Add them **alongside** the
existing Titan records — do not replace anything.

| Type | Name | Purpose |
|---|---|---|
| MX | `send` | bounce/complaint handling |
| TXT | `send` | SPF for the sending subdomain |
| TXT | `resend._domainkey` | DKIM signature |

Exact values come from the Resend dashboard; the DKIM key is generated per
domain.

### Two ways this goes wrong

**Do not put Resend's MX record at the root.** It belongs on `send`. Titan's
MX records live at the root and are what deliver mail to `support@`.
Overwriting them silently stops all incoming mail to the mailbox.

**Do not add a second SPF record at the root.** A domain may have exactly
one; a second one invalidates both. This is the usual collision when adding
a sender to a domain that already has mailbox hosting — Resend avoids it by
scoping its SPF to the `send` subdomain, so Titan's root SPF stays as it is.

Because `send.resonance.org.in` is a subdomain of the `From:` domain, DKIM
and SPF both align under relaxed DMARC, so adding a `_dmarc` policy later
will not break sending.

## Environment variables

Set on **Vercel**, not Azure. The Next.js app is the Better Auth server and
owns these flows; the Express API on Azure does not send verification mail.

```
EMAIL_DRIVER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Resonance <noreply@resonance.org.in>
```

If `EMAIL_DRIVER` is left unset in production it falls back to `console`:
codes are written to the Vercel logs instead of being sent, and every signup
dead-ends. Nothing errors. Check this first when signups stop working.

The backend has the same three variables in its `.env.example`. It does not
normally send this mail — they exist so the mirrored Better Auth config in
`src/lib/auth.ts` behaves identically if it ever does. Its `env.ts` refuses
to boot with `EMAIL_DRIVER=resend` and no `EMAIL_FROM`.

## Verifying it works

After DNS verification, from a checkout with the production variables set:

```
npm run dev > dev.log 2>&1
npm run test:verify-email dev.log
```

The suite covers the full flow — signup, hashed-at-rest storage, expiry,
single-use, rotation on resend, brute-force limits, both login states,
password reset, enumeration, CSRF, and rate limiting.

Note it reads codes from the dev server log, so it requires
`EMAIL_DRIVER=console`. To confirm real delivery, sign up with a live
address and watch the Resend dashboard for the send.

## Local development

Leave `EMAIL_DRIVER` unset. The code prints to the terminal:

```
  ──────────────────────────────────────────────
   Verify your Resonance email
   to: you@example.com

   CODE:  2 6 9 6 6 3

   expires in 10 minutes
  ──────────────────────────────────────────────
```

Or pull it from a redirected log:

```
npm run otp                 # newest code
npm run otp -- --all        # every code this session
npm run otp -- --watch      # follow as they arrive
```

Set `EMAIL_DEBUG_HTML=1` to log the full HTML body when working on the
template in `lib/email-templates.ts`.
