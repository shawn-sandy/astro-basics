import { describe, it, expect } from 'vitest'
import {
  sanitizeText,
  sanitizeEmail,
  sanitizeName,
  sanitizeMessage,
  detectSuspiciousContent,
  sanitizeMessageData,
} from '../src/utils/input-sanitization'

describe('sanitizeText', () => {
  it('should remove control characters while preserving newlines and tabs', () => {
    const input = `Hello\x00\x01World\nLine2\tTabbed`
    const result = sanitizeText(input)
    expect(result).toBe('HelloWorld\nLine2\tTabbed')
  })

  it('should normalize line endings', () => {
    const input = 'Line1\r\nLine2\rLine3\nLine4'
    const result = sanitizeText(input)
    expect(result).toBe('Line1\nLine2\nLine3\nLine4')
  })

  it('should limit consecutive newlines', () => {
    const input = 'Line1\n\n\n\n\nLine2'
    const result = sanitizeText(input)
    expect(result).toBe('Line1\n\nLine2')
  })

  it('should normalize excessive whitespace', () => {
    const input = 'Word1   \t  Word2    Word3'
    const result = sanitizeText(input)
    expect(result).toBe('Word1 Word2 Word3')
  })

  it('should trim leading and trailing whitespace', () => {
    const input = '   Hello World   '
    const result = sanitizeText(input)
    expect(result).toBe('Hello World')
  })

  it('should throw error for non-string input', () => {
    expect(() => sanitizeText(123 as any)).toThrow('Input must be a string')
    expect(() => sanitizeText(null as any)).toThrow('Input must be a string')
    expect(() => sanitizeText(undefined as any)).toThrow('Input must be a string')
  })
})

describe('sanitizeEmail', () => {
  it('should lowercase and trim email addresses', () => {
    const input = '  TEST@EXAMPLE.COM  '
    const result = sanitizeEmail(input)
    expect(result).toBe('test@example.com')
  })

  it('should remove dangerous characters', () => {
    const input = 'test<script>@example.com'
    const result = sanitizeEmail(input)
    expect(result).toBe('testscript@example.com')
  })

  it('should enforce RFC 5321 length limit', () => {
    const longEmail = 'a'.repeat(300) + '@example.com'
    const result = sanitizeEmail(longEmail)
    expect(result.length).toBeLessThanOrEqual(254)
  })

  it('should handle valid email addresses', () => {
    const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org']

    validEmails.forEach(email => {
      const result = sanitizeEmail(email)
      expect(result).toBe(email.toLowerCase())
    })
  })

  it('should throw error for non-string input', () => {
    expect(() => sanitizeEmail(123 as any)).toThrow('Email must be a string')
  })
})

describe('sanitizeName', () => {
  it('should remove HTML tags', () => {
    const input = 'John <script>alert(1)</script> Doe'
    const result = sanitizeName(input)
    expect(result).toBe('John alert(1) Doe')
  })

  it('should remove script protocols', () => {
    const input = 'javascript:alert(1) John Doe'
    const result = sanitizeName(input)
    expect(result).toBe('alert(1) John Doe')
  })

  it('should remove data protocols', () => {
    const input = 'data:text/html,<script> John Doe'
    const result = sanitizeName(input)
    expect(result).toBe('text/html, John Doe')
  })

  it('should normalize excessive whitespace', () => {
    const input = 'John    Doe'
    const result = sanitizeName(input)
    expect(result).toBe('John Doe')
  })

  it('should enforce length limit', () => {
    const longName = 'a'.repeat(300)
    const result = sanitizeName(longName)
    expect(result.length).toBeLessThanOrEqual(255)
  })

  it('should handle normal names', () => {
    const normalNames = ['John Doe', 'María García', "O'Connor", 'Jean-Pierre']

    normalNames.forEach(name => {
      const result = sanitizeName(name)
      expect(result).toBe(name)
    })
  })

  it('should throw error for non-string input', () => {
    expect(() => sanitizeName(123 as any)).toThrow('Name must be a string')
  })
})

describe('sanitizeMessage', () => {
  it('should remove HTML tags completely', () => {
    const input = 'Hello <b>world</b>! <script>alert(1)</script>'
    const result = sanitizeMessage(input)
    expect(result).toBe('Hello world! alert(1)')
  })

  it('should remove script protocols', () => {
    const input = 'Click here: javascript:alert(1)'
    const result = sanitizeMessage(input)
    expect(result).toBe('Click here: alert(1)')
  })

  it('should remove event handlers', () => {
    const input = 'onclick=alert(1) onmouseover=hack()'
    const result = sanitizeMessage(input)
    expect(result).toBe('hack()')
  })

  it('should preserve line breaks while limiting consecutive ones', () => {
    const input = 'Line1\n\nLine2\n\n\n\n\nLine3'
    const result = sanitizeMessage(input)
    expect(result).toBe('Line1\n\nLine2\n\nLine3')
  })

  it('should enforce length limit', () => {
    const longMessage = 'a'.repeat(6000)
    const result = sanitizeMessage(longMessage)
    expect(result.length).toBeLessThanOrEqual(5000)
  })

  it('should handle normal messages', () => {
    const normalMessage = `Hello there,

I would like to inquire about your services.
Please contact me at your earliest convenience.

Thank you!`

    const result = sanitizeMessage(normalMessage)
    expect(result).toBe(normalMessage)
  })

  it('should throw error for non-string input', () => {
    expect(() => sanitizeMessage(123 as any)).toThrow('Message must be a string')
  })
})

