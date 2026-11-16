# EAC Media Panel — design

Date: 2026-11-16. Status: awaiting approval.

## Intent

One local control panel for the AI media team. Each skill in `eac-marketer` becomes a button. The user clicks instead of typing prompts, drops YouTube Studio screenshots into a drop zone for audits, and the results flow back into the skill and MD files so the team keeps improving.

Why: the skills work but live in markdown and a terminal. Prepping a video means remembering trigger phrases and file paths. The panel should make "I'm about to publish" a single click.

## Goals

- Click **Prepare YouTube** and get the full publish package (keywords, titles, thumbnail text, description, tags, Short, pinned comment, end screen) with copy buttons.
- Drag and drop Studio analytics screenshots; get an audit and a proposed update to `performance.md`, `youtube-catalog.md`, and the channel audit.
- Separate buttons: **Short Form Scriptor**, **Shoot Briefings** (opens `/EACMedia`), **Weekly Studio Paste**, **Research**, **Carousels**, **Calendar**, **SEO page**.
- Zero per-click API cost: runs on the Claude Code subscription.
- Skills and MD files stay the single source of truth. The panel adds no logic of its own.

## Non-goals

- Phone or remote access (approach B, later).
- Auth, multi-user, hosting.
- Posting to any platform, image or video generation (existing hard limits).
- Replacing the daily scheduled run. The panel is the manual front door.

## Anti-goals

- A second copy of skill instructions in the panel. If a skill changes, the button must pick it up with no panel edit.
- Skills silently rewriting themselves. Changes to skill files are proposed and approved by the user, never auto-applied.
- Anything under `docs/` or `.claude/` becoming public.

## Constraints

- `wrangler.toml` serves `.` as public assets. `docs/`, `.claude/`, and `scripts/` are already in `.assetsignore`. The panel lives in `panel/` and **gets added to `.assetsignore`** so it never deploys.
- Runs only on the user's Mac. Needs `claude` (2.1.195, in nvm path) and Python 3 (installed).
- Headless runs have no one to answer questions, so every button must pass the inputs the skill would normally ask for.
- Never invent specs, quotes, or analytics. Existing rule; the panel passes it through.

## Approaches considered

- **A. Local panel on the Mac, buttons run `claude -p`. Chosen.** No cost per click, no auth, no hosting.
- B. Website panel behind Cloudflare Access with the Mac as worker. Anywhere access, but a queue, runner and auth first. Deferred; the job interface below keeps it open.
- C. Website panel calling the Claude API. Per-token cost, skills rebuilt as prompts. Rejected.

## Design

**Stack (my call):** Python 3 standard library server plus one `index.html` with vanilla JS. No installs, no build step. Matches `scripts/*.py` already in the repo. Binds to `127.0.0.1` only.

**Layout:** `panel/server.py`, `panel/index.html`, `panel/jobs.json` (button definitions), `panel/inbox/` (dropped screenshots, gitignored), `panel/runs/` (job logs, gitignored). Start with `python3 panel/server.py`; opens the browser.

**Buttons are data.** `jobs.json` maps each button to: label, a prompt template, the form fields it needs, allowed tools, and model. Adding a button is a JSON edit.

**Run flow:** click → small form for missing inputs (for Prepare YouTube: video name or draft, shoot date, chapters/SRT, links) → server runs `claude -p "<prompt>"` in the repo with `--allowedTools` scoped to that job → streams progress to the panel → output lands in its normal file (e.g. `docs/marketing/publish/`) → the panel renders that file with copy buttons per section.

**Job interface:** the front end only calls `POST /jobs`, `GET /jobs/<id>`, `GET /jobs/<id>/stream`. B can later swap the transport without touching the buttons.

**Screenshot drop zone:** accepts multiple images, saves to `panel/inbox/<date>/`, then runs the audit job: Claude reads the images, follows `performance.md` batch mode, and writes a dated audit file. It also writes a **proposed changes** file (edits to `performance.md`, `publish.md`, playbooks, with the evidence for each). The panel shows each proposal with Apply / Skip; Apply edits the file.

**Weekly Studio paste:** same drop zone with a "weekly" tag and a reminder on the panel when the last paste is over 7 days old.

**Token optimization:**
- Prompts are fixed and name the exact files to read; no open-ended exploration.
- Each job pins a model: cheaper for scriptor and calendar, stronger for audits.
- Outputs are saved; the panel shows the latest run and re-runs only on request.
- Screenshots are downscaled before reading when over a size threshold.

**Visual:** reuse the `/EACMedia` look (`deck.css`) so it reads as part of the same system. Dark, one card per team member grouped by pipeline stage: Research → Plan → Shoot → Package → Publish → Learn.

## Open items for the builder

- The Short Form Scriptor, lead log, and event playbook from the earlier list don't exist as skill files yet. The panel gets a button for each once the file exists; the Scriptor is the first to add (`content-engine.md`).
- Exact `--allowedTools` and permission flags per job: builder verifies against `claude -p` behavior and picks the narrowest working set.
- Streaming format: builder picks `--output-format stream-json` or polling.

## My calls (change any)

- Python stdlib over Node.
- Panel in `panel/`, gitignored runs and inbox, `.assetsignore` updated.
- Audit proposals need explicit Apply; nothing self-edits.
- **Approved scope (2026-11-16): three buttons only.** Prepare YouTube, Audit (drop zone), Short Form Scriptor. Shoot Briefings, Research, Carousels and the rest are out until the user has used the panel for two weeks and keeps opening it. The Scriptor needs its `content-engine.md` section written first; the build includes that.
- Status: approved.
