import { chromium, BrowserContext, Page, ElementHandle } from "playwright";
import { ScrapedJob, ListMeta } from "./types";
import { assertNoCheckpoint } from "./detect";
import { retryNetwork, retryOnce } from "./retry";
import { prisma } from "../db/client";
import { config } from "../config";

const STORAGE_STATE_PATH = "auth/storageState.json";

function randomDelay(minMs = 2000, maxMs = 6000) {
  return new Promise((r) =>
    setTimeout(r, minMs + Math.random() * (maxMs - minMs)),
  );
}

async function getFirstCardHref(page: Page): Promise<string | null> {
  const first = await page.$("a.job-card-container__link");
  return first ? await first.getAttribute("href") : null;
}

async function parseTotalPages(page: Page): Promise<number> {
  const text = await page
    .$eval(".jobs-search-pagination__page-state", (el) => el.textContent ?? "")
    .catch(() => "");
  const match = text.match(/de\s+(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

async function goToNextPage(page: Page): Promise<boolean> {
  const nextBtn = await page.$("button.jobs-search-pagination__button--next");
  if (!nextBtn) return false;

  const disabled = await nextBtn.getAttribute("disabled");
  if (disabled !== null) return false;

  const beforeHref = await getFirstCardHref(page);
  await nextBtn.click();

  try {
    await page.waitForFunction(
      (prevHref) => {
        const el = document.querySelector("a.job-card-container__link");
        return el && el.getAttribute("href") !== prevHref;
      },
      beforeHref,
      { timeout: 10_000 },
    );
  } catch {
    return false; // list didn't refresh — treat as end of pagination
  }

  return true;
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

async function extractJobIdFromCard(card: ElementHandle<Element>): Promise<string> {
  const href = await card.getAttribute("href");
  const match = href?.match(/\/jobs\/view\/(\d+)/);
  return match?.[1] ?? "";
}

export async function scrapeSearch(
  searchUrl: string,
  opts: { batchSize?: number; maxJobs?: number; searchName?: string; searchTags?: string[] } = {},
): Promise<void> {
  const batchSize = opts.batchSize ?? 10;
  const maxJobs = opts.maxJobs ?? 50;

  const browser = await chromium.launch({ headless: config.headless });
  const context: BrowserContext = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
  });
  const page = await context.newPage();

  let collected = 0;
  let currentPage = 1;

  try {
    await retryNetwork(() =>
      page.goto(searchUrl, { waitUntil: "domcontentloaded" }),
    );
    await page.waitForSelector("a.job-card-container__link", {
      timeout: 15_000,
    });
    assertNoCheckpoint(page);
    await randomDelay();

    const totalPages = await parseTotalPages(page);

    while (collected < maxJobs && currentPage <= totalPages) {
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
          searchName: opts.searchName,
          searchTags: opts.searchTags,
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

      if (collected >= maxJobs || currentPage >= totalPages) break;

      const advanced = await goToNextPage(page);
      if (!advanced) break;

      assertNoCheckpoint(page);
      await randomDelay();
      currentPage++;
    }
  } finally {
    await context.storageState({ path: STORAGE_STATE_PATH });
    await browser.close();
  }
}

async function persistBatch(batch: ScrapedJob[]) {
  await prisma.$transaction(
    batch.map((job) =>
      prisma.job.upsert({
        where: { linkedinJobId: job.linkedinJobId },
        update: {
          rawHtml: job.rawHtml,
          rawText: job.rawText,
          listMeta: job.listMeta as any,
          scrapedAt: job.scrapedAt,
          searchName: job.searchName,
          searchTags: job.searchTags,
        },
        create: { 
          ...job, 
          listMeta: job.listMeta as any,
          searchName: job.searchName,
          searchTags: job.searchTags ?? [],
        },
      }),
    ),
  );
}