describe('detectSuspiciousContent', () => {
  it('should detect script injection patterns', () => {
    const suspiciousInputs = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
    ]

    suspiciousInputs.forEach(input => {
      expect(detectSuspiciousContent(input)).toBe(true)
    })
  })

  it('should detect event handlers', () => {
    const suspiciousInputs = ['onclick=alert(1)', 'onmouseover=hack()', 'onerror=evil()']

    suspiciousInputs.forEach(input => {
      expect(detectSuspiciousContent(input)).toBe(true)
    })
  })

  it('should detect SQL injection patterns', () => {
    const suspiciousInputs = [
      'UNION SELECT * FROM users',
      'DROP TABLE messages',
      'INSERT INTO admin',
    ]

    suspiciousInputs.forEach(input => {
      expect(detectSuspiciousContent(input)).toBe(true)
    })
  })

  it('should detect template injection patterns', () => {
    const suspiciousInputs = [
      '{{7*7}}',
      '${process.env}',
      '{{constructor.constructor("return process")()}}',
    ]

    suspiciousInputs.forEach(input => {
      expect(detectSuspiciousContent(input)).toBe(true)
    })
  })

  it('should not flag normal content', () => {
    const normalInputs = [
      'Hello world!',
      'Please contact me at john@example.com',
      'My phone number is 123-456-7890',
      'I love JavaScript programming!',
    ]

    normalInputs.forEach(input => {
      expect(detectSuspiciousContent(input)).toBe(false)
    })
  })
})

describe('sanitizeMessageData', () => {
  const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    subject: 'Test Subject',
    message: 'This is a test message.',
  }

  it('should sanitize valid message data', () => {
    const result = sanitizeMessageData(validData)

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Test Subject',
      message: 'This is a test message.',
    })
  })

  it('should handle optional subject field', () => {
    const dataWithoutSubject = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a test message.',
    }

    const result = sanitizeMessageData(dataWithoutSubject)

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a test message.',
    })
    expect(result.subject).toBeUndefined()
  })

  it('should sanitize malicious content', () => {
    const maliciousData = {
      name: 'John <script>alert(1)</script> Doe',
      email: '  JOHN@EXAMPLE.COM  ',
      subject: 'javascript:alert(1) Test',
      message: 'Hello <b>world</b>! onclick=hack()',
    }

    const result = sanitizeMessageData(maliciousData)

    expect(result.name).toBe('John alert(1) Doe')
    expect(result.email).toBe('john@example.com')
    expect(result.subject).toBe('alert(1) Test')
    expect(result.message).toBe('Hello world! hack()')
  })

  it('should throw error for missing required fields', () => {
    expect(() => sanitizeMessageData({} as any)).toThrow('Invalid input types')
    expect(() => sanitizeMessageData({ name: 'John' } as any)).toThrow('Invalid input types')
    expect(() => sanitizeMessageData({ name: 'John', email: 'test@example.com' } as any)).toThrow(
      'Invalid input types'
    )
  })

  it('should throw error for wrong data types', () => {
    expect(() =>
      sanitizeMessageData({
        name: 123,
        email: 'test@example.com',
        message: 'Hello',
      } as any)
    ).toThrow('Invalid input types')
  })

  it('should throw error for empty fields after sanitization', () => {
    expect(() =>
      sanitizeMessageData({
        name: '   ',
        email: 'test@example.com',
        message: 'Hello',
      })
    ).toThrow('Required fields cannot be empty after sanitization')
  })

  it('should throw error for suspicious content', () => {
    expect(() =>
      sanitizeMessageData({
        name: 'John Doe',
        email: 'test@example.com',
        message: '<script>alert(1)</script>',
      })
    ).toThrow('Suspicious content detected')
  })

  it('should handle empty subject after sanitization', () => {
    const dataWithEmptySubject = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: '   ',
      message: 'This is a test message.',
    }

    const result = sanitizeMessageData(dataWithEmptySubject)

    expect(result.subject).toBeUndefined()
  })

  it('should handle edge cases', () => {
    const edgeCaseData = {
      name: 'A'.repeat(300), // Over limit
      email: '  MIXED@Case.COM  ',
      subject: 'Normal subject',
      message: 'Line1\n\n\n\n\nLine2', // Multiple newlines
    }

    const result = sanitizeMessageData(edgeCaseData)

    expect(result.name.length).toBeLessThanOrEqual(255)
    expect(result.email).toBe('mixed@case.com')
    expect(result.message).toBe('Line1\n\nLine2')
  })
})
