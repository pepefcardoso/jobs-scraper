import { scrapeSearch } from "../scraper";
import { getArg } from "./args";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const url = getArg(args, "--url");
const batchSize = getArg(args, "--batch-size") ? Number(getArg(args, "--batch-size")) : undefined;
const maxJobs = getArg(args, "--max-jobs") ? Number(getArg(args, "--max-jobs")) : undefined;
const isAll = args.includes("--all");
const name = getArg(args, "--name");

async function main() {
  if (isAll || name) {
    const searchesPath = path.resolve(process.cwd(), "searches.json");
    if (!fs.existsSync(searchesPath)) {
      console.error("searches.json not found in the root directory.");
      process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(searchesPath, "utf-8"));
    const searches = config.searches;

    const toRun = name ? searches.filter((s: any) => s.name === name) : searches;

    if (toRun.length === 0) {
      console.error(name ? `Search ${name} not found.` : "No searches configured.");
      process.exit(1);
    }

    for (const search of toRun) {
      console.log(`Running search: ${search.name}`);
      await scrapeSearch(search.url, {
        batchSize,
        maxJobs: maxJobs ?? search.maxJobs,
        searchName: search.name,
        searchTags: search.tags,
      });
      console.log(`Finished search: ${search.name}`);
    }
    console.log("All searches complete.");
    return;
  }

  if (!url) {
    console.error(
      "Usage:\n  pnpm scrape --url <search-url> [--batch-size N] [--max-jobs N]\n  pnpm scrape --all\n  pnpm scrape --name <search-name>"
    );
    process.exit(1);
  }

  await scrapeSearch(url, { batchSize, maxJobs });
  console.log("Scrape complete");
}

main().catch((err) => {
  console.error("Scrape failed:", err.message);
  process.exit(1);
});
