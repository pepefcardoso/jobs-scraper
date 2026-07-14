export class CheckpointDetectedError extends Error {
  constructor() {
    super("LinkedIn checkpoint/CAPTCHA detected — aborting run");
  }
}


