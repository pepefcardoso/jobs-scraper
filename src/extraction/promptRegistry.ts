import { PROMPT_V1 } from "./prompts/v1";

export const PROMPTS: Record<string, string> = {
  v1: PROMPT_V1,
};

export function getPrompt(version: string): string {
  const prompt = PROMPTS[version];
  if (!prompt) throw new Error(`Unknown prompt version: ${version}`);
  return prompt;
}
