/**
 * Security utilities for validating and sanitizing user-provided content
 */

/**
 * Result type for URL validation operations
 */
type ValidationResult<T, E extends Error> = { ok: true; value: T } | { ok: false; error: E }

/**
 * Validates and sanitizes image URLs to prevent XSS attacks
 *
 * @param url - The URL to validate
 * @returns ValidationResult with the validated URL or an error
 */
export function validateImageUrl(url: string | null | undefined): ValidationResult<string, Error> {
  // Handle null/undefined/empty cases
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return { ok: false, error: new Error('URL is required') }
  }

  const trimmedUrl = url.trim()

  try {
    // Parse the URL to validate structure
    const parsedUrl = new URL(trimmedUrl)

    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        ok: false,
        error: new Error(`Unsafe protocol: ${parsedUrl.protocol}. Only http and https are allowed`),
      }
    }

    // Additional checks for malicious patterns
    if (trimmedUrl.toLowerCase().includes('javascript:')) {
      return { ok: false, error: new Error('JavaScript URLs are not allowed') }
    }

    if (trimmedUrl.toLowerCase().includes('data:')) {
      return { ok: false, error: new Error('Data URLs are not allowed') }
    }

    // Check for common XSS patterns
    const dangerousPatterns = [
      /on\w+\s*=/i, // event handlers like onclick=
      /<script/i, // script tags
      /javascript:/i, // javascript protocol
      /vbscript:/i, // vbscript protocol
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedUrl)) {
        return { ok: false, error: new Error('URL contains potentially dangerous content') }
      }
    }

    return { ok: true, value: parsedUrl.toString() }
  } catch (error) {
    return {
      ok: false,
      error: new Error(
        `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
      ),
    }
  }
}

/**
 * Sanitizes an image URL for safe use in HTML attributes
 * Returns a safe URL or null if validation fails
 *
 * @param url - The URL to sanitize
 * @param fallbackUrl - Optional fallback URL if validation fails
 * @returns Sanitized URL or null
 */
export function sanitizeImageUrl(
  url: string | null | undefined,
  fallbackUrl?: string
): string | null {
  const result = validateImageUrl(url)

  if (result.ok) {
    return result.value
  }

  // Try fallback if provided
  if (fallbackUrl) {
    const fallbackResult = validateImageUrl(fallbackUrl)
    if (fallbackResult.ok) {
      return fallbackResult.value
    }
  }

  return null
}

/**
 * Validates URLs from trusted domains (like Clerk's CDN)
 *
 * @param url - The URL to validate
 * @param trustedDomains - Array of trusted domain patterns
 * @returns ValidationResult with the validated URL or an error
 */
export function validateTrustedImageUrl(
  url: string | null | undefined,
  trustedDomains: readonly string[] = ['images.clerk.dev', 'img.clerk.com']
): ValidationResult<string, Error> {
  const baseValidation = validateImageUrl(url)

  if (!baseValidation.ok) {
    return baseValidation
  }

  try {
    const parsedUrl = new URL(baseValidation.value)
    const hostname = parsedUrl.hostname.toLowerCase()

    // Check if the domain is in the trusted list
    const isTrusted = trustedDomains.some(domain => {
      // Support wildcard subdomains with *. prefix
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2)
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain)
      }
      return hostname === domain.toLowerCase()
    })

    if (!isTrusted) {
      return {
        ok: false,
        error: new Error(
          `URL is not from a trusted domain. Allowed domains: ${trustedDomains.join(', ')}`
        ),
      }
    }

    return { ok: true, value: baseValidation.value }
  } catch (error) {
    return {
      ok: false,
      error: new Error(
        `Failed to validate domain: ${error instanceof Error ? error.message : 'Unknown error'}`
      ),
    }
  }
}
