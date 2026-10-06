type RequestUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/**
 * Returns a stable, non-secret identifier for rate limiting.
 * OAuth access tokens must never be used as identifiers because they can end
 * up in third-party analytics or persistence layers.
 */
export function getRateLimitIdentifier(request: Request, user?: RequestUser | null): string {
  return user?.id || user?.email || user?.name || clientIp(request) || "anonymous";
}

/** A value safe to persist with application data. */
export function getPersistentUserIdentifier(user?: RequestUser | null): string {
  return user?.id || user?.email || "anonymous";
}
