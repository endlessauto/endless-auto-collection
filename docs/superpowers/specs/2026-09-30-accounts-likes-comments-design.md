# User Accounts, Likes & Comments on Build Archive

**Date:** 2026-09-30
**Status:** Approved design, pending implementation plan

## Context

The site is a static HTML site (`endless-auto-collection`) deployed via
Cloudflare Workers static assets (`wrangler.toml`, `[assets] directory = "."`).
There is currently no backend logic, no database, and no concept of a signed-in
user anywhere on the site. The Build Archive (`build-archive.html`,
`build-detail.html`, `build-submit.html`) lets visitors browse submitted car
builds and submit their own (submissions are reviewed by the shop before going
live — see `build-submit.html`'s success copy), but there is no way for a
visitor to create an account, like a build, or leave a comment on one.

This spec adds real accounts and social interactions (likes + comments) to
published builds, backed by a Cloudflare Worker and Cloudflare D1 (SQLite).
This is a new subsystem — it introduces server-side state, auth, and a
database where none existed — so it's scoped as architectural work with its
own spec and implementation plan, separate from the static-mockup rest of the
site.

## Goals

- Any visitor can create an account using just their email (magic link,
  no password) and immediately like or comment on a published build.
- Likes and comments are real, persisted, and visible to all visitors —
  this is live functionality, not a front-end mockup.
- Abuse is manageable: comments post instantly (keeps the archive feeling
  alive) but the shop can hide/delete any comment after the fact.
- The new backend stays inside the existing Cloudflare stack (Workers + D1)
  rather than adding a new vendor for auth or hosting.

## Non-goals

- No password-based login, no OAuth/social login.
- No comment editing (delete-and-repost is enough for a v1).
- No nested replies/threads — a flat comment list per build.
- No notifications (email/push) when someone comments on your build.
- No rate limiting beyond basic per-IP/per-session throttling (see Security).

## Architecture

```
Browser (build-detail.html)
  │  fetch() calls, cookie sent automatically
  ▼
Cloudflare Worker (new: functions under /api/*)
  │  reads/writes
  ▼
Cloudflare D1 (SQLite) — new database "eac-community"
  │  outbound email
  ▼
Resend API (magic-link emails)
```

The existing `wrangler.toml` already defines a Workers-backed static site
(`[assets] directory = "."`). We extend it with a D1 binding and a set of
`/api/*` routes handled by a Worker `fetch` handler that runs *before* falling
through to static assets (Workers with assets support a `run_worker_first`
pattern / explicit route matching — the Worker intercepts `/api/*` and serves
everything else from the asset directory as today).

## Data model (D1 / SQLite)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- uuid
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,       -- defaults to email local-part, editable later
  created_at INTEGER NOT NULL
);

CREATE TABLE magic_links (
  token TEXT PRIMARY KEY,           -- random 32-byte token, url-safe
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,      -- 15 min TTL
  used_at INTEGER                   -- null until consumed
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,           -- random 32-byte token, stored in httpOnly cookie
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL       -- 30 day rolling TTL
);

CREATE TABLE likes (
  build_id TEXT NOT NULL,           -- matches the `slug` key used in BUILDS (e.g. 'bmw-m3')
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (build_id, user_id)   -- one like per user per build
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,              -- uuid
  build_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,               -- max 500 chars, enforced server-side
  created_at INTEGER NOT NULL,
  hidden_at INTEGER                 -- null = visible; set by admin delete
);
```

`build_id` is a plain string matching the slug already used as the URL param
in `build-detail.html` (`?car=bmw-m3`) — builds themselves still live as
static data (the `BUILDS` object) for now; only the social layer is dynamic.
If/when build data itself moves server-side, `build_id` is ready to become a
real foreign key.

## Auth flow (magic link)

1. Visitor clicks **Sign in** (new small account menu in the nav, see UI
   section), enters their email, submits.
2. `POST /api/auth/request-link` — Worker generates a token, inserts into
   `magic_links` (15 min expiry), and calls Resend to send an email like:
   > Subject: Sign in to Endless Auto Collection
   > "Tap below to sign in. This link expires in 15 minutes and can only be
   > used once." → button linking to
   > `https://endlessautocollection.com/api/auth/verify?token=...`
3. Visitor clicks the link (same or different device/tab).
   `GET /api/auth/verify?token=...` — Worker validates the token (exists,
   unused, unexpired), marks it used, finds-or-creates the `users` row for
   that email (first sign-in = account creation, no separate signup step),
   creates a `sessions` row, sets an httpOnly + `Secure` + `SameSite=Lax`
   cookie (`eac_session=<token>`, 30-day expiry), then redirects to
   `/build-archive.html` (or back to the build they came from, via a `next`
   query param captured at step 1).
4. Every subsequent request from the browser automatically carries the
   cookie. `GET /api/me` returns `{ user: null }` or
   `{ user: { id, email, display_name } }` — pages call this once on load to
   decide whether to show "Sign in" or the account menu + comment box.
5. **Sign out**: `POST /api/auth/logout` deletes the session row and clears
   the cookie.

No password is ever stored. A stolen magic link is only useful for 15
minutes and only once.

