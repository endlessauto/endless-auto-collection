# Admin Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A first-party, cookieless analytics tracker for the public site plus an `/admin/analytics` dashboard showing top pages, top CTAs, exit pages, bounce, sources, devices and a funnel.

**Architecture:** A small browser script (`js/analytics.js`) beacons events to `POST /api/analytics/e`, handled by a new `AnalyticsState` Durable Object (SQLite, one instance named `main`). Pure logic (validation, bot/device detection, aggregation) lives in `analytics-core.mjs` so `node --test` covers it. `worker.js` serves an admin-only `GET /admin/analytics.json` and the page `admin/analytics.html`.

**Tech Stack:** Cloudflare Workers + Durable Objects (SQLite), vanilla JS, `node --test` (no package.json exists; Node built-in runner only).

**Spec:** `docs/superpowers/specs/2026-11-25-admin-analytics-design.md`

## Global Constraints

- No cookies, no IP stored, no UA stored (UA only read to derive `dev` and drop bots), no third-party scripts.
- Skip tracking on `/admin*`, bots, devices with `localStorage["eac.notrack"]==="1"`, and when `navigator.doNotTrack==="1"`.
- Session id lives in `sessionStorage["eac.sid"]` only.
- Raw events kept 90 days; prune older rows.
- Dashboard windows: 7, 30, 90 days (rolling); day buckets in `America/Los_Angeles`.
- Admin auth reuses `isSignedIn` in `worker.js`; analytics JSON and page return `NO_STORE` headers.
- Admin UI matches `admin/index.html` dark styling (copy its `<style>` variables; red accent `#e11d2e`).
- UI copy: sentence case, no exclamation points, no hype. Label counts "Visits", never "Unique visitors".
- CSP already allows same-origin `connect-src`; do not edit `_headers`.
- Work only in worktree `/Users/ybstudio/EndlessAutoCollection-analytics` on branch `feat/admin-analytics`. Do not deploy.

## Review Focus

1. Empty database or window with no events: dashboard shows zeros and "No data yet", never `NaN` or a crash.
2. Visit whose tab is killed before `leave` fires: counts as a visit and pageview, excluded from average time.
3. Bounce definition: one pageview and zero CTA clicks. A one-page visit that clicked "call" is not a bounce.
4. Internal referrer (`endlessautocollection.com`) and missing referrer both become source `direct`; `utm_source` wins over referrer.
5. Hostile or malformed beacon (huge body, bad sid, `/admin` path, unknown type, bot UA) is dropped without writing and never returns 5xx.

---

### Task 1: Core logic (`analytics-core.mjs`)

**Files:**
- Create: `analytics-core.mjs`
- Test: `tests/analytics-core.test.mjs`

**Interfaces:**
- Produces:
  - `normalizePath(p: unknown): string | null` returns lowercase path without query, hash, `.html`, or trailing slash (`/index` and `""` become `/`); null if not a string starting with `/`, longer than 120 chars, or starting with `/admin`.
  - `deviceFromUa(ua: string): "mobile" | "tablet" | "desktop"`
  - `isBot(ua: string): boolean` (empty UA counts as bot)
  - `sanitizeEvent(body: unknown, ua: string): { sid: string; type: "pv"|"cta"|"leave"; path: string; src: string; cta: string; val: number; scroll: number; dev: string } | null`. Body shape `{s, t, p, r?, c?, v?, y?}`. `s` must match `/^[a-z0-9]{8,32}$/`; `src` is lowercase host or utm value, max 60 chars, default `"direct"`, and `endlessautocollection.com` hosts become `"direct"`; `cta` matches `/^[a-z0-9-]{1,40}$/` and is required when `t==="cta"`; `val` is clamped to 0..1800000 ms; `scroll` is clamped to 0..100.
  - `summarize(rows: EventRow[], now: number, days: 7|30|90): Stats`
    - `EventRow = { ts: number; sid: string; type: string; path: string; src: string; dev: string; cta: string; val: number; scroll: number }`
    - `Stats = { days, visits, pageviews, bounceRate /*0..1*/, avgTimeSec, topPages: {path,views,exits,exitRate,avgTimeSec,avgScroll}[] /*max 15, by views desc*/, topCtas: {cta,clicks}[] /*max 15*/, sources: {src,visits}[], devices: {dev,visits}[], funnel: {home,service,cta}, daily: {day:"YYYY-MM-DD",visits,pageviews}[] /*one per day in window, oldest first*/ }`
    - Funnel counts visits that viewed `/`, then of those the visits that viewed any of `/ppf /ceramic /tint /detailing /wraps /mechanical`, then of those the visits with any `cta` event.
    - Exit page of a visit is the path of its last `pv` by `ts`. Source and device of a visit come from its first event.

