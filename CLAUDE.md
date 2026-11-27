# Endless Auto Collection

Static site (HTML/JS, Cloudflare Workers via `wrangler.toml`) for an auto detailing, PPF, ceramic, tint, and wrap shop. Brand: "Driven by Detail."

## Business

Fremont, CA. Services: PPF, vinyl wrap, ceramic coating, tint, detailing, mechanical, auto body, smog checks, alignments, car sales.

**Partner: Stillpoint Auto** (stillpointauto.com, @stillpointauto, rent@stillpointauto.com). Private one-on-one track and drift experiences, Fremont-based, "personal by design" voice. Fleet per site (2026-11-16): 2023 BMW M2 (453 hp, manual, track and drift), 2018 Mercedes-AMG GT R (577 hp, DCT, track only), W205 C63 coming. Intro sessions from $349 Thunderhill, $429 Sonoma, $479 Laguna Seca; ride-alongs from $169; drift pricing by inquiry; event insurance not included; one driver per booking. Still `TBD`: legal entity name, how EAC and Stillpoint share credit and revenue, what Stillpoint wants said. Current partner car: AMG GT R, available through about 2026-11-23. Prices come from their public site and can change; confirm before quoting in content. Not affiliated with BMW or Mercedes-Benz, so avoid implying endorsement.

**Monthly car meet** (planned, representing EAC): two racing sims upstairs, coffee, breakfast, spin-the-wheel and sim tournament, prizes. Plan in `docs/marketing/strategy-2026-11-16-still-point-meets-shorts.md`. Venue, capacity, and budget `TBD`.

## Marketing agent

For content, social, video scripts, captions, Build Archive pages, the content calendar, trend research, or post analytics, invoke the `eac-marketer` skill (`/eac-marketer`).

- Calendar: `docs/marketing/content-calendar.md`
- Build archives: `docs/marketing/build-archives/`
- Carousels: `docs/marketing/carousels/YYYY-MM-DD/` (daily scheduled run), style in `docs/marketing/carousel-style.md`
- Design spec: `docs/superpowers/specs/2026-09-28-eac-marketer-agent-design.md`

Business facts, NAP, proof, and say/don't-say live in `docs/marketing/site-brief.md`. Site audit: `python3 scripts/seo_audit.py`.

## Analytics

Own first-party analytics, cookieless, no IP stored. Tracker `js/analytics.js`; Durable Object `analytics.js` (binding `ANALYTICS_STATE`); core logic `analytics-core.mjs`; dashboard `admin/analytics.html` at `/admin/analytics`, JSON at `/admin/analytics.json`.
- Opening `/admin/analytics` on a device sets localStorage `eac.notrack`, so that device stops counting.
- Tests: plain `node --test`.
- Deploy needs migration `v4` (`AnalyticsState`). Nothing deployed yet.
- After the first deploy, spot-check the exit beacon on real cross-page navigation in a real browser.

Voice and brand standards come from the global `~/.claude/CLAUDE.md`. Don't duplicate them here.
