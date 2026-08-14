# Resonance — Backend Requirements for Production

Derived from a full read of every page, layout, and component in the app (`app/`, `components/`, `store/`, `lib/mock-data.ts`) as of 2026-07-29. Everything below is inferred directly from what the UI already renders, filters, sorts, toggles, or links to — not speculative feature creep. Where the UI implies logic that doesn't exist yet (e.g. ranking, trending, search), it's flagged as an **Algorithm**.

Auth (Neon + Drizzle + Better Auth) is already implemented — not repeated here except where other domains depend on `user.id`.

---

## 1. Data Model

Entities inferred from `lib/mock-data.ts`, `store/useDataStore.ts`, and every page that renders user/content data.

### User (extends the existing Better Auth `user` table)
Currently has: `id, name, email, username, bio, role, image`. Production profile page (`app/(main)/profile/[username]/page.tsx`) needs far more:

| Field | Source | Notes |
|---|---|---|
| `coverImage` | profile banner | upload target |
| `company` | "Principal Product Designer at Acme Corp" | |
| `location` | "San Francisco, CA" | |
| `websiteUrl` | profile link | |
| `toolbox` | string[] | "Designer Toolbox" tags (Figma, Framer...) |
| `interests` | string[] | overlaps with onboarding topic selection |
| `badges` | computed or admin-assigned | Verified Designer / Top Writer / Design Mentor — see Algorithm 12 |
| `verified` | boolean | blue check |
| Cached counters | `postsCount, articlesCount, followersCount, followingCount, totalLikesCount, articleReadsCount` | denormalized, see Algorithm 16 |

### Follow
`followerId, followingId, createdAt` — unique on `(followerId, followingId)`. Drives `toggleFollow`, "Following" feed tab, "Who to follow" exclusion, mutual-follower counts on `RightPanel`/`Explore`.

### Post
`id, authorId, content, images[], createdAt, hashtags[], linkedArticleId?, type (discussion|showcase|feedback), visibility (public|followers|private), badge?`. Type-specific fields from `create/page.tsx`: `feedbackType, urgency, figmaLink` (feedback mode), `toolsUsed, portfolioLink` (showcase mode). Counters: `likesCount, commentsCount, sharesCount, bookmarksCount` (denormalized, Algorithm 16).

### Article
`id, authorId, title, preview, content (rich HTML), coverImage, tags[], status (draft|published), publishedAt, readTime (computed, Algorithm 6), likesCount, commentsCount, bookmarksCount, viewsCount`.

### Comment
`id, targetType (post|article), targetId, parentId?, authorId, content, createdAt, likesCount, isPinned`. One level of nesting shown in UI (`CommentThread` builds a `parentId → replies[]` map) — schema should support arbitrary depth even if UI only renders one level today.

### Like / Bookmark
Generic polymorphic tables: `(userId, targetType: post|article|comment, targetId, createdAt)`, unique on the triple. Backs `toggleLike`, `toggleBookmark`, `toggleCommentLike`.

### Repost
`(userId, postId, createdAt)` — the `Repeat2` icon exists on every `PostCard` with a live count but **no store action wires it yet**. Needs a table + endpoint even though the frontend hook isn't written.

### Hashtag
Not a first-class stored entity today — extracted from `post.hashtags[]` string array. For production, hashtags should be **parsed server-side from post content on publish** (Algorithm 14), not client-supplied, with a `hashtag_counts` materialized view for `trendingHashtags` (Algorithm 2).

### Notification
`id, recipientId, actorId?, type (like|reply|mention|follow|article_published|system), targetType?, targetId?, isRead, createdAt`. The UI's `category` (`likes/replies/mentions/follows/articles/system`) maps directly to `type`. The `Today/Yesterday/Earlier this week` grouping is a client-side bucketing of `createdAt` — server just needs accurate timestamps.

### Draft
`id, authorId, mode (discussion|showcase|feedback|article), title, content, status (In Progress|Outline|...), coverImage?, lastEditedAt`. `app/(main)/drafts/page.tsx` and the autosave indicator in `create/page.tsx` (`"Draft saved {time}"`) both assume server-persisted drafts — currently 100% client `setTimeout` mock.

