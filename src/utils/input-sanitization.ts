/**
 * Input sanitization utilities for text-based content
 * Designed for Astro SSR where HTML rendering is auto-escaped
 */

/**
 * Sanitizes plain text input by removing/escaping dangerous characters
 * and normalizing whitespace
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }

  return (
    input
      // Remove null bytes and control characters (except newlines/tabs)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Limit consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim and normalize whitespace
      .trim()
      .replace(/[ \t]{2,}/g, ' ')
  )
}

/**
 * Sanitizes email addresses to prevent injection attacks
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string')
  }

  return (
    email
      .toLowerCase()
      .trim()
      // Remove dangerous characters
      .replace(/[<>"'`]/g, '')
      // Ensure basic email format
      .slice(0, 254)
  ) // RFC 5321 limit
}

/**
 * Sanitizes names and subject lines
 */
export function sanitizeName(name: string): string {
  if (typeof name !== 'string') {
    throw new Error('Name must be a string')
  }

  return (
    name
      .trim()
      // Remove HTML-like patterns
      .replace(/<[^>]*>/g, '')
      // Remove script-like patterns
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      // Remove excessive whitespace
      .replace(/\s{2,}/g, ' ')
      .slice(0, 255)
  )
}

/**
 * Comprehensive message sanitization
 */
export function sanitizeMessage(message: string): string {
  if (typeof message !== 'string') {
    throw new Error('Message must be a string')
  }

  return (
    message
      .trim()
      // Remove HTML tags completely (since we're text-only)
      .replace(/<[^>]*>/g, '')
      // Remove script protocols
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Normalize whitespace while preserving line breaks
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 5000)
  )
}

/**
 * Validates that input doesn't contain suspicious patterns
 */
export function detectSuspiciousContent(input: string): boolean {
  const suspiciousPatterns = [
    // Script injection patterns
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    // Event handlers
    /on\w+\s*=/i,
    // SQL injection patterns
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    // Template injection
    /\{\{.*\}\}/,
    /\$\{.*\}/,
  ]

  return suspiciousPatterns.some(pattern => pattern.test(input))
}

/**
 * Complete sanitization for message form data
 */
export interface SanitizedMessageData {
  name: string
  email: string
  subject?: string
  message: string
}

export function sanitizeMessageData(data: {
  name: unknown
  email: unknown
  subject?: unknown
  message: unknown
}): SanitizedMessageData {
  // Type validation
  if (
    typeof data.name !== 'string' ||
    typeof data.email !== 'string' ||
    typeof data.message !== 'string'
  ) {
    throw new Error('Invalid input types')
  }

  const sanitized: SanitizedMessageData = {
    name: sanitizeName(data.name),
    email: sanitizeEmail(data.email),
    message: sanitizeMessage(data.message),
  }

  // Only add subject if it exists and is not empty after sanitization
  if (data.subject) {
    const sanitizedSubject = sanitizeName(String(data.subject))
    if (sanitizedSubject.trim()) {
      sanitized.subject = sanitizedSubject
    }
  }

  // Detect suspicious content
  Object.values(sanitized)
    .filter(Boolean)
    .forEach(value => {
      if (detectSuspiciousContent(value)) {
        throw new Error('Suspicious content detected')
      }
    })

  // Final validation
  if (!sanitized.name || !sanitized.email || !sanitized.message) {
    throw new Error('Required fields cannot be empty after sanitization')
  }

  return sanitized
}
