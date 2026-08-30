import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST, GET } from '../../src/pages/api/message-us'

// Mock the dependencies
vi.mock('#libs/turso', () => ({
  isTursoConfigured: vi.fn(() => true),
  insertMessage: vi.fn(() => Promise.resolve('test-message-id')),
}))

vi.mock('#utils/csrf', () => ({
  validateCsrfToken: vi.fn(() => ({ ok: true, value: { isValid: true } })),
  extractCsrfTokenFromForm: vi.fn(() => 'valid-csrf-token'),
  extractCsrfTokenFromJson: vi.fn(() => 'valid-csrf-token'),
  parseCsrfTokenFromCookie: vi.fn(() => ({
    ok: true,
    value: { token: 'valid-csrf-token', expiresAt: Date.now() + 3_600_000 },
  })),
  CSRF_CONFIG: { COOKIE_NAME: 'csrf_token' },
}))

const createMockRequest = (data: any, contentType = 'application/json') => {
  return {
    headers: new Map([
      ['content-type', contentType],
      ['x-forwarded-for', '192.168.1.1'],
      ['user-agent', 'Test User Agent'],
    ]),
    json: () => Promise.resolve(data),
    formData: () => {
      const mockFormData = {
        entries: () =>
          Object.entries(data).map(([key, value]) => [key, String(value)] as [string, string]),
      }
      return Promise.resolve(mockFormData)
    },
  }
}

const createMockCookies = () => ({
  get: vi.fn(() => ({ value: 'mock-csrf-cookie' })),
})

