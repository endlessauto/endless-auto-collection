# EAC Media Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local, three-button control panel (Prepare YouTube, Audit drop zone, Short Form Scriptor) that runs the existing eac-marketer skills through headless Claude Code.

**Architecture:** A stdlib Python server on `127.0.0.1` serves one `index.html` and a small job API. Each button is an entry in `panel/jobs.json`; the server renders a prompt, runs `claude -p` in the repo root, and writes the log to `panel/runs/`. Skill logic stays in the skill files; the panel only supplies inputs.

**Tech Stack:** Python 3 stdlib (`http.server`, `subprocess`, `unittest`), vanilla JS/HTML.

**Spec:** `docs/superpowers/specs/2026-11-16-media-panel-design.md`

## Global Constraints

- Server binds `127.0.0.1` only. No auth, no hosting, no deploy.
- No dependencies beyond Python 3 stdlib. No build step.
- `panel/` is added to `.assetsignore`. `panel/inbox/` and `panel/runs/` are gitignored.
- Buttons are data in `panel/jobs.json`. No skill instructions are copied into panel code.
- Audit changes to skill or MD files are proposed, and written only after an explicit Apply.
- UI copy: sentence case, active voice, no exclamation points, no hype (EAC voice).
- Scope is three buttons. No Shoot Briefings, Research, or Carousels buttons.
- Never invent analytics; unknown values stay `TBD` (existing skill rule).

## Review Focus

- Path traversal on the file viewer and Apply (`../`, absolute paths, symlinks): refuse anything outside the allowed roots.
- Upload of non-image files, zero-byte files, duplicate filenames, or very large files: reject or rename, never overwrite.
- `claude` missing or exiting non-zero: the job shows `failed` with the stderr tail, not a hang.
- Server restart mid-job: orphaned runs show as `failed`, not `running` forever.
- Double-click on a button: two runs of the same job are allowed but never share a log file.

## File Structure

- `panel/server.py` — HTTP routing, static serving, path guards.
- `panel/runner.py` — job definitions loading, prompt rendering, subprocess run, run records.
- `panel/jobs.json` — the three button definitions.
- `panel/index.html` — the UI (cards, forms, drop zone, output viewer, proposal list).
- `panel/tests/test_runner.py`, `panel/tests/test_server.py`, `panel/tests/fake_claude.sh` — tests with a fake `claude` binary.
- `.claude/skills/eac-marketer/content-engine.md` — modified: Shorts script engine section.

---

### Task 1: Runner

**Files:**
- Create: `panel/runner.py`, `panel/jobs.json`, `panel/tests/test_runner.py`, `panel/tests/fake_claude.sh`
- Modify: `.assetsignore`, `.gitignore`

**Interfaces:**
- Produces: `load_jobs(path: Path) -> dict[str, Job]` where `Job` has `id, label, prompt, fields: list[str], model: str, allowed_tools: str`.
- Produces: `start_run(job: Job, inputs: dict[str, str], runs_dir: Path, claude_bin: str = "claude") -> str` returns `run_id`.
- Produces: `get_run(run_id: str, runs_dir: Path) -> dict` with keys `status` (`running|done|failed`), `log` (str), `started_at`, `job_id`.

- [ ] **Step 1: Write failing tests** in `test_runner.py` using `fake_claude.sh` (echoes its args, exits `$FAKE_EXIT`): `test_prompt_renders_inputs` (placeholders `{video}` filled), `test_missing_field_raises` (`KeyError` naming the field), `test_run_done_captures_log`, `test_nonzero_exit_is_failed_with_stderr_tail`, `test_missing_binary_is_failed`, `test_stale_running_run_becomes_failed_on_load` (run record with dead pid), `test_two_runs_have_distinct_logs`.
- [ ] **Step 2: Run** `python3 -I -m unittest discover panel/tests -v`; expect failures (module missing).
- [ ] **Step 3: Implement** `runner.py`. Run `claude -p <prompt> --model <model> --allowedTools <tools>` with `cwd` at the repo root, writing `panel/runs/<run_id>.json` (status, pid, job_id, started_at) and `<run_id>.log`. Run in a daemon thread; stale detection checks pid liveness. Builder confirms the exact flags against `claude -p --help` and picks the narrowest working tool set.
- [ ] **Step 4: Add `panel/` to `.assetsignore`; add `panel/inbox/` and `panel/runs/` to `.gitignore`.**
- [ ] **Step 5: Run tests; expect all pass. Commit** `feat(panel): job runner`.

### Task 2: Server and Prepare YouTube

**Files:**
- Create: `panel/server.py`, `panel/tests/test_server.py`
- Modify: `panel/jobs.json`

**Interfaces:**
- Consumes: Task 1 `load_jobs`, `start_run`, `get_run`.
- Produces: `GET /` (index.html), `GET /api/jobs` (list with fields), `POST /api/jobs/<id>/run` (JSON inputs → `{run_id}`), `GET /api/runs/<run_id>`, `GET /api/file?path=` (read-only; allowed roots `docs/marketing/publish/`, `docs/marketing/trend-briefs/`, `docs/marketing/audits/`).
- Produces: `python3 panel/server.py` starts on port 8765 and opens the browser.

