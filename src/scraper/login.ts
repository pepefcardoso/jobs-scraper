import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const STORAGE_STATE_PATH = "auth/storageState.json";

async function main() {
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.linkedin.com/login");
  console.log("Log in manually in the opened browser window.");
  console.log("Waiting for redirect to feed/home...");

  await page.waitForURL(/linkedin\.com\/feed/, { timeout: 0 });

  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log(`Session saved to ${STORAGE_STATE_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Login capture failed:", err.message);
  process.exit(1);
});
