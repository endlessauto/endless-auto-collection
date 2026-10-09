# EAC Marketer Agent — Design Spec

**Date:** 2026-09-28 (amended 2026-10-08)
**Status:** Amended — pending re-approval
**Owner:** LinkedSpaces / Endless Auto Collection marketing effort

## Amendment 1 (2026-10-08)

Scope grew after reviewing a comparable personal content-engine project (8-role pipeline with Notion/Jira, daily cron trend scouting, grading rubric, idea inbox, approval queue). Decision: stay filesystem-only and skills-only (no Notion/Jira, no subagent pipeline) — but adopt three of its mechanisms that genuinely improve EAC's content-engine sub-skill: a **Content Grader rubric**, an **Idea Inbox**, and an **Approval Queue**. This amendment updates the Content Engine and Calendar sections below accordingly.

## Amendment 2 (2026-10-08)

The user wants the agent able to analyze social media analytics, actively bounce ideas, and keep strategy tied to business growth, while freeing up their time. This adds two capabilities not covered by Amendment 1, and reverses part of the original "no cron" non-goal:
- A **Research** sub-skill — trend/competitor/format research — runs both on-demand and on a **daily schedule** (a scheduled cloud routine, not a separate hosted service), writing a dated brief and sending a push notification when ready. This is the one exception to "skills-only, no automation": the schedule just triggers this one skill in the same way a manual invocation would, it doesn't stand up new infrastructure.
- A **Performance** sub-skill — the user manually pastes/describes analytics (views, saves, shares, retention) for a posted piece; no Instagram/Meta API integration (that remains a non-goal — would require EAC to stand up its own Meta Developer app first). Findings feed back into the next research brief and into content-engine's pillar/idea decisions.

Everything else in the original spec and Amendment 1 stands.

## Purpose

Endless Auto Collection (EAC) wants to build a repeatable system, run through Claude Code, for producing car-owner video content that markets the shop's craft and builds a "Build Archive" library on the website. The immediate deadline is one high-production long-form piece (interview + b-roll + car shots) ready before SEMA, then short-form cutdowns for other platforms. Production is not for sale yet — it's a brand asset to show prospective customers and partners what EAC can do.

This spec covers a **skills-only v1**: no autonomous posting, no scheduled jobs, no image/video generation. The "agent" is a Claude Code skill system that a person invokes; it grows by adding sub-skills and refining instructions over time, not by adding infrastructure.

## Non-goals (v1)

- No autonomous social *posting* — the only scheduled piece is the Research sub-skill's daily run; nothing publishes anywhere on its own
- No AI image/video generation (no thumbnail generation, no image tool wired up)
- No Instagram/Meta Graph API integration — analytics are manually provided by the user; standing up a Meta Developer app is a future decision, not part of this build
- No standalone/API-hosted agent outside Claude Code
- Not building a paid-production sales flow (future spec, once the pilot exists)
- No Notion or Jira integration — filesystem/markdown only, to avoid new infra/auth before SEMA
- No multi-role subagent pipeline (no separate always-running Strategist / Creative Director agents) — one umbrella skill with five focused sub-skills, invoked by one person (plus the single scheduled Research run), covers this

## Context (from site review)

- Brand voice: precise, transparent, no-hype ("Driven by Detail"), documentation over hard-sell — matches the global CLAUDE.md voice rules already in force for LinkedSpaces products.
- Current site has Services / Process / FAQ / Instagram — no blog or build-story pages. Instagram is currently the only "live feed."
- This repo has no `.claude/` directory or project `CLAUDE.md` yet.

## Architecture

```
.claude/
  skills/
    eac-marketer/
      SKILL.md              (umbrella skill — persona, dispatch, brand voice)
      brainstorm.md          (sub-skill: interview/story brainstorming)
      calendar.md             (sub-skill: content plan & calendar)
      content-engine.md       (sub-skill: script/caption/archive drafting + grading)
      research.md              (sub-skill: trend/competitor research — manual + scheduled)
      performance.md           (sub-skill: manual analytics input + feedback loop)
docs/
  marketing/
    content-calendar.md       (the actual calendar data, git-tracked)
    idea-inbox.md             (raw ideas from Will/team, checked before AI-generated ones)
    approval-queue.md          (checkbox gate — nothing is "ready" without an explicit check)
    content-grader.md          (EAC-specific scoring rubric, reference only)
    trend-briefs/               (dated research briefs, one per day it's run)
    build-archives/            (one file per car, once produced)
CLAUDE.md                      (new, project-level — references the agent)
```

### Umbrella skill: `eac-marketer`