- [ ] **Step 1: Write failing tests** in `tests/analytics-core.test.mjs` using `node:test` and `node:assert/strict`. Cover: `normalizePath("/PPF.html?x=1#a")==="/ppf"`, `"/index.html"→"/"`, `"/admin/emails"→null`, `"ppf"→null`; `isBot("Googlebot/2.1")`, `isBot("")` true and an iPhone Safari UA false; `deviceFromUa` for iPhone, iPad, Mac Chrome; `sanitizeEvent` returns null for bad sid, `/admin` path, unknown type, cta type without `c`, bot UA; returns `src:"direct"` for `r:"www.endlessautocollection.com"`; `summarize([], now, 7)` has zeros, `bounceRate===0`, `avgTimeSec===0`, and 7 `daily` entries; a two-visit fixture asserts visits, pageviews, bounce (1 pv + cta is not a bounce), exit rate for the exit page, `topCtas` order, funnel `{home:2,service:1,cta:1}`, avg time ignoring visits with no `leave`.
- [ ] **Step 2: Run** `node --test tests/` from the worktree. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the five exports in `analytics-core.mjs` per the signatures above. Use `Intl.DateTimeFormat("en-CA", {timeZone:"America/Los_Angeles"})` for day keys. Guard every division.
- [ ] **Step 4: Run** `node --test tests/`. Expected: all PASS.
- [ ] **Step 5: Commit** `git add analytics-core.mjs tests/analytics-core.test.mjs && git commit -m "Analytics: core validation and aggregation"` (end message with the `Co-Authored-By` line from the session attribution).

### Task 2: Durable Object, ingest endpoint, admin JSON

**Files:**
- Create: `analytics.js` (exports `AnalyticsState`)
- Modify: `worker.js` (import/export `AnalyticsState`; add routes), `wrangler.toml` (binding `ANALYTICS_STATE`, migration `v4` with `new_sqlite_classes = ["AnalyticsState"]`)
- Test: manual via `wrangler dev` (DO cannot run under node)

**Interfaces:**
- Consumes: `sanitizeEvent`, `summarize` from Task 1.
- Produces:
  - `POST /api/analytics/e` (public): body ≤ 600 bytes (worker returns 413 above, checks `content-length`), only POST (405 otherwise). Always responds `204` for accepted or silently dropped events; `400` only for unparsable JSON.
  - `GET /admin/analytics.json?days=7|30|90` (admin-only, default 7, invalid value becomes 7): returns `Stats` JSON with `NO_STORE` headers.
  - Table `events(id INTEGER PRIMARY KEY, ts INTEGER, sid TEXT, type TEXT, path TEXT, src TEXT, dev TEXT, cta TEXT, val INTEGER, scroll INTEGER)` with indexes on `ts` and `sid`.
  - `AnalyticsState extends DurableObject` with `fetch(request)` routing on pathname. Per-sid cap: ignore inserts when that sid already has 300 events. Prune rows older than 90 days when the last prune was over 24h ago (store timestamp in `ctx.storage.kv` or a `meta` table). Aggregation reads rows where `ts >= now - days*864e5`, limit 200000.

