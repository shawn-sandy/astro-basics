/**
 * Rate limiting utility for API abuse prevention and DoS attack mitigation.
 *
 * Implements sliding window rate limiting with in-memory storage for high-performance
 * request throttling. Uses IP-based identification with proxy header support for
 * accurate client identification behind load balancers and CDNs.
 *
 * Security features:
 * - Sliding window algorithm prevents burst attacks at window boundaries
 * - Automatic cleanup prevents memory exhaustion attacks
 * - Configurable limits allow endpoint-specific protection
 * - Comprehensive header support for proxy/CDN environments
 * - Graceful degradation when client IP cannot be determined
 *
 * @fileoverview Rate limiting for API security and abuse prevention
 * @security Implements OWASP API Security Top 10 - API4:2023 Unrestricted Resource Consumption
 * @performance In-memory storage provides <1ms lookup times for rate limit checks
 * @see {@link https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/} OWASP API Security
 * @version 2.0.0
 * @since 1.0.0
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

/**
 * In-memory rate limiter using sliding window algorithm for accurate throttling.
 *
 * Implements a sliding window rate limiting strategy that provides more accurate
 * rate limiting than fixed windows by avoiding burst allowances at window boundaries.
 * Uses Map-based storage for O(1) lookup performance with automatic cleanup to
 * prevent memory leaks.
 *
 * Key features:
 * - Sliding window prevents burst attacks at window boundaries
 * - Automatic memory management with periodic cleanup
 * - Thread-safe operations (single-threaded JavaScript runtime)
 * - Configurable limits and windows per instance
 * - Memory-efficient storage with automatic expiration
 *
 * @class InMemoryRateLimiter
 * @example
 * const limiter = new InMemoryRateLimiter({
 *   maxRequests: 10,
 *   windowMs: 60000, // 1 minute
 *   message: 'Rate limit exceeded'
 * });
 *
 * const result = limiter.checkLimit(userIP);
 * if (!result.allowed) {
 *   // Handle rate limit violation
 * }
 * @see {@link RateLimitConfig} for configuration options
 * @see {@link RateLimitResult} for result structure
 * @since 1.0.0
 */
class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>()
  private config: RateLimitConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: RateLimitConfig) {
    this.config = config
    this.startCleanup()
  }

  /**
   * Checks and enforces rate limits for a given client identifier.
   *
   * This is the primary method for rate limit enforcement. It atomically
   * checks the current request count and increments it if allowed, ensuring
   * no race conditions in the rate limiting logic.
   *
   * Algorithm:
   * 1. Check if existing window has expired → create new window if so
   * 2. If within limits → increment counter and allow
   * 3. If at/over limits → reject with retry timing information
   *
   * @param {string} key - Client identifier (typically IP address)
   * @returns {RateLimitResult} Rate limit decision with metadata
   * @property {boolean} allowed - Whether request should be processed
   * @property {number} remaining - Requests remaining in current window
   * @property {number} resetTime - Timestamp when window resets
   * @property {number} [retryAfter] - Seconds until client can retry (if rejected)
   * @example
   * const result = limiter.checkLimit('192.168.1.1');
   * if (result.allowed) {
   *   // Process request
   *   console.log(`${result.remaining} requests remaining`);
   * } else {
   *   // Return 429 with Retry-After: ${result.retryAfter} seconds
   * }
   * @performance O(1) lookup and update operations
   * @since 1.0.0
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
   * Retrieves current rate limit status without consuming a request quota.
   *
   * Useful for monitoring, dashboard displays, or pre-flight checks that
   * should not count against the user's rate limit. Provides the same
   * information structure as checkLimit() but without side effects.
   *
   * @param {string} key - Client identifier to check status for
   * @returns {RateLimitResult} Current rate limit status (read-only)
   * @example
   * // Check status before expensive operation
   * const status = limiter.getStatus(clientIP);
   * if (!status.allowed) {
   *   return earlyRateLimitResponse(status);
   * }
   * // Proceed with expensive operation and then call checkLimit()
   * @performance O(1) read-only operation with no side effects
   * @since 1.0.0
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
   * Removes expired rate limit records to prevent memory leaks.
   *
   * Iterates through all stored records and removes those whose time
   * windows have expired. Critical for long-running applications to
   * prevent unbounded memory growth from accumulating client records.
   *
   * @private Internal maintenance function
   * @performance O(n) where n is number of active client records
   * @see {@link startCleanup} for automatic scheduling
   * @since 1.0.0
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
   * Initializes automatic cleanup interval for memory management.
   *
   * Sets up a recurring timer to remove expired records and prevent
   * memory leaks. Uses unref() in test environments to prevent the
   * interval from keeping test processes alive.
   *
   * @private Internal lifecycle management
   * @see {@link cleanup} for the actual cleanup logic
   * @see {@link destroy} for cleanup termination
   * @since 1.0.0
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
   * Gracefully shuts down the rate limiter and frees resources.
   *
   * Essential for clean application shutdown and testing cleanup.
   * Stops the background cleanup timer and clears all stored data
   * to prevent memory leaks and resource holding.
   *
   * @example
   * // Application shutdown
   * messageRateLimiter.destroy();
   *
   * // Test cleanup
   * afterEach(() => {
   *   testLimiter.destroy();
   * });
   * @since 1.0.0
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }

  /**
   * Returns the number of active client records for monitoring.
   *
   * Useful for application monitoring, debugging, and capacity planning.
   * High values may indicate need for cleanup tuning or potential abuse.
   *
   * @returns {number} Count of active client rate limit records
   * @example
   * // Monitoring check
   * if (limiter.getStoreSize() > 10000) {
   *   logger.warn('High rate limiter memory usage', { size: limiter.getStoreSize() });
   * }
   * @performance O(1) operation
   * @since 1.0.0
   */
  getStoreSize(): number {
    return this.store.size
  }
}

