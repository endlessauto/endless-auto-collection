# Publish prep

Turns a finished YouTube long-form video into a paste-ready publish package: keyword research, title options, thumbnail text, description, tags. Trigger phrases: "prepare for publishing", "publish prep", "upload package", "title and description for this video".

**Read first:** `docs/marketing/references/writing-style.md` (banned words, openers, self-check; run it on titles, thumbnail text, and description), `docs/marketing/references/youtube-engine-playbook.md` (sections 2 and 4), `docs/marketing/youtube-catalog.md` (avoid repeating a posted topic; pull "Previous" links), `docs/marketing/references/youtube-description-reference.md` (house description style), and `docs/marketing/content-grader.md`. For DIY how-to videos, also read `docs/marketing/references/youtube-tutorial-outliers.md` (outlier packaging and the ChrisFix description structure: durability proof, parts by function, safety line, "1 year later" follow-up). For parts blocks, check `docs/marketing/references/` (for example `f80-m3-strut-suspension-parts.md`) before marking a part number `TBD`.

Also read `docs/marketing/youtube-channel-audit-2026-11-12.md` (what wins and lags on this channel). Run `python3 scripts/refresh_youtube_catalog.py` before drafting so "Previous" links and the topic check use current data.

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
3. **Title options.** Three options. Primary keyword within the first 40 characters, under 60 characters total, one promise, no hype, no exclamation points, no all-caps words. Every title must carry one clear emotion (relief, tension, pride, curiosity, satisfaction), earned through a specific stake or payoff, not hype words. Name the emotion in the one-line rationale. Mark one recommended and why. Compare against titles in the catalog so the channel's titles stay consistent.
4. **Thumbnail text.** Three options, 2–4 words each, sentence case or caps per the user's current thumbnail style. Text adds to the title and never repeats it. Pair each with a one-line image direction (subject, framing, contrast block). Text only, no image generation.
5. **Description.** Fill the template below. Omit a section when it has no content; never leave an empty header. Put the primary keyword and one secondary in the first two sentences, because only about 150 characters show before "more".
6. **Tags.** 15–20 tags, most specific first, comma-separated, 500 characters max total. Mix: primary keyword and variants, secondary keywords, venue, area, car makes shown, format ("car meet vlog"), and brand ("endless autoworks"). No tags for things not in the video.
7. **Packaging check** against the channel audit. Pass or fix each line, and show the result in the output file:
   - Search-intent DIY (specific car plus job): the title leads with the car and job, or the outcome the viewer wants.
   - Vlog or shop story: the title names a car, part, or stake. Never a generic "vlog" or "shop vlog" alone.
   - Same topic as an existing how-to: the how-to ships first. Flag the order if the vlog is first.
   - Series part: the title carries its own hook, not "Pt. 2" alone.
   - Typed title has no double spaces, no stray caps words, and matches the recommended option (log any change).
8. **Companion package.**
   - **Short:** one Short title (own hook, named car or part, under 70 characters), a 15 to 45 second cut note (timestamp range from the long-form), and a pinned comment linking the long-form. Mark the cut `TBD` without timestamps.
   - **Pinned comment:** one question that invites an answer about the car or job, written before the video goes public.
   - **End screen:** one specific next video from the catalog, never two. Pick the closest topic that performed above the long-form median.
   - **Playlist:** name the playlist this video joins. Share links with `&list=<id>` once known (`TBD` until then).
   - **Next step:** the one site page or consult CTA that follows from what the video taught.
9. **Grade** with the rubric (see content-engine.md for thresholds). Show score and one line.
10. **Save** to `docs/marketing/publish/<yyyy-mm-dd>-<slug>.md`. Add the video to the calendar row if one exists. Do not touch the approval queue unless the user asks to stage it.
11. **After the video goes public**, remind the user to run `python3 scripts/refresh_youtube_catalog.py`. It updates the catalog and the "Watch the work" cards and schema on `index.html` and `about.html` (latest three long-forms). Then they deploy the site.
12. **Review schedule.** Put these in the package's Open items:
   - Public to +15 min: Community post with the deep link (playbook section 7).
   - +2 hours: Instagram story sequence with deep links.
   - Day 4: ask the user for Studio impressions CTR and average view duration. If either is below the channel baseline, test one variable (thumbnail first).
   - Day 14: record views, CTR, average view duration, and leads in `performance.md` terms. Update the audit's baselines if the median moved.

## Description template

