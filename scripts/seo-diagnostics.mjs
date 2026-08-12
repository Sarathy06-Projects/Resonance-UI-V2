#!/usr/bin/env node
// Lightweight, dependency-free SEO health check. Run against a live
// deployment (production or a preview URL) after any SEO-related change:
//
//   node scripts/seo-diagnostics.mjs https://app.resonance.org.in
//
// or, with NEXT_PUBLIC_APP_URL already set in the environment:
//
//   node scripts/seo-diagnostics.mjs
//
// Checks robots.txt, the sitemap (index + every sub-sitemap it lists), and
// a handful of key pages for the specific failure modes this app has
// actually hit before (wrong-domain URLs from a silent fallback, a single
// sitemap file exceeding Google's 50,000-URL cap, missing canonical/
// JSON-LD). Not a general Lighthouse/crawler replacement - a fast,
// targeted regression check for this app's own known risk areas.

const baseUrl = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

if (!baseUrl) {
  console.error("Usage: node scripts/seo-diagnostics.mjs <baseUrl>  (or set NEXT_PUBLIC_APP_URL)");
  process.exit(1);
}

const origin = new URL(baseUrl).origin;

let failures = 0;
let warnings = 0;

function pass(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function fail(msg) {
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
  failures++;
}
function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
  warnings++;
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "manual" });
  return { status: res.status, text: res.ok ? await res.text() : "" };
}

function extractAll(text, tagPattern) {
  return [...text.matchAll(tagPattern)].map((m) => m[1]);
}

async function checkRobots() {
  console.log(`\nrobots.txt (${baseUrl}/robots.txt)`);
  const { status, text } = await fetchText(`${baseUrl}/robots.txt`);
  if (status !== 200) {
    fail(`returned HTTP ${status}, expected 200`);
    return;
  }
  pass("reachable (200)");

  if (/User-agent:\s*\*\s*[\s\S]*?Disallow:\s*\/\s*$/im.test(text.split("\n\n")[0] ?? "")) {
    fail("the general 'User-agent: *' block disallows '/' - this blocks Googlebot entirely");
  } else {
    pass("general 'User-agent: *' block does not blanket-disallow '/'");
  }

  // This app deliberately emits one Sitemap: line per content-type file
  // (see app/sitemap.ts's generateSitemaps() split - Next.js does not
  // auto-generate a single /sitemap.xml index for that pattern), so
  // multiple lines are expected, not a warning sign on their own.
  const sitemapLines = extractAll(text, /^Sitemap:\s*(\S+)/gim);
  if (sitemapLines.length === 0) {
    fail("no 'Sitemap:' line found");
  } else {
    const wrongOrigin = sitemapLines.filter((l) => !l.startsWith(origin));
    if (wrongOrigin.length > 0) {
      fail(`Sitemap: line(s) point at a different origin: ${wrongOrigin.join(", ")}`);
    } else {
      pass(`${sitemapLines.length} Sitemap: line(s), all pointing at ${origin}`);
    }
  }

  const uaBlocks = extractAll(text, /^User-agent:\s*(\S+)/gim);
  const uaCounts = uaBlocks.reduce((m, ua) => m.set(ua.toLowerCase(), (m.get(ua.toLowerCase()) ?? 0) + 1), new Map());
  const dupes = [...uaCounts.entries()].filter(([, n]) => n > 1);
  if (dupes.length > 0) {
    fail(`duplicate User-agent blocks: ${dupes.map(([ua, n]) => `${ua} (x${n})`).join(", ")}`);
  } else {
    pass("no duplicate User-agent blocks");
  }

  return sitemapLines;
}

// Checks every sitemap file the robots.txt actually pointed at - not a
// hardcoded /sitemap.xml guess, since this app's generateSitemaps() split
// means there may be several files and no single index.
async function checkSitemap(sitemapUrls) {
  console.log(`\nsitemap file(s) (${sitemapUrls.length} listed in robots.txt)`);
  if (sitemapUrls.length === 0) {
    warn("no sitemap URLs to check (robots.txt had none)");
    return;
  }

  let totalUrls = 0;
  let wrongOrigin = 0;
  let missingLastmod = 0;

  for (const fileUrl of sitemapUrls) {
    const { status, text: doc } = await fetchText(fileUrl);
    if (status !== 200) {
      fail(`${fileUrl} returned HTTP ${status}, expected 200`);
      continue;
    }
    const locs = extractAll(doc, /<loc>([^<]+)<\/loc>/gi);
    const lastmods = extractAll(doc, /<lastmod>([^<]+)<\/lastmod>/gi);

    if (locs.length > 50000) {
      fail(`${fileUrl} has ${locs.length} URLs - exceeds Google's 50,000-per-file cap`);
    } else {
      pass(`${fileUrl}: ${locs.length} URLs`);
    }

    for (const loc of locs) {
      if (!loc.startsWith(origin)) wrongOrigin++;
    }
    missingLastmod += locs.length - lastmods.length;
    totalUrls += locs.length;
  }

  pass(`${totalUrls} total URLs across ${sitemapUrls.length} file(s)`);
  if (wrongOrigin > 0) {
    fail(`${wrongOrigin} URL(s) do not start with ${origin} (wrong-domain sitemap entries)`);
  } else {
    pass(`all URLs share the expected origin (${origin})`);
  }
  if (missingLastmod > 0) {
    warn(`${missingLastmod} URL(s) have no <lastmod> (fine for evergreen entries, worth a glance otherwise)`);
  }
}

async function checkPage(path, { requireJsonLd = true } = {}) {
  const url = `${baseUrl}${path}`;
  console.log(`\n${path === "" ? "/" : path} (${url})`);
  const { status, text } = await fetchText(url);
  if (status !== 200) {
    fail(`returned HTTP ${status}, expected 200`);
    return;
  }
  pass("reachable (200)");

  const canonicalMatch = text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (!canonicalMatch) {
    fail("no <link rel=\"canonical\"> tag found");
  } else if (!canonicalMatch[1].startsWith(origin)) {
    fail(`canonical tag points at a different origin: ${canonicalMatch[1]}`);
  } else {
    pass(`canonical tag present: ${canonicalMatch[1]}`);
  }

  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(text)) {
    fail("no non-empty <meta name=\"description\"> found");
  } else {
    pass("meta description present");
  }

  if (!/<title>[^<]+<\/title>/i.test(text)) {
    fail("no <title> tag found");
  } else {
    pass("<title> tag present");
  }

  const jsonLdBlocks = extractAll(text, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (requireJsonLd && jsonLdBlocks.length === 0) {
    fail("no application/ld+json block found");
  } else if (jsonLdBlocks.length > 0) {
    let allValid = true;
    for (const block of jsonLdBlocks) {
      try {
        JSON.parse(block);
      } catch {
        allValid = false;
      }
    }
    if (allValid) pass(`${jsonLdBlocks.length} JSON-LD block(s), all valid JSON`);
    else fail("one or more JSON-LD blocks are not valid JSON");
  }
}

async function main() {
  console.log(`SEO diagnostics for ${baseUrl}`);
  const sitemapUrls = await checkRobots();
  await checkSitemap(sitemapUrls ?? []);
  await checkPage("");
  await checkPage("/explore");

  console.log(`\n${"-".repeat(40)}`);
  if (failures > 0) {
    console.log(`\x1b[31m${failures} failure(s)\x1b[0m, ${warnings} warning(s)`);
    process.exit(1);
  }
  console.log(`\x1b[32mAll checks passed\x1b[0m (${warnings} warning(s))`);
}

main().catch((err) => {
  console.error("Diagnostics script crashed:", err);
  process.exit(1);
});
