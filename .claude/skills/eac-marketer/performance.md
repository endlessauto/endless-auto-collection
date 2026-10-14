# Performance

The user supplies analytics for a posted piece: numbers, a described screenshot, or a rough summary. No API calls.

## Steps

1. Identify the calendar row. If ambiguous, ask which.
2. Diagnose the funnel bottleneck (playbook section 9): impressions/views → saves/shares → profile visits or clicks → leads/consultations. Compute conversions per view (leads ÷ views) when both numbers exist; rank pieces by it and recommend more of the top ones. Use the user's lead count (DM keyword comments, inquiries, signups, bookings) only if supplied. Use only metrics provided.
3. Judge on-target results, not raw views (Game #5): a lower-view video that drove saves, profile visits, or inquiries from likely customers beats a higher-view one that didn't. Flag a spike in views with no downstream action as a possible wrong-audience hit and say not to chase it. Check hook alignment (text, visual, spoken say the same thing) as a first suspect for weak early retention.
4. Name the one brick most likely at fault (checklist, playbook section 7) with the evidence for it, not a list of everything. Short analysis: what likely worked (hook, pillar, format, timing), compared with prior rows for the same pillar/platform if they exist. Label guesses as guesses.
5. Suggest 2–3 hook or format variations. Preserve the psychology that worked; change the mechanism.
6. If CTR or watch time is below the channel baseline after 3–4 days, suggest an A/B test: one variable only, 14-day timebox at low traffic (playbook section 10).
7. Append a one-line note to that row's Notes column in `docs/marketing/content-calendar.md`.

## Batch mode

When the user asks how a group of videos did, or supplies 10 or more, follow playbook section 7 instead of the single-piece steps: rank the cohort, find 5×+ outliers on on-target results, run the 11-point checklist on each outlier and on the bottom performers, then state one hypothesis and one change to test across the next batch. For a 10×+ on-target outlier, propose 3–5 triple-down variants (same format, hook structure, visual style; new seed or substance) and add them to `docs/marketing/idea-inbox.md`. Don't draw conclusions from a batch under 10, and don't analyze a video in its first 3 days.

## Rules

- YouTube view counts are in `docs/marketing/youtube-catalog.md`. Run `python3 scripts/refresh_youtube_catalog.py` first if the user asks about a recent upload. Views only; retention, CTR and saves still come from the user.

- Don't invent numbers or baselines. With one data point, say there's nothing to compare yet.
- Next research run reads these notes.
- A lead from a video only counts if the user reports it. If no lead capture exists yet, say so and suggest the lowest-friction one (Kallaway playbook section 5) rather than judging on views alone.
