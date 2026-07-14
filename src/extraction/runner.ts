import { prisma } from "../db/client";
import { createExtractionProvider } from "./index";
import { ExtractionProvider } from "./types";

function schemaVersionFor(promptVersion: string): string {
  // v2+ prompts use v2 schema with domain-fit, salary parsing, remote scope
  return promptVersion === "v1" ? "v1" : "v2";
}
const MAX_ATTEMPTS = 3;

async function pLimit<T>(
  concurrency: number,
  items: T[],
  fn: (item: T) => Promise<void>,
) {
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export async function runExtraction(opts: {
  provider: string;
  promptVersion: string;
  concurrency?: number;
}) {
  const provider: ExtractionProvider = createExtractionProvider(
    opts.provider,
    opts.promptVersion,
  );
  const concurrency =
    opts.concurrency ?? Number(process.env.EXTRACTION_CONCURRENCY ?? 3);

  const pendingJobs = await prisma.job.findMany({
    where: {
      extractions: {
        none: {
          provider: opts.provider,
          promptVersion: opts.promptVersion,
          status: "SUCCESS",
        },
      },
    },
    include: {
      extractions: {
        where: { provider: opts.provider, promptVersion: opts.promptVersion },
      },
    },
  });

  await pLimit(concurrency, pendingJobs, async (job) => {
    const existing = job.extractions[0];

    if (existing && existing.attempts >= MAX_ATTEMPTS) return;

    const attempts = (existing?.attempts ?? 0) + 1;

    try {
      const structuredData = await provider.extract({
        rawHtml: job.rawHtml,
        rawText: job.rawText,
        listMeta: job.listMeta as any,
      });

      await prisma.extraction.upsert({
        where: {
          jobId_provider_promptVersion: {
            jobId: job.id,
            provider: opts.provider,
            promptVersion: opts.promptVersion,
          },
        },
        update: {
          status: "SUCCESS",
          attempts,
          structuredData: structuredData as any,
          lastError: null,
          model: provider.model,
          schemaVersion: schemaVersionFor(opts.promptVersion),
        },
        create: {
          jobId: job.id,
          provider: opts.provider,
          model: provider.model,
          promptVersion: opts.promptVersion,
          schemaVersion: schemaVersionFor(opts.promptVersion),
          status: "SUCCESS",
          attempts,
          structuredData: structuredData as any,
        },
      });
    } catch (err) {
      await prisma.extraction.upsert({
        where: {
          jobId_provider_promptVersion: {
            jobId: job.id,
            provider: opts.provider,
            promptVersion: opts.promptVersion,
          },
        },
        update: {
          status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          attempts,
          lastError: (err as Error).message,
        },
        create: {
          jobId: job.id,
          provider: opts.provider,
          model: provider.model,
          promptVersion: opts.promptVersion,
          schemaVersion: schemaVersionFor(opts.promptVersion),
          status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          attempts,
          lastError: (err as Error).message,
        },
      });
    }
  });
}
