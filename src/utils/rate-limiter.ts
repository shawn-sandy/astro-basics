/**
 * Rate Limiter Utility
 * Provides in-memory rate limiting functionality for API endpoints
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Custom message for rate limit exceeded */
  message?: string
}

interface RateLimitRecord {
  /** Number of requests made in current window */
  count: number
  /** Timestamp when the current window started */
  windowStart: number
  /** Timestamp when the window expires */
  windowEnd: number
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of requests remaining in current window */
  remaining: number
  /** Timestamp when the window resets */
  resetTime: number
  /** Number of seconds until reset (for Retry-After header) */
  retryAfter?: number
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>()
  private config: RateLimitConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: RateLimitConfig) {
    this.config = config
    this.startCleanup()
  }

  /**
   * Check if a request is allowed for the given key (typically IP address)
   */
  checkLimit(key: string): RateLimitResult {
    const now = Date.now()
    const existing = this.store.get(key)

    // If no existing record or window has expired, create new window
    if (!existing || now >= existing.windowEnd) {
      const newRecord: RateLimitRecord = {
        count: 1,
        windowStart: now,
        windowEnd: now + this.config.windowMs,
      }
      this.store.set(key, newRecord)

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newRecord.windowEnd,
      }
    }

    // Existing window is still valid
    if (existing.count >= this.config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.windowEnd,
        retryAfter: Math.ceil((existing.windowEnd - now) / 1000),
      }
    }

    // Increment count and allow request
    existing.count++
    this.store.set(key, existing)

    return {
      allowed: true,
      remaining: this.config.maxRequests - existing.count,
      resetTime: existing.windowEnd,
    }
  }

  /**
   * Get current status for a key without incrementing
   */
  getStatus(key: string): RateLimitResult {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || now >= existing.windowEnd) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
      }
    }

    const allowed = existing.count < this.config.maxRequests
    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - existing.count),
      resetTime: existing.windowEnd,
      retryAfter: allowed ? undefined : Math.ceil((existing.windowEnd - now) / 1000),
    }
  }

  /**
   * Clear expired entries from memory
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (now >= record.windowEnd) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)

    // Prevent the interval from keeping the process alive in testing
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      this.cleanupInterval.unref?.()
    }
  }

  /**
   * Stop cleanup interval and clear store
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }

  /**
   * Get store size (useful for monitoring/debugging)
   */
  getStoreSize(): number {
    return this.store.size
  }
}

// Default configuration for message submission API
export const MESSAGE_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many message submissions. Please wait before submitting again.',
}

// Global rate limiter instance for message submissions
export const messageRateLimiter = new InMemoryRateLimiter(MESSAGE_RATE_LIMIT_CONFIG)

/**
 * Extract client IP address from request headers
 */
export function getClientIP(request: Request): string {
  // Check common proxy headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  // Fallback to unknown if no IP can be determined
  return 'unknown'
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message?: string
): Response {
  const body = {
    success: false,
    error: message || MESSAGE_RATE_LIMIT_CONFIG.message,
    retryAfter: result.retryAfter,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': MESSAGE_RATE_LIMIT_CONFIG.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return new Response(JSON.stringify(body), {
    status: 429,
    headers,
  })
}

export { InMemoryRateLimiter }
export type { RateLimitResult, RateLimitRecord }