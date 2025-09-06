/**
 * Sanitizes user metadata by removing potentially dangerous fields
 * and escaping HTML entities to prevent XSS attacks
 */
export interface SanitizedMetadata {
  [key: string]: string | number | boolean | null
}

const DANGEROUS_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'private',
  'internal',
  'admin',
  'auth',
  'session',
  'csrf',
]

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

/**
 * Escapes HTML entities in string values
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/]/g, char => HTML_ENTITIES[char] || char)
}

/**
 * Checks if a field name is potentially dangerous
 */
function isDangerousField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase()
  return DANGEROUS_FIELDS.some(dangerous => lowerField.includes(dangerous))
}

/**
 * Recursively sanitizes metadata object
 */
export function sanitizeMetadata(metadata: unknown): SanitizedMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }

  const sanitized: SanitizedMetadata = {}
  const obj = metadata as Record<string, unknown>

  for (const [key, value] of Object.entries(obj)) {
    // Skip dangerous field names
    if (isDangerousField(key)) {
      continue
    }

    // Handle different value types
    if (value === null || value === undefined) {
      sanitized[key] = null
    } else if (typeof value === 'string') {
      // Escape HTML and limit length
      const sanitizedValue = escapeHtml(value)
      sanitized[key] =
        sanitizedValue.length > 500 ? sanitizedValue.substring(0, 500) + '...' : sanitizedValue
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects (limit depth)
      const nestedSanitized = sanitizeMetadata(value)
      if (Object.keys(nestedSanitized).length > 0) {
        sanitized[key] = JSON.stringify(nestedSanitized)
      }
    }
    // Skip arrays and functions for security
  }

  return sanitized
}

/**
 * Formats sanitized metadata for display
 */
export function formatMetadataForDisplay(metadata: unknown): string {
  const sanitized = sanitizeMetadata(metadata)

  if (Object.keys(sanitized).length === 0) {
    return 'No displayable metadata'
  }

  return JSON.stringify(sanitized, null, 2)
}

// Comment sanitization utilities
interface SanitizeCommentOptions {
  maxLength?: number
  allowBasicFormatting?: boolean
  stripUrls?: boolean
}

/**
 * Sanitize comment content to prevent XSS attacks
 * Allows basic text formatting but strips dangerous content
 * 
 * @param content - Raw user input content
 * @param options - Sanitization options
 * @returns Sanitized content safe for display
 */
export function sanitizeComment(
  content: string,
  options: SanitizeCommentOptions = {}
): string {
  const {
    maxLength = 1000,
    stripUrls = false
  } = options

  if (typeof content !== 'string') {
    return ''
  }

  let sanitized = content

  // 1. Trim whitespace
  sanitized = sanitized.trim()

  // 2. Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  // 3. Remove/escape HTML tags and entities
  sanitized = escapeHtml(sanitized)

  // 4. Remove potentially dangerous characters and sequences
  sanitized = removeDangerousSequences(sanitized)

  // 5. Handle URLs if needed
  if (stripUrls) {
    sanitized = removeUrls(sanitized)
  }

  // 6. Basic formatting cleanup
  sanitized = normalizeWhitespace(sanitized)

  // 7. Final validation
  if (sanitized.length === 0 || sanitized.match(/^\s*$/)) {
    return ''
  }

  return sanitized
}

/**
 * Remove potentially dangerous character sequences
 */
function removeDangerousSequences(text: string): string {
  // Remove potential script injections, even if escaped
  const dangerousPatterns = [
    /javascript:/gi,
    /vbscript:/gi,
    /data:/gi,
    /on\w+\s*=/gi, // event handlers like onclick=, onmouseover=
    /<script/gi,
    /<\/script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<style/gi,
    /<meta/gi,
    /expression\s*\(/gi, // CSS expressions
    /url\s*\(/gi, // CSS url() functions
    /@import/gi, // CSS imports
  ]

  let sanitized = text
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })

  return sanitized
}

/**
 * Remove URLs from text
 */
function removeUrls(text: string): string {
  // Remove common URL patterns
  const urlPatterns = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi // Improved domain pattern
  ]

  let sanitized = text
  urlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[URL removed]')
  })

  return sanitized
}

/**
 * Normalize whitespace and line breaks
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')   // Handle old Mac line endings
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks to 2
    .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces/tabs
    .trim()
}

/**
 * Validate comment content meets basic requirements
 */
export function validateCommentContent(content: string): {
  valid: boolean
  error?: string
  sanitized: string
} {
  if (!content || typeof content !== 'string') {
    return {
      valid: false,
      error: 'Content is required',
      sanitized: ''
    }
  }

  const sanitized = sanitizeComment(content)

  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'Content cannot be empty',
      sanitized
    }
  }

  if (sanitized.length < 3) {
    return {
      valid: false,
      error: 'Content must be at least 3 characters long',
      sanitized
    }
  }

  if (sanitized.length > 1000) {
    return {
      valid: false,
      error: 'Content must be less than 1000 characters',
      sanitized
    }
  }

  // Check for excessive repetition (spam detection)
  if (isExcessiveRepetition(sanitized)) {
    return {
      valid: false,
      error: 'Content contains excessive repetition',
      sanitized
    }
  }

  return {
    valid: true,
    sanitized
  }
}

/**
 * Detect excessive character or word repetition (basic spam detection)
 */
function isExcessiveRepetition(text: string): boolean {
  // Check for same character repeated more than 10 times
  if (/(.)\1{10,}/.test(text)) {
    return true
  }

  // Check for same word repeated more than 5 times
  const words = text.toLowerCase().split(/\s+/)
  const wordCounts: Record<string, number> = {}
  
  for (const word of words) {
    if (word.length > 2) { // Only check words longer than 2 characters
      wordCounts[word] = (wordCounts[word] || 0) + 1
      if (wordCounts[word] > 5) {
        return true
      }
    }
  }

  return false
}

/**
 * Extract safe text preview for display purposes
 */
export function createCommentPreview(
  content: string, 
  maxLength: number = 100
): string {
  const sanitized = sanitizeComment(content, { maxLength: maxLength * 2 })
  
  if (sanitized.length <= maxLength) {
    return sanitized
  }

  // Find a good break point (space or punctuation)
  const truncated = sanitized.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  const lastPunctuation = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )

  const breakPoint = Math.max(lastSpace, lastPunctuation)
  
  if (breakPoint > maxLength * 0.7) {
    return truncated.substring(0, breakPoint) + '...'
  }

  return truncated + '...'
}
