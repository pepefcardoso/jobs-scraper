# LinkedIn Jobs Scraper

A robust pipeline to scrape LinkedIn job search results, extract structured data using pluggable AI providers (Gemini, Groq), and store both raw and structured data in a PostgreSQL database.

## Features
- **Streaming Scraping**: Scrapes jobs in batches using Playwright and saves raw HTML/text immediately to avoid memory bloat and handle crashes gracefully.
- **AI Extraction**: Uses Large Language Models (Gemini 2.5 Flash, Groq Llama 3.3) to extract structured fields (title, seniority, tech stack, salary, etc.) from raw job descriptions.
- **Decoupled Architecture**: Scraping and extraction are isolated steps. You can re-run the AI extraction with different prompts or providers without having to re-scrape LinkedIn.
- **Resilience**: Built-in retry logic, exponential backoff for HTTP 429 rate limits, and checkpoint/CAPTCHA detection.

## Prerequisites
- Node.js (v18+)
- `pnpm` (Package manager)
- Docker & Docker Compose (for the PostgreSQL database)

## Installation

1. **Clone the repository and install dependencies:**
   ```bash
   pnpm install
   npx playwright install chromium

```

2. **Set up the environment variables:**
Copy the example environment file and add your API keys.
```bash
cp .env.example .env

```


*Ensure you fill in `GEMINI_API_KEY` and/or `GROQ_API_KEY` in the `.env` file.*
3. **Start the database:**
Run the PostgreSQL instance using Docker Compose:
```bash
docker compose up -d

```


4. **Initialize the database schema:**
Apply Prisma migrations and generate the client:
```bash
pnpm db:generate
pnpm db:migrate

```



## Usage

### 1. Authentication

Before scraping, you need to log in to LinkedIn to save your session state.

```bash
pnpm login

```

*This will open a Playwright browser window. Log in manually and wait for it to redirect to your LinkedIn feed. The session will be saved locally.*

### 2. Scraping Jobs

Scrape job listings from a specific LinkedIn search URL.

```bash
pnpm scrape --url "<search-url>" --max-jobs 10

```

*Options:*

* `--batch-size`: Number of jobs to process before saving to the database (default: 10).
* `--max-jobs`: Total maximum number of jobs to scrape (default: 50).

### 3. Extracting Structured Data

Process the scraped raw job descriptions using an AI provider to get structured JSON data.

```bash
pnpm extract --provider gemini

```

*Options:*

* `--provider`: `gemini` or `groq`.
* `--prompt-version`: Specify the prompt version to use (e.g., `v1`).
* `--concurrency`: Number of concurrent API requests (defaults to 3).

## Database Architecture

The project uses Prisma with PostgreSQL, consisting of two main models:

* **`Job`**: Stores the raw scraped data (`rawHtml`, `rawText`, `listMeta`).
* **`Extraction`**: Stores the structured data output from the AI provider. It links back to the `Job`. This structure allows multiple extractions per job (e.g., for A/B testing Groq vs. Gemini prompts).
