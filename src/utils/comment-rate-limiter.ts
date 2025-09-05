/**
 * Comment-specific rate limiting utilities
 * Extends the general rate limiter for comment submission
 */

import { InMemoryRateLimiter, getClientIP, createRateLimitResponse } from './rate-limiter'
import type { RateLimitConfig, RateLimitResult } from './rate-limiter'

// Comment rate limit configuration
export const COMMENT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 5, // 5 comments
  windowMs: 60 * 1000, // per minute
  message: 'Too many comments submitted. Please wait before commenting again.',
}

// Stricter rate limit for new users or suspicious behavior
export const STRICT_COMMENT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 2, // 2 comments
  windowMs: 60 * 1000, // per minute
  message: 'Rate limit exceeded. Please wait longer between comments.',
}

// Comment rate limiter instance
export const commentRateLimiter = new InMemoryRateLimiter(COMMENT_RATE_LIMIT_CONFIG)

// Strict rate limiter for new/suspicious users
export const strictCommentRateLimiter = new InMemoryRateLimiter(STRICT_COMMENT_RATE_LIMIT_CONFIG)

/**
 * Enhanced rate limiting that considers user behavior patterns
 */
export class CommentRateLimiter {
  private normalLimiter = commentRateLimiter
  private strictLimiter = strictCommentRateLimiter
  private suspiciousIPs = new Set<string>()
  private lastCommentTimes = new Map<string, number[]>()

  /**
   * Check if comment submission is allowed with enhanced logic
   */
  checkCommentLimit(
    clientIP: string,
    userId?: string,
    content?: string
  ): RateLimitResult & { reason?: string } {
    // Determine if this looks like suspicious behavior
    const isSuspicious = this.isSuspiciousBehavior(clientIP, userId, content)
    
    // Use stricter limits for suspicious activity
    const limiter = isSuspicious ? this.strictLimiter : this.normalLimiter
    const result = limiter.checkLimit(clientIP)

    // Track comment timing patterns
    if (result.allowed) {
      this.trackCommentTiming(clientIP)
    }

    // Add reason for denial if applicable
    if (!result.allowed) {
      return {
        ...result,
        reason: isSuspicious ? 'Suspicious activity detected' : 'Rate limit exceeded'
      }
    }

    return result
  }

  /**
   * Detect potentially suspicious commenting behavior
   */
  private isSuspiciousBehavior(
    clientIP: string, 
    userId?: string, 
    content?: string
  ): boolean {
    // Check if IP is already marked as suspicious
    if (this.suspiciousIPs.has(clientIP)) {
      return true
    }

    // Check comment timing patterns
    const recentComments = this.lastCommentTimes.get(clientIP) || []
    const now = Date.now()
    
    // Filter to last 5 minutes
    const recentTimes = recentComments.filter(time => now - time < 5 * 60 * 1000)
    
    // Suspicious if more than 3 comments in 5 minutes
    if (recentTimes.length > 3) {
      this.suspiciousIPs.add(clientIP)
      return true
    }

    // Check for very rapid commenting (less than 10 seconds between comments)
    if (recentTimes.length >= 2) {
      const timeDiffs = recentTimes
        .slice(1)
        .map((time, i) => time - recentTimes[i])
      
      if (timeDiffs.some(diff => diff < 10 * 1000)) {
        this.suspiciousIPs.add(clientIP)
        return true
      }
    }

    // Content-based checks if content is provided
    if (content) {
      // Very short content might indicate spam
      if (content.length < 10) {
        return true
      }

      // Very long content might be spam
      if (content.length > 800) {
        return true
      }

      // Check for excessive repetition (already handled in sanitization)
      // This is a lightweight check for obvious spam patterns
      if (/(.{3,})\1{3,}/.test(content.toLowerCase())) {
        this.suspiciousIPs.add(clientIP)
        return true
      }
    }

    return false
  }

  /**
   * Track comment submission timing for pattern analysis
   */
  private trackCommentTiming(clientIP: string): void {
    const now = Date.now()
    const existing = this.lastCommentTimes.get(clientIP) || []
    
    // Add current time and keep only last 10 timestamps
    const updated = [...existing, now].slice(-10)
    this.lastCommentTimes.set(clientIP, updated)
    
    // Cleanup old entries (older than 1 hour)
    const cutoff = now - 60 * 60 * 1000
    const filtered = updated.filter(time => time > cutoff)
    
    if (filtered.length !== updated.length) {
      this.lastCommentTimes.set(clientIP, filtered)
    }
  }

  /**
   * Remove an IP from the suspicious list (for admin use)
   */
  clearSuspiciousIP(clientIP: string): void {
    this.suspiciousIPs.delete(clientIP)
    this.lastCommentTimes.delete(clientIP)
  }

  /**
   * Get list of currently flagged IPs (for monitoring)
   */
  getSuspiciousIPs(): string[] {
    return Array.from(this.suspiciousIPs)
  }

  /**
   * Cleanup old data
   */
  cleanup(): void {
    const now = Date.now()
    const cutoff = now - 2 * 60 * 60 * 1000 // 2 hours

    // Clean up timing data
    for (const [ip, times] of this.lastCommentTimes.entries()) {
      const filtered = times.filter(time => time > cutoff)
      if (filtered.length === 0) {
        this.lastCommentTimes.delete(ip)
      } else if (filtered.length !== times.length) {
        this.lastCommentTimes.set(ip, filtered)
      }
    }

    // Clean up suspicious IPs that haven't been active for a while
    // (This is a simple approach - in production, you might want more sophisticated logic)
    for (const ip of this.suspiciousIPs) {
      const times = this.lastCommentTimes.get(ip)
      if (!times || times.length === 0 || Math.max(...times) < cutoff) {
        this.suspiciousIPs.delete(ip)
      }
    }
  }
}

// Global enhanced comment rate limiter
export const enhancedCommentRateLimiter = new CommentRateLimiter()

// Periodic cleanup
setInterval(() => {
  enhancedCommentRateLimiter.cleanup()
}, 30 * 60 * 1000) // Every 30 minutes

// Re-export utilities from base rate limiter
export { getClientIP, createRateLimitResponse }
export type { RateLimitResult }