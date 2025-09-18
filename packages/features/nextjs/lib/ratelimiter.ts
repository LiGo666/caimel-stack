import type { NextRequest } from "next/server";

/**
 * Rate limiter configuration
 * In Docker, we need to use the service name as the hostname
 */
const RATE_LIMITER_HOST = process.env.RATE_LIMITER_HOST || "http://redis-ratelimiter:8000";
const RATE_LIMITER_ENABLED = process.env.RATE_LIMITER_ENABLED !== "false";
const DEFAULT_RATE_LIMIT = 20; // Number of requests allowed
const DEFAULT_WINDOW_MS = 60_000; // Time window in milliseconds (1 minute)

/**
 * Rate limiter options
 */
export type RateLimiterOptions = {
  /** Number of requests allowed in the time window */
  limit?: number;
  /** Time window in milliseconds */
  windowMs?: number;
  /** Algorithm to use (sliding or fixed) */
  algo?: "sliding" | "fixed";
}

/**
 * Rate limiter response
 */
export type RateLimiterResponse = {
  /** Whether the request is allowed */
  allow: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Timestamp (ms) when the limit fully resets */
  reset: number;
  /** Seconds until the client should retry (only present if rate limited) */
  retryAfter?: number;
}

/**
 * Check if a request is rate limited
 * @param request The Next.js request object
 * @param actionType Type of action being rate limited (for different limits per action type)
 * @param options Rate limiter options
 * @returns Promise resolving to the rate limiter response
 */
export async function checkRateLimit(
  request: NextRequest,
  actionType = "server-action",
  options: RateLimiterOptions = {}
): Promise<RateLimiterResponse> {
  try {
    // Get client identifier (IP address or user ID if authenticated)
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const userId = request.cookies.get("user-id")?.value;
    
    // Create a unique identifier for this client + action type
    const identifier = userId ? `user-${userId}-${actionType}` : `ip-${clientIp}-${actionType}`;
    
    // Call the rate limiter service
    const response = await fetch(`${RATE_LIMITER_HOST}/ratelimit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: identifier,
        limit: options.limit || DEFAULT_RATE_LIMIT,
        windowMs: options.windowMs || DEFAULT_WINDOW_MS,
        algo: options.algo || "sliding",
      }),
    });
    
    if (!response.ok) {
      // If rate limiter service returns an error status, throw an error
      // biome-ignore lint/suspicious/noConsole: logging service errors
      console.error("Rate limiter service error:", response.status, await response.text());
      throw new Error(`Rate limiter service returned ${response.status}`);
    }
    
    const result = await response.json();
    
    // If not allowed, log the rate limit
    if (!result.allow) {
      // biome-ignore lint/suspicious/noConsole: logging rate limit
      console.log(`Rate limit exceeded for ${identifier}. Retry after ${result.retryAfter}s`);
    }
    
    return result;
  } catch (error) {
    // Always rethrow the error so the middleware can handle it
    // biome-ignore lint/suspicious/noConsole: logging errors
    console.error("Error checking rate limit:", error);
    throw error;
  }
}

/**
 * Simplified function to check if a request is rate limited
 * @param request The Next.js request object
 * @param actionType Type of action being rate limited
 * @param options Rate limiter options
 * @returns Promise resolving to true if rate limited, false otherwise
 * @throws Error if the rate limit check fails
 */
export async function isRateLimited(
  request: NextRequest,
  actionType = "server-action",
  options: RateLimiterOptions = {}
): Promise<boolean> {
  // Skip rate limiting if disabled
  if (!RATE_LIMITER_ENABLED) {
    return false;
  }
  
  try {
    // This will throw an error if the rate limiter service is unavailable
    const result = await checkRateLimit(request, actionType, options);
    return !result.allow;
  } catch (error) {
    // If the rate limiter service is unavailable, allow the request
    // biome-ignore lint/suspicious/noConsole: logging errors
    console.warn("Rate limiter service unavailable, allowing request", error);
    return false;
  }
}
