/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Keeps abuse (lead-form spam, guest-game flooding) off the DB and the owner's
 * notifications without adding infrastructure. NOTE: state is per-process, so on
 * a multi-instance deployment each instance enforces its own window. For a hard,
 * cluster-wide limit move this to Redis — tracked in docs/AUDIT.md (P1.2).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Keep the map from growing unbounded under many distinct keys. */
function pruneExpired(now: number) {
  if (buckets.size < 5000) return;
  buckets.forEach((bucket, key) => {
    if (now >= bucket.resetAt) buckets.delete(key);
  });
}

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

/**
 * Record a hit against `key` and report whether it is within `limit` per
 * `windowMs`. `now` is injected (default `Date.now()`) so callers/tests stay
 * deterministic.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    pruneExpired(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Test helper — clears all windows. */
export function __resetRateLimits() {
  buckets.clear();
}