House style: `docs/marketing/references/youtube-description-reference.md` (the user's own Santana Row description). Read it before drafting. Match its section order, emoji section headers, and bullets.

Formatting: YouTube renders `*text*` as bold. Wrap every section header in single asterisks: `*CHAPTERS | HYPERCAR WALKAROUND*`. Do not bold body sentences. Keep the asterisks flush against the text, with no spaces inside them.

Voice: sentence case in body copy, active voice, no hype. The chill-format rule: describe the mood and what's shown, never oversell. Emoji appear only as section-header markers, never as bullets or inline. No em dashes in new copy.

```
<Para 1: cars named, place, Endless AutoWorks, what the viewer gets. Primary keyword and one secondary inside the first ~150 characters.>

<Para 2: what is shown up close.>

<Para 3: one rarity or story fact. Sourced or hedged. Omit if none.>

<Para 4: mood line, such as "No commentary. Just a cinematic walkaround...">

<Para 5: who it is for.>

📍 *Location:* <venue>, <city>, California

🏎️ *CHAPTERS | <SHORT VIDEO LABEL>*

00:00 - <car or segment>
<mm:ss> - <car or segment>

*FEATURED CARS*          (vlogs and meets; includes cars with no chapter)

• <year make model>

*PARTS IN THIS VIDEO*    (builds and installs; replaces FEATURED CARS)

• <item: brand, part number, price, link>

🎥 *MORE FROM ENDLESS AUTOWORKS*

<One related video: city, one-line pitch.> 
   • <full catalog title>: https://www.youtube.com/watch?v=<id>

<What Drives You block, variant below>

📲 *CONNECT WITH ENDLESS*

Instagram: @endlessautoco
Email: EndlessAutoCollection@gmail.com
Website: https://www.endlessautocollection.com

🔧 *ABOUT ENDLESS AUTOWORKS*

Based in Fremont, California, Endless AutoWorks is more than an automotive shop. We're building a community of car enthusiasts, creators, and individuals who share a passion for automotive culture.

Our services include automotive detailing, paint protection film (PPF), ceramic coating, window tinting, and vehicle wraps.

Your One-Stop Shop. Driven by Detail.

🎵 *MUSIC CREDITS*

Track: <title>
Artist: <artist>

All music rights belong to their respective owners.

#<Specific> #<Place or Secondary> #<Format>
```

Rules: exactly three hashtags. First chapter is `00:00` and there are at least three chapters (YouTube requirement). Every chapter line starts at the beginning of the line. Use `FEATURED CARS` or `PARTS IN THIS VIDEO`, whichever fits. The What Drives You block, Connect, About, and the website line are never omitted, on every video. Omit Music Credits only if the video has no music; otherwise ask for the track and artist and never guess. Only link to pages that exist in this repo. The related-video link must be a full title and URL from the catalog, never truncated.

DIY how-to videos add a plain-English safety line above the hashtags: `Safety: wear eye and skin protection, follow each product's label, and test in a small spot first. This is how we do it. Results depend on your car and materials.` Name what each item in the parts block does. Never claim a result is permanent without a documented follow-up; hedge or mark `TBD`.

### What Drives You block variants

Non-series videos (the default). Explains the series and sends viewers to the website:

```
🎙️ *WHAT DRIVES YOU? | OUR CAR OWNER INTERVIEW SERIES*

Every car has a story. Every owner has a reason.

What Drives You? is an Endless original interview series exploring the people, memories, and passions behind the cars they own.

Have a car and a story worth sharing? We'd love to hear from you.

Apply to be featured:
https://www.endlessautocollection.com/whatdrivesyou
```

Series episodes:

```
🎙️ *ABOUT WHAT DRIVES YOU?*

What Drives You? is a series where car owners tell the story behind their car in their own words.

Want to be in it?
Apply to be featured:
https://www.endlessautocollection.com/whatdrivesyou
```

## Output file shape

Sections in order: Research (autocomplete results, search findings, primary and secondary keywords), Title options, Thumbnail text, Description (code block), Tags (code block, with character count), Packaging check, Companion package (Short, pinned comment, end screen, playlist, next step), Grade, Open items (everything marked `TBD`, plus the review schedule). After publishing, add a "Live title" line with the exact title that went public.

## Rules

- Research is live every time. Never reuse a prior video's keywords without re-running the pulls.
- One pillar tag per piece.
- If autocomplete returns nothing for a seed, say so and move on.
