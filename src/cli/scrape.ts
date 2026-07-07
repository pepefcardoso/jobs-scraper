import { scrapeSearch } from "../scraper";

const args = process.argv.slice(2);
const url = args[args.indexOf("--url") + 1];
const batchSize = args.includes("--batch-size")
  ? Number(args[args.indexOf("--batch-size") + 1])
  : undefined;
const maxJobs = args.includes("--max-jobs")
  ? Number(args[args.indexOf("--max-jobs") + 1])
  : undefined;

if (!url) {
  console.error(
    "Usage: pnpm scrape --url <search-url> [--batch-size N] [--max-jobs N]",
  );
  process.exit(1);
}

scrapeSearch(url, { batchSize, maxJobs })
  .then(() => console.log("Scrape complete"))
  .catch((err) => {
    console.error("Scrape failed:", err.message);
    process.exit(1);
  });
