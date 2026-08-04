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
