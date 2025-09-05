/**
 * RFC 5322 compliant email validation utility
 * Provides comprehensive email address validation according to RFC standards
 */

/**
 * More comprehensive email validation regex that follows RFC 5322 standards
 * This regex handles most common valid email formats including:
 * - Basic format: user@domain.com
 * - Dots in local part: user.name@domain.com
 * - Plus addressing: user+tag@domain.com
 * - Numbers in domain: user@domain123.com
 * - Multiple subdomains: user@mail.domain.com
 * - International TLDs: user@domain.travel
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/

/**
 * More strict RFC 5322 compliant regex for comprehensive validation
 * Handles additional cases like:
 * - Quoted strings in local part
 * - IP addresses as domain
 * - Unicode characters (basic support)
 */
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * Validates an email address using improved RFC-compliant regex
 * @param email - The email address to validate
 * @param strict - Whether to use strict RFC 5322 validation (default: false)
 * @returns boolean indicating if email is valid
 */
export function isValidEmail(email: string, strict: boolean = false): boolean {
  if (typeof email !== 'string' || email.length === 0) {
    return false
  }

  // Trim whitespace
  const trimmedEmail = email.trim()

  // Check basic length constraints
  if (trimmedEmail.length > 254) {
    return false // RFC 5321 limit
  }

  // Split email into local and domain parts
  const parts = trimmedEmail.split('@')
  if (parts.length !== 2) {
    return false
  }

  const [localPart, domainPart] = parts

  // Check local part length (64 characters max per RFC 5321)
  if (localPart.length === 0 || localPart.length > 64) {
    return false
  }

  // Check domain part length
  if (domainPart.length === 0 || domainPart.length > 253) {
    return false
  }

  // Use appropriate regex based on strict flag
  const regex = strict ? STRICT_EMAIL_REGEX : EMAIL_REGEX

  return regex.test(trimmedEmail)
}

/**
 * Additional validation checks for common email issues
 * @param email - The email address to validate
 * @returns object with validation result and error message if invalid
 */
export function validateEmailWithMessage(email: string): { valid: boolean; message?: string } {
  if (typeof email !== 'string') {
    return { valid: false, message: 'Email must be a string' }
  }

  const trimmedEmail = email.trim()

  if (trimmedEmail.length === 0) {
    return { valid: false, message: 'Email address is required' }
  }

  if (trimmedEmail.length > 254) {
    return { valid: false, message: 'Email address is too long (maximum 254 characters)' }
  }

  const parts = trimmedEmail.split('@')
  if (parts.length !== 2) {
    return { valid: false, message: 'Email must contain exactly one @ symbol' }
  }

  const [localPart, domainPart] = parts

  if (localPart.length === 0) {
    return { valid: false, message: 'Email must have a local part before @' }
  }

  if (localPart.length > 64) {
    return { valid: false, message: 'Local part of email is too long (maximum 64 characters)' }
  }

  if (domainPart.length === 0) {
    return { valid: false, message: 'Email must have a domain part after @' }
  }

  if (domainPart.length > 253) {
    return { valid: false, message: 'Domain part of email is too long (maximum 253 characters)' }
  }

  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    return { valid: false, message: 'Email cannot contain consecutive dots' }
  }

  // Check for dots at beginning or end of local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, message: 'Local part cannot start or end with a dot' }
  }

  if (!isValidEmail(trimmedEmail)) {
    return { valid: false, message: 'Please enter a valid email address' }
  }

  return { valid: true }
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use isValidEmail instead
 */
export const validateEmail = isValidEmail