### Collection (bookmarks)
`collections/page.tsx` currently just shows all mock posts/articles under "Saved Posts"/"Saved Articles" tabs. Minimum viable: reuse the `Bookmark` table filtered by `targetType`. If named/custom collections (folders) are wanted later, add a `Collection` table + `CollectionItem` join — nothing in the current UI requires that yet, only the two hardcoded tabs.

### Secondary/discovery entities (currently static mock arrays, need real tables eventually)
- `Community` (`id, name, icon, membersCount`) — `suggestedCommunities`, buttons are disabled "Coming Soon" but schema should exist.
- `Event` (`id, title, date, attendeesCount`) — `upcomingEvents` widget, "Register" button unwired.
- `DesignChallenge` (`id, title, participantsCount, deadline`) — "Join Challenge" button unwired.
- `Resource` (`id, title, type`) — `popularResources` widget, read-only links.
- `Topic` — curated list used in onboarding (`allTopics`), explore "Browse Topics", and create-post topic chips. Distinct from hashtags: topics are a **fixed taxonomy**, hashtags are **freeform user text**.

---

## 2. API Surface

Grouped by domain. All mutating endpoints require the Better Auth session; anonymous users can read public feed/profile/article data (matches current `isAuthenticated ? action : openAuthModal()` gating pattern throughout the UI).

### Users & Profile
- `GET /api/users/:username` — full profile payload (user + counters + badges)
- `PATCH /api/users/me` — name, username, bio, company, location, websiteUrl, toolbox, interests (`settings/page.tsx` "Save Changes", profile "Edit Profile")
- `POST /api/users/me/avatar`, `POST /api/users/me/cover` — signed upload (profile "Change Cover", onboarding avatar upload)
- `GET /api/users/check-username?value=` — debounced availability check (onboarding shows a live checkmark after 3+ chars — currently fake)
- `GET /api/users/:id/followers`, `GET /api/users/:id/following`
- `POST /api/users/:id/follow`, `DELETE /api/users/:id/follow`
- `GET /api/users/recommended` — "Who to follow" / "Featured Designers" (Algorithm 3)
- `DELETE /api/users/me` — account deletion ("Danger Zone" button exists, unwired)
- `PATCH /api/users/me/password` — "Change Password" button exists, unwired
- `POST /api/auth/forgot-password` — login page links to `/reset-password`, route doesn't exist yet and Better Auth's email/password flow needs this wired