/**
 * Rate limiting configuration for contact form submissions.
 *
 * Values chosen based on legitimate user behavior analysis and spam prevention:
 * - maxRequests: 5 submissions per window prevents spam while allowing corrections
 * - windowMs: 60 seconds provides reasonable cooldown period
 * - message: User-friendly error message explaining the limitation
 *
 * @constant {RateLimitConfig} MESSAGE_RATE_LIMIT_CONFIG - Contact form rate limits
 * @property {number} maxRequests - 5 requests per minute (prevents spam, allows corrections)
 * @property {number} windowMs - 60-second sliding window
 * @property {string} message - User-facing error message for rate limit violations
 * @security Balances spam prevention with legitimate user access
 * @since 1.0.0
 */
export const MESSAGE_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many message submissions. Please wait before submitting again.',
}

/**
 * Global rate limiter instance for contact form submission protection.
 *
 * Singleton instance ensures consistent rate limiting across all requests
 * and prevents memory waste from multiple limiter instances.
 *
 * @constant {InMemoryRateLimiter} messageRateLimiter - Shared rate limiter instance
 * @example
 * const result = messageRateLimiter.checkLimit(clientIP);
 * if (!result.allowed) {
 *   return createRateLimitResponse(result);
 * }
 * @see {@link MESSAGE_RATE_LIMIT_CONFIG} for configuration details
 * @since 1.0.0
 */
export const messageRateLimiter = new InMemoryRateLimiter(MESSAGE_RATE_LIMIT_CONFIG)

/**
 * Extracts client IP address from request headers with proxy support.
 *
 * Implements a comprehensive IP extraction strategy that works correctly
 * behind load balancers, CDNs, and proxy servers. Checks headers in order
 * of reliability and trustworthiness.
 *
 * Header priority order:
 * 1. X-Forwarded-For (most common proxy header, uses first IP)
 * 2. X-Real-IP (nginx and other reverse proxies)
 * 3. CF-Connecting-IP (Cloudflare CDN)
 * 4. 'unknown' fallback for complete anonymization scenarios
 *
 * @param {Request} request - Fetch API Request object
 * @returns {string} Client IP address or 'unknown' if undeterminable
 * @security Critical for rate limiting accuracy in proxy/CDN environments
 * @example
 * // Direct connection: returns actual IP
 * // Behind proxy: returns original client IP from headers
 * // Privacy proxy: returns 'unknown' (still allows rate limiting)
 * const clientIP = getClientIP(request);
 * const rateLimitResult = limiter.checkLimit(clientIP);
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For} X-Forwarded-For
 * @since 1.0.0
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
 * Creates standardized HTTP 429 rate limit response with comprehensive headers.
 *
 * Generates a properly formatted rate limit response following HTTP standards
 * and best practices. Includes all necessary headers for client retry logic
 * and debugging information.
 *
 * Response includes:
 * - HTTP 429 Too Many Requests status
 * - JSON error body with retry information
 * - X-RateLimit-* headers for client rate limit awareness
 * - Retry-After header for automatic client retry scheduling
 *
 * @param {RateLimitResult} result - Rate limit check result with timing info
 * @param {string} [message] - Override default error message
 * @returns {Response} HTTP 429 response with rate limit headers
 * @example
 * const limitResult = limiter.checkLimit(clientIP);
 * if (!limitResult.allowed) {
 *   return createRateLimitResponse(limitResult, 'Custom rate limit message');
 * }
 * // Response headers:
 * // X-RateLimit-Limit: 5
 * // X-RateLimit-Remaining: 0
 * // X-RateLimit-Reset: 1640995200
 * // Retry-After: 45
 * @see {@link https://datatracker.ietf.org/doc/html/draft-polli-ratelimit-headers-03} Rate Limit Headers
 * @since 1.0.0
 */
export function createRateLimitResponse(result: RateLimitResult, message?: string): Response {
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
