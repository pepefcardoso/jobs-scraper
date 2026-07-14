import { getPrompt } from "../promptRegistry";
import { ExtractionInput } from "../types";

export function buildPrompt(promptVersion: string, input: ExtractionInput) {
  const systemPrompt = getPrompt(promptVersion);
  const userContent = `LIST METADATA:\n${JSON.stringify(input.listMeta)}\n\nRAW TEXT:\n${input.rawText}`;
  return { systemPrompt, userContent };
}
