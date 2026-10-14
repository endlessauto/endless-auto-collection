# Publish prep

Turns a finished YouTube long-form video into a paste-ready publish package: keyword research, title options, thumbnail text, description, tags. Trigger phrases: "prepare for publishing", "publish prep", "upload package", "title and description for this video".

**Read first:** `docs/marketing/references/youtube-engine-playbook.md` (sections 2 and 4), `docs/marketing/youtube-catalog.md` (avoid repeating a posted topic; pull "Previous" links), and `docs/marketing/content-grader.md`.

## Inputs

Ask only for what's missing, in one message:

- What the video is, in the user's words (vibe, who it's for)
- Shoot date, location or venue, anything shown (cars, parts, products, people)
- Chapter timestamps or an SRT. Without them, mark every chapter `[TBD]`.
- Links to include (parts, site guide, prior videos)

Never invent cars, specs, timestamps, or part numbers. Unknown means `TBD`.

## Steps

1. **Keyword research.** Run live YouTube autocomplete, one fetch per seed, using `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=<seed>` via WebFetch. Seed with: the format ("car meet vlog"), the broad term, the local term ("bay area", "fremont"), the venue, and any named car or part. Add a WebSearch for venue and event facts. Record results verbatim.
2. **Pick keywords.** One primary keyword (highest-intent phrase that honestly describes the video), 3–5 secondary. Prefer the open lane: specific local or model terms over saturated broad ones. Note what is saturated.
3. **Title options.** Three options. Primary keyword within the first 40 characters, under 60 characters total, one promise, no hype, no exclamation points, no all-caps words. Mark one recommended and why. Compare against titles in the catalog so the channel's titles stay consistent.
4. **Thumbnail text.** Three options, 2–4 words each, sentence case or caps per the user's current thumbnail style. Text adds to the title and never repeats it. Pair each with a one-line image direction (subject, framing, contrast block). Text only, no image generation.
5. **Description.** Fill the template below. Omit a section when it has no content; never leave an empty header. Put the primary keyword and one secondary in the first two sentences, because only about 150 characters show before "more".
6. **Tags.** 15–20 tags, most specific first, comma-separated, 500 characters max total. Mix: primary keyword and variants, secondary keywords, venue, area, car makes shown, format ("car meet vlog"), and brand ("endless autoworks"). No tags for things not in the video.
7. **Grade** with the rubric (see content-engine.md for thresholds). Show score and one line.
8. **Save** to `docs/marketing/publish/<yyyy-mm-dd>-<slug>.md`. Add the video to the calendar row if one exists. Do not touch the approval queue unless the user asks to stage it.

9. **After the video goes public**, remind the user to run `python3 scripts/refresh_youtube_catalog.py`. It updates the catalog and the "Watch the work" cards and schema on `index.html` and `about.html` (latest three long-forms). Then they deploy the site.

## Description template

Voice: sentence case, active voice, no hype. The chill-format rule: describe the mood and what's shown, never oversell.

```
<Sentence 1: what the video is, with primary keyword. Sentence 2: what you'll see / who it's for.>

Chapters
00:00 <chapter>
<mm:ss> <chapter>

Cars in this video          (vlogs and meets)
<year make model, one per line>

Parts in this video         (builds and installs)
<item: brand, part number, price, link>

Location
<venue, city>

Related
<Site guide or relevant page>: https://www.endlessautocollection.com/<page>
Previous: <catalog title>: https://www.youtube.com/watch?v=<id>

Endless AutoWorks in Fremont, CA. Detailing, PPF, ceramic coating, tint, wraps. Driven by detail.
https://www.endlessautocollection.com

#<Primary> #<Secondary> #<Format>
```

Rules: exactly three hashtags. First chapter is `00:00` and there are at least three chapters (YouTube requirement). Use `Cars in this video` or `Parts in this video`, whichever fits, or both. The footer and website line never change. Only link to pages that exist in this repo.

## Output file shape

Sections in order: Research (autocomplete results, search findings, primary and secondary keywords), Title options, Thumbnail text, Description (code block), Tags (code block, with character count), Grade, Open items (everything marked `TBD`).

## Rules

- Research is live every time. Never reuse a prior video's keywords without re-running the pulls.
- One pillar tag per piece.
- If autocomplete returns nothing for a seed, say so and move on.
