import { ExtractionProvider, ExtractedJob, ExtractionInput } from "../types";
import { getPrompt } from "../promptRegistry";

export class GeminiProvider implements ExtractionProvider {
  name = "gemini";
  model = "gemini-2.0-flash";

  constructor(
    private apiKey: string,
    private promptVersion: string,
  ) {}

  async extract(input: ExtractionInput): Promise<ExtractedJob> {
    const systemPrompt = getPrompt(this.promptVersion);
    const userContent = `LIST METADATA:\n${JSON.stringify(input.listMeta)}\n\nRAW TEXT:\n${input.rawText}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: `${systemPrompt}\n\n${userContent}` }] },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!res.ok)
      throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini: empty response");

    return JSON.parse(text);
  }
}
