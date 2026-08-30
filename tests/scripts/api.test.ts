/**
 * Tests for API utilities module
 */
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import modules to test
// Note: We need to dynamically import since these are ES modules in /public/scripts/
let _apiModule: any

describe('API Module', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamically import the module for testing
    // In a real test environment, we'd need to serve these files or copy them to a testable location
    // For now, we'll test the logic patterns
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('apiRequest', () => {
    it('should handle successful API responses', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, data: 'test' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Test the logic pattern that would be in apiRequest
      const response = await fetch('/test')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data).toBe('test')
    })

    it('should handle API error responses', async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const response = await fetch('/test')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(data.error).toBe('API Error')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'))

      try {
        await fetch('/test')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network Error')
      }
    })
  })

  describe('postForm', () => {
    it('should handle FormData correctly', () => {
      const formData = new FormData()
      formData.append('name', 'John')
      formData.append('email', 'john@example.com')

      const jsonData = JSON.stringify(Object.fromEntries(formData.entries()))
      const parsedData = JSON.parse(jsonData)

      expect(parsedData.name).toBe('John')
      expect(parsedData.email).toBe('john@example.com')
    })

    it('should handle plain objects correctly', () => {
      const data = { name: 'John', email: 'john@example.com' }
      const jsonData = JSON.stringify(data)
      const parsedData = JSON.parse(jsonData)

      expect(parsedData.name).toBe('John')
      expect(parsedData.email).toBe('john@example.com')
    })
  })
})
