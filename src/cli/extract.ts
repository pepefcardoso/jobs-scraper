import { runExtraction } from "../extraction/runner";

const args = process.argv.slice(2);
const provider =
  args[args.indexOf("--provider") + 1] ??
  process.env.EXTRACTION_PROVIDER ??
  "gemini";
const promptVersion = args.includes("--prompt-version")
  ? args[args.indexOf("--prompt-version") + 1]
  : (process.env.EXTRACTION_PROMPT_VERSION ?? "v1");
const concurrency = args.includes("--concurrency")
  ? Number(args[args.indexOf("--concurrency") + 1])
  : undefined;

runExtraction({ provider, promptVersion, concurrency })
  .then(() => console.log("Extraction complete"))
  .catch((err) => {
    console.error("Extraction failed:", err.message);
    process.exit(1);
  });