- [ ] **Step 1: Implement** `analytics.js` following the `RaffleState` pattern in `raffle.js` (constructor creates tables via `this.sql`).
- [ ] **Step 2: Wire** `worker.js`: `import { AnalyticsState } from "./analytics.js"`, add to the `export {}` line, route `/api/analytics/e` to `env.ANALYTICS_STATE.get(env.ANALYTICS_STATE.idFromName("main"))`, and in `handleAdmin` (after the signed-in check) route `/admin/analytics.json` to the same stub. Add the page route `/admin/analytics` mirroring the `/admin/emails` asset branch.
- [ ] **Step 3: Update** `wrangler.toml` with the binding and migration `v4`.
- [ ] **Step 4: Verify locally.** Create `.dev.vars` with `ADMIN_USER=t` and `ADMIN_PASS=t` (do not commit; confirm it is gitignored or add to `.git/info/exclude`). Run `npx wrangler dev --port 8799`. Then:
  - `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:8799/api/analytics/e -H "user-agent: Mozilla/5.0 (iPhone) Safari" -d '{"s":"abcd1234ef","t":"pv","p":"/ppf"}'` expects `204`.
  - Same with `"p":"/admin"` expects `204` and no row written.
  - `curl -i localhost:8799/admin/analytics.json` without cookie expects the login page (200 HTML with "Team sign in"), not JSON.
  - Log in via `curl -c jar -d "username=t&password=t" localhost:8799/admin/login`, then `curl -b jar "localhost:8799/admin/analytics.json?days=7"` expects JSON with `visits: 1`, `pageviews: 1`.
  - Body over 600 bytes expects `413`; invalid JSON expects `400`.
- [ ] **Step 5: Commit** `git add analytics.js worker.js wrangler.toml && git commit -m "Analytics: Durable Object, ingest and admin JSON"`.

### Task 3: Browser tracker (`js/analytics.js`)

**Files:**
- Create: `js/analytics.js`
- Test: `tests/tracker.test.mjs`

**Interfaces:**
- Produces: classic script (no module syntax) that, when loaded in a browser, tracks automatically; and when `typeof module !== "undefined"`, exports `{ classifyCta(href: string, el?: {dataset?: {cta?: string}}): string | "" }`.
  - `classifyCta` returns `data-cta` value if present, else: `tel:` → `call`, `sms:` → `text`, `mailto:` → `email`, `maps.apple.com` or `google.com/maps` → `directions`, `app.shopmonkey.cloud` → `book-online`, path `/raffle` → `raffle`, otherwise `""` (not a CTA).
  - Browser behavior: on load send `{s,t:"pv",p:location.pathname,r:<utm_source or external referrer host>}`; delegated `click` listener walks up to the nearest `a` or `[data-cta]` and sends `{t:"cta",c}` when classified; on `visibilitychange→hidden` and `pagehide` send one `{t:"leave",v:<ms visible>,y:<max scroll %>}`. Use `navigator.sendBeacon("/api/analytics/e", JSON.stringify(...))` with `fetch(..., {keepalive:true})` fallback; wrap everything in try/catch so tracker errors never reach the page. Skip entirely for `/admin` paths, `eac.notrack`, and Do Not Track.
  - New `sid` per `sessionStorage` session: 16 chars from `crypto.getRandomValues`, lowercase alphanumeric.

- [ ] **Step 1: Write failing test** `tests/tracker.test.mjs` using `createRequire` to load `js/analytics.js`: assert `classifyCta("tel:+15107097097")==="call"`, `sms:`→`text`, a maps.apple.com URL→`directions`, `/raffle`→`raffle`, `/ppf`→`""`, and `data-cta="get-quote"` overrides everything.
- [ ] **Step 2: Run** `node --test tests/`. Expected: FAIL for tracker tests.
- [ ] **Step 3: Implement** `js/analytics.js`. Guard browser-only code with `typeof window !== "undefined"` so `require` in Node does not execute tracking.
- [ ] **Step 4: Run** `node --test tests/`. Expected: all PASS.
- [ ] **Step 5: Commit** `git add js/analytics.js tests/tracker.test.mjs && git commit -m "Analytics: browser tracker"`.

### Task 4: Dashboard page and admin card

**Files:**
- Create: `admin/analytics.html`
- Modify: `admin/index.html` (add card inside the `data-t="site"` section, same markup as the neighboring `.item` links, `href="/admin/analytics"`, title "Analytics", description "Pages, clicks and where visitors leave.", `data-k="analytics traffic pages clicks cta bounce exits visitors"`)

