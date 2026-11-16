# SEO page

Audits, optimizes, and drafts pages on the EAC static site. No paid search-data tools. Search demand comes from `scripts/yt_keyword_research.py` (YouTube autocomplete) and from what customers ask.

**Read first:** `docs/marketing/site-brief.md` (NAP, money pages, reader, say/don't-say) and `docs/marketing/references/writing-style.md`. If a needed brief field is `⚠️ NEEDS INPUT`, mark that check `n/a` and say why. Never fill it by guessing.

## Step 1: run the audit

```
python3 scripts/seo_audit.py
```

Gives per page: title and meta length, H1 count, canonical, sitemap presence, word count, schema types, inbound and outbound page links. Redirect stubs (`ppf-front`, `ppf-full`) are expected noise.

## Step 2: detect page type, then run only that branch

Page types: **service** (`ppf`, `ceramic`, `tint`, `wraps`, `detailing`, `mechanical`, `index`), **how-to / article** (`how-to-restore-headlights` and the other build guides), **story** (`whatdrivesyou*`). Say which type and the evidence. If signals conflict, ask.

### Service page checks

1. Schema: `AutoRepair` plus `Service` plus `FAQPage`. NAP in schema equals the brief exactly.
2. Transactional intent: what is included, who it is for, how it works, how pricing works, how to start.
3. Specificity: would the copy read the same for a shop in another city? Quote generic sentences. Service and Fremont both appear naturally.
4. CTA above the fold and at the end, one action, matching the brief.
5. Trust: real photos, named film or coating brand, warranty, reviews (only if the brief has them).
6. First fold: what it is, who it is for, where, how to start.
7. Title (≤60 chars) and meta (≤160) use commercial phrasing and name the service and Fremont.
8. Links out to at least one relevant how-to or build story (proof).

### How-to checks

1. Answers the target query's intent without drifting. Quote any drift.
2. Freshness: dates, prices, product versions. Name stale items.
3. Every statistic or claim sourced, inline on the keyword. Unsourced numbers are findings.
4. Answer capsule: each H2 is a question with a complete two-sentence answer directly below. Quote one H2 that passes and one that fails.
5. Author block names Will (see brief).
6. Schema: `Article` plus `FAQPage`, `HowTo` where steps exist. Valid, and matching visible content.
7. Links: at least two contextual outbound links, one to a money page where honest. At least one contextual inbound link from a service page (see `internal-links.md`).
8. Video: the matching YouTube video embedded or linked, `VideoObject` present.

## Step 3: report

Write findings to the chat as a table: check, `pass | warn | fail | n/a`, quoted evidence, fix. Score `passed/total` for the branch. Weight schema, capsule structure, specificity, and CTA above cosmetic issues and say so. Rewritten title, meta, and H1 get character counts.

Do not edit pages unless asked. Show the diff first, because these pages are live.

## Writing a new page or section

Rule of one: one question per H2, one two-sentence answer directly beneath it, one source per claim (fetched and confirmed, inline on the keyword, no sources block at the end), one table per page, one first-hand anecdote.

Ask Will for the first-hand piece: "What do you know about this that someone who only researched it wouldn't? A number you measured, a customer situation, a mistake." If it is missing, write `[WILL'S EXPERIENCE HERE]` and leave it visible. Never invent an anecdote, customer, result, or measurement.

## Honesty rules

- No volume, ranking, or traffic number we did not get from a real source. Show "no data".
- Quote the actual page for every finding. "Thin content" is not a finding.
- Fewer real findings beat a padded list.

## Loop

Gaps found here, plus questions customers ask, go to `idea-inbox.md` as the next video or page topics. A published video gets a matching page or FAQ, and the page links back to the video.
