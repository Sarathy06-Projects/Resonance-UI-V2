// Moves the @resonance.seed personas' posts and articles into the recent
// past, so seeded content sits inside the window the For You feed ranks
// against instead of looking like a dead archive.
//
//   node scripts/refresh-seed-dates.mjs          # dry run, prints the plan
//   node scripts/refresh-seed-dates.mjs --commit # actually updates
//
// Why this exists: the seed content was all written within about an hour of
// each other on 2026-08-03, so even when it was inside the feed's window it
// carried a single timestamp for 400 items. Spreading it over the last ten
// days makes the ordering mean something and stops every card reading
// "15d ago".
//
// This only ever touches rows authored by @resonance.seed accounts. Real
// users' content is never rewritten - re-dating someone's actual post would
// be falsifying their history, which is a different and much worse thing than
// re-dating a fixture.
//
// Note: the backend's forYouFeed no longer *depends* on this. It backfills
// with older posts when the recent pool underfills, so the feed cannot go
// blank again the way it did. This is cosmetic: it makes seeded content look
// like a community that has been active, rather than one that stopped.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const COMMIT = process.argv.includes("--commit");
const sql = neon(process.env.DATABASE_URL);

// Spread across this many days ending a few hours ago. Not ending at "now":
// content timestamped to the second you looked at it reads as generated.
const SPREAD_DAYS = 10;
const NEWEST_AGE_HOURS = 5;

console.log(`database: ${new URL(process.env.DATABASE_URL).hostname}`);

const [before] = await sql`
  select
    (select count(*)::int from post p    join "user" u on u.id=p.author_id where u.email like '%@resonance.seed') as posts,
    (select count(*)::int from article a join "user" u on u.id=a.author_id where u.email like '%@resonance.seed') as articles,
    (select count(*)::int from post where created_at > now() - interval '14 days') as posts_in_window`;
console.log(`seed posts: ${before.posts}, seed articles: ${before.articles}`);
console.log(`posts currently inside the feed's 14-day window: ${before.posts_in_window}`);

// Guard: never touch content that is not a seed persona's. Cheap to check,
// and the failure it prevents is rewriting a real person's history.
const [{ n: nonSeed }] = await sql`
  select count(*)::int as n from post p join "user" u on u.id=p.author_id
  where u.email not like '%@resonance.seed'`;
console.log(`posts by non-seed authors (must stay untouched): ${nonSeed}`);

if (!COMMIT) {
  console.log(`\nWould spread ${before.posts} posts and ${before.articles} articles`);
  console.log(`across the last ${SPREAD_DAYS} days, newest ~${NEWEST_AGE_HOURS}h ago.`);
  console.log("\nDRY RUN - nothing changed. Re-run with --commit to apply.");
  process.exit(0);
}

// Deterministic spread by row order rather than random per row: random
// timestamps cluster and leave visible gaps at this volume. row_number() over
// the existing created_at order preserves the sequence the seed script
// intended, just rescaled onto a recent span.
//
// updated_at tracks created_at so nothing appears edited before it was
// written. article.published_at moves with it for the same reason - the
// status/published_at index is what the article listings sort on.
const posts = await sql`
  with ordered as (
    select p.id, row_number() over (order by p.created_at, p.id) - 1 as rn,
           count(*) over () as total
    from post p join "user" u on u.id = p.author_id
    where u.email like '%@resonance.seed'
  )
  update post p
     set created_at = now()
                    - interval '${sql.unsafe(String(NEWEST_AGE_HOURS))} hours'
                    - (interval '${sql.unsafe(String(SPREAD_DAYS))} days'
                       * (ordered.total - 1 - ordered.rn) / greatest(ordered.total - 1, 1)),
         updated_at = now()
                    - interval '${sql.unsafe(String(NEWEST_AGE_HOURS))} hours'
                    - (interval '${sql.unsafe(String(SPREAD_DAYS))} days'
                       * (ordered.total - 1 - ordered.rn) / greatest(ordered.total - 1, 1))
    from ordered
   where p.id = ordered.id
  returning p.id`;
console.log(`\nre-dated posts: ${posts.length}`);

const articles = await sql`
  with ordered as (
    select a.id, row_number() over (order by a.created_at, a.id) - 1 as rn,
           count(*) over () as total
    from article a join "user" u on u.id = a.author_id
    where u.email like '%@resonance.seed'
  )
  update article a
     set created_at = now()
                    - interval '${sql.unsafe(String(NEWEST_AGE_HOURS))} hours'
                    - (interval '${sql.unsafe(String(SPREAD_DAYS))} days'
                       * (ordered.total - 1 - ordered.rn) / greatest(ordered.total - 1, 1)),
         updated_at = now()
                    - interval '${sql.unsafe(String(NEWEST_AGE_HOURS))} hours'
                    - (interval '${sql.unsafe(String(SPREAD_DAYS))} days'
                       * (ordered.total - 1 - ordered.rn) / greatest(ordered.total - 1, 1)),
         published_at = case when a.published_at is null then null else
                          now()
                        - interval '${sql.unsafe(String(NEWEST_AGE_HOURS))} hours'
                        - (interval '${sql.unsafe(String(SPREAD_DAYS))} days'
                           * (ordered.total - 1 - ordered.rn) / greatest(ordered.total - 1, 1))
                        end
    from ordered
   where a.id = ordered.id
  returning a.id`;
console.log(`re-dated articles: ${articles.length}`);

const [after] = await sql`
  select
    (select count(*)::int from post where created_at > now() - interval '14 days') as posts_in_window,
    (select min(created_at) from post) as oldest,
    (select max(created_at) from post) as newest`;
console.log(`\nposts now inside the 14-day window: ${after.posts_in_window}`);
console.log(`oldest post: ${new Date(after.oldest).toISOString()}`);
console.log(`newest post: ${new Date(after.newest).toISOString()}`);

const [sanity] = await sql`
  select count(*)::int as n from post
  where created_at > now() or created_at < now() - interval '60 days'`;
console.log(`posts with an implausible date (expect 0): ${sanity.n}`);
