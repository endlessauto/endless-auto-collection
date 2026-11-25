# Admin analytics dashboard

## Intent
See how visitors use the site (top pages, top CTAs, where they leave, bounce) so we can improve pages and UX. First-party, cookieless, private.

## Goals
- Pageviews, visitors, bounce rate, avg time on page
- Top pages, top CTAs (`data-cta`), exit pages and exit rate per page
- Traffic sources (referrer, UTM), devices
- Funnel: home -> service page -> CTA click
- 7 / 30 / 90 day toggle
- New "Analytics" card in `/admin` Website section, behind existing admin login

## Non-goals / anti-goals
Heatmaps, session replay, per-person profiles, cookies, IP storage, third-party scripts, off-site booking conversion.

## Constraints
- Cloudflare Worker + Durable Objects (SQLite), same pattern as `RaffleState`/`PotluckState`
- Admin auth reuses `eac_admin` cookie in `worker.js`
- Static HTML pages; tracker is one `js/analytics.js` script tag per public page
- Skip `/admin`, bots, and the owner's own device (localStorage opt-out flag)
- Branch `feat/admin-analytics` from `origin/main`, worktree `../EndlessAutoCollection-analytics`

## Approaches
1. **First-party tracker + Durable Object (chosen).** Full control, no cookies, fits privacy stance and existing stack. Cost: build the dashboard ourselves; unique visitors approximate.
2. Cloudflare Web Analytics beacon. Free and easy, but no custom CTA/exit/funnel data and no in-admin dashboard.
3. Third-party (GA, Plausible, PostHog). Richest, but cookies/consent, external data, and the dashboard is not in `/admin`.

## Decisions
- `POST /api/analytics/e` (public, size-limited, `sendBeacon`) -> `AnalyticsState` DO (id "main")
- `GET /admin/analytics.json?days=` (admin-only) -> aggregated stats; `admin/analytics.html` renders it
- Session id in `sessionStorage`; no IP stored; events: pageview, cta, scroll, leave (time + max scroll)
- Raw events kept 90 days; older rows pruned
- Tracker on every public page except `/admin` (including unlinked Friday Friendsgiving page; my call, owner did not specify)
- `data-cta` added to existing call/text/quote/directions/raffle/RSVP buttons

## Left to the builder
Exact event schema, SQL aggregation, chart styling (match existing admin dark theme), CTA naming list, bot filter heuristics.