Invoked as `/eac-marketer`. Carries:
- Brand voice rules (inherits global CLAUDE.md voice standards: sentence case, no hype, no exclamation points, direct/warm/private-first/effortless)
- Current priority context: SEMA long-form pilot → short-form cutdowns → Build Archive pages
- Dispatch logic: routes the request to the right sub-skill based on what's being asked (new idea → brainstorm; scheduling/status → calendar; drafting from existing footage/notes → content-engine; "what's trending" → research; "how did this post do" → performance)

This skill does not do the work itself — it's a thin router + shared context holder, so the five sub-skills stay focused and independently testable.

### Sub-skill: `brainstorm`

Wraps `superpowers:brainstorming` with EAC-specific framing:
- Given a car + owner (or "we have someone in mind"), generates candidate story angles: what's interesting about this build, what tension/difficulty to explore, what the owner's relationship to the car is
- Produces an **interview question set** tailored to that angle (not generic — tied to the specific car/build history)
- Produces a **shot list** categorized into: interview setup, b-roll (car detail shots), action/driving shots, environment/location shots
- Output is a single markdown brief per car, saved under `docs/marketing/build-archives/<car-slug>-brief.md`

### Sub-skill: `calendar`

Reads and writes `docs/marketing/content-calendar.md` — a single markdown table:

| Date | Car / Owner | Asset | Platform | Status | Notes |
|------|-------------|-------|----------|--------|-------|

Status values: `idea`, `drafted`, `scheduled`, `filming`, `editing`, `posted`. A row only advances from `drafted` to `scheduled` once it's checked off in `docs/marketing/approval-queue.md`. This sub-skill:
- Adds new rows when a brainstorm brief is created
- Updates status as work progresses (user tells it what changed)
- Can summarize "what's next" or "what's overdue" on request
- Does **not** auto-schedule dates or push to any external calendar — it's a shared, human-edited record

### Sub-skill: `content-engine`

Given finished footage notes / a transcript / raw interview answers (pasted or described by the user — no video processing capability exists here), drafts:
- Long-form video script structure (narrative beats, not word-for-word — this is footage-driven, not scripted-then-shot)
- Short-form cutdown scripts/captions for **Instagram and YouTube** (Shorts), derived from the long-form piece
- **Text-only thumbnail concepts** (described in words for whoever edits, e.g. "close-up of the badge, title lower-third") — no image generation
- Build Archive page copy: specs, build difficulties, owner story, in the site's existing voice — saved to `docs/marketing/build-archives/<car-slug>-archive.md`, ready to hand off for eventual web publishing

All content-engine output is text/markdown. No API calls to image or video models in v1.

**Content pillars** (every idea/piece is tagged with one):

