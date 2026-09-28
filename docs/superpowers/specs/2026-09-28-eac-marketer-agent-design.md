# EAC Marketer Agent — Design Spec

**Date:** 2026-09-28
**Status:** Approved for planning
**Owner:** LinkedSpaces / Endless Auto Collection marketing effort

## Purpose

Endless Auto Collection (EAC) wants to build a repeatable system, run through Claude Code, for producing car-owner video content that markets the shop's craft and builds a "Build Archive" library on the website. The immediate deadline is one high-production long-form piece (interview + b-roll + car shots) ready before SEMA, then short-form cutdowns for other platforms. Production is not for sale yet — it's a brand asset to show prospective customers and partners what EAC can do.

This spec covers a **skills-only v1**: no autonomous posting, no scheduled jobs, no image/video generation. The "agent" is a Claude Code skill system that a person invokes; it grows by adding sub-skills and refining instructions over time, not by adding infrastructure.

## Non-goals (v1)

- No autonomous social posting or scheduled cron agent
- No AI image/video generation (no thumbnail generation, no image tool wired up)
- No standalone/API-hosted agent outside Claude Code
- Not building a paid-production sales flow (future spec, once the pilot exists)

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

Status values: `idea`, `scheduled`, `filming`, `editing`, `posted`. This sub-skill:
- Adds new rows when a brainstorm brief is created
- Updates status as work progresses (user tells it what changed)
- Can summarize "what's next" or "what's overdue" on request
- Does **not** auto-schedule dates or push to any external calendar — it's a shared, human-edited record

### Sub-skill: `content-engine`

Given finished footage notes / a transcript / raw interview answers (pasted or described by the user — no video processing capability exists here), drafts:
- Long-form video script structure (narrative beats, not word-for-word — this is footage-driven, not scripted-then-shot)
- Short-form cutdown scripts/captions for other platforms, derived from the long-form piece
- **Text-only thumbnail concepts** (described in words for whoever edits, e.g. "close-up of the badge, title lower-third") — no image generation
- Build Archive page copy: specs, build difficulties, owner story, in the site's existing voice — saved to `docs/marketing/build-archives/<car-slug>-archive.md`, ready to hand off for eventual web publishing

All content-engine output is text/markdown. No API calls to image or video models in v1.

## Data flow

1. **Brainstorm** produces a brief for a given car/owner → saved to `docs/marketing/build-archives/`.
2. **Calendar** logs that brief as a row (status: `idea` or `scheduled`).
3. Filming happens outside this system (Will + team, in person).
4. Once footage/notes exist, **content-engine** drafts scripts, captions, and archive copy, referencing the original brief.
5. **Calendar** status updates as pieces move through editing → posted.

## CLAUDE.md addition

A new project-level `CLAUDE.md` is created (none exists today) with a short section:
- Names the `eac-marketer` skill and when to invoke it
- Points to `docs/marketing/content-calendar.md` and `docs/marketing/build-archives/` as the canonical locations
- Notes that this project inherits the global voice/brand standards already defined in the user's global CLAUDE.md — no duplication of those rules

## Testing / validation

Since this is skill-authoring, not application code, "testing" means dry-running each sub-skill against the SEMA pilot car once Will has picked the owner:
- Run `/eac-marketer` → brainstorm for that car → confirm the brief reads like something the team would actually use for the interview
- Confirm the calendar file updates correctly with the new row
- Once any real footage notes exist, run content-engine once to confirm output quality before relying on it

## Growth path (explicitly deferred, not designed here)

- Image/video generation for thumbnails — future spec, once a real need is confirmed
- Scheduled/cron agent for proactive reminders — future spec
- Standalone hosted agent (e.g. Cloudflare Agents SDK) for autonomous posting — future spec, once paid productization also becomes real