### Feed
- `GET /api/feed?tab=foryou|following&cursor=&limit=` — ranked/chronological feed (Algorithm 1), cursor pagination (Algorithm 20)
- Discovery module injection ("Featured Designers" after post #2, "Popular Articles" after post #4) can stay a client-side layout concern, but the module *contents* (`GET /api/users/recommended`, `GET /api/articles/popular`) are server endpoints.

### Posts
- `POST /api/posts` — create (discussion/showcase/feedback modes, all fields from `create/page.tsx`)
- `GET /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`, `DELETE /api/posts/:id/like`
- `POST /api/posts/:id/bookmark`, `DELETE /api/posts/:id/bookmark`
- `POST /api/posts/:id/repost`, `DELETE /api/posts/:id/repost` (not wired in UI yet, but the button and count exist)
- `GET /api/posts/:id/comments`

### Articles
- `POST /api/articles` — create/publish, from `ArticleEditor` (Tiptap HTML output) + cover image + tags
- `GET /api/articles/:id`
- `PATCH /api/articles/:id`
- `DELETE /api/articles/:id`
- `POST/DELETE /api/articles/:id/like`, `/bookmark` (article page has these buttons rendered but static — no store wiring at all today)
- `POST /api/articles/:id/view` — idempotent-per-session view increment (Algorithm 23)
- `GET /api/articles/popular`

### Comments (generic across posts/articles)
- `POST /api/comments` — `{ targetType, targetId, parentId?, content }`
- `POST /api/comments/:id/like`, `DELETE /api/comments/:id/like`
- `PATCH /api/comments/:id/pin` — author-only, and pinning one comment must unpin any other on the same post (see `togglePinComment` mock logic — atomic swap, not independent toggles)
- `DELETE /api/comments/:id`

### Drafts
- `GET /api/drafts`
- `PUT /api/drafts/:id` — upsert, debounced autosave target
- `DELETE /api/drafts/:id`
- `POST /api/drafts/:id/publish` — converts draft → published article/post

### Collections / Bookmarks
- `GET /api/collections?type=posts|articles`
- Reuses `POST/DELETE /api/{posts,articles}/:id/bookmark` above — no separate write path needed

### Hashtags & Topics
- `GET /api/hashtags/:tag/posts?cursor=`
- `GET /api/hashtags/trending` (Algorithm 2)
- `GET /api/topics` — curated taxonomy for onboarding/create/explore

### Explore / Search
- `GET /api/search?q=&type=posts|articles|users|hashtags&cursor=` — powers the unified search bar that currently client-filters three separate mock arrays by substring match (Algorithm 4)
- `GET /api/search/recent` / `POST /api/search/recent` — "Recent Searches" dropdown is hardcoded, needs per-user search history
- `GET /api/communities/suggested`, `GET /api/events/upcoming`, `GET /api/challenges/current`, `GET /api/resources/popular` — all currently static arrays, low priority but same shape needed whenever they go live

### Notifications
- `GET /api/notifications?category=&cursor=`
- `GET /api/notifications/unread-count` — drives the pulsing red dot on the nav bell, currently hardcoded `hasUnread: true`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `PATCH /api/notifications/:id` — mute/save actions exist as hover buttons in the UI, currently no-ops
- Push channel: WebSocket or SSE subscription for live badge updates (Infra section)

### Onboarding
- `POST /api/onboarding/complete` — `{ role, topics[], name, username, bio }`, single transaction that also seeds initial feed personalization signal (Algorithm 21)

---

## 3. Algorithms & Business Logic

Numbered for cross-reference from the sections above.

1. **Feed ranking ("For You" vs "Following").** "Following" is a simple reverse-chron filter on followed authors (with an explicit empty state already built). "For You" needs actual ranking — recency decay + engagement (likes/comments/bookmarks velocity) + affinity (shared topics from onboarding/interests) — not just chronological, or "For You" is indistinguishable from "Following" minus the filter.
2. **Trending hashtags.** Rolling-window post count per hashtag with a velocity/growth component (mirrors the "↑ 18%" growth badges already shown in `RightPanel`'s "Trending Topics" — that growth number needs a real time-series comparison, not a hardcoded string).
3. **Recommendation ("Who to follow" / "Featured Designers").** Exclude already-followed users; rank by mutual-follower count, topic/interest overlap, and recent activity. Appears in three places (`RightPanel`, `Explore`, home feed discovery module) — should be one shared endpoint.
4. **Search relevance.** Multi-entity (posts, articles, users, hashtags) fuzzy/substring search with ranked results and a genuine "no results" path. Postgres full-text search (`tsvector`) is the minimum viable option; consider Meilisearch/Typesense if search becomes a core surface.
5. **Notification grouping.** Bucket by `Today / Yesterday / Earlier this week` from `createdAt` — purely a formatting concern, but must be done consistently (server timestamp, client or server timezone-aware bucketing).
6. **Read-time estimation.** `words / 200 wpm`, already prototyped client-side in `create/page.tsx` (`Math.max(1, Math.ceil(wordCount / 200))`) — move this to the server at publish time so it's consistent and not spoofable, store as `readTime` on the article.
7. **Relative timestamp formatting.** "2h ago", "Just now", "1d ago" — server should store real `createdAt` and either the client formats it (with a shared util) or server pre-formats; either way this needs to be systematized, not per-component string literals like the mock data has.
8. **Comment threading & ordering.** Pinned comment first, then newest-first, replies nested one level under `parentId`. `togglePinComment`'s mock logic unpins every other comment on the same post when pinning a new one — that atomicity must be preserved server-side (single transaction, not two round trips).
9. **"Liked by creator" badge.** Whether the post/article author has liked a given comment — computed as `EXISTS(Like WHERE targetId = comment.id AND userId = post.authorId)`, not a stored boolean (avoids drift if the author unlikes).
10. **Autosave / draft diffing.** Debounced (the UI already debounces 1s client-side) upsert to the draft record; consider optimistic concurrency (updatedAt check) if the same draft could be edited from two tabs.
11. **Rate limiting / anti-spam.** Posting, commenting, following-in-bulk — none of this exists in the UI's mental model today (it assumes every action succeeds instantly) but is required before this is public.
12. **Badge/verification assignment.** "Verified Designer", "Top Writer", "Design Mentor" — needs either admin tooling or automated criteria (e.g. Top Writer = top-N by article engagement in a rolling window). Currently hardcoded per mock user.
13. **Mention parsing.** `@username` inside post/comment content → resolve to a user → fire a "mentioned you" notification. Referenced in notification mock data but no compose-time mention detection/autocomplete exists in `CreatePostInput` yet — needs both the parser and (eventually) an `@`-autocomplete UI.
14. **Hashtag extraction.** Parse `#tag` tokens from post content server-side on publish rather than trusting a client-supplied `hashtags[]` array (current mock data hand-authors this array — not safe for user-generated content).
15. **Image upload & processing.** Avatars, cover images, post images, article covers all need presigned upload (S3/R2/Cloudinary-style), server-side validation (type/size), and resizing/thumbnail generation — every `<img>` in the app currently points at hardcoded Unsplash/pravatar URLs.
16. **Denormalized counters.** `likesCount/commentsCount/bookmarksCount/sharesCount` on posts and articles must be maintained atomically (increment/decrement in the same transaction as the Like/Comment/Bookmark row) and be idempotent against double-clicks/retries — the current Zustand mock just does `likes: isLiked ? likes - 1 : likes + 1` with no concurrency concerns at all.
17. **Mutual follower count.** `mutualFollowers: 12`-style stat on `RightPanel`/`Explore` designer cards — needs `COUNT(followers of X who are also followed by viewer)`.
18. *(intentionally reserved — merged into 12)*
19. **Weekly digest generation.** Scheduled job that aggregates followed-community activity and trending articles into the "system" notification category (`systemData.title/description/cta` in the notification mock) — needs a cron/worker, not a request-time computation.
20. **Cursor-based pagination.** Feed, explore sections, comments, notifications, drafts, hashtag pages — all currently render full unpaginated mock arrays. "Load More Feed" spinner is already in the UI with no real pagination behind it.
21. **Onboarding → feed personalization.** The topics selected in step 2 of onboarding (`selectedTopics`, min 5 required) currently go nowhere — they should seed the affinity signal used by Algorithm 1.
22. *(intentionally reserved)*
23. **Article view tracking.** `12.4K` views shown per article — increment once per user/session (not per page load) to avoid trivial inflation; dedupe key `(userId or sessionId, articleId, day)`.

---

## 4. Real-time & Infrastructure

- **Object storage** (S3/Cloudflare R2/Cloudinary) for avatars, cover images, post images, article covers — nothing is uploaded anywhere today, every image URL in the app is an external hardcoded link.
- **Image processing pipeline** — resize/thumbnail on upload (feeds need small thumbnails, article pages need full-res).
- **Search index** — Postgres `tsvector`/`GIN` index at minimum; dedicated engine if search becomes a primary surface.
- **Notification delivery** — WebSocket or SSE channel per authenticated user for the live unread badge; falls back to polling `GET /api/notifications/unread-count` if real-time isn't prioritized for v1.
- **Background job queue** (e.g. a simple cron table or a queue like BullMQ/Inngest) for: trending hashtag recomputation, weekly digest generation, badge/verification recalculation, counter reconciliation.
- **Email delivery** — password reset (`/reset-password` is linked but doesn't exist), weekly digest, possibly email verification on signup.
- **Rate limiting middleware** — per-user/per-IP on write endpoints (post, comment, follow, like).
- **Content moderation** — at minimum a profanity/spam filter on publish; a report/flag system doesn't exist in the UI at all yet and should be scoped separately before public launch.
- **CDN** in front of object storage for image delivery.

---

## 5. Known UI-only Dead Ends (no backend today, no store action either)

Quick reference for things that render in the UI but currently do nothing on click — useful as a checklist when wiring each domain above:

- Login page "Forgot password?" link → route doesn't exist
- Settings "Change Password", "Save Changes", "Delete Account"
- Profile "Edit Profile", "Change Cover", "Message" button
- Article page like/comment/bookmark/share buttons (static counts, no store)
- Post card repost/share buttons
- `CreatePostInput` image/list/emoji buttons
- `create/page.tsx` cover image upload, all formatting toolbar buttons (mock only — real rich text lives in `ArticleEditor`/Tiptap but `create/page.tsx` uses a plain `<textarea>` instead of it, worth reconciling)
- Notification hover actions: mark-as-read works, "Save"/"Mute"/"View Profile" do not
- Notification settings gear icon
- Collections "Remove from Saved"
- Drafts "Preview", "Delete Draft"
- Explore search "Recent Searches" (hardcoded strings, not real history)
- Community/Event/Challenge/Resource CTAs ("Coming Soon", "Register", "Join Challenge") — intentionally disabled or no-op

---

## 6. Suggested Build Order

1. **Users & Follows** — profile CRUD, follow/unfollow, avatar/cover upload. Unlocks profile page and follow-gated UI across the app.
2. **Posts + Likes/Bookmarks/Comments** — the core feed loop. Includes hashtag extraction and denormalized counters (Algorithms 14, 16).
3. **Feed ranking + pagination** (Algorithms 1, 20) — replace the flat mock array powering `/`.
4. **Articles + Drafts** — publishing flow, autosave, read-time (Algorithm 6).
5. **Notifications** — table + polling endpoint first, real-time channel later.
6. **Search + Explore** (Algorithm 4) — once there's enough real content to search.
7. **Recommendations + Trending** (Algorithms 2, 3) — need real engagement data to be meaningful; sequence after step 2-3 have live traffic.
8. **Moderation, rate limiting, digest jobs** — pre-launch hardening pass.

---

## 7. Android Push Notifications

Added 2026-08-14, when the Capacitor Android shell (`../resonanceandroidapp`)
landed. This is the one backend gap the Android app has; everything else it
needs already exists.

The web app receives notifications over SSE (`GET /api/notifications/stream`),
which only works while a tab is open. That is the whole reason push is needed
on mobile — a phone with the app backgrounded has no stream.

### `POST /api/notifications/devices`

Authenticated. Body `{ token: string, platform: "android" | "ios" }`.

**Upsert on `(userId, token)`**, not insert: the client re-sends the same token
on every launch, because FCM can rotate a token at any time and re-asserting
the current one is the only way to notice.

```
device_tokens(
  id, user_id, token UNIQUE, platform,
  created_at, last_seen_at
)
```

### `DELETE /api/notifications/devices`

Body `{ token }`. Called on sign-out, so a signed-out phone stops receiving
another account's notifications.

### Sending

Wherever a `notification` row is written today, also look up the recipient's
device tokens and send via `firebase-admin`:

```js
await messaging.sendEachForMulticast({
  tokens,
  notification: { title, body },
  // The client navigates to data.path. It must be a same-origin relative path
  // — the client rejects anything else, because a push payload is
  // attacker-influenceable as soon as user content is reflected into it.
  data: { path: `/post/${postId}` },
  android: { priority: "high", notification: { channelId: "resonance_general" } },
});
```

Prune tokens returning `messaging/registration-token-not-registered`;
uninstalled apps otherwise accumulate forever.

Keep the SSE stream — it is faster than a push round trip when the app is
already in the foreground, and it is what browsers use.

### Secrets

The Firebase service account JSON goes in the backend environment (Azure App
Service → Configuration). Never in a repository, and never in the APK: anything
shipped in an APK is extractable, and an FCM service account can notify every
user of the app.

Client side is already done — see `lib/api/notifications.ts`
(`registerPushToken` / `unregisterPushToken`) and
`components/providers/NativeShell.tsx`. Until these endpoints exist the client
calls 404 and are swallowed, so nothing breaks; push simply does not arrive.
