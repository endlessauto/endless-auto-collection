# Internal links

Plans internal links for the EAC site. Local crawl only, no paid tools. Rules-based, so keep the output short and exact.

**Read first:** `docs/marketing/site-brief.md` (money pages, domain).

## Process

1. Run `python3 scripts/seo_audit.py --json`. Note that every page links to the nav (about, ppf, ceramic, tint, wraps, detailing, mechanical, forums). Inbound counts of 15 or more are nav, not editorial. Judge editorial links by `inbound_from` on content pages.
2. For the target page, search the other `.html` files for sentences that already discuss its topic (`grep -n`). A link needs a real reason: the source already mentions the topic.
3. Links in (cap 15): give the source file, exact anchor text, and the quoted sentence from the source with line number. Descriptive, varied anchors. Never "click here".
4. Links out (cap 8): pages that help the reader. Money pages only where the context is honest.
5. Orphans: pages with no editorial inbound link (nav-only counts as none). Name the best page to link from and an anchor.
6. Clusters: ppf, ceramic, tint, wraps, detailing, mechanical, build guides, What Drives You. For each: hub page, members, whether members interlink.

## Output

Chat table. One row per proposed link: `source`, `line`, `quoted sentence`, `anchor`, `target`, `priority`. State pages crawled and anything excluded (`build-submit`, redirect stubs).

Do not edit pages unless asked. If asked, change one sentence per link, keep the voice, and rerun the audit to confirm.

## Honesty rules

- Only propose a link where the source genuinely discusses the topic.
- Quote real sentences. Never invent the sentence an anchor goes in.
- If nothing on the site relates to a new page, say so and name what to publish first.

## Current finding (2026-11-16)

The five how-to and build pages have only 1 to 3 inbound links (forums, mechanical, detailing, index), none from `ppf`, `ceramic`, `tint`, or `wraps`. Service pages do not link to proof. `about` is missing from `sitemap.xml`. `ppf-front` and `ppf-full` are redirect stubs and fine.
