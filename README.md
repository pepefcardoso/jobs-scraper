# LinkedIn Jobs Scraper
Scrapes LinkedIn job search results and turns raw postings into structured, queryable data for job seekers tracking their applications.

## Problem
Job hunting on LinkedIn means re-reading the same postings, losing track of what you applied to, and manually copying details into a spreadsheet. Existing browser extensions scrape the page but don't decouple extraction from scraping, so switching AI providers or prompts means re-scraping everything. This project separates the two steps and keeps a durable record of every job seen, applied to, and its outcome.

## Tech Stack
| Layer      | Technology |
|------------|------------|
| Runtime    | Node.js, TypeScript, tsx |
| Scraping   | Playwright (Chromium) |
| Extraction | Gemini 2.5 Flash / Groq Llama 3.3 / DeepSeek (pluggable providers) |
| Database   | PostgreSQL via Prisma ORM |
| Validation | Zod |
| Infra      | Docker Compose (Postgres only) |

## Architecture
```
LinkedIn search URL
        │
        ▼
Scraper (Playwright, streaming batches)
        │  rawHtml / rawText / listMeta
        ▼
Job (Postgres)
        │
        ▼
Extraction queue (status: PENDING)
        │  provider: gemini | groq | deepseek
        ▼
Extraction (structuredData JSONB, one row per job+provider+promptVersion)
        │
        ▼
Application tracking (apply.ts) ── Report (report.ts, weekly conversion stats)
```
Scraping and extraction are decoupled — reruns of extraction with a new prompt or provider don't require re-scraping.

## Key Features
- **Scraping**
  - Streaming batches (default 10) to avoid memory bloat and enable crash resume
  - Retry policy: immediate retry on network errors, exponential backoff (5s→2min) on HTTP 429, immediate abort on CAPTCHA/checkpoint detection
  - Persistent login session via `pnpm login` (Playwright storage state)
- **Extraction**
  - Pluggable AI providers (Gemini, Groq, DeepSeek) with prompt versioning (`v1`, `v2`)
  - Multiple extractions per job for A/B testing providers/prompts (`@@unique([jobId, provider, promptVersion])`)
  - Configurable concurrency for API calls
- **Application Tracking**
  - `apply.ts` — list/filter applications by status (`APPLIED`, `SCREENED`, `INTERVIEWING`, `OFFERED`, `REJECTED`, `GHOSTED`, `WITHDRAWN`) and time window
  - `report.ts` — weekly conversion reports with configurable score threshold

## Project Structure
```
src/
├── cli/            # entrypoints: scrape, extract, apply, report, login
├── scraper/        # Playwright scraping, retry, CAPTCHA detection
├── extraction/      # AI provider adapters, prompt registry, schema validation
├── db/             # Prisma client
└── config.ts        # env-driven config
prisma/
└── schema.prisma    # Job, Extraction, Application models
```

## Getting Started
### Prerequisites
- Node.js >= 18
- pnpm
- Docker (Postgres only — no app Dockerfile, this is a CLI tool)

### Install
```bash
git clone <repo-url>
cd jobs-scraper
pnpm install
npx playwright install chromium
```

### Environment
```bash
cp .env.example .env
```

### Run
```bash
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm login                                     # opens browser, log in manually once
pnpm scrape --url "<linkedin-search-url>" --max-jobs 50 --batch-size 10
pnpm extract --provider gemini --prompt-version v1 --concurrency 3
pnpm apply --list --status APPLIED --since 7d
pnpm report --weeks 1 --threshold 60
```

## Environment Variables
| Variable       | Description            | Example                | Required |
|----------------|-------------------------|-------------------------|----------|
| `DATABASE_URL` | PostgreSQL connection    | `postgresql://scraper:scraper@localhost:5432/linkedin_scraper` | Yes |
| `EXTRACTION_PROVIDER` | Default AI provider | `gemini` | No |
| `EXTRACTION_PROMPT_VERSION` | Default prompt version | `v1` | No |
| `EXTRACTION_CONCURRENCY` | Concurrent extraction requests | `3` | No |
| `GEMINI_API_KEY` | Gemini API key | `AIza...` | Only if using Gemini |
| `GROQ_API_KEY` | Groq API key | `gsk_...` | Only if using Groq |
| `DEEPSEEK_API_KEY` | DeepSeek API key | `sk-...` | Only if using DeepSeek |
| `SCRAPER_HEADLESS` | Run Playwright headless | `true` | No |

## Testing
No automated test suite yet. Validate behavior via `pnpm scrape` / `pnpm extract` against a small `--max-jobs` run.

## Deployment
This is a local/scheduled CLI pipeline, not a deployed service. Only the PostgreSQL database is containerized.
```bash
docker compose up -d          # start Postgres
pnpm db:migrate                # apply schema
```
Runs are typically triggered manually or via a scheduled job (cron) calling `pnpm scrape` / `pnpm extract` in sequence.

## Conventions
Project rules and constraints live in [`SPEC.md`](./SPEC.md) — not duplicated here.

## License
MIT