describe('POST /api/message-us', () => {
  const validMessageData = {
    name: 'John Doe',
    email: 'john@example.com',
    subject: 'Test Subject',
    message: 'This is a test message.',
    _csrf: 'valid-csrf-token',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Valid submissions', () => {
    it('should accept valid JSON message data', async () => {
      const request = createMockRequest(validMessageData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Your message has been sent successfully!')
      expect(result.id).toBe('test-message-id')
    })

    it('should accept valid form data', async () => {
      const request = createMockRequest(validMessageData, 'application/x-www-form-urlencoded')
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })

    it('should handle optional subject field', async () => {
      const dataWithoutSubject = { ...validMessageData }
      delete dataWithoutSubject.subject

      const request = createMockRequest(dataWithoutSubject)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })

    it('should sanitize input data', async () => {
      const maliciousData = {
        name: 'John <script>alert(1)</script> Doe',
        email: '  JOHN@EXAMPLE.COM  ',
        subject: 'javascript:alert(1) Test',
        message: 'Hello <b>world</b>!',
        _csrf: 'valid-csrf-token',
      }

      const request = createMockRequest(maliciousData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })
  })

  describe('Input validation errors', () => {
    it('should reject missing required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        // Missing email and message
        _csrf: 'valid-csrf-token',
      }

      const request = createMockRequest(incompleteData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required fields')
    })

    it('should reject empty fields after sanitization', async () => {
      const emptyData = {
        name: '   ',
        email: 'test@example.com',
        message: '   ',
        _csrf: 'valid-csrf-token',
      }

      const request = createMockRequest(emptyData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should reject wrong data types', async () => {
      const invalidData = {
        name: 123, // Should be string
        email: 'test@example.com',
        message: 'Hello',
        _csrf: 'valid-csrf-token',
      }

      const request = createMockRequest(invalidData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required fields')
    })

    it('should reject suspicious content with 403 status', async () => {
      const maliciousData = {
        name: 'John Doe',
        email: 'test@example.com',
        message: '<script>alert(1)</script>',
        _csrf: 'valid-csrf-token',
      }

      const request = createMockRequest(maliciousData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Message contains prohibited content')
    })

    it('should reject invalid content type', async () => {
      const request = createMockRequest(validMessageData, 'text/plain')
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid content type')
    })
  })

  describe('CSRF protection', () => {
    it('should reject requests with invalid CSRF tokens', async () => {
      // Mock CSRF validation to fail
      const { validateCsrfToken } = await import('#utils/csrf')
      vi.mocked(validateCsrfToken).mockReturnValueOnce({
        ok: true,
        value: { isValid: false, reason: 'Invalid token' },
      })

      const request = createMockRequest(validMessageData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toContain('CSRF validation failed')
    })

    it('should reject requests with missing CSRF cookie', async () => {
      // Mock CSRF cookie parsing to fail
      const { parseCsrfTokenFromCookie } = await import('#utils/csrf')
      vi.mocked(parseCsrfTokenFromCookie).mockReturnValueOnce({
        ok: false,
        error: new Error('Missing CSRF cookie'),
      })

      const request = createMockRequest(validMessageData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toBe('CSRF validation failed')
    })
  })

  describe('Database configuration', () => {
    it('should return 503 when database is not configured', async () => {
      // Mock database as not configured
      const { isTursoConfigured } = await import('#libs/turso')
      vi.mocked(isTursoConfigured).mockReturnValueOnce(false)

      const request = createMockRequest(validMessageData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(503)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Database is not configured')
    })
  })

  describe('Error handling', () => {
    it('should handle database insertion errors', async () => {
      // Mock database insertion to fail
      const { insertMessage } = await import('#libs/turso')
      vi.mocked(insertMessage).mockRejectedValueOnce(new Error('Database error'))

      const request = createMockRequest(validMessageData)
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('error occurred while sending')
    })

    it('should handle JSON parsing errors', async () => {
      const request = {
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as any
      const cookies = createMockCookies()

      const response = await POST({ request, cookies } as any)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('error occurred while sending')
    })
  })

  describe('IP address handling', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const { insertMessage } = await import('#libs/turso')
      const insertMessageSpy = vi.mocked(insertMessage)

      const request = createMockRequest(validMessageData)
      request.headers.set('x-forwarded-for', '203.0.113.1, 70.41.3.18')
      const cookies = createMockCookies()

      await POST({ request, cookies } as any)

      expect(insertMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '203.0.113.1',
        })
      )
    })

    it('should fallback to x-real-ip header', async () => {
      const { insertMessage } = await import('#libs/turso')
      const insertMessageSpy = vi.mocked(insertMessage)

      const request = createMockRequest(validMessageData)
      request.headers.delete('x-forwarded-for')
      request.headers.set('x-real-ip', '198.51.100.1')
      const cookies = createMockCookies()

      await POST({ request, cookies } as any)

      expect(insertMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '198.51.100.1',
        })
      )
    })

    it('should use "unknown" for invalid IP addresses', async () => {
      const { insertMessage } = await import('#libs/turso')
      const insertMessageSpy = vi.mocked(insertMessage)

      const request = createMockRequest(validMessageData)
      request.headers.set('x-forwarded-for', 'invalid-ip')
      const cookies = createMockCookies()

      await POST({ request, cookies } as any)

      expect(insertMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: 'unknown',
        })
      )
    })

    it('should normalize IPv6 addresses', async () => {
      const { insertMessage } = await import('#libs/turso')
      const insertMessageSpy = vi.mocked(insertMessage)

      const request = createMockRequest(validMessageData)
      request.headers.set('x-forwarded-for', '[2001:0db8:0000:0000:0000:0000:0000:0001]:8080')
      const cookies = createMockCookies()

      await POST({ request, cookies } as any)

      expect(insertMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '::1',
        })
      )
    })

    it('should handle IPv6 addresses without truncation', async () => {
      const { insertMessage } = await import('#libs/turso')
      const insertMessageSpy = vi.mocked(insertMessage)

      const request = createMockRequest(validMessageData)
      request.headers.set('x-forwarded-for', '2001:db8:85a3::8a2e:370:7334')
      const cookies = createMockCookies()

      await POST({ request, cookies } as any)

      expect(insertMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '2001:db8:85a3::8a2e:370:7334',
        })
      )
    })
  })
})

describe('GET /api/message-us', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return API status', async () => {
    const response = await GET({} as any)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.message).toBe('Contact API is running')
    expect(typeof result.configured).toBe('boolean')
  })
})
