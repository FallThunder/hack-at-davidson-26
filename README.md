<div align="center">

# Evident

### Instant AI Credibility Analysis for News Articles

Detect bias. Verify claims. Understand truth — at a glance.

<br>

![Hackathon](https://img.shields.io/badge/Hack@Davidson-2026-blue.svg)
![Version](https://img.shields.io/badge/version-1.7.0-orange.svg)
![Platform](https://img.shields.io/badge/platform-Chrome-green.svg)
![AI](https://img.shields.io/badge/powered%20by-Claude%20Sonnet-purple.svg)

<br>

**Making truth easier to see.**

<br>

**[Download latest release (evident.zip)](https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident.zip)**

</div>

---

## What It Does

Evident is a Chrome extension that analyzes news articles across **6 trust dimensions** and surfaces inline sentence-level flags directly on the page — without interrupting your reading.

Click the Evident icon → a side panel streams in:

- A **Trust Score** (0–100) with animated arc gauge
- **Site profile** — political bias bar, factual reporting rating, tone
- **6 dimension cards** — fact-checking, rhetoric, headline accuracy, statistics, source diversity, emotional arc
- **Fact flags** — color-coded sentence highlights (yellow/orange/red by urgency) with confidence %, reasoning, and sources

Highlighted sentences are interactive: hover for a tooltip, click for a full card. Clicking a flag card in the panel scrolls and pulses the matching sentence in the article.

---

## Current State

The extension uses a **live backend** (`factcheck.coredoes.dev`) that analyzes any news article via Claude Sonnet. Analysis is cached server-side, so revisiting an article is near-instant.

- First visit to an article: analysis streams in (publisher profile first, then flags once ready)
- Subsequent visits or tab switches: results are restored instantly from the local extension cache — no API call made
- Navigating away from an article automatically closes the panel; click the toolbar icon on any article to open it again
- Non-article pages (new tabs, settings, etc.) show a "no analysis available" message

---

## Features

- **Streaming UI** — shimmer skeleton cards fill in progressively as results arrive; cycling status messages keep you informed while loading
- **Trust Meter** — animated spinning arc while analyzing, then animated SVG arc + count-up number, color-coded by tier (red / yellow / green)
- **Inline highlights** — urgency-coded spans injected directly into article text; beat any page `!important` CSS via inline style priority; hover triggers a holographic iridescent shimmer effect
- **Hover tooltips** — fixed-position, escape `overflow:hidden` containers on any news site
- **Click popovers** — flag detail card (reasoning + sources) anchored to the highlighted text
- **Bidirectional scroll** — click article highlight → side panel scrolls to flag card; click flag card excerpt → article scrolls to highlight with pulse animation
- **Active flag tracking** — blue ring follows whichever flag was most recently activated (from article or panel)
- **Dark / light mode** — synced to system preference, manual override
- **Tab result caching** — switching back to a previously analyzed tab restores results instantly with no API call; same-page refreshes re-analyze; navigating to a new URL closes the panel so you choose when to activate it
- **Paywall support** — article text extracted from the page is sent directly to the backend, so paywalled articles you've loaded are fully analyzable
- **Slow response warning** — amber banner appears after 2 minutes if the backend hasn't responded
- **Clean close** — closing the panel removes all highlights, tooltips, and popovers from the article

---

## Installation

### Option A — Download pre-built release (recommended)

1. Download **[evident.zip](https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident.zip)** from the latest release
2. Unzip it — you'll get a `dist/` folder
3. Open Chrome → `chrome://extensions` → enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `dist/` folder
5. Navigate to one of the demo article URLs above and click the Evident toolbar icon

### Option B — Build from source

```bash
npm install
npm run build
```

Then load the `/dist` folder as an unpacked extension (same steps 3–5 above).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Manifest V3 |
| Side panel UI | React 18 + Vite 5 + Tailwind CSS 3.4 |
| Analysis API | Claude Sonnet via live backend at `factcheck.coredoes.dev` |
| Build | Three-pass Vite `build()` in `build.js` (side panel, content script IIFE, service worker ESM) |
| State | `useReducer` state machine; per-session URL cache avoids redundant API calls on tab switch |
| Text matching | Jaccard word similarity (threshold 0.5) with cross-node DOM range wrapping |

---

## Architecture

```
/src/
  sidepanel/        React SPA (side panel)
    App.jsx         Root — orchestrates analysis + message routing
    mockData.js     URL-keyed mock data adapter (example2 + example3)
    components/     TrustMeter, SiteProfile, DimensionCard, FlagCard, ...
    hooks/
      useAnalysis.js   useReducer state machine + live backend polling + URL cache
      useHighlights.js APPLY / TOGGLE / CLEAR / SCROLL highlight control
  content/
    content.js      Article extraction, highlight injection, tooltip + popover
    highlight.css   Urgency colors, tooltip, popover styles
  background/
    service-worker.js  Panel open/close, message relay, tab/navigation events
  utils/
    scoring.js         Weighted Trust Score formula
    articleExtractor.js Heuristic article text extraction
/api/
  analyze.js        Vercel serverless proxy → Claude API (to be wired up)
/public/
  manifest.json     MV3 manifest
  icons/            16, 48, 128px + trust-tier colored variants
/exampleFiles/
  example2/         Fox News article + pre-analyzed JSON
  example3/         Boing Boing article + pre-analyzed JSON
```

---

## Trust Score Formula

```
TrustScore = factCheck×0.25 + rhetoric×0.20 + headlineAccuracy×0.15
           + statistics×0.15 + sourceDiversity×0.15 + emotionalArc×0.10
```

- **0–39** Low Trust (red)
- **40–69** Moderate (yellow)
- **70–100** High Trust (green)

---

*Built at Hack@Davidson 2026 (Feb 20–22)*
