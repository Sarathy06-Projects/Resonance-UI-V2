// Digital Asset Links, served at /.well-known/assetlinks.json.
//
// This is the server half of Android App Links: the manifest's
// autoVerify="true" intent filter is a *claim* that this app opens
// app.resonance.org.in links, and Android only honours it after fetching this
// file over https and finding the package name plus the signing certificate's
// SHA-256 fingerprint listed here. Until then, links open in the browser -
// which is the correct fallback, not a failure.
//
// A route handler rather than public/.well-known/assetlinks.json because the
// fingerprints differ per environment and must not be hardcoded in a file
// that ships to every deployment: the upload key is generated per developer
// and the Play App Signing key belongs to Google. They come from an env var
// instead, so staging and production can claim different keys.
//
// Note this must be reachable without a redirect. Android does not follow one
// while verifying, so /.well-known/assetlinks.json has to answer 200 directly.

import { NextResponse } from "next/server";

const PACKAGE_NAME = "in.org.resonance.app";

// Comma-separated SHA-256 fingerprints, e.g.
//   ANDROID_CERT_FINGERPRINTS="AB:CD:...,12:34:..."
//
// TWO are normally needed and shipping one is the classic mistake:
//   1. the upload key, which signs builds installed by sideload / internal
//      testing, and
//   2. the Play App Signing key Google re-signs with, which is what every
//      Play install actually carries.
// List only one and App Links silently fail for whichever half of your users
// has the other build - and they fail by falling back to the browser, so
// nothing looks broken enough to investigate.
function fingerprints(): string[] {
  const raw = process.env.ANDROID_CERT_FINGERPRINTS ?? "";
  return raw
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
}

export function GET() {
  const certs = fingerprints();

  // An empty array is served rather than a 404 when nothing is configured.
  // Android treats a malformed or missing file as "verification failed" and
  // backs off for a while before retrying; a valid document with no matching
  // cert fails the same check but keeps the endpoint honest and makes the
  // misconfiguration visible to anyone who opens the URL.
  const statements = certs.length
    ? [
        {
          relation: [
            "delegate_permission/common.handle_all_urls",
            // Lets Chrome/Android offer saved Resonance credentials to the
            // app, and vice versa - the app and the site are one account
            // system, so they should share one password entry.
            "delegate_permission/common.get_login_creds",
          ],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: certs,
          },
        },
      ]
    : [];

  return NextResponse.json(statements, {
    headers: {
      "Content-Type": "application/json",
      // Android caches this. An hour is short enough that adding the Play
      // signing key after the first release takes effect the same day,
      // without making every verification a fresh origin hit.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
