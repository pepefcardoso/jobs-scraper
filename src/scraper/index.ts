import { chromium, BrowserContext, Page } from "playwright";
import { ScrapedJob, ListMeta } from "./types";
import { assertNoCheckpoint } from "./detect";
import { retryNetwork, retryOnce } from "./retry";
import { prisma } from "../db/client";

const STORAGE_STATE_PATH = "auth/storageState.json";
const PAGE_SIZE = 25;

function randomDelay(minMs = 2000, maxMs = 6000) {
  return new Promise((r) =>
    setTimeout(r, minMs + Math.random() * (maxMs - minMs)),
  );
}

async function extractListMeta(page: Page): Promise<ListMeta> {
  return page.evaluate(() => {
    const title =
      document
        .querySelector(".job-details-jobs-unified-top-card__job-title h1")
        ?.textContent?.trim() ?? "";
    const company =
      document
        .querySelector(".job-details-jobs-unified-top-card__company-name")
        ?.textContent?.trim() ?? "";
    const location =
      document
        .querySelector(
          ".job-details-jobs-unified-top-card__primary-description-container",
        )
        ?.textContent?.trim() ?? "";
    const badges = Array.from(
      document.querySelectorAll(".job-details-fit-level-preferences button"),
    ).map((el) => el.textContent?.trim() ?? "");
    return { title, company, location, badges };
  });
}

async function extractJobIdFromCard(card: any): Promise<string> {
  const href = await card.getAttribute("href");
  const match = href?.match(/\/jobs\/view\/(\d+)/);
  return match?.[1] ?? "";
}

export async function scrapeSearch(
  searchUrl: string,
  opts: { batchSize?: number; maxJobs?: number } = {},
): Promise<void> {
  const batchSize = opts.batchSize ?? 10;
  const maxJobs = opts.maxJobs ?? 50;

  const browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
  });
  const page = await context.newPage();

  let collected = 0;
  let start = 0;

  try {
    while (collected < maxJobs) {
      const pageUrl = `${searchUrl}&start=${start}`;
      await retryNetwork(() =>
        page.goto(pageUrl, { waitUntil: "domcontentloaded" }),
      );
      assertNoCheckpoint(page);
      await randomDelay();

      const cards = await page.$$("a.job-card-container__link");
      if (cards.length === 0) break;

      const batch: ScrapedJob[] = [];

      for (const card of cards) {
        if (collected >= maxJobs) break;

        const linkedinJobId = await extractJobIdFromCard(card);
        if (!linkedinJobId) continue;

        await retryOnce(async () => {
          await card.click();
          await page.waitForSelector(
            ".job-details-jobs-unified-top-card__job-title",
            { timeout: 10_000 },
          );
        });
        assertNoCheckpoint(page);
        await randomDelay();

        const rawHtml = await page
          .$eval("#job-details", (el) => el.innerHTML)
          .catch(() => "");
        const rawText = await page
          .$eval("#job-details", (el) => (el as HTMLElement).innerText)
          .catch(() => "");
        const listMeta = await extractListMeta(page);

        batch.push({
          linkedinJobId,
          searchUrl,
          scrapedAt: new Date(),
          rawHtml,
          rawText,
          listMeta,
        });

        collected++;

        if (batch.length >= batchSize) {
          await persistBatch(batch.splice(0));
        }
      }

      if (batch.length > 0) await persistBatch(batch);

      start += PAGE_SIZE;
    }
  } finally {
    await context.storageState({ path: STORAGE_STATE_PATH });
    await browser.close();
  }
}

async function persistBatch(batch: ScrapedJob[]) {
  for (const job of batch) {
    await prisma.job.upsert({
      where: { linkedinJobId: job.linkedinJobId },
      update: {
        rawHtml: job.rawHtml,
        rawText: job.rawText,
        listMeta: job.listMeta as any,
        scrapedAt: job.scrapedAt,
      },
      create: {
        linkedinJobId: job.linkedinJobId,
        searchUrl: job.searchUrl,
        scrapedAt: job.scrapedAt,
        rawHtml: job.rawHtml,
        rawText: job.rawText,
        listMeta: job.listMeta as any,
      },
    });
  }
}
