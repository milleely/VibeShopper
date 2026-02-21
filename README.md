# VibeShopper

AI-powered Shopify store analyzer. Crawls your store like a first-time customer, captures screenshots at every step, and generates a prioritized conversion audit report — all in under a minute.

Built with [Claude](https://anthropic.com) | [Next.js](https://nextjs.org) | [Playwright](https://playwright.dev)

## What It Does

VibeShopper simulates a real customer's first visit to any Shopify store. It navigates through 5 key pages — homepage, collections, product, add-to-cart, and cart — taking screenshots and analyzing each step with AI. The result is a scored audit report with actionable Quick Wins to improve your conversion rate.

## How It Works

**Paste URL** &rarr; **Watch AI Browse** &rarr; **Get Audit Report**

1. Enter any Shopify store URL
2. Watch in real-time as an AI-powered browser navigates your store, with live commentary appearing as each page is analyzed
3. Receive a comprehensive audit report with an overall score, category breakdowns, and prioritized fixes

### The 5-Step Customer Journey

| Step | What It Evaluates |
|---|---|
| **Homepage** | First impression, value proposition clarity, navigation |
| **Collections** | Product catalog organization, filtering, product cards |
| **Product** | Description quality, images, pricing, Add to Cart prominence |
| **Add to Cart** | Button visibility, confirmation feedback, cart drawer UX |
| **Cart** | Order summary, shipping info, trust signals, checkout path |

## Features

- **Real-time browser view** with live AI commentary as each page is analyzed
- **5-page customer journey** simulation covering the full purchase path
- **Scored audit report** (0-100) with category breakdowns across 5 dimensions
- **Quick Wins** — top 3 highest-impact, lowest-effort fixes with specific instructions
- **Issue severity ratings** (high/medium/low) with one-sentence fixes
- **Screenshot capture** at every step for visual reference
- **Intelligent overlay dismissal** — automatically handles cookie banners, geo-selectors, newsletter popups, and age gates
- **Parallel AI analysis** — commentary generates in the background while browsing continues (~45-55s total)

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** | App Router, SSE streaming API, React Server Components |
| **TypeScript** | Strict mode, full type safety |
| **Tailwind CSS 4** | Dark aurora theme with custom design tokens |
| **Claude API** | Per-step commentary + full audit report generation |
| **Playwright** | Headless Chromium for real browser screenshots + HTML capture |

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# Clone the repo
git clone https://github.com/milleely/VibeShopper.git
cd VibeShopper/vibeshopper

# Install dependencies
npm install

# Install Playwright's Chromium browser
npx playwright install chromium

# Set up environment variables
cp .env.example .env.local
# Then add your Anthropic API key to .env.local
```

### Environment Variables

Create a `.env.local` file:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and try analyzing a store like `allbirds.com`, `gymshark.com`, or `bombas.com`.

## Architecture

```
src/
├── app/
│   ├── layout.tsx            # Root layout (Inter font, metadata)
│   ├── page.tsx              # Main page — state machine: idle → crawling → complete
│   ├── globals.css           # Aurora theme tokens + Tailwind config
│   └── api/analyze/
│       └── route.ts          # SSE streaming endpoint (POST /api/analyze)
├── components/
│   ├── LiveViewer.tsx        # Real-time crawl view (browser frame + commentary)
│   ├── AuditReport.tsx       # Final report (score, quick wins, categories)
│   └── ScoreGauge.tsx        # Score display + progress bar
└── lib/
    ├── types.ts              # TypeScript types + CRAWL_STEPS config
    ├── validators.ts         # Shopify URL validation
    ├── crawler.ts            # Playwright browser automation (5 steps)
    ├── analyzer.ts           # Claude API calls (commentary + audit)
    └── useStoreAnalysis.ts   # React hook — SSE consumer + UI state
```

### Data Flow

1. User submits a Shopify URL
2. `POST /api/analyze` validates the URL and opens an SSE stream
3. Playwright crawls 5 pages, emitting `step_start`, `screenshot`, and `commentary` events
4. The `LiveViewer` component renders screenshots and AI commentary in real-time
5. After all steps, Claude generates a full audit report
6. The `AuditReport` component renders the scored dashboard

## Deployment

VibeShopper includes a production-ready Dockerfile based on `mcr.microsoft.com/playwright` for container deployments (Railway, Fly.io, etc.):

```bash
docker build -t vibeshopper .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... vibeshopper
```

Key deployment notes:
- Requires Node.js runtime (not edge) — set `runtime = "nodejs"` in route config
- `maxDuration = 120` for the full crawl + analysis cycle
- Playwright needs `--no-sandbox` and `--disable-dev-shm-usage` flags in containers

## License

[MIT](LICENSE)
