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
