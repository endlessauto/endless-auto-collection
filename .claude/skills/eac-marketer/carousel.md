# Carousel generator

Builds Instagram carousels as self-contained HTML files, ready to screenshot. Runs daily on a schedule and on demand ("make a carousel about X").

## Read first, every run

| File | Why |
|------|-----|
| `../SKILL.md` (this skill's router) | Brand voice, pillars, hard limits |
| `docs/marketing/carousel-style.md` | Visual rules: palette, type, slide types, photos |
| `docs/marketing/carousels/template/reference.html` | The build to copy. Same `<head>`, CSS, inline background sphere and markup |
| `docs/marketing/content-grader.md` | Score every carousel before saving |
| `docs/marketing/idea-inbox.md` | Team ideas come first |
| Latest `docs/marketing/trend-briefs/` file from the last 7 days | Inspiration, same tier as your own ideas |
| `docs/marketing/youtube-catalog.md` | What already performed, what's already posted |
| Every file in `docs/marketing/carousels/` from the last 14 days | Don't repeat a topic or hook |

Do not write copy before reading the brand voice in `SKILL.md`.

## Task

Per run, build 4 carousels:

- 1 × 1-slide post: one statement worth sharing
- 1 × 3–5 slide post: a quick, specific point
- 2 × 8–10 slide posts: save-worthy education or process, with different hook types

Save to `docs/marketing/carousels/YYYY-MM-DD/` (America/Los_Angeles date):

```
1-slide-<slug>.html
3-slide-<slug>.html   (use the real count: 3, 4 or 5)
8-slide-<slug-a>.html (use the real count: 8, 9 or 10)
9-slide-<slug-b>.html
```

## Daily angle

| Day | Pillar | Angle |
|-----|--------|-------|
| Monday | Education | The decision: ceramic vs PPF vs wrap vs tint, which one for which owner |
| Tuesday | Process & Craft | How we do one step, and why that way |
| Wednesday | Build Stories | A real car from `docs/marketing/build-archives/`, the catalog, or the site guides |
| Thursday | Education | Limits: what a service doesn't do, myths, when we'd say no |
| Friday | Shop & Team | The people and the shop. Afterhours tone allowed |
| Saturday | Process & Craft | Transformation: before and after on an ordinary car (our strongest format so far) |
| Sunday | Education | Aftercare: washing, maintenance, keeping the result |

Use the day's angle for at least the two long carousels. If it isn't fresh, pull from the inbox or the latest brief. Tag each carousel with exactly one pillar.

## Structure

```
Slide 1      HOOK         3–8 words. Current belief vs the true contrast. On-target: an owner knows it's for them
Slide 2      TRANSITION   One sentence. Why keep swiping
Slides 3–8   CONTENT      One point per slide
Slide 9      INSIGHT      The reframe worth saving
Slide 10     CTA          One action that follows from what was taught
```

- 3–5 slides: Hook, Transition, 1–2 content, Insight or CTA.
- 1 slide: statement only. The CTA lives in the caption.
- The two long posts use different hook types (for example Contrarian and Process, or Limit and Story).

## Copy rules

- Headline: max 10 words per slide. Supporting line: max 18 words.
- Sentence case, active voice, no exclamation points anywhere, no hype words, no FOMO.
- Gold `<b>` on 1–3 key words per content slide.
- Teach the decision, not the service. Say what a service doesn't do.
- Specific over generic: name the car, the step, the tool.
- Never invent specs, prices, timelines, legal limits, owner quotes, or results. If a number isn't in this repo (site pages, guides, build archives, catalog), leave it out or mark it `TBD` in the brief's open items. California tint limits need a statute check before use.
- "Endless" or "Endless Auto Collection" for the shop. Never "EAC" in public copy.

## TikTok title

Every carousel gets a TikTok photo-post title, shown in the brief box directly above the caption.

- Under 90 characters, sentence case, no exclamation points, no hype, no emoji.
- SEO: the primary search phrase an owner would type ("paint correction", "ceramic coating vs ppf", "tint percentages") goes in the first words. Add the city ("Fremont, CA") when it fits in the limit.
- It must name the real topic and promise only what the slides deliver. No bait, no invented claims.
- Same topic as the caption, different words. Use the primary keyword once in the title, once in the caption's first sentence, and in one hashtag.

## CTA assets

Point to a real page. Status must be `exists` unless the user says otherwise.

| Topic | Asset | Status |
|-------|-------|--------|
| Tint | `endlessautocollection.com/tint` (shade comparison) | exists |
| PPF | `endlessautocollection.com/ppf` | exists |
| Ceramic | `endlessautocollection.com/ceramic` | exists |
| Wraps | `endlessautocollection.com/wraps` | exists |
| Detailing, correction | `endlessautocollection.com/detailing` | exists |
| Mechanical | `endlessautocollection.com/mechanical` | exists |
| DIY guides | `endlessautocollection.com/f80-m3-differential-bushing`, `/bilstein-b16-strut-assembly` | exists |
| Anything else | Consultation via the site | exists |

Never imply a lead magnet, DM flow or email list exists.

## Build

- Start from `reference.html`. Keep the Google Fonts link, `:root` tokens, CSS and the inline `.sph-bg` SVG unchanged. Never use `<use href>` references; they vanish in the PNG export. Only add CSS when a layout truly needs it.
- Photo and logo `src` values are full live-site URLs (`https://www.endlessautocollection.com/images/...`), never relative paths, so the HTML renders when opened from an email. Only use files listed in `carousel-style.md` or found in `images/` and already deployed. Never hotlink stock or generate images.
- Each slide sits in `.sw` with a `.sn` label, the `.slide`, then a `.shot-note`.
- The `.brief` box at the top holds: format, pillar, hook type (with current belief vs true contrast), angle source, TikTok title (bold label `TikTok title:`, directly above the caption), caption with 4–6 hashtags (always `#fremontca`), CTA asset and status, grade, open items, supporting photos.

## Grade

Score each carousel with `content-grader.md`. 32–40 save. 23–31 revise the weak part and re-grade. Below 23 rewrite. Put the final score and one line on why in the brief. If all four score PUSH on the first pass, grade again more strictly.

## Quality checklist

All carousels:
- [ ] Every slide background is `--black`, except the insight slide (`--graphite`)
- [ ] Gold is accent only, no gold fills behind text
- [ ] Headlines in Archivo wide, supporting text in Inter
- [ ] Gradient (`.metal`) text on slide 2 only
- [ ] Content slides left-aligned with `.num`, `.bar`, 1–3 gold keywords
- [ ] No headline over 10 words, no supporting line over 18
- [ ] Logo image (`.flogo`) bottom-left on slides 2–9 and top-left on slide 1. No typed ENDLESS, no sphere in the corners
- [ ] CTA slide has the full logo image (`.logo`) and exactly one action with a real URL
- [ ] Only repo photos, each listed in "Supporting photos"
- [ ] A `.shot-note` below every slide, nothing production-related inside a slide
- [ ] No exclamation points, no hype, sentence case
- [ ] TikTok title under 90 characters, primary keyword first, directly above the caption in the brief
- [ ] No invented numbers; every unverified fact is in open items

Hook slide:
- [ ] Setup phrase in Inter, hero words in Archivo within the size table in `carousel-style.md`
- [ ] No hero line wraps mid-phrase

1-slide posts:
- [ ] `.tb`, `.sph-bg`, `.hd`, `.st`, `.cb`, `.flogo` all present

Per run:
- [ ] 1 × 1-slide, 1 × 3–5 slide, 2 × 8–10 slide with different hook types
- [ ] No topic repeated from the last 14 days of carousels

## Stage, don't approve

After saving, add one unchecked line per carousel to `docs/marketing/approval-queue.md`:

```
- [ ] Carousel (Instagram): <title> (`docs/marketing/carousels/YYYY-MM-DD/<file>.html`)
```

Never check a box, never edit the calendar, never post.

## PNG export

Every carousel file must keep the `<!-- PNG export: do not remove -->` block (style plus two scripts) from `template/reference.html`, copied unchanged just before `</body>`. It adds a "Download as PNG" button under each slide and a "Download all slides" button above the deck. Exports are 1080×1350 PNGs. Don't rename `.slide`, `.sw` or `.deck`.

## Email delivery (scheduled runs)

Gmail attachments need the whole file passed through the send call, which fails at this size. Publish unlisted preview copies and email links instead.

1. Copy the day's 4 HTML files to `carousels-preview/YYYY-MM-DD/` (same file names) and commit them with the carousel folder. The site serves them at `https://www.endlessautocollection.com/carousels-preview/YYYY-MM-DD/<file>.html`. `_headers` marks the path noindex and `robots.txt` disallows it.
2. After pushing, email the day's carousels to endlessautocollection@gmail.com only, with the Gmail `send_message` tool. Do not attach files.
3. Subject: `EAC carousels YYYY-MM-DD: <strongest hook, under 60 characters>`.
4. Plain text body (no Markdown symbols): per carousel, the full preview URL on its own line, then file name, format, pillar, hook, grade, TikTok title, caption, open items. Then one line on whether the push to main succeeded, and one line: "Previews go live a minute or two after the push. Open the links in a browser to view and screenshot the slides."
