/**
 * Adds Resend's sending records to the Cloudflare zone for resonance.org.in.
 *
 *   CLOUDFLARE_API_TOKEN=... node scripts/cloudflare-dns.mjs \
 *     --dkim "p=MIGfMA0GCSqGSIb3..." \
 *     --spf  "v=spf1 include:amazonses.com ~all" \
 *     --mx   "feedback-smtp.ap-south-1.amazonses.com"
 *
 * Prints a plan and changes nothing unless --apply is passed.
 *
 * The three values come from Resend once the domain is added there; they
 * cannot be guessed, and the DKIM key is generated per domain. Copy them
 * from the Resend dashboard.
 *
 * Token needs Zone:Read and DNS:Edit for this zone. Create it at
 * https://dash.cloudflare.com/profile/api-tokens - do not reuse the R2
 * keys, which are S3 credentials and carry no DNS permission.
 *
 * SAFETY: this writes only to `resend._domainkey` and `send`. It refuses to
 * touch the zone apex, which is where the existing mailbox records live -
 * overwriting the root MX or adding a second root SPF would break incoming
 * mail to support@resonance.org.in. See docs/EMAIL_SETUP.md.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const API = "https://api.cloudflare.com/client/v4";
const ZONE = process.env.CLOUDFLARE_ZONE || "resonance.org.in";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const dkim = value("dkim");
const spf = value("spf");
const mx = value("mx");
const mxPriority = Number(value("mx-priority") ?? 10);

if (!TOKEN) {
  console.error("CLOUDFLARE_API_TOKEN is not set.");
  console.error("Create one with Zone:Read + DNS:Edit at");
  console.error("  https://dash.cloudflare.com/profile/api-tokens");
  process.exit(1);
}
if (!dkim || !spf || !mx) {
  console.error("Missing record values. All three come from the Resend dashboard:");
  console.error('  --dkim "p=..."                                  -> TXT resend._domainkey');
  console.error('  --spf  "v=spf1 include:amazonses.com ~all"      -> TXT send');
  console.error('  --mx   "feedback-smtp.<region>.amazonses.com"   -> MX  send');
  process.exit(1);
}

async function cf(path, init) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!body.success) {
    const msg = (body.errors ?? []).map((e) => `${e.code} ${e.message}`).join("; ");
    throw new Error(`Cloudflare API ${path} failed: ${msg || res.status}`);
  }
  return body.result;
}

/**
 * Every record this script is willing to write. Names are relative and are
 * always a subdomain - the apex is deliberately unreachable from here.
 */
const DESIRED = [
  { type: "TXT", name: "resend._domainkey", content: dkim },
  { type: "TXT", name: "send", content: spf },
  { type: "MX", name: "send", content: mx, priority: mxPriority },
];

function assertNotApex(name) {
  if (!name || name === "@" || name === ZONE) {
    throw new Error(
      `Refusing to write to the zone apex (${name}). The root MX and SPF belong to the mailbox provider; changing them breaks incoming mail.`,
    );
  }
}

async function main() {
  const zones = await cf(`/zones?name=${encodeURIComponent(ZONE)}`);
  if (!zones.length) throw new Error(`Zone ${ZONE} not found on this account.`);
  const zoneId = zones[0].id;
  console.log(`zone ${ZONE} (${zoneId})\n`);

  // Shown for context, and because clobbering these is the failure mode
  // this script exists to prevent.
  const existing = await cf(`/zones/${zoneId}/dns_records?per_page=100`);
  const apexMail = existing.filter(
    (r) => (r.name === ZONE && (r.type === "MX" || (r.type === "TXT" && r.content.startsWith("v=spf1")))),
  );
  if (apexMail.length) {
    console.log("existing apex mail records (left untouched):");
    for (const r of apexMail) console.log(`  ${r.type.padEnd(4)} ${r.name}  ${r.content}`);
    console.log();
  }

  const plan = [];
  for (const want of DESIRED) {
    assertNotApex(want.name);
    const fqdn = `${want.name}.${ZONE}`;
    const match = existing.find((r) => r.name === fqdn && r.type === want.type);
    if (!match) plan.push({ action: "create", want, fqdn });
    else if (match.content !== want.content || (want.priority && match.priority !== want.priority))
      plan.push({ action: "update", want, fqdn, id: match.id, from: match.content });
    else plan.push({ action: "unchanged", want, fqdn });
  }

  for (const p of plan) {
    const label = p.action.toUpperCase().padEnd(9);
    console.log(`${label} ${p.want.type.padEnd(4)} ${p.fqdn}`);
    console.log(`${" ".repeat(9)}      ${p.want.content}${p.want.priority ? ` (priority ${p.want.priority})` : ""}`);
    if (p.action === "update") console.log(`${" ".repeat(9)}      was: ${p.from}`);
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write these records.");
    return;
  }

  for (const p of plan) {
    if (p.action === "unchanged") continue;
    const payload = {
      type: p.want.type,
      name: p.want.name,
      content: p.want.content,
      ttl: 1, // automatic
      ...(p.want.priority ? { priority: p.want.priority } : {}),
      // These are verification records, not traffic - never proxy them.
      proxied: false,
    };
    if (p.action === "create") {
      await cf(`/zones/${zoneId}/dns_records`, { method: "POST", body: JSON.stringify(payload) });
    } else {
      await cf(`/zones/${zoneId}/dns_records/${p.id}`, { method: "PUT", body: JSON.stringify(payload) });
    }
    console.log(`applied: ${p.want.type} ${p.fqdn}`);
  }

  console.log("\nDone. Click Verify in Resend - propagation is usually quick on Cloudflare.");
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
