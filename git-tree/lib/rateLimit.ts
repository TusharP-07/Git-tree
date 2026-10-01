import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Only create ratelimiter if redis is configured
export const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests per minute
      analytics: true,
      ephemeralCache: new Map(), // Optional: local cache to prevent a redis call for every single request
    })
  : null;

// Fallback in-memory rate limiter for when Redis is not available
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const entries = new Map<string, RateLimitEntry>();

function fallbackRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = entries.get(key);

  if (!entry || entry.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}

/**
 * Helper to check rate limit and return appropriate headers
 * Returns { success: boolean, headers?: Headers }
 * Fails open (allows request) if redis fails, to prevent production errors
 */
export async function checkRateLimit(identifier: string) {
  if (!ratelimit) {
    // If Redis isn't configured, use the fallback in-memory rate limiter (e.g. for dev)
    const isLimited = fallbackRateLimit(identifier, 20, 60000);
    return { success: !isLimited, headers: new Headers() };
  }

  try {
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
    
    const headers = new Headers();
    headers.set("X-RateLimit-Limit", limit.toString());
    headers.set("X-RateLimit-Remaining", remaining.toString());
    headers.set("X-RateLimit-Reset", reset.toString());

    return { success, headers };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open on Redis errors to prevent taking down the API in production
    return { success: true };
  }
}