## Likes

- `POST /api/builds/:id/like` — requires session; inserts into `likes`
  (idempotent: `INSERT OR IGNORE`, since the primary key prevents dupes).
  Returns the new total like count.
- `DELETE /api/builds/:id/like` — requires session; removes the row (unlike).
  Returns the new total.
- `GET /api/builds/:id/likes` — public; returns `{ count, likedByMe }`
  (`likedByMe` only meaningful if a session cookie is present).

## Comments

- `GET /api/builds/:id/comments` — public; returns visible (non-hidden)
  comments, newest first, each with `{ id, body, created_at, author: { display_name } }`.
  No email exposed to other visitors.
- `POST /api/builds/:id/comments` — requires session; body max 500 chars,
  trimmed, rejected if empty; inserts a row; returns the created comment.
  Posts immediately (auto-approve, per the confirmed moderation approach) —
  no queue, no delay.
- `DELETE /api/comments/:id` — **admin only** (see Admin below); sets
  `hidden_at` (soft delete — keeps the record for abuse history, just stops
  rendering it).

There's no `PATCH`/edit endpoint — a user who wants to fix a comment deletes
their own (`DELETE /api/comments/:id` also allowed when `user_id` on the
comment matches the caller, not just for admins) and posts a new one.

## Admin (comment moderation)

No separate admin login system for a v1 — the shop owner's own account is
flagged as admin via a hardcoded allowlist of emails in a Worker environment
variable (`ADMIN_EMAILS`, e.g. `endlessautocollection@gmail.com`). When that
user is signed in, `build-detail.html` renders a small "Hide" control next to
every comment (admin-only, checked via `GET /api/me` returning `isAdmin: true`).
Clicking it calls `DELETE /api/comments/:id`. This avoids building a whole
separate admin panel while still giving the shop a fast way to remove
something abusive.

## Front-end UI/UX

**Nav account menu** (added to every page's nav, matching existing
`.btn`/ghost-button visual language):
- Signed out: a small "Sign in" text link.
- Signed in: a circular avatar-less chip showing the user's display name
  initial, opening a tiny dropdown with "Signed in as <email>" and "Sign out".

**Sign-in modal** (same pattern as the existing `#quote` consultation modal —
a centered card over a dark backdrop):
- Single email field + "Send sign-in link" button.
- After submit: swaps to "Check your email — we sent a link to
  <email>. It expires in 15 minutes." with a "use a different email" reset.
- No separate "sign up" vs "sign in" — entering any email either logs you
  into your existing account or creates one on the spot, exactly like the
  magic-link services users already know (Slack, Notion, etc.).

**Build detail page (`build-detail.html`) additions**, placed below the
existing hero/stats/mods sections, above the footer:
- **Like button**: a heart icon + live count, next to the hero title area.
  Filled/gold when `likedByMe`, outline otherwise. Clicking while signed out
  opens the sign-in modal first (with `next` set to the current build URL so
  the like completes automatically once the magic link is clicked — the
  intended like is remembered in `sessionStorage` across the redirect).
- **Comments section**: heading "Comments (`n`)", a textarea + "Post" button
  (shown only when signed in; when signed out, replaced with a "Sign in to
  leave a comment" prompt that opens the same modal), then the list of
  comments (display name, relative timestamp, body, and a small "×" delete
  control shown only to the comment's author or an admin).

All of this is plain `fetch()` calls from inline `<script>` in
`build-detail.html`, consistent with how the page already fetches nothing
server-side today (it currently renders everything from the static `BUILDS`
object) — this is the first page on the site to talk to a real API.

## Security considerations

- Cookies: httpOnly, `Secure`, `SameSite=Lax` — not readable by JS, not sent
  cross-site, so no token ever touches client-side storage.
- Magic link tokens and session tokens: cryptographically random (32 bytes,
  `crypto.getRandomValues`), single-use for magic links.
- Comment body: HTML-escaped on render (the front end inserts it as text
  content, never `innerHTML`, so no stored-XSS surface).
- Basic abuse throttling: the Worker rate-limits `POST /api/auth/request-link`
  and `POST /api/builds/:id/comments` per IP (e.g. 5/minute) using a small
  in-memory or D1-backed counter — enough to stop obvious spam scripts
  without building a full WAF rule.
- CORS: not needed — the API is same-origin (`/api/*` on the same domain as
  the pages calling it).

## Testing

- Worker unit tests (Vitest, matching Cloudflare Workers testing conventions)
  for each route: magic link issue/verify/expiry, like idempotency,
  comment length validation, admin-only delete authorization.
- Manual end-to-end pass on `build-detail.html`: sign in, like, unlike,
  comment, delete own comment, confirm admin can hide someone else's.

## Open questions for the implementation plan to resolve

- Exact D1 migration tooling (wrangler's built-in `d1 migrations` vs. a
  single bootstrap SQL file) — a mechanical choice, doesn't affect this
  design.
- Whether `display_name` is editable anywhere in v1, or permanently derived
  from the email local-part at account creation (leaning toward the latter
  for v1 — smaller scope, can add an account-settings page later).
