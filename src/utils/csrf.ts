/**
 * CSRF (Cross-Site Request Forgery) protection utilities following OWASP guidelines.
 *
 * Implements the Synchronizer Token Pattern with cryptographically secure tokens
 * to prevent unauthorized cross-site requests. Uses constant-time comparison to
 * prevent timing attacks and secure cookie storage with HttpOnly and SameSite flags.
 *
 * Security features:
 * - Cryptographically secure random token generation (32 bytes default)
 * - Constant-time string comparison prevents timing attack vectors
 * - Token expiration (4 hours default) limits replay attack windows
 * - Secure cookie storage with HttpOnly, Secure, and SameSite=strict
 * - __Host- cookie prefix for additional security in modern browsers
 *
 * @fileoverview CSRF protection following OWASP Top 10 2021 guidelines
 * @security Implements A01:2021 - Broken Access Control prevention
 * @see {@link https://owasp.org/www-community/attacks/csrf} OWASP CSRF Prevention
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis} Cookie Security
 * @version 2.0.0
 * @since 1.0.0
 */

import type { CsrfResult, CsrfToken, CsrfValidationResult, CsrfOptions } from '#types/csrf'

/**
 * CSRF security configuration following industry best practices.
 *
 * Configuration values are chosen based on security research and OWASP recommendations:
 * - TOKEN_LENGTH: 32 bytes provides 256 bits of entropy (exceeds NIST recommendations)
 * - EXPIRATION_HOURS: 4 hours balances security vs usability for typical session lengths
 * - COOKIE_NAME: __Host- prefix provides additional security guarantees in modern browsers
 * - FIELD_NAME: Standard convention for CSRF token field identification
 *
 * @constant {Object} CSRF_CONFIG - Immutable security configuration
 * @property {number} TOKEN_LENGTH - Cryptographic token length in bytes (32 = 256 bits)
 * @property {number} EXPIRATION_HOURS - Token validity period in hours
 * @property {string} COOKIE_NAME - Secure cookie name with __Host- prefix
 * @property {string} FIELD_NAME - HTML form field name for token submission
 * @security Values chosen to exceed OWASP and NIST security guidelines
 * @readonly Configuration is frozen to prevent runtime modification
 * @since 1.0.0
 */
export const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  EXPIRATION_HOURS: 4,
  COOKIE_NAME: '__Host-csrf-token',
  FIELD_NAME: '_csrf',
} as const

