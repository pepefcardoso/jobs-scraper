const BACKOFF_MS = [5_000, 15_000, 45_000, 120_000];

export async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === BACKOFF_MS.length) throw err;
      const isRateLimit = (err as any)?.name === "RateLimitedError";
      if (!isRateLimit) throw err; // non-429 errors handled by caller-specific retry
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
  }
  throw new Error("unreachable");
}

export async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}

export async function retryNetwork<T>(
  fn: () => Promise<T>,
  times = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
