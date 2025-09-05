import { describe, it, expect } from 'vitest'
import {
  generateCsrfToken,
  validateCsrfToken,
  extractCsrfTokenFromForm,
  extractCsrfTokenFromJson,
  parseCsrfTokenFromCookie,
  serializeCsrfTokenForCookie,
  createCsrfCookieOptions,
  CSRF_CONFIG,
} from '#utils/csrf'

describe('generateCsrfToken', () => {
  it('should generate a valid CSRF token with default options', async () => {
    const result = await generateCsrfToken()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.token).toHaveLength(CSRF_CONFIG.TOKEN_LENGTH * 2) // hex encoding doubles length
      expect(result.value.expiresAt).toBeInstanceOf(Date)
      expect(result.value.expiresAt.getTime()).toBeGreaterThan(Date.now())
    }
  })

  it('should generate tokens with custom length', async () => {
    const customLength = 16
    const result = await generateCsrfToken({ tokenLength: customLength })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.token).toHaveLength(customLength * 2)
    }
  })

  it('should generate tokens with custom expiration', () => {
    const customHours = 1
    const before = new Date()
    const result = generateCsrfToken({ expirationHours: customHours })
    const _after = new Date()

    expect(result.ok).toBe(true)
    if (result.ok) {
      const expectedExpiration = new Date(before.getTime() + customHours * 60 * 60 * 1000)
      const actualExpiration = result.value.expiresAt

      // Allow for small timing differences (within 1 second)
      expect(Math.abs(actualExpiration.getTime() - expectedExpiration.getTime())).toBeLessThan(1000)
    }
  })

  it('should generate unique tokens on each call', async () => {
    const result1 = await generateCsrfToken()
    const result2 = await generateCsrfToken()

    expect(result1.ok).toBe(true)
    expect(result2.ok).toBe(true)
    if (result1.ok && result2.ok) {
      expect(result1.value.token).not.toBe(result2.value.token)
    }
  })
})

describe('validateCsrfToken', () => {
  it('should validate matching tokens that are not expired', () => {
    const token = 'valid-token'
    const expiresAt = new Date(Date.now() + 60000) // 1 minute from now

    const result = validateCsrfToken(token, token, expiresAt)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.isValid).toBe(true)
      expect(result.value.reason).toBeUndefined()
    }
  })

  it('should reject missing provided token', () => {
    const expectedToken = 'expected-token'
    const expiresAt = new Date(Date.now() + 60000)

    const result = validateCsrfToken(undefined, expectedToken, expiresAt)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.isValid).toBe(false)
      expect(result.value.reason).toBe('CSRF token missing')
    }
  })

  it('should reject missing expected token', () => {
    const providedToken = 'provided-token'
    const expiresAt = new Date(Date.now() + 60000)

    const result = validateCsrfToken(providedToken, undefined, expiresAt)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.isValid).toBe(false)
      expect(result.value.reason).toBe('CSRF token missing')
    }
  })

  it('should reject expired tokens', () => {
    const token = 'valid-token'
    const expiresAt = new Date(Date.now() - 60000) // 1 minute ago

    const result = validateCsrfToken(token, token, expiresAt)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.isValid).toBe(false)
      expect(result.value.reason).toBe('CSRF token expired')
    }
  })

  it('should reject mismatched tokens', () => {
    const providedToken = 'provided-token'
    const expectedToken = 'expected-token'
    const expiresAt = new Date(Date.now() + 60000)

    const result = validateCsrfToken(providedToken, expectedToken, expiresAt)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.isValid).toBe(false)
      expect(result.value.reason).toBe('CSRF token invalid')
    }
  })

  it('should reject when expiration date is missing', () => {
    const token = 'valid-token'

    const result = validateCsrfToken(token, token, undefined)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.isValid).toBe(false)
      expect(result.value.reason).toBe('CSRF token expired')
    }
  })
})

describe('extractCsrfTokenFromForm', () => {
  it('should extract CSRF token from form data with default field name', () => {
    const formData = new FormData()
    formData.append(CSRF_CONFIG.FIELD_NAME, 'test-token')

    const token = extractCsrfTokenFromForm(formData)
    expect(token).toBe('test-token')
  })

  it('should extract CSRF token from form data with custom field name', () => {
    const formData = new FormData()
    const customFieldName = 'custom-csrf'
    formData.append(customFieldName, 'test-token')

    const token = extractCsrfTokenFromForm(formData, customFieldName)
    expect(token).toBe('test-token')
  })

  it('should return undefined when token is not present', () => {
    const formData = new FormData()

    const token = extractCsrfTokenFromForm(formData)
    expect(token).toBeUndefined()
  })

  it('should return undefined when token is not a string', () => {
    const formData = new FormData()
    // Create a File object to test non-string form data
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    formData.append(CSRF_CONFIG.FIELD_NAME, file)

    const token = extractCsrfTokenFromForm(formData)
    expect(token).toBeUndefined()
  })
})

describe('extractCsrfTokenFromJson', () => {
  it('should extract CSRF token from JSON body with default field name', () => {
    const body = { [CSRF_CONFIG.FIELD_NAME]: 'test-token' }

    const token = extractCsrfTokenFromJson(body)
    expect(token).toBe('test-token')
  })

  it('should extract CSRF token from JSON body with custom field name', () => {
    const customFieldName = 'custom-csrf'
    const body = { [customFieldName]: 'test-token' }

    const token = extractCsrfTokenFromJson(body, customFieldName)
    expect(token).toBe('test-token')
  })

  it('should return undefined when token is not present', () => {
    const body = {}

    const token = extractCsrfTokenFromJson(body)
    expect(token).toBeUndefined()
  })

  it('should return undefined when token is not a string', () => {
    const body = { [CSRF_CONFIG.FIELD_NAME]: 123 }

    const token = extractCsrfTokenFromJson(body)
    expect(token).toBeUndefined()
  })
})

describe('parseCsrfTokenFromCookie', () => {
  it('should parse valid cookie value', () => {
    const token = 'test-token'
    const expiresAt = new Date('2024-01-01T12:00:00.000Z')
    const cookieValue = `${token}|${expiresAt.toISOString()}`

    const result = parseCsrfTokenFromCookie(cookieValue)
    expect(result.ok).toBe(true)
    if (result.ok && result.value) {
      expect(result.value.token).toBe(token)
      expect(result.value.expiresAt).toEqual(expiresAt)
    }
  })

  it('should return null for undefined cookie value', () => {
    const result = parseCsrfTokenFromCookie(undefined)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeNull()
    }
  })

  it('should return null for malformed cookie value', () => {
    const result = parseCsrfTokenFromCookie('malformed-cookie')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeNull()
    }
  })

  it('should return null for invalid date in cookie', () => {
    const cookieValue = 'test-token|invalid-date'

    const result = parseCsrfTokenFromCookie(cookieValue)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeNull()
    }
  })
})

describe('serializeCsrfTokenForCookie', () => {
  it('should serialize token for cookie storage', () => {
    const token = 'test-token'
    const expiresAt = new Date('2024-01-01T12:00:00.000Z')
    const csrfToken = { token, expiresAt }

    const serialized = serializeCsrfTokenForCookie(csrfToken)
    expect(serialized).toBe(`${token}|${expiresAt.toISOString()}`)
  })
})

describe('createCsrfCookieOptions', () => {
  it('should create secure cookie options', () => {
    const expiresAt = new Date('2024-01-01T12:00:00.000Z')

    const options = createCsrfCookieOptions(expiresAt)

    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })
  })
})