**Interfaces:**
- Consumes: `GET /admin/analytics.json?days=` returning `Stats` (Task 1/2).
- Produces: page that on load sets `localStorage["eac.notrack"]="1"` (so team devices stop counting), fetches stats for the selected window (7/30/90 toggle, default 7), and renders: KPI row (Visits, Pageviews, Bounce rate, Avg time on page); daily visits bar chart (inline SVG); tables for Top pages (views, exit rate, avg time, avg scroll), Top CTAs, Exit pages (top pages sorted by `exits`), Sources, Devices; and a three-step funnel (Visited home → Viewed a service page → Clicked a CTA, with counts and percent of previous step). Empty state "No data yet. Visits show up here within a minute." Footer note: "Visits are counted per browsing session. We use no cookies and store no IP addresses." Back link to `/admin`.

- [ ] **Step 1: Build** `admin/analytics.html` with vanilla JS and the admin dark styles; use `textContent` (never `innerHTML` with data) because paths and sources are visitor-supplied.
- [ ] **Step 2: Add** the card to `admin/index.html`.
- [ ] **Step 3: Verify** with `wrangler dev`: seed 3 visits using the curl pattern from Task 2 (include a `cta` and a `leave` event), sign in, open `http://localhost:8799/admin/analytics`, confirm KPIs, tables, funnel and the 7/30/90 toggle render and the console has no errors; open with an empty DB and confirm the empty state. Capture a screenshot if a browser tool is available.
- [ ] **Step 4: Commit** `git add admin/analytics.html admin/index.html && git commit -m "Analytics: admin dashboard page"`.

### Task 5: Install tracker on public pages

**Files:**
- Modify: every root-level `*.html` except `raffle1.html` (team raffle admin) — insert `<script src="/js/analytics.js" defer></script>` immediately before `</body>`
- Test: `tests/pages-tagged.test.mjs`

**Interfaces:**
- Consumes: `/js/analytics.js` (Task 3).

- [ ] **Step 1: Write failing test** `tests/pages-tagged.test.mjs`: read every `*.html` in the repo root; assert each contains exactly one `/js/analytics.js` script tag except `raffle1.html`, which must contain none; assert no file under `admin/` or `EACMedia/` contains it.
- [ ] **Step 2: Run** `node --test tests/`. Expected: FAIL listing untagged pages.
- [ ] **Step 3: Insert** the tag in each page with a small script run once (do not commit the script). Spot-check `git diff --stat` shows one-line changes per page.
- [ ] **Step 4: Run** `node --test tests/`. Expected: all PASS.
- [ ] **Step 5: Verify end to end** with `wrangler dev`: load `http://localhost:8799/ppf` in a browser, click the call link, navigate away, then check `/admin/analytics.json` shows the pageview, a `call` CTA and the leave time.
- [ ] **Step 6: Commit** `git add -A -- '*.html' tests/pages-tagged.test.mjs && git commit -m "Analytics: install tracker on public pages"`.

### Task 6: Hand-off notes

**Files:**
- Modify: `CLAUDE.md` (one short "Analytics" paragraph: where the tracker, DO and dashboard live, that `eac.notrack` is set by opening `/admin/analytics`, and that deploy needs migration `v4`)

- [ ] **Step 1: Add** the paragraph. **Step 2: Run** `node --test tests/` expecting all PASS. **Step 3: Commit** `git add CLAUDE.md && git commit -m "Docs: analytics notes"`.

---

## Self-review notes

- Spec coverage: pageviews, CTAs, exits, bounce, sources, devices, funnel, date toggle, admin card, auth, no cookies/IP, tracker on every public page except admin: Tasks 1–5.
- Deviations from the design doc, both deliberate: (1) raw events only, no daily rollups, which is enough at this traffic and removes a moving part; (2) CTAs are auto-classified from `tel:`, `sms:`, maps, Shopmonkey and `/raffle` links, with `data-cta` as an optional override, so we avoid editing buttons on every page.