- [ ] **Step 1: Write failing tests** (start the server on an ephemeral port with a fake claude): `test_jobs_endpoint_lists_three_buttons`, `test_run_returns_run_id_and_completes`, `test_unknown_job_404`, `test_file_rejects_dotdot`, `test_file_rejects_absolute_path`, `test_file_rejects_symlink_escape`, `test_file_serves_publish_markdown`, `test_server_binds_loopback_only`.
- [ ] **Step 2: Run tests; expect failures.**
- [ ] **Step 3: Implement** `server.py` with `ThreadingHTTPServer` on `127.0.0.1`. Path guard: `Path.resolve()` must be inside an allowed root.
- [ ] **Step 4: Add the `prepare-youtube` job** to `jobs.json`. Fields: `video`, `shoot_date`, `venue`, `chapters` (optional), `links` (optional). The prompt invokes the eac-marketer publish flow with those inputs, tells it to read `.claude/skills/eac-marketer/publish.md`, to write the package to `docs/marketing/publish/<date>-<slug>.md`, and to mark unknowns `TBD` instead of asking. Model: the strongest available.
- [ ] **Step 5: Run tests; pass. Commit** `feat(panel): server and prepare youtube job`.

### Task 3: Short Form Scriptor

**Files:**
- Modify: `.claude/skills/eac-marketer/content-engine.md`, `.claude/skills/eac-marketer/SKILL.md` (dispatch row), `panel/jobs.json`

**Interfaces:**
- Produces: job `shorts-scriptor` with fields `topic`, `pillar`. Output file `docs/marketing/shorts/<date>-<slug>.md`; the allowed read root is added to `/api/file`.

- [ ] **Step 1: Write the "Shorts script engine" section in `content-engine.md`.** Per topic output: hook as three lines (text, visual, spoken, aligned per the Kallaway hook rule in `docs/marketing/references/kallaway-short-form-playbook.md`), a 20 to 40 second script with timestamps, a caption, one lead keyword, one pillar tag. Sentence case, no hype, unknowns `TBD`. Add a `SKILL.md` dispatch row.
- [ ] **Step 2: Add the job** to `jobs.json` pointing at that section.
- [ ] **Step 3: Test** `test_file_serves_shorts_markdown` in `test_server.py` (add the `docs/marketing/shorts/` root, then run).
- [ ] **Step 4: Manual check:** run the job once for a real topic from `idea-inbox.md`; confirm the file has all five parts. Commit `feat(panel): shorts scriptor`.

### Task 4: Audit drop zone and proposals

**Files:**
- Modify: `panel/server.py`, `panel/jobs.json`
- Test: `panel/tests/test_server.py`

**Interfaces:**
- Produces: `POST /api/upload` (multipart, field `files`, query `tag=weekly|adhoc`) → `{dir: "panel/inbox/<date>"}`; accepts `image/png|jpeg|webp` only, each ≤ 10 MB, names deduplicated by suffix.
- Produces: job `studio-audit`, field `dir`. The prompt has Claude read the images and follow `performance.md` batch mode. It writes `docs/marketing/audits/<date>-audit.md` and `docs/marketing/audits/<date>-proposals.json`: a list of `{id, file, summary, evidence, new_text}`, where `file` must be inside `.claude/skills/eac-marketer/` or `docs/marketing/`.
- Produces: `GET /api/proposals`, `POST /api/proposals/<id>/apply` (overwrites `file` with `new_text` after the path guard), `POST /api/proposals/<id>/skip`. Applied or skipped state is stored in the proposals file.
- Produces: `GET /api/last-audit` → `{date, days_ago}` for the "last pasted N days ago" banner.

- [ ] **Step 1: Write failing tests:** `test_upload_rejects_non_image`, `test_upload_rejects_empty_file`, `test_upload_dedupes_filename`, `test_upload_rejects_oversize`, `test_apply_writes_file_and_marks_applied`, `test_apply_rejects_path_outside_allowed_roots`, `test_skip_does_not_touch_file`, `test_last_audit_days_ago`.
- [ ] **Step 2: Run; expect failures.**
- [ ] **Step 3: Implement** the endpoints; use `email`/`cgi`-free multipart parsing via stdlib `email.message_from_bytes`.
- [ ] **Step 4: Add the `studio-audit` job.**
- [ ] **Step 5: Run tests; pass. Commit** `feat(panel): studio audit and proposals`.

### Task 5: UI

**Files:**
- Create: `panel/index.html`

**Interfaces:**
- Consumes: all `/api/*` endpoints from Tasks 2 to 4.

- [ ] **Step 1:** Three cards: Prepare YouTube (form from the job's `fields`), Short Form Scriptor (form), Audit (drag-and-drop zone with a thumbnail preview and the last-audit banner; the banner turns amber over seven days).
- [ ] **Step 2:** After a run, poll `/api/runs/<id>` every two seconds, show the status and log tail, then render the output markdown with a copy button on each heading section.
- [ ] **Step 3:** Proposal list under the Audit card, each with evidence plus Apply and Skip.
- [ ] **Step 4:** Style after `EACMedia/deck.css` (dark, one card per skill).
- [ ] **Step 5: Manual verification:** start the server, drop two real Studio screenshots, run the audit, apply one proposal, confirm the file changed. Run Prepare YouTube on the next real video. Report anything that fails.
- [ ] **Step 6: Commit** `feat(panel): ui`.

---

## Self-review

- Spec coverage: three buttons, drop zone, apply/skip, `.assetsignore`, localhost bind, jobs as data, model pinning (per job field), weekly reminder: covered. Screenshot downscaling from the spec is deferred. It only matters if audit runs prove expensive.
- Type consistency: `Job`, `start_run`, `get_run`, and the endpoint names match across tasks.
