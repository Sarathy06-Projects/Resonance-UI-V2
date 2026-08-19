// Read-only survey of what looks like test data in the live database.
//
// Runs no DELETE and takes no arguments - the point is to decide what the
// cleanup should target before anything targets it. delete-test-accounts.mjs
// is the script that actually removes things.
//
//   node scripts/survey-test-data.mjs
//
// Note this reads whatever DATABASE_URL in .env.local points at, which is the
// same Neon instance the deployed backend uses. There is no separate dev
// database.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);

const show = (title, rows, render) => {
  console.log(`\n== ${title} ==`);
  if (!rows.length) return console.log("  (none)");
  for (const r of rows) console.log("  " + render(r));
};

console.log(`database: ${new URL(process.env.DATABASE_URL).hostname}`);

// --- Who is in here, by email domain ---------------------------------------
const domains = await sql`
  select split_part(email,'@',2) as domain,
         count(*)::int as users,
         min(created_at) as first_seen,
         max(created_at) as last_seen
  from "user" group by 1 order by users desc`;
show("users by email domain", domains, (r) =>
  `${String(r.users).padStart(4)}  @${r.domain.padEnd(28)} ${new Date(r.first_seen).toISOString().slice(0, 10)} .. ${new Date(r.last_seen).toISOString().slice(0, 10)}`
);

// --- Content volume per domain ---------------------------------------------
const content = await sql`
  select split_part(u.email,'@',2) as domain,
         count(distinct p.id)::int as posts,
         count(distinct a.id)::int as articles,
         count(distinct c.id)::int as comments
  from "user" u
  left join post p    on p.author_id = u.id
  left join article a on a.author_id = u.id
  left join comment c on c.author_id = u.id
  group by 1
  having count(distinct p.id) + count(distinct a.id) + count(distinct c.id) > 0
  order by posts desc`;
show("content by author domain", content, (r) =>
  `@${r.domain.padEnd(28)} posts=${String(r.posts).padStart(5)} articles=${String(r.articles).padStart(4)} comments=${String(r.comments).padStart(5)}`
);

// --- Posts whose text reads like a generated probe --------------------------
// Matched on the body rather than on the author, so a probe written by an
// account that is otherwise real still shows up here.
const probePosts = await sql`
  select p.id, u.email, left(p.content, 70) as sample, p.created_at
  from post p join "user" u on u.id = p.author_id
  where p.content ~ '^[a-z]{0,4} ?(capacity )?probe [0-9]+ 0\\.[0-9]+$'
     or p.content ilike 'capacity probe %'
     or p.content ilike '%loadtest%'
     or p.content ilike '%sectest%'
  order by p.created_at desc`;
console.log(`\n== posts matching a probe/load-test body: ${probePosts.length} ==`);
for (const r of probePosts.slice(0, 12)) {
  console.log(`  ${r.email.padEnd(42)} ${JSON.stringify(r.sample)}`);
}
if (probePosts.length > 12) console.log(`  ... and ${probePosts.length - 12} more`);

// Their authors, so the cleanup can decide whether to remove the account too
// rather than only the posts.
const probeAuthors = await sql`
  select distinct u.email, u.username, u.name
  from post p join "user" u on u.id = p.author_id
  where p.content ~ '^[a-z]{0,4} ?(capacity )?probe [0-9]+ 0\\.[0-9]+$'
     or p.content ilike 'capacity probe %'
  order by u.email`;
show("authors of those posts", probeAuthors, (r) => `${r.email.padEnd(42)} @${r.username ?? "-"} (${r.name})`);

// --- Accounts the existing cleanup script would target ----------------------
const targeted = await sql`
  select count(*)::int as n from "user"
  where email like '%@example.com' or email like '%@resonance.dev'`;
console.log(`\n== delete-test-accounts.mjs target set: ${targeted[0].n} users ==`);

// Anything that looks disposable but sits outside that set - the gap worth
// knowing about before assuming the existing script is sufficient.
const missed = await sql`
  select u.email, u.username, u.name,
         (select count(*)::int from post where author_id = u.id) as posts
  from "user" u
  where u.email not like '%@example.com'
    and u.email not like '%@resonance.dev'
    and u.email not like '%@resonance.seed'
    and (
      u.username ~ '^(rl|rt|load|full|sectest|test|probe)[_0-9]*$'
      or u.name in ('Load','Test','Probe')
      or exists (
        select 1 from post p where p.author_id = u.id
          and (p.content ilike 'capacity probe %'
               or p.content ~ '^[a-z]{0,4} ?probe [0-9]+ 0\\.[0-9]+$')
      )
    )
  order by u.email`;
show("test-looking accounts OUTSIDE the current target set", missed, (r) =>
  `${r.email.padEnd(42)} @${(r.username ?? "-").padEnd(20)} ${String(r.posts).padStart(4)} posts  (${r.name})`
);

// --- Seed personas, which must survive any cleanup --------------------------
const [seed] = await sql`
  select
    (select count(*)::int from "user" where email like '%@resonance.seed') as users,
    (select count(*)::int from post p join "user" u on u.id=p.author_id where u.email like '%@resonance.seed') as posts,
    (select count(*)::int from article a join "user" u on u.id=a.author_id where u.email like '%@resonance.seed') as articles`;
console.log(`\n== seed personas (must survive): users=${seed.users} posts=${seed.posts} articles=${seed.articles} ==`);

const [totals] = await sql`
  select (select count(*)::int from "user") as users,
         (select count(*)::int from post) as posts,
         (select count(*)::int from article) as articles,
         (select count(*)::int from comment) as comments`;
console.log(`\n== totals: ${JSON.stringify(totals)} ==`);
