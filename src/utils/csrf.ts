/**
 * CSRF protection utilities following OWASP guidelines
 */

import type { CsrfResult, CsrfToken, CsrfValidationResult, CsrfOptions } from '#types/csrf'

/**
 * Default CSRF configuration
 */
export const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  EXPIRATION_HOURS: 4,
  COOKIE_NAME: '__Host-csrf-token',
  FIELD_NAME: '_csrf',
} as const

/**
 * Generates a cryptographically secure CSRF token (server-side only)
 *
 * @param options - Optional configuration for token generation
 * @returns CsrfResult with generated token or error
 */
export async function generateCsrfToken(options?: CsrfOptions): Promise<CsrfResult<CsrfToken>> {
  try {
    // Dynamic import to ensure this only runs server-side
    const { randomBytes } = await import('node:crypto')

    const tokenLength = options?.tokenLength ?? CSRF_CONFIG.TOKEN_LENGTH
    const expirationHours = options?.expirationHours ?? CSRF_CONFIG.EXPIRATION_HOURS

    // Generate cryptographically secure random token
    const token = randomBytes(tokenLength).toString('hex')

    // Set expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expirationHours)

    return {
      ok: true,
      value: {
        token,
        expiresAt,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: new Error(
        `Failed to generate CSRF token: ${error instanceof Error ? error.message : 'Unknown error'}`
      ),
    }
  }
}

/**
 * Validates a CSRF token against the expected token and expiration
 *
 * @param providedToken - Token provided by the client
 * @param expectedToken - Expected token from server storage
 * @param expiresAt - Token expiration date
 * @returns CsrfResult with validation result
 */
export function validateCsrfToken(
  providedToken: string | undefined,
  expectedToken: string | undefined,
  expiresAt: Date | undefined
): CsrfResult<CsrfValidationResult> {
  try {
    // Check if tokens exist
    if (!providedToken || !expectedToken) {
      return {
        ok: true,
        value: {
          isValid: false,
          reason: 'CSRF token missing',
        },
      }
    }

    // Check if token is expired
    if (!expiresAt || new Date() > expiresAt) {
      return {
        ok: true,
        value: {
          isValid: false,
          reason: 'CSRF token expired',
        },
      }
    }

    // Use constant-time comparison to prevent timing attacks
    if (!constantTimeCompare(providedToken, expectedToken)) {
      return {
        ok: true,
        value: {
          isValid: false,
          reason: 'CSRF token invalid',
        },
      }
    }

    return {
      ok: true,
      value: {
        isValid: true,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: new Error(
        `Failed to validate CSRF token: ${error instanceof Error ? error.message : 'Unknown error'}`
      ),
    }
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Extracts CSRF token from form data
 *
 * @param formData - Form data from request
 * @param fieldName - Name of the CSRF field
 * @returns CSRF token or undefined if not found
 */
export function extractCsrfTokenFromForm(
  formData: FormData,
  fieldName = CSRF_CONFIG.FIELD_NAME
): string | undefined {
  const token = formData.get(fieldName)
  return typeof token === 'string' ? token : undefined
}

/**
 * Extracts CSRF token from JSON body
 *
 * @param body - JSON body from request
 * @param fieldName - Name of the CSRF field
 * @returns CSRF token or undefined if not found
 */
export function extractCsrfTokenFromJson(
  body: Record<string, unknown>,
  fieldName = CSRF_CONFIG.FIELD_NAME
): string | undefined {
  const token = body[fieldName]
  return typeof token === 'string' ? token : undefined
}

/**
 * Parses CSRF token from cookie value
 *
 * @param cookieValue - Cookie value containing token data
 * @returns CsrfResult with parsed token or error
 */
export function parseCsrfTokenFromCookie(
  cookieValue: string | undefined
): CsrfResult<CsrfToken | null> {
  try {
    if (!cookieValue) {
      return { ok: true, value: null }
    }

    const parts = cookieValue.split('|')
    if (parts.length !== 2) {
      return { ok: true, value: null }
    }

    const [token, expiresAtString] = parts
    const expiresAt = new Date(expiresAtString)

    if (isNaN(expiresAt.getTime())) {
      return { ok: true, value: null }
    }

    return {
      ok: true,
      value: {
        token,
        expiresAt,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: new Error(
        `Failed to parse CSRF token from cookie: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      ),
    }
  }
}

/**
 * Serializes CSRF token for cookie storage
 *
 * @param csrfToken - CSRF token to serialize
 * @returns Serialized cookie value
 */
export function serializeCsrfTokenForCookie(csrfToken: CsrfToken): string {
  return `${csrfToken.token}|${csrfToken.expiresAt.toISOString()}`
}

/**
 * Creates cookie options for CSRF token
 *
 * @param expiresAt - Token expiration date
 * @returns Cookie options for secure storage
 */
export function createCsrfCookieOptions(expiresAt: Date): {
  readonly httpOnly: boolean
  readonly secure: boolean
  readonly sameSite: 'strict'
  readonly expires: Date
  readonly path: string
} {
  return {
    httpOnly: true,
    secure: true, // Requires HTTPS in production
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  }
}
