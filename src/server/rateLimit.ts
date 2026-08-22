// In-process sliding-window rate limiter.
//
// The family has no shared limiter package — grcpay, stamp, grcbazaar and the
// faucet each roll their own against whatever store they already have. The hub
// has no Redis, and this endpoint is low volume, so an in-memory window is the
// honest fit: one process, one map, a timer that sweeps it.
//
// Being per-process means a restart forgives everyone and a second replica
// would double the allowance. Both are fine here, because this is defence in
// depth rather than the actual control: what decides whether a reported peer
// is ever published is a successful probe of our own.

interface Window {
  hits: number[];
}

const buckets = new Map<string, Window>();
let sweeper: NodeJS.Timeout | null = null;

function ensureSweeper(windowMs: number) {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const key of Array.from(buckets.keys())) {
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.hits = bucket.hits.filter((t) => t > cutoff);
      if (!bucket.hits.length) buckets.delete(key);
    }
  }, Math.min(windowMs, 60_000));
  // Never hold the process open on this timer's account: the job shares this
  // module graph and has to be able to exit.
  sweeper.unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  ensureSweeper(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Test seam: drop all state. */
export function resetRateLimits(): void {
  buckets.clear();
}
