import { runExtraction } from "../extraction/runner";
import { getArg } from "./args";

const args = process.argv.slice(2);
const provider =
  getArg(args, "--provider") ??
  process.env.EXTRACTION_PROVIDER ??
  "gemini";
const promptVersion = getArg(args, "--prompt-version") ?? (process.env.EXTRACTION_PROMPT_VERSION ?? "v1");
const concurrency = getArg(args, "--concurrency") ? Number(getArg(args, "--concurrency")) : undefined;

runExtraction({ provider, promptVersion, concurrency })
  .then(() => console.log("Extraction complete"))
  .catch((err) => {
    console.error("Extraction failed:", err.message);
    process.exit(1);
  });
