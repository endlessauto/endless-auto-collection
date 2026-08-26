# Consultation Flow Redesign & OneStopBot AI Chatbot

**Date:** 2026-08-25
**Status:** Approved design, pending implementation plan

## Context

The site (`endlessauto`, static HTML pages hosted on Vercel/Netlify) currently
opens a "Request a consultation" modal that embeds Shopmonkey's hosted
quote-request form directly in an iframe (`index.html:149`). This iframe is
cross-origin: the site cannot read its fields, prefill it beyond URL params
Shopmonkey itself supports, or detect submission events from it. There is no
existing backend — the site is fully static.

Two subsystems are in scope:
1. A redesigned, more immersive consultation flow with a service-interest
   multi-select, built around the existing Shopmonkey iframe constraint.
2. A new AI chatbot ("OneStopBot"), which requires a new backend (a
   serverless API route) since it did not exist before.

## 1. Consultation modal redesign

Multi-step flow inside the existing modal shell (`#quote` in each page):

- **Step 1 — service interest.** Chip-style multi-select grid (not a native
  `<select>`): PPF Full Body, Front-end, Tinting, Wraps, Maintenance, Other.
  Tap to toggle; selected chips highlight in the site accent color. Multiple
  selections allowed.
- **Step 2 — contact basics.** Name / phone / email, minimal fields.
- **Step 3 — submit.** Reveals the existing unmodified Shopmonkey iframe.
  Selected services from Step 1 are carried forward as:
  - a prefilled query param into the iframe URL if/where Shopmonkey's
    hosted form supports one, and
  - always also rendered as a visible summary chip row above the iframe, so
    the selection is preserved for the shop's visibility regardless of
    whether Shopmonkey ingests it.
- Small progress indicator (e.g. 3 dots) and a spring-in transition between
  steps.
- Below the iframe, a **"I've submitted my request"** button (explicit
  confirm, chosen over a blind timer) that:
  - closes/collapses the quote step, and
  - triggers the chatbot to auto-open with the thank-you message (see below).

No changes are made to the Shopmonkey iframe's own form fields — it stays a
black box we hand off to, not something we integrate with beyond URL params.

## 2. OneStopBot chatbot

### Presence

- Persistent floating button, bottom-right corner, on every page —
  independent of the consultation flow. Always available.
- When the user finishes the consultation flow (clicks "I've submitted my
  request"), the bot auto-opens with:

  > "Thank you for your submission — we'll get back to you as soon as
  > possible. Please don't hesitate to give us a call."

  and then continues into normal chat mode in the same window.

### Interaction model: hybrid (buttons + free text)

- Free-form text input is always available.
- Every bot message also carries 2–4 contextual quick-reply buttons.
  Clicking a button behaves identically to typing that text — both paths
  route through the same model + tool-calling logic, no separate code path.
- **Opening state is context-seeded:**
  - Arriving from the consultation flow with services selected → intro +
    buttons reflect those services (e.g. selected Wraps → "View wrap
    catalog", "Wrap pricing", "Ask something else").
  - Opened cold (no prior context) → generic starters: "View services",
    "Get a quote", "Ask a question".

### Smart navigation

The model is given a `navigate_to(page)` (or equivalent) tool the frontend
executes (e.g. `window.location`, smooth-scroll to a section) so that
requests like "show me the wrap catalog" or "what's your PPF pricing" result
in an actual navigation action rather than a text-only answer. The system
prompt is grounded in the site's real page/service structure (from the
existing HTML pages: ceramic, ppf, ppf-front, tint, wraps) to avoid
hallucinated offerings.

### Backend architecture

- New serverless function (`/api/chat`), added to the existing
  Vercel/Netlify deployment. Holds the LLM API key server-side; the
  frontend widget never sees it.
- Frontend widget: plain JS/CSS, no framework dependency required, embedded
  on every page (shared partial/script include).

### Model choice: Claude Haiku 4.5

- On-device/in-browser models (e.g. WebLLM/transformers.js) are explicitly
  rejected: too weak at the size that fits in a browser download, no
  server-side control for logging leads or future tool use, and a poor fit
  for a business agent that must follow shop-specific instructions
  reliably.
- Haiku 4.5 via the Claude API is recommended: fast, cheap, sufficiently
  capable for FAQ + guided navigation + light personality, and supports
  tool use so navigation and future automation extend the same pattern
  without an architecture change (e.g. later: drafting follow-up emails,
  summarizing leads, checking appointment slots).

### Cost estimate & controls

At expected volume (small local shop, dozens of conversations/day):
- Roughly $0.01–0.03 per conversation at Haiku 4.5 pricing
  (~$1 / $5 per million input/output tokens), i.e. well under $5–10/month
  at this scale.
- No paid vector DB needed — service/page info lives directly in the
  system prompt as structured text, hand-updated when services change.
- Prompt caching is used for the system prompt to keep per-message cost
  near-fixed as conversations grow.

**Usage controls (cost/abuse containment):**
- Turn cap per session (~15–20 messages); after the cap, the bot wraps up
  and pushes a call/consultation CTA.
- Input length cap/truncation on incoming messages before they reach the
  API.
- Per-visitor rate limiting (IP or session-based) inside the serverless
  function.
- Quick-reply buttons keep the common paths (catalog, pricing, hours)
  low-token by default; free text remains available for the minority who
  need it, not the default cost driver.

## Out of scope / explicitly not building

- No changes to the Shopmonkey iframe's internal form/fields.
- No on-device/in-browser LLM.
- No paid vector DB or external knowledge base — system-prompt-grounded
  only, for now.
- No CAPTCHA or paid abuse-detection service — rate limiting + turn caps
  are sufficient at current expected volume.