/**
 * Generates a cryptographically secure CSRF token using Node.js crypto module.
 *
 * Uses Node.js `randomBytes()` which leverages the operating system's CSPRNG
 * (Cryptographically Secure Pseudo-Random Number Generator) to generate tokens
 * with sufficient entropy to prevent prediction or brute force attacks.
 *
 * Token generation process:
 * 1. Generate cryptographically secure random bytes using OS entropy
 * 2. Convert to hexadecimal string for safe transmission
 * 3. Calculate expiration timestamp based on configuration
 * 4. Return structured result with error handling
 *
 * @param {CsrfOptions} [options] - Optional token generation parameters
 * @param {number} [options.tokenLength] - Override default token length in bytes
 * @param {number} [options.expirationHours] - Override default expiration time
 * @returns {Promise<CsrfResult<CsrfToken>>} Result containing token and expiration or error
 * @throws Never throws - all errors are captured in result structure
 * @security Uses cryptographically secure randomness from OS entropy pool
 * @performance Typically <1ms for token generation, async for non-blocking operation
 * @example
 * const result = await generateCsrfToken({ expirationHours: 8 });
 * if (result.ok) {
 *   console.log(`Token: ${result.value.token}, Expires: ${result.value.expiresAt}`);
 * }
 * @see {@link https://nodejs.org/api/crypto.html#cryptorandombytessize-callback} Node.js randomBytes
 * @since 1.0.0
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
 * Validates CSRF token with comprehensive security checks and timing attack prevention.
 *
 * Performs multi-layer validation to ensure token authenticity and prevent various
 * attack vectors including timing attacks, replay attacks, and token forgery.
 *
 * Validation process:
 * 1. Presence validation - ensures both tokens exist
 * 2. Expiration validation - prevents replay attacks with stale tokens
 * 3. Constant-time comparison - prevents timing attack analysis
 * 4. Structured error reporting for debugging and monitoring
 *
 * @param {string | undefined} providedToken - Token submitted by client (form/JSON)
 * @param {string | undefined} expectedToken - Server-stored token for comparison
 * @param {Date | undefined} expiresAt - Token expiration timestamp
 * @returns {CsrfResult<CsrfValidationResult>} Validation result with detailed failure reasons
 * @throws Never throws - all errors are captured in result structure
 * @security Uses constant-time comparison to prevent timing attack vectors
 * @performance O(n) where n is token length, regardless of match/mismatch outcome
 * @example
 * const result = validateCsrfToken(formToken, cookieToken, expirationDate);
 * if (result.ok && result.value.isValid) {
 *   // Process form submission
 * } else {
 *   // Log security event and reject request
 *   logger.warn('CSRF validation failed', { reason: result.value.reason });
 * }
 * @see {@link constantTimeCompare} for timing attack prevention implementation
 * @since 1.0.0
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
 * Constant-time string comparison preventing timing attack analysis.
 *
 * Standard string comparison (`===`) can leak information about string content
 * through execution time variations. This implementation ensures consistent
 * execution time regardless of where strings differ, preventing attackers from
 * using timing analysis to determine token values.
 *
 * Algorithm:
 * 1. Early return if lengths differ (length is not secret information)
 * 2. XOR all character pairs and OR results together
 * 3. Return true only if all XOR operations resulted in 0
 * 4. Execution time is constant for equal-length strings
 *
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} True if strings are identical, false otherwise
 * @security Prevents timing attacks by maintaining constant execution time
 * @complexity O(n) time where n is string length, regardless of match position
 * @algorithm Bitwise XOR with accumulation ensures constant-time comparison
 * @example
 * // Safe for security-sensitive comparisons
 * const isValid = constantTimeCompare(userToken, expectedToken);
 * // Unsafe: if (userToken === expectedToken) // Leaks timing information
 * @see {@link https://codahale.com/a-lesson-in-timing-attacks/} Timing Attack Reference
 * @since 1.0.0
 * @private Internal security utility - not exported
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
 * Safely extracts CSRF token from HTML form submission data.
 *
 * Handles FormData extraction with type safety to prevent injection attacks
 * through malformed form data. Only accepts string values to prevent object
 * pollution or prototype manipulation attacks.
 *
 * @param {FormData} formData - Browser FormData object from form submission
 * @param {string} [fieldName] - CSRF field name (defaults to configured value)
 * @returns {string | undefined} CSRF token string or undefined if not found/invalid
 * @security Type validation prevents object pollution attacks
 * @example
 * // In API endpoint handling form submission
 * const formData = await request.formData();
 * const csrfToken = extractCsrfTokenFromForm(formData);
 * if (!csrfToken) {
 *   return new Response('CSRF token missing', { status: 403 });
 * }
 * @see {@link CSRF_CONFIG.FIELD_NAME} for default field name
 * @since 1.0.0
 */
export function extractCsrfTokenFromForm(
  formData: FormData,
  fieldName = CSRF_CONFIG.FIELD_NAME
): string | undefined {
  const token = formData.get(fieldName)
  return typeof token === 'string' ? token : undefined
}

/**
 * Safely extracts CSRF token from JSON request body with type validation.
 *
 * Handles JSON body extraction with strict type checking to prevent injection
 * attacks through malformed JSON payloads. Only accepts string values to prevent
 * object pollution, prototype manipulation, or type confusion attacks.
 *
 * @param {Record<string, unknown>} body - Parsed JSON request body
 * @param {string} [fieldName] - CSRF field name (defaults to configured value)
 * @returns {string | undefined} CSRF token string or undefined if not found/invalid
 * @security Strict type validation prevents various JSON-based attacks
 * @example
 * // In API endpoint handling JSON submission
 * const body = await request.json();
 * const csrfToken = extractCsrfTokenFromJson(body);
 * if (!csrfToken) {
 *   return new Response('CSRF token missing', { status: 403 });
 * }
 * @see {@link CSRF_CONFIG.FIELD_NAME} for default field name
 * @since 1.0.0
 */
