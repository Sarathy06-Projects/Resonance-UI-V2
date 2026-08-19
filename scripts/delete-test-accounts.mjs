// One-off cleanup: removes the throwaway accounts left behind by automated
// test runs and by scripts/seed-test-accounts.ts (in the backend repo),
// leaving the curated @resonance.seed community personas and every real
// login untouched.
//
//   node scripts/delete-test-accounts.mjs          # dry run, prints the plan
//   node scripts/delete-test-accounts.mjs --commit # actually deletes
//
// Two things to know before running with --commit:
//
//  1. This points at whatever DATABASE_URL in .env.local points at, and that
//     is the same Neon instance the deployed backend uses. There is no
//     separate dev database. This is production.
//  2. Every FK referencing "user" is ON DELETE CASCADE, so removing a user
//     also removes their posts, comments, messages, follows, likes and
//     sessions. There is no undo beyond Neon's point-in-time restore.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const COMMIT = process.argv.includes("--commit");
const sql = neon(process.env.DATABASE_URL);
const die = (m) => { console.error("ABORT:", m); process.exit(1); };

// Accounts to remove. Anchored at the end of the string so `@resonance.dev`
// can never reach `@resonance.seed`.
const targets = await sql`
  select id, email from "user"
  where email like '%@example.com' or email like '%@resonance.dev'
  order by email`;

// Real logins, explicitly preserved. Listed by hand rather than inferred, so
// a future domain that happens to look disposable can't quietly join the
// delete set.
const KEEP = [
  "projects.sarathy@gmail.com", "saam@gmail.com", "bodivew743@hutdot.com",
  "wehicay753@playboot.com", "sarathy06.official@gmail.com",
  "documentsdrive07@gmail.com", "work.sarathy06@gmail.com",
];

const byDomain = {};
for (const t of targets) {
  const d = t.email.split("@")[1];
  byDomain[d] = (byDomain[d] ?? 0) + 1;
}
console.log(`database: ${new URL(process.env.DATABASE_URL).hostname}`);
console.log(`targets: ${targets.length}`);
for (const [d, n] of Object.entries(byDomain)) console.log(`  ${String(n).padStart(3)}  @${d}`);

// Guards. Cheap to check, and the failure they prevent is unrecoverable.
const bad = targets.filter((t) => !/@(example\.com|resonance\.dev)$/.test(t.email));
if (bad.length) die(`unexpected domains in target set: ${bad.map((b) => b.email).join(", ")}`);
if (targets.some((t) => t.email.endsWith("@resonance.seed"))) die("target set reaches the seed personas");
const keepHit = targets.filter((t) => KEEP.includes(t.email));
if (keepHit.length) die(`target set reaches real logins: ${keepHit.map((k) => k.email).join(", ")}`);
console.log("pre-flight OK: no seed personas, no real logins in the target set");

if (!COMMIT) {
  console.log("\nDRY RUN - nothing deleted. Re-run with --commit to apply.");
  process.exit(0);
}

// By explicit id rather than re-running the LIKE, so what gets deleted is
// exactly the set the guards above just cleared. One statement, so it is
// atomic; CASCADE takes the dependent rows with it.
const deleted = await sql.query(
  `delete from "user" where id = any($1::text[]) returning id`,
  [targets.map((t) => t.id)],
);
console.log(`\ndeleted users: ${deleted.length}`);

const after = await sql`
  select split_part(email,'@',2) as domain, count(*)::int as n
  from "user" group by 1 order by n desc`;
console.log("\nremaining users by domain:");
for (const r of after) console.log(`  ${String(r.n).padStart(3)}  @${r.domain}`);
console.log(`  ---- total: ${after.reduce((a, r) => a + r.n, 0)}`);

const [seed] = await sql`
  select
    (select count(*)::int from "user" where email like '%@resonance.seed') as users,
    (select count(*)::int from post p join "user" u on u.id=p.author_id where u.email like '%@resonance.seed') as posts,
    (select count(*)::int from article a join "user" u on u.id=a.author_id where u.email like '%@resonance.seed') as articles`;
console.log(`\nseed personas intact: users=${seed.users} posts=${seed.posts} articles=${seed.articles}`);

const [orphans] = await sql`
  select
    (select count(*)::int from post where author_id not in (select id from "user")) as posts,
    (select count(*)::int from message where sender_id not in (select id from "user")) as messages,
    (select count(*)::int from "session" where user_id not in (select id from "user")) as sessions`;
console.log(`orphan rows (expect all 0): ${JSON.stringify(orphans)}`);
