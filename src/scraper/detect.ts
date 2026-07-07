import { Page } from "playwright";
import { CheckpointDetectedError } from "./errors";

export function assertNoCheckpoint(page: Page) {
  const url = page.url();
  if (url.includes("/checkpoint/") || url.includes("/authwall")) {
    throw new CheckpointDetectedError();
  }
}
