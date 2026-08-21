# Known gotchas

## Dev server: routes 404 after running a long time

Symptom: `npm run dev` still prints "Ready", `/` loads fine, but every other
route (`/explore`, `/profile/[username]`, `/article/[id]`, etc.) returns
Next's built-in 404 page at the framework level - not the app's own
not-found UI, and not a data-fetching error. This is a known Turbopack
dev-mode persistent filesystem cache corruption issue, more common on
Windows and on sessions left running for hours.

`turbopackFileSystemCacheForDev` is disabled in `next.config.ts` specifically
to prevent this. If it still happens:

```
npm run dev:reset
```

(kills nothing - just wipes `.next` and restarts `next dev`; if the old
process is still holding the port, stop it first).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
