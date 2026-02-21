# VibeShopper

AI-powered Shopify store analyzer. Crawls a store like a first-time customer (5 pages), captures screenshots, generates per-step AI commentary, and produces a full conversion audit report.

## Tech Stack

- **Framework**: Next.js 16 (App Router, `src/` directory)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 with `@theme inline` tokens in `globals.css`
- **AI**: Anthropic Claude API via `@anthropic-ai/sdk`
- **Crawling**: Playwright (headless Chromium)
- **Package Manager**: npm

## Design System

Dark aurora theme with animated gradient background.

- **Font**: Inter (loaded via `next/font/google`)
- **Primary color**: `#008060` (Shopify green)
- **Background**: Animated aurora gradient (`bg-aurora` class in `globals.css`)
- **Cards**: Three-tier system:
  - `.card-glass` — frosted glass (8% white bg, blur backdrop)
  - `.card-dark` — solid dark (`rgba(2, 20, 16, 0.90)`)
  - `.card-dark-nested` — subtle nested card (6% white bg)
- **Severity colors**: `#ff6b6b` (high), `#ffd93d` (medium), `#6bcf7f` (low)
- **Text**: White with opacity hierarchy — `text-white` (headings), `text-white/70` (body), `text-white/60` (secondary), `text-white/40` (muted)
- All colors are registered as Tailwind theme tokens (e.g., `bg-primary`)

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout (Inter font, metadata)
│   ├── page.tsx            # Main page — state machine: idle → crawling → complete
│   ├── globals.css         # Polaris color tokens + Tailwind theme
│   └── api/analyze/
│       └── route.ts        # SSE streaming endpoint (POST /api/analyze)
├── components/
│   ├── LiveViewer.tsx      # Real-time crawl view (browser frame + commentary)
│   ├── AuditReport.tsx     # Final report dashboard (score, quick wins, categories)
│   └── ScoreGauge.tsx      # Score number + progress bar
└── lib/
    ├── types.ts            # All TypeScript types + CRAWL_STEPS config
    ├── validators.ts       # Shopify URL validation (checks /products.json)
    ├── crawler.ts          # Playwright: navigates 5 pages, captures screenshots + HTML
    ├── analyzer.ts         # Claude API: per-step commentary + full audit report
    └── useStoreAnalysis.ts # React hook: SSE consumer, manages all UI state
```

## Data Flow

1. `page.tsx` renders idle form → user submits URL → `useStoreAnalysis().analyze(url)`
2. Hook POSTs to `/api/analyze`, opens SSE stream
3. `route.ts` validates URL → launches Playwright crawl (5 steps)
4. Each step: `step_start` → `screenshot` → `commentary` SSE events
5. Hook updates state → `LiveViewer` renders in real time
6. After all steps: Claude generates full audit → `report` SSE event → `AuditReport` renders

## Key Patterns

- **JSON parsing from Claude**: Always use `parseJsonResponse()` in `analyzer.ts` — strips markdown fences before `JSON.parse()`
- **Overlay dismissal**: `dismissOverlays()` in `crawler.ts` runs before every screenshot to clear cookie banners, geo-modals, and popups
- **Status state machine**: `idle` → `validating` → `crawling` → `analyzing` → `complete` | `error`
- **Screenshots**: Base64 PNGs rendered as `data:image/png;base64,${screenshot}`

## Commands

```bash
npm run dev        # Dev server on port 3001
npm run build      # Production build
npm run lint       # ESLint
```

## Environment

Requires `.env.local` with:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Playwright Chromium must be installed: `npx playwright install chromium`

## Configuration

- `next.config.ts`: `serverExternalPackages: ["playwright"]` (Playwright can't be client-bundled)
- `route.ts`: `runtime = "nodejs"`, `maxDuration = 120` (full crawl needs Node.js runtime + 2 min timeout)
- Dev server runs on port 3001 (`package.json` dev script)

## Claude Code Rules

Follow these rules for all development work.

### Planning Protocol
1. First think through the problem, read the codebase for relevant files, and write a plan to `tasks/todo.md`
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan
4. Then, begin working on the todo items, marking them as complete as you go
5. Every step of the way, give me a high-level explanation of what changes you made
6. Finally, add a review section to the `todo.md` file with a summary of the changes you made

### Simplicity Rules
- Make every task and code change as simple as possible
- Avoid massive or complex changes—every change should impact as little code as possible
- One feature per PR. If a change touches more than 3 files, pause and ask if it can be split
- Everything is about simplicity

### Quality Standards
- DO NOT BE LAZY. IF THERE IS A BUG, FIND THE ROOT CAUSE AND FIX IT
- No temporary fixes. You are a senior developer
- All fixes should only impact necessary code relevant to the task and nothing else
- Your goal is to not introduce any bugs

### Debugging Protocol
- CRITICAL: When debugging, trace through the ENTIRE code flow step by step. No assumptions. No shortcuts.
- CRITICAL: Before pushing build to production, run locally to catch all errors in one cycle or in as few cycles as needed.

### Development Notes
- Auto-save occurs on editor content changes
- Theme switching supports light/dark/system modes
- Responsive design optimized for desktop use

**This document is maintained by AI assistants working with Michael. Keep it updated as the project evolves.**