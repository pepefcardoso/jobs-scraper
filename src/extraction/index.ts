import { ExtractionProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";

export function createExtractionProvider(
  providerName: string,
  promptVersion: string,
): ExtractionProvider {
  switch (providerName) {
    case "gemini":
      return new GeminiProvider(process.env.GEMINI_API_KEY!, promptVersion);
    case "groq":
      return new GroqProvider(process.env.GROQ_API_KEY!, promptVersion);
    default:
      throw new Error(`Unknown extraction provider: ${providerName}`);
  }
}
