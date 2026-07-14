import "dotenv/config";

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  geminiApiKey: () => required("GEMINI_API_KEY"),
  groqApiKey: () => required("GROQ_API_KEY"),
  deepseekApiKey: () => required("DEEPSEEK_API_KEY"),
  extractionConcurrency: Number(process.env.EXTRACTION_CONCURRENCY ?? 3),
  headless: process.env.SCRAPER_HEADLESS !== "false",
};
