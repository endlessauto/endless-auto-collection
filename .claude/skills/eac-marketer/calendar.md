# Calendar

Reads and writes `docs/marketing/content-calendar.md`, a single markdown table:

| Date | Car / Owner | Asset | Platform | Status | Notes |

Status values: `idea`, `drafted`, `scheduled`, `filming`, `editing`, `posted`.

## Actions

- **Add row**: when a brainstorm brief exists. Status `idea`. Date is `TBD` unless the user gives one.
- **Update status**: only as the user reports changes.
- **Summarize**: "what's next" and "what's overdue" from the table, dates compared with today.
- **Cadence check**: when asked if we're on track, count `posted` rows per week and report it against the user's stated weekly target (Kallaway playbook section 8). Ask for the target if none is stated; never assume one.
- **Advance to `scheduled`**: only if the matching line in `docs/marketing/approval-queue.md` is checked (`- [x]`). If unchecked, say so and stop.

## First-3-reps sprint

When the user starts the sprint, add three rows (status `idea`, dates `TBD`) tagged `sprint` in Notes with the source outlier link and the lead magnet for each. Record filming, editing, and posting only as the user reports them.

## Rules

- Human-edited shared record. Never auto-assign dates, never push to an external calendar.
- Keep Notes short. Performance notes are appended by `performance.md`.
- For posted video, the 24-hour amplification steps (playbook section 7) can be added to Notes as a checklist when the user asks.
