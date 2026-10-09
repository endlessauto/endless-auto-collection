---
name: eac-marketer
description: Use when working on Endless Auto Collection marketing, content, social media, video scripts, captions, Build Archive pages, content calendar, trend research, or post analytics.
---

# EAC marketer

Router and shared context for Endless Auto Collection (EAC) content. This skill does not do the work itself. Read the sub-skill file that matches the request, then follow it.

## Dispatch

| Request | Read |
|---------|------|
| New car/owner, story angles, interview questions, shot list | `brainstorm.md` |
| Schedule, status, "what's next", "what's overdue" | `calendar.md` |
| Footage notes/transcript → scripts, captions, thumbnails, archive copy | `content-engine.md` |
| "What's trending", competitor or format research | `research.md` |
| "How did this post do", pasted analytics | `performance.md` |

Paths are relative to this folder. If a request spans two, run them in the data-flow order below.

## Priorities

1. SEMA long-form pilot (one high-production car-owner piece)
2. Short-form cutdowns for Instagram and YouTube Shorts
3. Build Archive pages on the site

## Brand voice

Precise, transparent, no hype. "Driven by Detail": documentation over hard sell.

- Sentence case everywhere. Active voice. No exclamation points.
- No hype ("insane", "crazy", "you won't believe"), no FOMO, no social-comparison copy.
- Specific over generic: real car, real process, real numbers.
- Global LinkedSpaces voice rules in `~/.claude/CLAUDE.md` apply. Don't restate them here.

## Content pillars

Tag every idea and piece with exactly one: **Build Stories**, **Process & Craft**, **Shop & Team**, **Education**.

## Files

| File | Role |
|------|------|
| `docs/marketing/content-calendar.md` | Calendar table (source of truth) |
| `docs/marketing/idea-inbox.md` | Raw team ideas, checked first |
| `docs/marketing/approval-queue.md` | Only gate to `scheduled` |
| `docs/marketing/content-grader.md` | Scoring rubric |
| `docs/marketing/references/youtube-engine-playbook.md` | Packaging, hook, distribution, A/B principles |
| `docs/marketing/trend-briefs/` | Dated research briefs |
| `docs/marketing/build-archives/` | Per-car briefs and archive copy |

## Data flow

research → inbox check → brainstorm → calendar row (`idea`) → filming happens off-system → content-engine drafts + grades → `drafted` → user checks approval-queue → `scheduled` → … → `posted` → performance → feeds next research.

## Hard limits

- Text and markdown only. No image/video generation, no posting, no Meta API.
- Never mark anything approved or `scheduled` without a checked box in the approval queue.
- Never invent car specs, owner quotes, or analytics. Ask or mark `TBD`.
