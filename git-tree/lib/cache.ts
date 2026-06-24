// Simple localStorage-based cache for AI summaries to avoid redundant API calls.

const CACHE_PREFIX = "repograph_summary_";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry {
  value: string;
  timestamp: number;
}

export function getCachedSummary(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.value;
  } catch {
    return null;
  }
}

export function setCachedSummary(key: string, value: string): void {
  if (typeof window === "undefined") return;

  try {
    const entry: CacheEntry = { value, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — fail silently, caching is non-critical
  }
}