/**
 * Prints the verification codes issued by the local dev server.
 *
 *   npm run otp                 # most recent code
 *   npm run otp -- --all        # every code this session
 *   npm run otp -- <email>      # most recent code for one address
 *   npm run otp -- --watch      # follow, printing each new code as it lands
 *
 * With EMAIL_DRIVER unset (the default) lib/email.ts prints codes to stdout
 * instead of sending mail, so a local signup never reaches an inbox. This
 * reads them back rather than making you scroll the dev server output.
 *
 * It needs the dev server's stdout in a file. Either redirect it:
 *
 *   npm run dev > dev.log 2>&1
 *
 * or point the script at wherever it already goes:
 *
 *   OTP_LOG=/path/to/dev.log npm run otp
 *
 * Dev only. There is nothing to read when EMAIL_DRIVER=resend, because then
 * the code exists solely in the email.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const emailFilter = args.find((a) => !a.startsWith("--") && a.includes("@"));

const CANDIDATES = [
  process.env.OTP_LOG,
  "dev.log",
  ".next/dev.log",
  // Where the assistant-managed dev server writes during this session.
  "C:/Users/SARATH~1/AppData/Local/Temp/claude/d--Personal-Projects-Drafts-Resonanceuiv2/98497775-ffb2-4673-9687-d9ff875329a7/scratchpad/dev-run.log",
].filter(Boolean);

const logPath = CANDIDATES.find((p) => existsSync(p));

if (!logPath) {
  console.error("Couldn't find a dev server log. Looked in:");
  for (const c of CANDIDATES) console.error(`  ${c}`);
  console.error("\nStart the server with output redirected:");
  console.error("  npm run dev > dev.log 2>&1");
  console.error("\nor point at an existing log:");
  console.error("  OTP_LOG=/path/to/dev.log npm run otp");
  process.exit(1);
}

if (process.env.EMAIL_DRIVER === "resend") {
  console.error("EMAIL_DRIVER=resend - codes are sent by email and never logged.");
  process.exit(1);
}

/** One entry per `[email:console] ... code=NNNNNN` line written by lib/email.ts. */
function parse(text) {
  const out = [];
  const re = /\[email:console\] to=(\S+) subject="([^"]+)"(?: code=(\d{6}))?/g;
  let m;
  while ((m = re.exec(text))) {
    if (!m[3]) continue; // link-based mail, no code
    out.push({ to: m[1], subject: m[2], code: m[3] });
  }
  return out;
}

function render(entries) {
  if (!entries.length) {
    console.log("No codes yet. Sign up or request a reset, then run this again.");
    return;
  }
  const shown = flag("all") ? entries : entries.slice(-1);
  for (const e of shown) {
    console.log(`\n  ${e.code}   ${e.to}`);
    console.log(`  ${" ".repeat(6)}   ${e.subject}`);
  }
  if (!flag("all") && entries.length > 1) {
    console.log(`\n  (${entries.length - 1} earlier — 'npm run otp -- --all' to see them; only the newest per address works)`);
  }
  console.log();
}

let entries = parse(readFileSync(logPath, "utf8"));
if (emailFilter) entries = entries.filter((e) => e.to === emailFilter);

if (!flag("watch")) {
  render(entries);
  process.exit(0);
}

// --watch: poll the file and print each new code as it appears.
console.log(`watching ${logPath} — Ctrl+C to stop`);
render(entries);
let seen = entries.length;
let size = statSync(logPath).size;

setInterval(() => {
  const s = statSync(logPath).size;
  // Truncation (a restarted dev server) resets the baseline.
  if (s < size) {
    seen = 0;
    size = s;
    return;
  }
  if (s === size) return;
  size = s;
  let all = parse(readFileSync(logPath, "utf8"));
  if (emailFilter) all = all.filter((e) => e.to === emailFilter);
  if (all.length > seen) {
    for (const e of all.slice(seen)) console.log(`\n  ${e.code}   ${e.to}\n`);
    seen = all.length;
  }
}, 700);
