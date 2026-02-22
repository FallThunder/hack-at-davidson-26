<div align="center">

# Evident

### Instant AI Credibility Analysis for News Articles

Detect bias. Verify claims. Understand truth — at a glance.

<br>

![Hackathon](https://img.shields.io/badge/Hack@Davidson-2026-blue.svg)
![Version](https://img.shields.io/badge/version-2.2.0-orange.svg)
![Chrome](https://img.shields.io/badge/platform-Chrome-green.svg)
![Firefox](https://img.shields.io/badge/platform-Firefox-orange.svg)
![AI](https://img.shields.io/badge/powered%20by-Claude%20Opus-purple.svg)

<br>

**Making truth easier to see.**

<br>

**[Chrome — Download evident-chrome.zip](https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-chrome.zip)**
&nbsp;&nbsp;|&nbsp;&nbsp;
**[Firefox — Download evident-firefox.zip](https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-firefox.zip)**

</div>

---

## What It Does

Evident is a browser extension (Chrome and Firefox) that analyzes news articles for bias, factual accuracy, and rhetorical manipulation — surfacing inline sentence-level flags directly on the page without interrupting your reading.

Click the Evident icon → a side panel loads:

- A **Trust Score** (0–100) with animated arc gauge
- **Site profile** — political bias bar, factual reporting rating, tone, factuality
- **Fact flags** — color-coded sentence highlights (yellow/orange/red by urgency) with confidence %, reasoning, and sources

Highlighted sentences are interactive: hover for a tooltip, click for a full card. Clicking a flag card in the panel scrolls and pulses the matching sentence in the article.

---

## Current State

The extension uses a **live backend** (`factcheck2.coredoes.dev`) that analyzes any news article via Claude Opus. Analysis is cached server-side, so revisiting an article is near-instant.

- First visit to an article: analysis streams in (publisher profile first, then flags once ready)
- Subsequent visits or tab switches: results are restored instantly from the local extension cache — no API call made
- Non-article pages (new tabs, settings, etc.) show a "no analysis available" message

**Chrome vs Firefox behavior:**

| Event | Chrome | Firefox |
|---|---|---|
| Navigate to new URL | Side panel resets to idle; must click Analyze on new article | Sidebar resets to idle; must click Analyze on new article |
| Click toolbar icon | Opens side panel | Toggles sidebar open/close |
| Close panel/sidebar | All highlights removed | All highlights removed |

---

## Features

- **Manage news sites** — settings panel (sliders icon in header) lets you add custom domains, remove them, or browse the full built-in list; user-added sites persist across sessions
- **Streaming UI** — shimmer skeleton cards fill in progressively as results arrive; cycling status messages keep you informed while loading
- **Trust Meter** — animated spinning arc while analyzing, then animated SVG arc + count-up number, color-coded by tier (red / orange / yellow / green)
- **Inline highlights** — urgency-coded spans injected directly into article text; beat any page `!important` CSS via inline style priority; hover triggers a holographic iridescent shimmer effect
- **Hover tooltips** — fixed-position, escape `overflow:hidden` containers on any news site
- **Click popovers** — flag detail card (reasoning + sources) anchored to the highlighted text
- **Bidirectional scroll** — click article highlight → side panel scrolls to flag card; click flag card excerpt → article scrolls to highlight with pulse animation
- **Active flag tracking** — blue ring follows whichever flag was most recently activated (from article or panel)
- **Dark / light mode** — synced to system preference, manual override
- **Tab result caching** — switching back to a previously analyzed tab restores results instantly with no API call; same-page refreshes re-analyze
- **Paywall support** — article text extracted from the page is sent directly to the backend, so paywalled articles you've loaded are fully analyzable
- **Slow response warning** — amber banner appears after 2 minutes if the backend hasn't responded
- **Clean close** — closing the panel removes all highlights, tooltips, and popovers from the article

---

## Installation

### Chrome

#### Option A — Download pre-built release (recommended)

1. Download **[evident-chrome.zip](https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-chrome.zip)** from the latest release
2. Unzip it — you'll get a `dist/` folder
3. Open Chrome → `chrome://extensions` → enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `dist/` folder
5. Navigate to any news article and click the Evident toolbar icon

#### Option B — Build from source

```bash
npm install
npm run build:chrome
```

Then load the `dist/` folder as an unpacked extension (same steps 3–5 above).

---

### Firefox

#### Option A — Download pre-built release (recommended)

1. Download **[evident-firefox.zip](https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-firefox.zip)** from the latest release
2. Open Firefox → navigate to `about:debugging`
3. Click **This Firefox** → **Load Temporary Add-on**
4. Select the `manifest.json` file inside the unzipped `dist-firefox/` folder
5. Navigate to any news article — the Evident sidebar appears in Firefox's sidebar selector

> **Note:** Temporary add-ons in Firefox are removed when the browser closes. For a persistent install, the extension would need to be signed by Mozilla.

#### Option B — Build from source

```bash
npm install
npm run build:firefox
```

Then load `dist-firefox/manifest.json` via `about:debugging` → Load Temporary Add-on.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Manifest V3 + Firefox MV3 (`sidebar_action`) |
| Side panel UI | React 18 + Vite 5 + Tailwind CSS 3.4 |
| Analysis API | Claude Haiku (publisher) + Claude Opus (analysis) via live backend at `factcheck2.coredoes.dev` |
| Build | Three-pass Vite `build()` in `build.js` (side panel, content script IIFE, service worker ESM/IIFE) |
| State | `useReducer` state machine; per-session URL cache avoids redundant API calls on tab switch |
| Text matching | Jaccard word similarity (threshold 0.5) with cross-node DOM range wrapping |

---

## Architecture

```
/src/
  sidepanel/        React SPA (side panel / sidebar)
    App.jsx         Root — orchestrates analysis + message routing
    mockData.js     URL-keyed mock data adapter (reference only)
    components/     TrustMeter, SiteProfile, DimensionCard, FlagCard, ...
    hooks/
      useAnalysis.js   useReducer state machine + live backend polling + URL cache
      useHighlights.js APPLY / TOGGLE / CLEAR / SCROLL highlight control
  content/
    content.js      Article extraction, highlight injection, tooltip + popover
    highlight.css   Urgency colors, tooltip, popover styles
  background/
    service-worker.js  Panel open/close, message relay, tab/navigation events
                       (Chrome: ES module; Firefox: IIFE event page)
  utils/
    scoring.js         Weighted Trust Score formula
    articleExtractor.js Heuristic article text extraction
/public/
  manifest.json         Chrome MV3 manifest (side_panel)
  manifest-firefox.json Firefox MV3 manifest (sidebar_action, background.scripts)
  icons/                16, 48, 128px + trust-tier colored variants
/dist/                  Chrome build output (load as unpacked in Chrome)
/dist-firefox/          Firefox build output (load via about:debugging)
/exampleFiles/
  example2/         Fox News article + pre-analyzed JSON
  example3/         Boing Boing article + pre-analyzed JSON
```

---

## Trust Score Formula

Starts at 100, then applies additive adjustments:

1. **Publisher factual reporting** — up to ±20 pts based on MBFC factual reporting score
2. **Political bias neutrality** — up to −12 pts based on distance from center on MBFC bias scale
3. **Content factuality** — up to ±30 pts based on overall factuality rating
4. **Content tone** — up to −20 pts based on overall tone rating
5. **Per-flag deductions** — each flag deducts points scaled by urgency and confidence


- **85–100** High Trust (green)
- **70–84** Mostly Reliable (yellow)
- **55–69** Use Caution (orange)
- **0–54** Low Trust (red)

---

## Build Commands

```bash
npm run build           # Build both Chrome and Firefox
npm run build:chrome    # Chrome only → dist/
npm run build:firefox   # Firefox only → dist-firefox/
npm run zip:chrome      # Build + zip Chrome → evident-chrome.zip
npm run zip:firefox     # Build + zip Firefox → evident-firefox.zip
```

---

*Built at Hack@Davidson 2026 (Feb 20–22)*
