/**
 * Tiny in-memory login rate limiter.
 *
 * This is intentionally process-local: on Vercel each warm instance keeps its
 * own counters, which is enough to stop naive credential stuffing. A shared
 * store (Upstash/Redis) would be the production upgrade.
 */
type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimitRemaining(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= Date.now()) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - bucket.count);
}

/** Records a failed attempt. Returns false once the key is blocked. */
export function registerFailedAttempt(key: string): boolean {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  bucket.count += 1;
  return bucket.count < MAX_ATTEMPTS;
}

export function isRateLimited(key: string): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return false;
  if (bucket.resetAt <= Date.now()) {
    buckets.delete(key);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function resetAttempts(key: string): void {
  buckets.delete(key);
}

export function secondsUntilUnlocked(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  return Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000));
}

export const LOGIN_RATE_LIMIT = { windowMs: WINDOW_MS, maxAttempts: MAX_ATTEMPTS };
