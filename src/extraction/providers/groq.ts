import { ExtractionProvider, ExtractedJob, ExtractionInput } from "../types";
import { buildPrompt } from "./shared";
import { extractedJobSchema } from "../schema";

export class GroqProvider implements ExtractionProvider {
  name = "groq";
  model = "llama-3.1-8b-instant";

  constructor(
    private apiKey: string,
    private promptVersion: string,
  ) {}

  async extract(input: ExtractionInput): Promise<ExtractedJob> {
    const { systemPrompt, userContent } = buildPrompt(this.promptVersion, input);

    for (let attempt = 1; attempt <= 15; attempt++) {
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

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          const match = errorText.match(/try again in ([\d.]+)s/);
          const waitTimeStr = res.headers.get("retry-after");
          let waitTime = 10; // default to 10 seconds if we can't parse it
          
          if (match && match[1]) {
            waitTime = parseFloat(match[1]);
          } else if (waitTimeStr) {
            waitTime = parseFloat(waitTimeStr);
          }
          
          console.log(`[Rate Limit] Groq 429 hit. Waiting ${waitTime.toFixed(1)}s before retry ${attempt}/15...`);
          // Add a small buffer of 0.5s to ensure the limit has reset
          await new Promise(resolve => setTimeout(resolve, (waitTime + 0.5) * 1000));
          continue; // retry
        }
        throw new Error(`Groq error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq: empty response");

      return extractedJobSchema.parse(JSON.parse(text));
    }
    
    throw new Error("Groq error: Max retries exceeded for 429 rate limits");
  }
}
