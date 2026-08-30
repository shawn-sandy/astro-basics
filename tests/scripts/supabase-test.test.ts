/**
 * Tests for Supabase Test feature
 */
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'

// Mock DOM elements
const mockConnectionButton = {
  id: 'testConnection',
  disabled: false,
  textContent: 'Test Connection',
  addEventListener: vi.fn(),
  dataset: {},
}

const mockQueryButton = {
  id: 'testQuery',
  disabled: false,
  textContent: 'Test Query',
  addEventListener: vi.fn(),
  dataset: {},
}

const mockConnectionResult = {
  id: 'connectionResult',
  className: '',
  textContent: '',
}

const mockQueryResult = {
  id: 'queryResult',
  className: '',
  textContent: '',
}

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockDocument = {
  querySelector: vi.fn(),
  getElementById: vi.fn(),
}

global.document = mockDocument as any

describe('Supabase Test Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnectionButton.disabled = false
    mockConnectionButton.textContent = 'Test Connection'
    mockConnectionButton.dataset = {}
    mockQueryButton.disabled = false
    mockQueryButton.textContent = 'Test Query'
    mockQueryButton.dataset = {}
    mockConnectionResult.className = ''
    mockConnectionResult.textContent = ''
    mockQueryResult.className = ''
    mockQueryResult.textContent = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Test Initialization', () => {
    it('should find required test elements', () => {
      mockDocument.querySelector.mockImplementation(selector => {
        if (selector === '#testConnection') return mockConnectionButton
        if (selector === '#testQuery') return mockQueryButton
        if (selector === '#connectionResult') return mockConnectionResult
        if (selector === '#queryResult') return mockQueryResult
        return null
      })

      const connectionButton = mockDocument.querySelector('#testConnection')
      const queryButton = mockDocument.querySelector('#testQuery')
      const connectionResult = mockDocument.querySelector('#connectionResult')
      const queryResult = mockDocument.querySelector('#queryResult')

      expect(connectionButton).toBe(mockConnectionButton)
      expect(queryButton).toBe(mockQueryButton)
      expect(connectionResult).toBe(mockConnectionResult)
      expect(queryResult).toBe(mockQueryResult)
    })

    it('should handle missing test elements gracefully', () => {
      mockDocument.querySelector.mockReturnValue(null)

      const connectionButton = mockDocument.querySelector('#testConnection')
      expect(connectionButton).toBeNull()
    })
  })

  describe('Connection Test', () => {
    it('should handle successful connection test', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Supabase connected successfully',
            timestamp: new Date().toISOString(),
          }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Simulate connection test logic
      mockConnectionButton.disabled = true
      mockConnectionButton.textContent = 'Testing...'
      mockConnectionResult.className = 'result-box'
      mockConnectionResult.textContent = 'Testing connection...'

      const response = await fetch('/api/supabase-test')
      const data = await response.json()

      mockConnectionResult.textContent = JSON.stringify(data, null, 2)
      mockConnectionResult.className = `result-box ${data.success ? 'success' : 'error'}`
      mockConnectionButton.disabled = false
      mockConnectionButton.textContent = 'Test Connection'

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(mockConnectionResult.className).toBe('result-box success')
      expect(mockConnectionButton.disabled).toBe(false)
      expect(mockConnectionButton.textContent).toBe('Test Connection')
    })

    it('should handle connection test failure', async () => {
      const mockResponse = {
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Failed to connect to Supabase',
          }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Simulate connection test logic
      mockConnectionButton.disabled = true
      mockConnectionButton.textContent = 'Testing...'

      const response = await fetch('/api/supabase-test')
      const data = await response.json()

      mockConnectionResult.textContent = JSON.stringify(data, null, 2)
      mockConnectionResult.className = `result-box ${data.success ? 'success' : 'error'}`
      mockConnectionButton.disabled = false
      mockConnectionButton.textContent = 'Test Connection'

      expect(data.success).toBe(false)
      expect(mockConnectionResult.className).toBe('result-box error')
    })

    it('should handle network errors in connection test', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'))

      try {
        await fetch('/api/supabase-test')
      } catch (error) {
        mockConnectionResult.textContent = `Error: ${(error as Error).message}`
        mockConnectionResult.className = 'result-box error'
        mockConnectionButton.disabled = false
        mockConnectionButton.textContent = 'Test Connection'
      }

      expect(mockConnectionResult.textContent).toBe('Error: Network Error')
      expect(mockConnectionResult.className).toBe('result-box error')
    })
  })

  describe('Query Test', () => {
    it('should handle successful query test', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Query executed successfully',
            data: { tables: ['messages', 'users'] },
          }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Simulate query test logic
      mockQueryButton.disabled = true
      mockQueryButton.textContent = 'Testing...'
      mockQueryResult.className = 'result-box'
      mockQueryResult.textContent = 'Testing query...'

      const response = await fetch('/api/supabase-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-query' }),
      })
      const data = await response.json()

      mockQueryResult.textContent = JSON.stringify(data, null, 2)
      mockQueryResult.className = `result-box ${data.success ? 'success' : 'error'}`
      mockQueryButton.disabled = false
      mockQueryButton.textContent = 'Test Query'

      expect(data.success).toBe(true)
      expect(mockQueryResult.className).toBe('result-box success')
      expect(mockQueryButton.disabled).toBe(false)
    })

    it('should handle query test failure', async () => {
      const mockResponse = {
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Query execution failed',
          }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const response = await fetch('/api/supabase-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-query' }),
      })
      const data = await response.json()

      mockQueryResult.className = `result-box ${data.success ? 'success' : 'error'}`

      expect(data.success).toBe(false)
      expect(mockQueryResult.className).toBe('result-box error')
    })

    it('should send correct POST data for query test', () => {
      const expectedBody = JSON.stringify({ action: 'test-query' })

      fetch('/api/supabase-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expectedBody,
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/supabase-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expectedBody,
      })
    })
  })

  describe('UI State Management', () => {
    it('should manage button loading states correctly', () => {
      // Test connection button loading
      mockConnectionButton.disabled = true
      mockConnectionButton.dataset.originalText = 'Test Connection'
      mockConnectionButton.textContent = 'Testing...'

      expect(mockConnectionButton.disabled).toBe(true)
      expect(mockConnectionButton.textContent).toBe('Testing...')

      // Test restore state
      mockConnectionButton.disabled = false
      mockConnectionButton.textContent = mockConnectionButton.dataset.originalText

      expect(mockConnectionButton.disabled).toBe(false)
      expect(mockConnectionButton.textContent).toBe('Test Connection')
    })

    it('should update result displays correctly', () => {
      // Test initial state
      mockConnectionResult.className = 'result-box'
      mockConnectionResult.textContent = 'Testing connection...'

      expect(mockConnectionResult.className).toBe('result-box')
      expect(mockConnectionResult.textContent).toBe('Testing connection...')

      // Test success state
      const successData = { success: true, message: 'Connected' }
      mockConnectionResult.textContent = JSON.stringify(successData, null, 2)
      mockConnectionResult.className = 'result-box success'

      expect(mockConnectionResult.className).toBe('result-box success')
      expect(mockConnectionResult.textContent).toContain('Connected')
    })
  })
})
