import { ExtractionProvider, ExtractedJob, ExtractionInput } from "../types";
import { buildPrompt } from "./shared";
import { extractedJobSchema } from "../schema";

export class DeepSeekProvider implements ExtractionProvider {
  name = "deepseek";
  model = "deepseek-v4-flash";

  constructor(
    private apiKey: string,
    private promptVersion: string,
  ) {}

  async extract(input: ExtractionInput): Promise<ExtractedJob> {
    const { systemPrompt, userContent } = buildPrompt(this.promptVersion, input);

    const res = await fetch("https://api.deepseek.com/chat/completions", {
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

    if (!res.ok) throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("DeepSeek: empty response");

    return extractedJobSchema.parse(JSON.parse(text));
  }
}
