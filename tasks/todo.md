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
- [x] Compact Browsing Session commentary — narrative + severity summary line (matching live view)
- [x] Decouple screenshot/commentary heights in Browsing Session (`items-start`)
- [x] Add page name and URL link to Quick Win cards

### Live Viewer UX
- [x] Simplify commentary panel — compact cards (step name + narrative + severity breakdown + top issue)
- [x] Remove expandable detail from live view (observations, issues list, positives → audit report only)
- [x] Remove unused `SeverityBadge` and `SEVERITY_STYLES` from LiveViewer
- [x] Decouple screenshot/commentary panel heights (`items-start`, viewport `max-h-[500px]`, commentary `max-h-[600px]`)
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
- [x] Add "WHAT IS NOT AN ISSUE" section — cookie banners, cart drawers, geo-selectors, chat widgets are normal
- [x] Add "Focus on issues a REAL FIRST-TIME SHOPPER would notice" guidance
- [x] Add scope rules — describe only current page, no forward-looking predictions
- [x] Pass previous step context (URLs, errors) to each commentary call for consistent narratives

### Dark Aurora Theme
- [x] Replace light Polaris theme with animated aurora gradient background (`bg-aurora`)
- [x] Create three-tier card system: `.card-glass`, `.card-dark`, `.card-dark-nested`
- [x] Restyle LiveViewer with dark glass cards (progress bar, browser frame, commentary panel)
- [x] Restyle AuditReport with dark glass cards (all 12 element groups)
- [x] Update ScoreGauge colors for dark background (`#ff6b6b`, `#ffd93d`, `#6bcf7f`)
- [x] Update severity styles to bright colors with transparent backgrounds
- [x] White text opacity hierarchy (100%, 80%, 70%, 60%, 40%)

### Crawler Resilience
- [x] Wrap crawl steps 2-5 in per-step try/catch — single-step failures don't abort the crawl
- [x] Change `findProductLink()` from throwing to returning fallback URL
- [x] Expand `dismissOverlays()` to 40+ selectors (newsletter, Klaviyo, Privy, promo, age verification, announcement bars)
- [x] Add JS fallback to hide fixed/sticky overlays with z-index > 999 covering > 30% viewport

### Performance
- [x] Parallel commentary — fire-and-forget with `Promise.all()` collection before audit
- [x] Switch `page.goto()` from `networkidle` to `domcontentloaded` + 1500ms settle
- [x] Tighten overlay dismissal timeouts (800→400ms visibility, 400→250ms post-click)
- [x] Tighten selector timeouts across all helper functions (600-1200ms range)
- [x] Reduce scroll waits (500→300ms), add-to-cart wait (2000→1200ms)

### Deployment
- [x] Create Dockerfile with Playwright base image (multi-stage build)
- [x] Deploy to Railway
- [x] Add `--disable-dev-shm-usage` Chromium flag for container memory limits
- [x] Set `maxDuration = 120` in route config

### Repo & Documentation
- [x] Create `CLAUDE.md` with architecture, commands, design system, data flow
- [x] Rewrite README with project showcase (features, tech stack, architecture, getting started)
- [x] Add MIT license
- [x] Add `.env.example` for onboarding
- [x] Add package.json metadata (description, keywords, author, repository)
- [x] Update CLAUDE.md design system to reflect dark aurora theme
- [x] Remove unused Next.js boilerplate SVGs from public/

## In Progress

- [ ] Fix audit report generation failure — commentary ordering bug with parallel execution (ordering fix applied, needs testing)

## Planned / Ideas

- [ ] Add screenshots/demo GIF to README
- [ ] Mobile responsiveness pass — test and fix layout on smaller viewports
- [ ] Error recovery — retry failed steps instead of returning partial data
- [ ] Export report — download audit as PDF or shareable link
- [ ] Historical comparisons — store previous audit scores, show improvement over time
- [ ] Checkout step — extend crawler to step 6 (begin checkout flow)
- [ ] Screenshot annotations — overlay hotspots on screenshots pointing to specific issues
