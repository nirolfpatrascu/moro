const rateMap = new Map<string, { count: number; resetAt: number }>();

/**
 * In-memory rate limiter.
 * Returns true if the request should be BLOCKED (rate limited).
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  entry.count++;
  return entry.count > limit; // true = rate limited
}
