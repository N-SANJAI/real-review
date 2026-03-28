# The Real Review

Unbiased product reviews aggregated from Reddit, Trustpilot, forums, and YouTube — powered by TinyFish web agents and OpenAI.

## How it works

1. User enters a product name
2. OpenAI (`gpt-4o`) identifies 6 high-quality review sources
3. TinyFish runs 6 parallel browser agents to scrape each source
4. OpenAI synthesizes a full report: verdict, score, pros, cons, red flags

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add environment variables
```bash
cp .env.local.example .env.local
```
Fill in:
- `OPENAI_API_KEY` — from https://platform.openai.com
- `TINYFISH_API_KEY` — from https://agent.tinyfish.ai/api-keys

### 3. Run dev server
```bash
npm run dev
```

Open http://localhost:3000

## File Structure

```
app/
  page.tsx                     # Home / search input
  results/page.tsx             # Results page (orchestrates pipeline)
  api/
    identify-urls/route.ts     # OpenAI → find 6 source URLs
    scrape/route.ts            # TinyFish parallel scraping
    synthesize/route.ts        # OpenAI → synthesize full report
components/
  ReportCard.tsx               # Verdict, score, pros/cons, red flags
  SourceCard.tsx               # Per-source review preview
lib/
  types.ts                     # Shared TypeScript types
  openai.ts                    # OpenAI client
  tinyfish.ts                  # TinyFish helper (single + parallel)
```

## Pipeline

```
User Input
    ↓
/api/identify-urls  (OpenAI gpt-4o)
    ↓ 6 URLs
/api/scrape         (TinyFish x6 parallel)
    ↓ scraped reviews
/api/synthesize     (OpenAI gpt-4o)
    ↓
Full Report
```
