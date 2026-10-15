# Carousel style blueprint

Visual rules for Instagram carousels built by `.claude/skills/eac-marketer/carousel.md`. Derived from `references/endless-visual-brand-system.md`. If the two conflict, the brand system wins; update this file to match.

The reference build is `docs/marketing/carousels/template/reference.html`. Copy its `<head>`, CSS and slide markup. Change copy and photos, not the system.

## Canvas

- Slide: 360 × 450 px (4:5). Export at 3× scale for 1080 × 1350.
- Safe area: 24 px inset on all sides. Footer row sits at 18 px from the bottom.
- Page around the slides: `#121212`, slides laid out in a wrapping row so the whole deck reads at a glance.

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| `--black` | #050505 | Every slide background, except the insight slide |
| `--graphite` | #191919 | Insight slide background, panels |
| `--gold` | #F5B51B | Key words, accent bar, rules, sphere mark. Accent only, never a fill behind text |
| `--gold-hi` | #FFD45A | Bright end of gold gradients |
| `--gold-burnt` | #C77A00 | Dark end of gold gradients |
| `--white` | #F4F4F2 | Headlines |
| `--steel` | #BFC1C3 | Supporting lines, setup phrases, footer |

Ratio per slide: about 70% black, 20% white/steel, 10% gold. If a slide looks yellow, remove gold.

## Type

| Role | Font | Settings |
|------|------|----------|
| Display (headlines, hero words, wordmark) | Archivo, wide | `font-stretch:125%`, weight 700–800, tight line height (1.0–1.15) |
| Supporting lines, setup phrases | Inter | 400–500, 13–16 px, `--steel` |
| Eyebrows, labels, footer | Inter | 600, 9–10 px, uppercase, letter spacing 2–4 px |
| Script logo (CTA slide only) | `Endless_Tshirt_Back_1.webp` image | Never retype it in a font |

Load both from one Google Fonts link (see the reference file). Copy stays in sentence case. Only the ENDLESS wordmark and small labels are uppercase.

### Hook slide sizes

Archivo at 125% width is wide. Keep lines short:

| Size | Max characters per line |
|------|-------------------------|
| 44 px | ~10 |
| 36 px | ~13 |
| 30 px | ~16 |

Put long setup phrases in Inter (16 px, `--steel`). Reserve big Archivo for 1–4 hero words. One hero word may be `--gold`.

## Slide types

| Slide | Layout |
|-------|--------|
| 1 Hook | Full-bleed real shop photo (`.ph`) under a black gradient (`.shade`), eyebrow label in gold, setup line in Inter, hero words in Archivo. ENDLESS wordmark top-left, "Swipe" cue bottom-right. With no fitting photo, use the black background with a large faint sphere (`.sph-bg`) |
| 2 Transition | Centered. Short gold rule above. Metallic text (`.metal`: white to steel gradient). This is the only slide with gradient text |
| 3–8 Content | Left-aligned. Outlined step number (`.num`), gold accent bar (`.bar`) beside the headline, gold `<b>` on 1–3 key words, one Inter supporting line. Optional top photo panel (`.ph-top`) when a real photo fits the point |
| 9 Insight | `--graphite` background, large faint sphere behind, centered reframe. The save-worthy line |
| 10 CTA | Centered. Script logo image, one Archivo line, one action in a gold outlined pill (`.pill`) with the real URL. One action only |

Slides 2–9 carry the footer: ENDLESS wordmark (`.wm`) bottom-left and the Endless Sphere mark (`.sph`) bottom-right. Slides 1 and 10 do not.

For 3–5 slide posts, keep the same slide types and drop content slides. For 1-slide posts, see below.

## 1-slide post

Never text on plain black alone. Every 1-slider has:

| Element | Class |
|---------|-------|
| Top gold bar, burnt to bright to burnt | `.tb` |
| Large faint Endless Sphere behind the statement | `.sph-bg` |
| Statement in Archivo, gold on 1–3 words | `.hd` |
| Subtitle in Inter, `--steel` | `.st` |
| Gold outlined pill: location or next step | `.cb` |
| ENDLESS wordmark bottom-left | `.wm` |
| Sphere mark bottom-right | `.sph` |

A real photo background (`.ph` + `.shade`) is allowed on a 1-slider when it is the proof.

## Photos

Only real Endless photos from the repo. No stock, no AI images, no recolored cars. Gold comes from the graphic layer, never from the car.

Available now. Use the full live-site URL so the file renders anywhere, including as an email attachment:

| File | Shows |
|------|-------|
| `https://www.endlessautocollection.com/images/showcase/polish.jpg` | Machine polishing a blue BMW hood (portrait) |
| `https://www.endlessautocollection.com/images/showcase/ppf-install.jpg` | PPF install (landscape) |
| `https://www.endlessautocollection.com/images/showcase/team.jpg` | The team (landscape) |
| `https://www.endlessautocollection.com/images/showcase/m2-lift.jpg` | M2 on the lift (portrait) |
| `https://www.endlessautocollection.com/images/showcase/m4-lift.jpg` | M4 on the lift (landscape) |
| `https://www.endlessautocollection.com/images/showcase/engine-bay.jpg` | Engine bay (portrait) |
| `https://www.endlessautocollection.com/images/showcase/supra.jpg` | Supra (portrait) |
| `https://www.endlessautocollection.com/images/showcase/night-drive.jpg` | Night drive (portrait) |
| `https://www.endlessautocollection.com/images/showcase/grinder.jpg` | Grinder sparks, fabrication (portrait) |
| `https://www.endlessautocollection.com/images/showcase/bike.jpg` | Motorcycle (portrait) |
| `https://www.endlessautocollection.com/images/ceramic-coating.webp` | Ceramic coating (portrait) |
| `https://www.endlessautocollection.com/images/custom-wraps.webp` | Wrap work (portrait) |
| `https://www.endlessautocollection.com/images/paint-protection-film.webp` | PPF (landscape) |
| `https://www.endlessautocollection.com/images/ppf-front-end-m3.webp`, `ppf-full-body-m3.webp` | PPF coverage diagrams on an M3 |
| `https://www.endlessautocollection.com/images/tint-vlt-5.webp` … `tint-vlt-100.webp` | Tint shade renders, 5 to 100% VLT |
| `https://www.endlessautocollection.com/Endless_Tshirt_Back_1.webp` | "Auto Collection" gold script logo (CTA slide) |

Check the folder before each run; new photos may have landed. When no photo fits, use a text layout and write the shot you need in the slide's `.shot-note`.

## Shot notes

Every slide gets a `.shot-note` block inside its `.sw` wrapper, after the `.slide` closing tag. Never put production notes inside the slide.

- Photo used: `Slide N — Photo: <repo path>. Why it fits.`
- Photo needed: `Slide N — Shoot: <subject, angle, lighting>. Swap in when filmed.`
- Text only: `Slide N — Text only.`

## Captions and the brief box

Each file opens with a `.brief` box: format, pillar, hook type, angle source, caption, hashtags, CTA asset and status, grade, open items (`TBD` facts to verify), and a "Supporting photos" list. Captions follow brand voice: sentence case, no exclamation points, no hype, one next step.
