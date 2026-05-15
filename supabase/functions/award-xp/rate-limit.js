const buckets = new Map();

export function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  buckets.set(key, entry);
  return { allowed: true, remaining: limit - entry.count };
}

export function __resetRateLimitForTests() {
  buckets.clear();
}
