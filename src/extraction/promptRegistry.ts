import { PROMPT_V1 } from "./prompts/v1";
import { PROMPT_V2 } from "./prompts/v2";

export const PROMPTS: Record<string, string> = {
  v1: PROMPT_V1,
  v2: PROMPT_V2,
};

export function getPrompt(version: string): string {
  const prompt = PROMPTS[version];
  if (!prompt) throw new Error(`Unknown prompt version: ${version}`);
  return prompt;
}
