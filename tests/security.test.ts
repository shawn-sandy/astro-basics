import { describe, it, expect } from 'vitest'
import { validateImageUrl, sanitizeImageUrl, validateTrustedImageUrl } from '#/utils/security'

describe('validateImageUrl', () => {
  it('should validate valid HTTP URLs', () => {
    const result = validateImageUrl('http://example.com/image.jpg')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('http://example.com/image.jpg')
    }
  })

  it('should validate valid HTTPS URLs', () => {
    const result = validateImageUrl('https://example.com/image.png')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('https://example.com/image.png')
    }
  })

  it('should reject javascript: URLs', () => {
    const result = validateImageUrl('javascript:alert("xss")')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Unsafe protocol')
    }
  })

  it('should reject data: URLs', () => {
    const result = validateImageUrl('data:text/html,<script>alert("xss")</script>')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Unsafe protocol')
    }
  })

  it('should reject vbscript: URLs', () => {
    const result = validateImageUrl('vbscript:alert("xss")')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Unsafe protocol')
    }
  })

  it('should reject file: URLs', () => {
    const result = validateImageUrl('file:///etc/passwd')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Unsafe protocol')
    }
  })

  it('should reject URLs with javascript: in the path', () => {
    const result = validateImageUrl('https://example.com/javascript:alert(1)')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('JavaScript URLs are not allowed')
    }
  })

  it('should reject URLs with data: in the path', () => {
    const result = validateImageUrl('https://example.com/data:text/html,<script>')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Data URLs are not allowed')
    }
  })

  it('should reject URLs with event handlers', () => {
    const testCases = [
      'https://example.com/image.jpg?onclick=alert(1)',
      'https://example.com/image.jpg#onload=alert(1)',
      'https://example.com/image.jpg?onmouseover=alert(1)',
    ]

    for (const url of testCases) {
      const result = validateImageUrl(url)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('potentially dangerous content')
      }
    }
  })

  it('should reject URLs with script tags', () => {
    const result = validateImageUrl('https://example.com/<script>alert(1)</script>')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('potentially dangerous content')
    }
  })

  it('should reject null and undefined values', () => {
    const nullResult = validateImageUrl(null)
    expect(nullResult.ok).toBe(false)

    const undefinedResult = validateImageUrl(undefined)
    expect(undefinedResult.ok).toBe(false)
  })

  it('should reject empty strings', () => {
    const result = validateImageUrl('')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('URL is required')
    }
  })

  it('should reject whitespace-only strings', () => {
    const result = validateImageUrl('   ')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('URL is required')
    }
  })

  it('should reject malformed URLs', () => {
    const result = validateImageUrl('not-a-url')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Invalid URL format')
    }
  })

  it('should trim whitespace from valid URLs', () => {
    const result = validateImageUrl('  https://example.com/image.jpg  ')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('https://example.com/image.jpg')
    }
  })

  it('should handle URLs with query parameters', () => {
    const result = validateImageUrl('https://example.com/image.jpg?w=100&h=100')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('https://example.com/image.jpg?w=100&h=100')
    }
  })

  it('should handle URLs with fragments', () => {
    const result = validateImageUrl('https://example.com/image.jpg#section')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('https://example.com/image.jpg#section')
    }
  })
})

describe('sanitizeImageUrl', () => {
  it('should return valid URL when validation passes', () => {
    const url = 'https://example.com/image.jpg'
    const result = sanitizeImageUrl(url)
    expect(result).toBe(url)
  })

  it('should return null when validation fails', () => {
    const result = sanitizeImageUrl('javascript:alert("xss")')
    expect(result).toBeNull()
  })

  it('should return fallback URL when primary URL is invalid', () => {
    const fallback = 'https://example.com/default.jpg'
    const result = sanitizeImageUrl('javascript:alert("xss")', fallback)
    expect(result).toBe(fallback)
  })

  it('should return null when both primary and fallback URLs are invalid', () => {
    const result = sanitizeImageUrl('javascript:alert("xss")', 'javascript:alert("xss2")')
    expect(result).toBeNull()
  })

  it('should handle null and undefined inputs', () => {
    expect(sanitizeImageUrl(null)).toBeNull()
    expect(sanitizeImageUrl(undefined)).toBeNull()
    expect(sanitizeImageUrl(null, 'https://example.com/default.jpg')).toBe(
      'https://example.com/default.jpg'
    )
  })
})

describe('validateTrustedImageUrl', () => {
  it('should validate URLs from default trusted domains', () => {
    const clerkUrls = ['https://images.clerk.dev/user123.jpg', 'https://img.clerk.com/avatar.png']

    for (const url of clerkUrls) {
      const result = validateTrustedImageUrl(url)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(url)
      }
    }
  })

  it('should reject URLs from untrusted domains', () => {
    const result = validateTrustedImageUrl('https://malicious.com/fake-avatar.jpg')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('not from a trusted domain')
    }
  })

  it('should work with custom trusted domains', () => {
    const customDomains = ['cdn.example.com', 'assets.mysite.com']
    const result = validateTrustedImageUrl('https://cdn.example.com/image.jpg', customDomains)
    expect(result.ok).toBe(true)
  })

  it('should support wildcard subdomains', () => {
    const customDomains = ['*.example.com']

    // Should allow subdomains
    const subdomainResult = validateTrustedImageUrl(
      'https://images.example.com/pic.jpg',
      customDomains
    )
    expect(subdomainResult.ok).toBe(true)

    // Should allow the base domain
    const baseResult = validateTrustedImageUrl('https://example.com/pic.jpg', customDomains)
    expect(baseResult.ok).toBe(true)

    // Should reject other domains
    const otherResult = validateTrustedImageUrl('https://other.com/pic.jpg', customDomains)
    expect(otherResult.ok).toBe(false)
  })

  it('should reject malicious URLs even if from trusted domain', () => {
    const result = validateTrustedImageUrl('javascript:alert("xss")', ['javascript'])
    expect(result.ok).toBe(false)
  })

  it('should be case-insensitive for domain matching', () => {
    const result = validateTrustedImageUrl('https://IMAGES.CLERK.DEV/user123.jpg')
    expect(result.ok).toBe(true)
  })
})