| Pillar | Purpose |
|--------|---------|
| **Build Stories** | Interview-driven long-form + cutdowns about a specific car and owner (the SEMA pilot's category) |
| **Process & Craft** | Behind-the-scenes of PPF/ceramic/detailing work itself — precision and process, "Driven by Detail" |
| **Shop & Team** | Who EAC is — the people, the space — builds familiarity before a visit |
| **Education** | VLT explainers, what PPF protects against, FAQ-driven content — same spirit as the tint.html comparison tool |

**Idea Inbox** (`docs/marketing/idea-inbox.md`): Will or anyone on the team drops raw ideas here, any format, no structure required. content-engine checks this file first, before generating its own ideas, and builds inbox ideas before anything AI-generated. If an idea conflicts with brand voice rules (e.g. hype language, exclamation points), it's not silently dropped — it's flagged with the conflict and a compliant rewrite suggestion.

**Content Grader** (`docs/marketing/content-grader.md`, reference doc): every drafted piece is scored 0–35 before being shown to the user:

| Score | Verdict | Action |
|-------|---------|--------|
| 28–35 | PUSH | Include as-is |
| 20–27 | REVISE | Rewrite the weak part (usually the hook), re-grade, show only the revised version |
| Below 20 | REWRITE | Scrap and redraft, re-grade, show only the rewritten version |

Scoring criteria (EAC-specific, adapted from the personal project's rubric): brand voice fit (sentence case, no hype, no exclamation points, active voice), hook strength (does the first line earn the next five seconds), specificity (real car/build details, not generic car content), and platform fit (does the format match how Instagram vs. YouTube actually consumes this).

**Approval Queue** (`docs/marketing/approval-queue.md`): content-engine never marks anything "ready to film/post" on its own. Drafted pieces land in staging (the calendar row stays at `idea` or `drafted`); the user or Will checks off what they approve in this file, which is the only thing that moves a piece to `scheduled`/`ready` status in the calendar.

### Sub-skill: `research`

Runs a web search covering: trending car-build/detailing content formats, competitor shop activity, automotive culture moments worth tapping into, and (once any exist) follow-ups on ideas from past performance notes. Summarizes findings in 3–5 bullets, tagged to the content pillar they're most relevant to.

- **On-demand:** invoked directly ("what's trending in car detailing content right now") — writes nothing by itself, just answers in chat, unless the user asks it to save the findings.
- **Scheduled:** a daily cloud routine (configured via this session's scheduling tooling, not a separate hosted service) invokes this sub-skill once a day. Output is saved to `docs/marketing/trend-briefs/trend-brief-YYYY-MM-DD.md`, and a push notification is sent when it's ready. This is the only automated/unattended piece in the system — it only researches and writes a file; it never drafts content, touches the calendar, or posts anything.
- **Tie-in to content-engine:** when content-engine runs without inbox ideas to prioritize, it reads the most recent trend brief (if one exists from the last 7 days) and uses it as inspiration context, same priority tier as its own from-scratch idea generation — inbox ideas still come first.

### Sub-skill: `performance`

The user (or Will) provides analytics for a posted piece — pasted numbers, a described screenshot, or a rough summary ("the build story reel did way better than our average, lots of saves"). This sub-skill:
- Produces a short analysis: what likely worked (hook, pillar, format, timing), compared to what's typical for that pillar/platform if prior data exists
- Suggests 2–3 hook or format variations to try next, based on what worked
- Appends a short performance note to the relevant row in `docs/marketing/content-calendar.md` (Notes column) so the history stays in one place
- Feeds the insight into the next **research** run — real performance data outranks generic trend-search findings when the two conflict

No API calls — this sub-skill only processes what the user explicitly gives it.

## Data flow

1. **Research** runs daily (scheduled) and writes a dated trend brief + push notification; can also be run on demand anytime.
2. **Idea Inbox check** — content-engine (and brainstorm, when starting fresh) reads `docs/marketing/idea-inbox.md` first; inbox ideas take priority over anything generated from scratch or from the trend brief.
3. **Brainstorm** produces a brief for a given car/owner, tagged with a content pillar → saved to `docs/marketing/build-archives/`.
4. **Calendar** logs that brief as a row (status: `idea`).
5. Filming happens outside this system (Will + team, in person).
6. Once footage/notes exist, **content-engine** drafts scripts, captions, and archive copy, referencing the original brief and (if relevant) the latest trend brief — every piece is run through the **Content Grader** before being shown to the user; anything below 28/35 is revised and re-graded automatically.
7. Graded drafts stay in staging (calendar status `drafted`) until the user or Will checks them off in `docs/marketing/approval-queue.md`.
8. Approval moves the calendar row to `scheduled`, then `filming`/`editing`/`posted` as work progresses.
9. After posting, the user runs **performance** with real analytics; the note is appended to the calendar row and the insight feeds the next research run.

## CLAUDE.md addition

A new project-level `CLAUDE.md` is created (none exists today) with a short section:
- Names the `eac-marketer` skill and when to invoke it
- Points to `docs/marketing/content-calendar.md` and `docs/marketing/build-archives/` as the canonical locations
- Notes that this project inherits the global voice/brand standards already defined in the user's global CLAUDE.md — no duplication of those rules

## Testing / validation

Since this is skill-authoring, not application code, "testing" means dry-running each sub-skill against the SEMA pilot car once Will has picked the owner:
- Run `/eac-marketer` → brainstorm for that car → confirm the brief reads like something the team would actually use for the interview, and is tagged with the right content pillar
- Confirm the calendar file updates correctly with the new row
- Drop a test idea into `docs/marketing/idea-inbox.md` and confirm the next content-engine run picks it up first
- Once any real footage notes exist, run content-engine once and confirm the Content Grader scores it sensibly (not rubber-stamping everything PUSH)
- Confirm a drafted piece only advances to `scheduled` after being checked in `docs/marketing/approval-queue.md`
- Run `research` manually once, confirm the output reads as genuinely useful (not generic filler), then set up the daily schedule and confirm a trend brief + push notification actually arrive the next morning
- Feed `performance` a made-up example analytics description and confirm the note lands correctly on the right calendar row

## Growth path (explicitly deferred, not designed here)

- Image/video generation for thumbnails — future spec, once a real need is confirmed
- Instagram/Meta Graph API integration for automatic analytics pulls — future spec, once EAC has a Meta Developer app set up
- Standalone hosted agent (e.g. Cloudflare Agents SDK) for autonomous posting — future spec, once paid productization also becomes real
