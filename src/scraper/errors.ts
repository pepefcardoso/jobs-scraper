export class CheckpointDetectedError extends Error {
  constructor() {
    super("LinkedIn checkpoint/CAPTCHA detected — aborting run");
  }
}

export class RateLimitedError extends Error {
  constructor(public retryAfterMs?: number) {
    super("Rate limited (429)");
  }
}
