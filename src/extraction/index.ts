import { ExtractionProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { DeepSeekProvider } from "./providers/deepseek";
import { config } from "../config";

export function createExtractionProvider(
  providerName: string,
  promptVersion: string,
): ExtractionProvider {
  switch (providerName) {
    case "gemini":
      return new GeminiProvider(config.geminiApiKey(), promptVersion);
    case "groq":
      return new GroqProvider(config.groqApiKey(), promptVersion);
    case "deepseek":
      return new DeepSeekProvider(config.deepseekApiKey(), promptVersion);
    default:
      throw new Error(`Unknown extraction provider: ${providerName}`);
  }
}
