Checklist to test:

docker compose up -d
cp .env.example .env — fill in GEMINI_API_KEY and/or GROQ_API_KEY
pnpm install && npx playwright install chromium
pnpm db:generate && pnpm db:migrate
pnpm login — manual login, wait for redirect
pnpm scrape --url "<search-url>" --max-jobs 10 (small batch first)
pnpm extract --provider gemini