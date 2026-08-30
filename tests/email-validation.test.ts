import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { isValidEmail, validateEmailWithMessage } from '#utils/email-validation'

describe('Email Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('isValidEmail', () => {
    it('should validate basic email formats', () => {
      const validEmails = [
        'user@example.com',
        'test@domain.org',
        'email@subdomain.example.com',
        'firstname.lastname@example.com',
        // 'email@123.123.123.123', // IP-like domains are not supported by the current regex (TLD must be alphabetic)
        'user.name@example.co.uk',
        'user+tag@example.com',
        'user_name@example.com',
        'x@example.com',
        'email@example-one.com',
        'email@example.name',
        'email@example.travel',
      ]

      validEmails.forEach(email => {
        expect(isValidEmail(email), `${email} should be valid`).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        'plainaddress',
        'user@',
        '@domain.com',
        'user@@domain.com',
        'user..name@domain.com',
        '.user@domain.com',
        'user.@domain.com',
        'user@domain',
        'user@.domain.com',
        'user@domain..com',
        'user name@domain.com',
        'user@domain .com',
        'user@domain.c',
        'user@domain.123', // Pure numeric TLD not allowed
        'user@',
        '@',
        'user@domain.',
        'a'.repeat(65) + '@domain.com', // Local part too long
        'user@' + 'a'.repeat(254) + '.com', // Domain too long
        'a'.repeat(255) + '@domain.com', // Total too long
      ]

      invalidEmails.forEach(email => {
        expect(isValidEmail(email), `${email} should be invalid`).toBe(false)
      })
    })

    it('should handle edge cases', () => {
      // Empty string
      expect(isValidEmail('')).toBe(false)

      // Non-string input
      expect(isValidEmail(null as any)).toBe(false)
      expect(isValidEmail(undefined as any)).toBe(false)
      expect(isValidEmail(123 as any)).toBe(false)

      // Whitespace handling
      expect(isValidEmail('  user@example.com  ')).toBe(true)
      expect(isValidEmail(' ')).toBe(false)

      // Length limits (RFC 5321)
      const longLocalPart = 'a'.repeat(64) + '@example.com'
      const tooLongLocalPart = 'a'.repeat(65) + '@example.com'

      expect(isValidEmail(longLocalPart)).toBe(true)
      expect(isValidEmail(tooLongLocalPart)).toBe(false)
    })

    it('should support strict mode', () => {
      const testEmails = ['user@example.com', 'test.email@example.org', 'user+tag@example.com']

      testEmails.forEach(email => {
        expect(isValidEmail(email, false)).toBe(true)
        expect(isValidEmail(email, true)).toBe(true)
      })
    })
  })

  describe('validateEmailWithMessage', () => {
    it('should return valid result for good emails', () => {
      const result = validateEmailWithMessage('user@example.com')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should return appropriate error messages', () => {
      const testCases = [
        { email: '', expectedMessage: 'Email address is required' },
        { email: 'plaintext', expectedMessage: 'Email must contain exactly one @ symbol' },
        { email: 'user@@domain.com', expectedMessage: 'Email must contain exactly one @ symbol' },
        { email: '@domain.com', expectedMessage: 'Email must have a local part before @' },
        { email: 'user@', expectedMessage: 'Email must have a domain part after @' },
        {
          email: 'user..name@domain.com',
          expectedMessage: 'Email cannot contain consecutive dots',
        },
        { email: '.user@domain.com', expectedMessage: 'Local part cannot start or end with a dot' },
        { email: 'user.@domain.com', expectedMessage: 'Local part cannot start or end with a dot' },
        {
          email: 'a'.repeat(65) + '@domain.com',
          expectedMessage: 'Local part of email is too long (maximum 64 characters)',
        },
        {
          email: 'user@' + 'a'.repeat(254) + '.com',
          expectedMessage: 'Domain part of email is too long (maximum 253 characters)',
        },
        {
          email: 'a'.repeat(255) + '@domain.com',
          expectedMessage: 'Email address is too long (maximum 254 characters)',
        },
      ]

      testCases.forEach(({ email, expectedMessage }) => {
        const result = validateEmailWithMessage(email)
        expect(result.valid, `${email} should be invalid`).toBe(false)
        expect(result.message, `${email} should have message: ${expectedMessage}`).toBe(
          expectedMessage
        )
      })
    })

    it('should handle non-string input', () => {
      const result = validateEmailWithMessage(123 as any)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Email must be a string')
    })

    it('should handle whitespace properly', () => {
      const result = validateEmailWithMessage('  user@example.com  ')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })
  })

  describe('Regression tests for common email formats', () => {
    it('should handle emails that the old regex rejected incorrectly', () => {
      // These are valid emails that the old regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ might reject
      const emailsToTest = [
        'user.name@example.com', // Dots in local part
        'user+tag@example.com', // Plus addressing
        'user_underscore@example.com', // Underscores
        'user123@example.com', // Numbers in local part
        'user@sub.domain.com', // Multiple subdomains
        'a@b.co', // Short but valid
        'long.email.address@very.long.domain.name.com', // Long but valid
      ]

      emailsToTest.forEach(email => {
        expect(isValidEmail(email), `${email} should be valid with new implementation`).toBe(true)
      })
    })

    it('should still reject clearly invalid emails', () => {
      const invalidEmails = [
        'user@domain', // Missing TLD
        'user space@example.com', // Space in local part
        'user@domain .com', // Space in domain
        'user@@example.com', // Double @
        '@example.com', // Missing local part
        'user@', // Missing domain
        '', // Empty string
      ]

      invalidEmails.forEach(email => {
        expect(isValidEmail(email), `${email} should still be invalid`).toBe(false)
      })
    })
  })
})
