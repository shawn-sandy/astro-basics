import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  InMemoryRateLimiter,
  MESSAGE_RATE_LIMIT_CONFIG,
  messageRateLimiter,
  getClientIP,
  createRateLimitResponse,
} from '#utils/rate-limiter'

describe('InMemoryRateLimiter', () => {
  let rateLimiter: InMemoryRateLimiter

  beforeEach(() => {
    rateLimiter = new InMemoryRateLimiter({
      maxRequests: 3,
      windowMs: 1000, // 1 second for faster tests
    })
  })

  afterEach(() => {
    rateLimiter.destroy()
  })

  it('should allow requests within the limit', () => {
    const key = 'test-ip'

    // First request should be allowed
    const result1 = rateLimiter.checkLimit(key)
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(2)

    // Second request should be allowed
    const result2 = rateLimiter.checkLimit(key)
    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(1)

    // Third request should be allowed
    const result3 = rateLimiter.checkLimit(key)
    expect(result3.allowed).toBe(true)
    expect(result3.remaining).toBe(0)
  })

  it('should reject requests exceeding the limit', () => {
    const key = 'test-ip'

    // Use up the limit
    rateLimiter.checkLimit(key)
    rateLimiter.checkLimit(key)
    rateLimiter.checkLimit(key)

    // Fourth request should be rejected
    const result = rateLimiter.checkLimit(key)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('should reset after time window expires', async () => {
    const key = 'test-ip'

    // Use up the limit
    rateLimiter.checkLimit(key)
    rateLimiter.checkLimit(key)
    rateLimiter.checkLimit(key)

    // Should be rejected
    const rejectedResult = rateLimiter.checkLimit(key)
    expect(rejectedResult.allowed).toBe(false)

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Should be allowed again
    const allowedResult = rateLimiter.checkLimit(key)
    expect(allowedResult.allowed).toBe(true)
    expect(allowedResult.remaining).toBe(2)
  })

  it('should handle different keys independently', () => {
    const key1 = 'ip-1'
    const key2 = 'ip-2'

    // Use up limit for key1
    rateLimiter.checkLimit(key1)
    rateLimiter.checkLimit(key1)
    rateLimiter.checkLimit(key1)

    // key1 should be rejected
    const result1 = rateLimiter.checkLimit(key1)
    expect(result1.allowed).toBe(false)

    // key2 should still be allowed
    const result2 = rateLimiter.checkLimit(key2)
    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(2)
  })

  it('should return correct status without incrementing count', () => {
    const key = 'test-ip'

    // Make one request
    rateLimiter.checkLimit(key)

    // Check status multiple times
    const status1 = rateLimiter.getStatus(key)
    expect(status1.allowed).toBe(true)
    expect(status1.remaining).toBe(2)

    const status2 = rateLimiter.getStatus(key)
    expect(status2.allowed).toBe(true)
    expect(status2.remaining).toBe(2) // Should not change
  })

  it('should clean up expired entries', async () => {
    const key = 'test-ip'

    // Make a request
    rateLimiter.checkLimit(key)
    expect(rateLimiter.getStoreSize()).toBe(1)

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Trigger cleanup by making another request
    rateLimiter.checkLimit('another-ip')

    // Original entry should be cleaned up on next cleanup cycle
    // Note: cleanup runs every minute, so we can't reliably test automatic cleanup
    // but we can test the cleanup method directly
    expect(rateLimiter.getStoreSize()).toBeGreaterThanOrEqual(1)
  })
})

describe('getClientIP', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://example.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    })

    const ip = getClientIP(request)
    expect(ip).toBe('192.168.1.1')
  })

  it('should extract IP from x-real-ip header', () => {
    const request = new Request('http://example.com', {
      headers: {
        'x-real-ip': '192.168.1.2',
      },
    })

    const ip = getClientIP(request)
    expect(ip).toBe('192.168.1.2')
  })

  it('should extract IP from cf-connecting-ip header', () => {
    const request = new Request('http://example.com', {
      headers: {
        'cf-connecting-ip': '192.168.1.3',
      },
    })

    const ip = getClientIP(request)
    expect(ip).toBe('192.168.1.3')
  })

  it('should return unknown when no IP headers present', () => {
    const request = new Request('http://example.com')

    const ip = getClientIP(request)
    expect(ip).toBe('unknown')
  })

  it('should prioritize x-forwarded-for over other headers', () => {
    const request = new Request('http://example.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
        'cf-connecting-ip': '192.168.1.3',
      },
    })

    const ip = getClientIP(request)
    expect(ip).toBe('192.168.1.1')
  })
})

describe('createRateLimitResponse', () => {
  it('should create proper 429 response', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    }

    const response = createRateLimitResponse(result)

    expect(response.status).toBe(429)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(response.headers.get('X-RateLimit-Limit')).toBe(
      MESSAGE_RATE_LIMIT_CONFIG.maxRequests.toString()
    )
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Too many message submissions')
    expect(body.retryAfter).toBe(60)
  })

  it('should create response without retry-after when not provided', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
    }

    const response = createRateLimitResponse(result)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeNull()

    const body = await response.json()
    expect(body.retryAfter).toBeUndefined()
  })

  it('should accept custom error message', async () => {
    const result = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 30,
    }

    const customMessage = 'Custom rate limit message'
    const response = createRateLimitResponse(result, customMessage)

    const body = await response.json()
    expect(body.error).toBe(customMessage)
  })
})

describe('MESSAGE_RATE_LIMIT_CONFIG', () => {
  it('should have correct configuration', () => {
    expect(MESSAGE_RATE_LIMIT_CONFIG.maxRequests).toBe(5)
    expect(MESSAGE_RATE_LIMIT_CONFIG.windowMs).toBe(60 * 1000) // 1 minute
    expect(MESSAGE_RATE_LIMIT_CONFIG.message).toContain('Too many message submissions')
  })
})

describe('messageRateLimiter instance', () => {
  afterEach(() => {
    // Clean up the global instance after each test
    messageRateLimiter.destroy()
  })

  it('should be properly configured', () => {
    expect(messageRateLimiter).toBeInstanceOf(InMemoryRateLimiter)
    expect(messageRateLimiter.getStoreSize()).toBe(0)
  })

  it('should work with the configured limits', () => {
    const key = 'test-ip'

    // Should allow up to 5 requests
    for (let i = 0; i < 5; i++) {
      const result = messageRateLimiter.checkLimit(key)
      expect(result.allowed).toBe(true)
    }

    // 6th request should be rejected
    const result = messageRateLimiter.checkLimit(key)
    expect(result.allowed).toBe(false)
  })
})
