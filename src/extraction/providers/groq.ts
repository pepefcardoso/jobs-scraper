import { ExtractionProvider, ExtractedJob, ExtractionInput } from "../types";
import { getPrompt } from "../promptRegistry";

export class GroqProvider implements ExtractionProvider {
  name = "groq";
  model = "llama-3.3-70b-versatile";

  constructor(
    private apiKey: string,
    private promptVersion: string,
  ) {}

  async extract(input: ExtractionInput): Promise<ExtractedJob> {
    const systemPrompt = getPrompt(this.promptVersion);
    const userContent = `LIST METADATA:\n${JSON.stringify(input.listMeta)}\n\nRAW TEXT:\n${input.rawText}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok)
      throw new Error(`Groq error ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq: empty response");

    return JSON.parse(text);
  }
}
