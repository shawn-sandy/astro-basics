/**
 * CSRF protection types
 */

/**
 * Result type for CSRF operations
 */
export type CsrfResult<T, E extends Error = Error> = { ok: true; value: T } | { ok: false; error: E }

/**
 * CSRF token data structure
 */
export interface CsrfToken {
  readonly token: string
  readonly expiresAt: Date
}

/**
 * CSRF validation result
 */
export interface CsrfValidationResult {
  readonly isValid: boolean
  readonly reason?: string
}

/**
 * CSRF configuration options
 */
export interface CsrfOptions {
  readonly tokenLength?: number
  readonly expirationHours?: number
  readonly cookieName?: string
  readonly fieldName?: string
}

/**
 * CSRF middleware context
 */
export interface CsrfContext {
  readonly token: string
  readonly setToken: (token: string) => void
}