# Calendar

Reads and writes `docs/marketing/content-calendar.md`, a single markdown table:

| Date | Car / Owner | Asset | Platform | Status | Notes |

Status values: `idea`, `drafted`, `scheduled`, `filming`, `editing`, `posted`.

## Actions

- **Add row**: when a brainstorm brief exists. Status `idea`. Date is `TBD` unless the user gives one.
- **Update status**: only as the user reports changes.
- **Summarize**: "what's next" and "what's overdue" from the table, dates compared with today.
- **Advance to `scheduled`**: only if the matching line in `docs/marketing/approval-queue.md` is checked (`- [x]`). If unchecked, say so and stop.

## Rules

- Human-edited shared record. Never auto-assign dates, never push to an external calendar.
- Keep Notes short. Performance notes are appended by `performance.md`.
- For posted video, the 24-hour amplification steps (playbook section 7) can be added to Notes as a checklist when the user asks.