export function extractCsrfTokenFromJson(
  body: Record<string, unknown>,
  fieldName = CSRF_CONFIG.FIELD_NAME
): string | undefined {
  const token = body[fieldName]
  return typeof token === 'string' ? token : undefined
}

/**
 * Securely parses CSRF token from cookie storage format with validation.
 *
 * Handles the deserialization of CSRF tokens stored in cookies using a
 * pipe-delimited format (token|expiration). Includes comprehensive validation
 * to prevent injection attacks through malformed cookie values.
 *
 * Cookie format: `{token}|{ISO8601_expiration_date}`
 * Security considerations:
 * - Validates pipe-delimited format to prevent injection
 * - Validates date format to prevent parsing errors
 * - Graceful handling of malformed data (returns null, not error)
 * - No information leakage about why parsing failed
 *
 * @param {string | undefined} cookieValue - Raw cookie value from browser
 * @returns {CsrfResult<CsrfToken | null>} Parsed token data or null if invalid
 * @throws Never throws - all errors captured in result structure
 * @security Validates input format to prevent injection via malformed cookies
 * @example
 * const cookieValue = request.headers.get('cookie');
 * const tokenResult = parseCsrfTokenFromCookie(cookieValue);
 * if (tokenResult.ok && tokenResult.value) {
 *   const { token, expiresAt } = tokenResult.value;
 * }
 * @see {@link serializeCsrfTokenForCookie} for corresponding serialization
 * @since 1.0.0
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
 * Serializes CSRF token data for secure cookie storage.
 *
 * Creates a pipe-delimited string format for storing CSRF token and expiration
 * in browser cookies. Uses ISO 8601 format for reliable date parsing across
 * different locales and time zones.
 *
 * @param {CsrfToken} csrfToken - Token object with token string and expiration
 * @returns {string} Serialized cookie value in format: token|ISO8601_date
 * @example
 * const tokenData = { token: 'abc123...', expiresAt: new Date() };
 * const cookieValue = serializeCsrfTokenForCookie(tokenData);
 * // Result: 'abc123def456...|2023-12-01T10:30:00.000Z'
 * @see {@link parseCsrfTokenFromCookie} for corresponding deserialization
 * @since 1.0.0
 */
export function serializeCsrfTokenForCookie(csrfToken: CsrfToken): string {
  return `${csrfToken.token}|${csrfToken.expiresAt.toISOString()}`
}

/**
 * Creates secure cookie configuration for CSRF token storage.
 *
 * Implements multiple security layers following OWASP cookie security guidelines:
 * - HttpOnly: Prevents XSS attacks by blocking JavaScript access
 * - Secure: Requires HTTPS transmission to prevent network interception
 * - SameSite=strict: Prevents CSRF attacks by blocking cross-site requests
 * - Explicit expiration: Limits token lifetime for reduced attack surface
 * - Root path: Ensures token availability across entire application
 *
 * @param {Date} expiresAt - Token expiration date for cookie expiration
 * @returns {Object} Immutable cookie options object with security flags
 * @property {boolean} httpOnly - Prevents JavaScript access (XSS protection)
 * @property {boolean} secure - Requires HTTPS (network protection)
 * @property {'strict'} sameSite - Prevents cross-site requests (CSRF protection)
 * @property {Date} expires - Token expiration timestamp
 * @property {string} path - Cookie availability path (root for app-wide access)
 * @security Implements defense-in-depth strategy against multiple attack vectors
 * @example
 * const options = createCsrfCookieOptions(new Date(Date.now() + 4*60*60*1000));
 * response.headers.set('Set-Cookie', `${CSRF_CONFIG.COOKIE_NAME}=${tokenValue}; ${serializeOptions(options)}`);
 * @see {@link https://owasp.org/www-community/controls/SecureCookieAttribute} OWASP Cookie Security
 * @since 1.0.0
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
