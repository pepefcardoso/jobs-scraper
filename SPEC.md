# LinkedIn Job Scraper — Spec (v2)

## Goal

Scrape LinkedIn job search results, extract structured data via pluggable
AI providers, store raw + structured data in Postgres. Support re-running
extraction independently of scraping, and A/B comparison across providers.

## Pipeline

```
Scrape (streaming, batch of N)
    ↓
Job (raw storage: rawHtml, rawText, listMeta, scrapedAt)
    ↓
Extraction Queue (status: PENDING)
    ↓
Extraction (provider + model + promptVersion)
    ↓
Extraction row (structuredData, schemaVersion) — one per (job, provider, promptVersion)
```

## Stack adjustment

Postgres (not SQLite) — matches your stack, and normalized Job/Extraction
tables benefit from JSONB + proper indexing for A/B queries.

## Database schema

### `Job`

- `id`, `linkedinJobId` (unique), `searchUrl`, `scrapedAt`
- `rawHtml`, `rawText`
- `listMeta` (JSONB — title/company/location/badges as scraped)
- `createdAt`, `updatedAt`

### `Extraction`

- `id`, `jobId` (FK → Job)
- `provider`, `model`, `promptVersion`, `schemaVersion`
- `status` (`PENDING` | `SUCCESS` | `FAILED`)
- `attempts`, `lastError`
- `structuredData` (JSONB — the full `ExtractedJob` shape)
- `createdAt`, `updatedAt`
- unique on `(jobId, provider, promptVersion)` — reruns of the same
  provider+prompt update in place; different prompt/provider adds a row

## Scraper (`src/scraper/`)

- Streaming batches of N (default 10): scrape → hand off to extraction
  queue → persist → next batch. Avoids full-run memory buildup and gives
  crash resume for free (query `Job` rows with no matching `SUCCESS` extraction).
- Retry policy:
  - network error → immediate retry, up to 3x
  - Playwright error (stale element, detached node, timeout) → retry once
  - HTTP 429 → exponential backoff: 5s → 15s → 45s → 2min, then abort run
  - checkpoint/CAPTCHA redirect detected → abort run immediately, no retry
- Output per job: `{ linkedinJobId, searchUrl, scrapedAt, rawHtml, rawText, listMeta }`

## Extraction (`src/extraction/`)

- Provider interface takes full context, not just raw text — lets each
  provider decide what it needs and lets listMeta backfill gaps the
  description omits (e.g. location, applicant count).

```ts
interface ExtractionProvider {
  name: string;
  model: string;
  extract(input: {
    rawHtml: string;
    rawText: string;
    listMeta: ListMeta;
  }): Promise<ExtractedJob>;
}
```

- Prompt versioned (`promptVersion`, e.g. `v1`, `v2`) and stored per extraction row.
- `EXTRACTION_CONCURRENCY` env var, default varies by provider (Groq's
  free tier is 30 RPM vs Gemini's higher ceiling — concurrency should not
  be a single hardcoded constant).
- Malformed JSON → retry up to 2x with error appended to prompt context,
  then `status = FAILED` + `lastError` recorded — never silently null out fields.

## Entry points

- `pnpm scrape --url "<search-url>" [--batch-size 10] [--max-jobs 50]`
- `pnpm extract --provider gemini|groq [--prompt-version v1] [--concurrency N]`
  — runs independently against any `Job` rows missing a `SUCCESS` extraction
  for that provider+promptVersion, so re-extraction never re-scrapes.
- `pnpm compare --provider-a gemini --provider-b groq` — diffs
  `structuredData` across two `Extraction` rows per job for the eval set.

## Evaluation harness

- Labeled set of 100–200 jobs with hand-verified fields (title, company,
  salary, employment type, seniority, tech stack).
- Field-level exact-match / precision-recall for objective fields
  (title, company, salary, employment type).
- Manual review pass for subjective fields (soft skills, inferred seniority).
- Results stored as a report (not in the main DB) — this is a one-time
  comparison tool, not part of the production pipeline.

## Out of scope

- Scheduling/cron
- Web UI (query Postgres directly, or add later)
- Proxy rotation / anti-detection beyond delay + backoff

## Resolved decisions

1. Retry/backoff — as above, checkpoint/CAPTCHA aborts rather than retries.
2. Raw HTML + raw text persisted for every job, unconditionally.
3. Gemini vs Groq — labeled eval set + field-level metrics, not spot-checks alone.
