# YouTube channel audit, 2026-11-12

Source: public view counts in `youtube-catalog.md` (refreshed 2026-11-12, 29 videos: 18 long-form, 11 Shorts). No CTR, retention, traffic-source, or subscriber data. Every finding below is a hypothesis from views alone until Studio numbers confirm it. Views are age-biased: the two SEMA videos are under 8 days old.

## Baselines

| Format | Count | Median views | Range |
|--------|-------|--------------|-------|
| Long-form | 18 | 148 | 56 to 653 |
| Shorts | 11 | 907 | 24 to 1,516 |

Shorts run about 6x long-form. Shorts feed reach; long-form builds trust. The workflow should make each long-form ship with a Short.

## What wins

| Pattern | Evidence |
|---------|----------|
| Search-intent DIY, specific car plus job | Headlights how-to 653 (best long-form), bushing puller 473, Mustang springs Pt.1 454 |
| Customer service detail, plain local promise | Sienna detail 447 long, 1,387 Short; "Come get your full car detailed in Fremont" 907 |
| Named car in the title | Huracán STO Short 1,516, Santana Row hypercars 199 vs Cupertino meet 89 |
| Curiosity question about a stake | "Why sell the car you dreamed of owning as a kid?" 1,081 |
| Specific part fitment in a Short title | Escalade door handle, 2007-2014 Tahoe and Yukon, 1,055 |
| Local, non-car moment | Church bells Short 994 (shows Fremont-flavored content travels) |

## What lags

| Pattern | Evidence | Read |
|---------|----------|------|
| Same topic, vlog framing | Customer headlight vlog 132 vs how-to 653 | Searchers want the answer, not the story. Ship the how-to first, the vlog second. |
| Shop-story and BTS | Revamp series 56 to 109, Peaky Blinders 109 long and 24 Short | No outside demand. Keep as community content, don't expect reach. |
| "Pt. 2" Short with series label | What Drives You Pt. 2 171 vs the hook Short 1,081 | The question hook carried Pt. 1. Pt. 2 lost it. Every Short needs its own hook title. |
| Generic meet vlog | Cars and Coffee 89 | Name the cars or don't expect search or browse pull. |
| Early-October mid-job vlogs | Differential bushings installed 137, jack suspension 131 | Titles lead with process, not the outcome a viewer wants. |
| Title hygiene | Ep 1 live title has a double space ("Vlog Ep  1"), 2026-11-04 | Check the typed title against the package before publishing. |
| Published title drifted from package | Ep 1 package recommended option 1; option 3 went live | Fine if intentional. Log the final live title in the package. |

## Gaps in the current workflow

1. Publish prep ends at paste-ready metadata. Nothing covers Shorts companions, pinned comment, end screen, playlists, the first 24 hours, or the post-publish review.
2. Catalog tracks views only. No CTR or average view duration, so A/B triggers in the playbook can't fire.
3. No rule for the how-to-before-vlog order, which is the clearest lever in the data.
4. Titles and thumbnails aren't checked against the winners list above.
5. Catalog goes stale: it read "latest upload 2026-10-29" nine days after SEMA content shipped.
6. Series content (What Drives You) has no repeatable Short title rule.

## Changes made from this audit

- `publish.md`: reads this audit, adds a title/thumbnail checklist from the winners and laggards, a Short companion, a pinned comment, end screen and playlist, a 24-hour amplification list, and a day-4 / day-14 review step; refreshes the catalog first.
- `SKILL.md`: lists this audit in Files and in the publish dispatch row.
- `youtube-catalog.md`: refreshed from the feed (3 new videos, 29 total).

## Needs the user

Paste from YouTube Studio (last 28 days, long-form and Shorts separately): impressions CTR, average view duration, average percentage viewed, top traffic sources, and subscribers gained per video. Without it, packaging advice rests on view counts. Re-run this audit at 30 uploads or once Studio numbers arrive.
