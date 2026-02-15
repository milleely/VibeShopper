# VibeShopper — Project Progress

## Completed

### Core Build
- [x] Scaffold Next.js 16 app (TypeScript, Tailwind, App Router, `src/` dir, npm)
- [x] Copy backend modules to `src/lib/` and `src/app/api/analyze/`
- [x] Install dependencies (`@anthropic-ai/sdk`, `playwright`, Chromium)
- [x] Configure `next.config.ts` (`serverExternalPackages: ["playwright"]`)
- [x] Set dev server to port 3001
- [x] Create `.env.local` with `ANTHROPIC_API_KEY`

### Styling & Layout
- [x] Rewrite `globals.css` with Polaris theme tokens (Tailwind 4 `@theme inline`)
- [x] Rewrite `layout.tsx` with Inter font via `next/font/google`
- [x] Light-mode only, `#008060` primary green

### Components
- [x] Build `ScoreGauge.tsx` (score number + progress bar, color-coded by severity)
- [x] Build `LiveViewer.tsx` (progress bar, browser frame, commentary panel)
- [x] Build `AuditReport.tsx` (score, narrative, quick wins, category breakdown)
- [x] Rewrite `page.tsx` as main orchestrator (idle → crawling → complete)

### Bug Fixes
- [x] Fix JSON parsing — add `parseJsonResponse()` to strip markdown fences before `JSON.parse()`
- [x] Fix missing "analyzing" loading state — set `status: "analyzing"` when cart commentary arrives
- [x] Add analyzing overlay in `LiveViewer` ("Generating your audit report...")

### Crawler Enhancements
- [x] Rename `autoCloseCookieBanner` → `dismissOverlays`, expand to 14 selectors (cookies, geo-modals, popups)
- [x] Call `dismissOverlays` before every step (not just homepage)
- [x] Add `selectVariant(page)` — select size/color before add-to-cart (5 selector patterns)
- [x] Add `verifyCartUpdate(page)` — check cart count, drawer, or success notification
- [x] Update `crawlAddToCart` flow: variant selection → click → verification → partial failure signal
- [x] Surface `step.error` in AI commentary prompt so Claude doesn't generate false findings

### Report UX
- [x] Add "Audit Report" / "Browsing Session" tab toggle
- [x] Build `BrowsingSessionView` (screenshots + commentary side by side)
- [x] Build `ScreenshotLightbox` (full-size modal, Escape key, body scroll lock)
- [x] Make screenshot strip thumbnails clickable → lightbox
- [x] Add screenshot thumbnails to `IssueCard` and `QuickWinCard` (clickable, opens lightbox)
- [x] Pass `screenshotMap` through `CategorySection` to issue cards
- [x] Add footer CTA card ("Want to improve your score? Run another analysis...")

### Live Viewer UX
- [x] Simplify commentary panel — collapsed-by-default cards (step name + narrative + issue count badge)
- [x] Click-to-expand for full observations/issues/positives
- [x] Eliminate scroll mismatch between screenshot viewport and commentary panel
- [x] Multi-screenshot capture — 2-3 screenshots per step (initial + after scroll + after interaction)
- [x] Crossfade transitions between screenshots (300ms opacity fade, `onLoad`-gated)
- [x] "Scrolling..." indicator in browser footer during transitions
- [x] SSE streams screenshots individually via `onScreenshot` callback with index

### AI Accuracy
- [x] Send screenshots to Claude via multimodal API (image content blocks in `generateStepCommentary` and `generateAuditReport`)
- [x] Update system prompts to be screenshot-first with visual accuracy guardrails
- [x] Add "CRITICAL ACCURACY RULES" — never claim something is missing if visible in screenshot
- [x] Add `navigationConfidence` + `navigationMethod` fields to `CrawlStep`
- [x] Return navigation metadata from `findCollectionsLink` / `findProductLink` (high/medium/low)
- [x] Add `detectEmptyState(html)` — downgrades confidence when page shows 404/empty indicators
- [x] Pass navigation context to AI prompt so it doesn't blame stores for crawler navigation issues
- [x] Add "AUTOMATED BROWSING AWARENESS" block to both system prompts (empty states, failed add-to-cart, popup-blocked content)

### Documentation
- [x] Create `CLAUDE.md` with architecture, commands, design system, data flow

## Planned / Ideas

- [ ] Mobile responsiveness pass — test and fix layout on smaller viewports
- [ ] Error recovery — retry failed steps instead of returning partial data
- [ ] Export report — download audit as PDF or shareable link
- [ ] Historical comparisons — store previous audit scores, show improvement over time
- [ ] Checkout step — extend crawler to step 6 (begin checkout flow)
- [ ] Screenshot annotations — overlay hotspots on screenshots pointing to specific issues
