/**
 * Sets the production environment variables this app needs on Vercel.
 *
 *   VERCEL_TOKEN=... node scripts/setup-vercel-env.mjs           # dry run
 *   VERCEL_TOKEN=... node scripts/setup-vercel-env.mjs --apply
 *
 * Uses the REST API with a token rather than `vercel login`, so it works
 * without an interactive browser session. Create a token at
 * https://vercel.com/account/tokens - put it in .env.local, not on the
 * command line, so it stays out of shell history.
 *
 * Project and team ids are read from .vercel/repo.json, which is already
 * checked in.
 *
 * Values come from .env.local, so whatever is verified working locally is
 * what gets promoted. RESEND_API_KEY is never printed.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const TOKEN = process.env.VERCEL_TOKEN;
const APPLY = process.argv.includes("--apply");

if (!TOKEN) {
  console.error("VERCEL_TOKEN is not set.");
  console.error("Create one at https://vercel.com/account/tokens, then add to .env.local:");
  console.error("  VERCEL_TOKEN=...");
  process.exit(1);
}

const repo = JSON.parse(readFileSync(".vercel/repo.json", "utf8"));
const project = repo.projects[0];
const { id: projectId, orgId } = project;

/**
 * The four variables production needs.
 *
 * EMAIL_DRIVER is the dangerous one: unset, lib/email.ts falls back to
 * "console", every verification code is written to the Vercel log instead
 * of being sent, and signup dead-ends with nothing erroring anywhere.
 */
const VARS = [
  { key: "EMAIL_DRIVER", value: "resend" },
  { key: "RESEND_API_KEY", value: process.env.RESEND_API_KEY, secret: true },
  { key: "EMAIL_FROM", value: "Resonance <noreply@resonance.org.in>" },
  { key: "NEXT_PUBLIC_APP_URL", value: "https://app.resonance.org.in" },
];

const missing = VARS.filter((v) => !v.value).map((v) => v.key);
if (missing.length) {
  console.error(`Missing values for: ${missing.join(", ")}`);
  console.error("RESEND_API_KEY is read from .env.local - set it there first.");
  process.exit(1);
}

const api = async (path, init) => {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${path}${sep}teamId=${orgId}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body.error ?? body)}`);
  return body;
};

const show = (v) => (v.secret ? `set (${v.value.length} chars, starts ${v.value.slice(0, 3)})` : v.value);

async function main() {
  console.log(`project ${project.name} (${projectId})\n`);

  const existing = (await api(`/v9/projects/${projectId}/env`)).envs ?? [];

  const plan = VARS.map((v) => {
    const match = existing.find((e) => e.key === v.key && e.target?.includes("production"));
    return { v, action: match ? "update" : "create", id: match?.id };
  });

  for (const p of plan) {
    console.log(`${p.action.toUpperCase().padEnd(6)} ${p.v.key.padEnd(20)} ${show(p.v)}`);
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write these to production.");
    return;
  }

  for (const p of plan) {
    const payload = {
      key: p.v.key,
      value: p.v.value,
      type: "encrypted",
      target: ["production"],
    };
    if (p.action === "create") {
      await api(`/v10/projects/${projectId}/env`, { method: "POST", body: JSON.stringify(payload) });
    } else {
      await api(`/v9/projects/${projectId}/env/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ value: p.v.value, target: ["production"] }),
      });
    }
    console.log(`applied ${p.v.key}`);
  }

  console.log("\nDone. These apply to the NEXT deployment - existing ones keep the old values.");
  console.log("Deploy by merging the frontend branch into the project's production branch.");
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
