# EAC Marketer Agent — Design Spec

**Date:** 2026-09-28 (amended 2026-10-08)
**Status:** Amended — pending re-approval
**Owner:** LinkedSpaces / Endless Auto Collection marketing effort

## Amendment (2026-10-08)

Scope grew after reviewing a comparable personal content-engine project (8-role pipeline with Notion/Jira, daily cron trend scouting, grading rubric, idea inbox, approval queue). Decision: stay filesystem-only and skills-only (no Notion/Jira, no cron, no subagent pipeline) — but adopt three of its mechanisms that genuinely improve EAC's content-engine sub-skill: a **Content Grader rubric**, an **Idea Inbox**, and an **Approval Queue**. This amendment updates the Content Engine and Calendar sections below accordingly; everything else in the original spec (architecture, non-goals, growth path) stands unchanged.

## Purpose

Endless Auto Collection (EAC) wants to build a repeatable system, run through Claude Code, for producing car-owner video content that markets the shop's craft and builds a "Build Archive" library on the website. The immediate deadline is one high-production long-form piece (interview + b-roll + car shots) ready before SEMA, then short-form cutdowns for other platforms. Production is not for sale yet — it's a brand asset to show prospective customers and partners what EAC can do.

This spec covers a **skills-only v1**: no autonomous posting, no scheduled jobs, no image/video generation. The "agent" is a Claude Code skill system that a person invokes; it grows by adding sub-skills and refining instructions over time, not by adding infrastructure.

## Non-goals (v1)

- No autonomous social posting or scheduled cron agent
- No AI image/video generation (no thumbnail generation, no image tool wired up)
- No standalone/API-hosted agent outside Claude Code
- Not building a paid-production sales flow (future spec, once the pilot exists)
- No Notion or Jira integration — filesystem/markdown only, to avoid new infra/auth before SEMA
- No multi-role subagent pipeline (no separate Trend Scout / Strategist / Creative Director agents) — the umbrella skill + 3 sub-skills structure, run by one person in one session, covers this

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
      content-engine.md       (sub-skill: script/caption/archive drafting)
docs/
  marketing/
    content-calendar.md       (the actual calendar data, git-tracked)
    idea-inbox.md             (raw ideas from Will/team, checked before AI-generated ones)
    approval-queue.md          (checkbox gate — nothing is "ready" without an explicit check)
    content-grader.md          (EAC-specific scoring rubric, reference only)
    build-archives/            (one file per car, once produced)
CLAUDE.md                      (new, project-level — references the agent)
```

### Umbrella skill: `eac-marketer`

Invoked as `/eac-marketer`. Carries:
- Brand voice rules (inherits global CLAUDE.md voice standards: sentence case, no hype, no exclamation points, direct/warm/private-first/effortless)
- Current priority context: SEMA long-form pilot → short-form cutdowns → Build Archive pages
- Dispatch logic: routes the request to the right sub-skill based on what's being asked (new idea → brainstorm; scheduling/status → calendar; drafting from existing footage/notes → content-engine)

This skill does not do the work itself — it's a thin router + shared context holder, so the three sub-skills stay focused and independently testable.

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

## Data flow

1. **Idea Inbox check** — content-engine (and brainstorm, when starting fresh) reads `docs/marketing/idea-inbox.md` first; inbox ideas take priority over anything generated from scratch.
2. **Brainstorm** produces a brief for a given car/owner, tagged with a content pillar → saved to `docs/marketing/build-archives/`.
3. **Calendar** logs that brief as a row (status: `idea`).
4. Filming happens outside this system (Will + team, in person).
5. Once footage/notes exist, **content-engine** drafts scripts, captions, and archive copy, referencing the original brief — every piece is run through the **Content Grader** before being shown to the user; anything below 28/35 is revised and re-graded automatically.
6. Graded drafts stay in staging (calendar status `drafted`) until the user or Will checks them off in `docs/marketing/approval-queue.md`.
7. Approval moves the calendar row to `scheduled`, then `filming`/`editing`/`posted` as work progresses.

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

## Growth path (explicitly deferred, not designed here)

- Image/video generation for thumbnails — future spec, once a real need is confirmed
- Scheduled/cron agent for proactive reminders — future spec
- Standalone hosted agent (e.g. Cloudflare Agents SDK) for autonomous posting — future spec, once paid productization also becomes real
