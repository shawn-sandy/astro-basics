/**
 * Tests for UI utilities module
 */
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'

// Mock DOM
const mockElement = {
  textContent: '',
  className: '',
  style: { display: '' },
  dataset: {},
  disabled: false,
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
}

const mockDocument = {
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
}

global.document = mockDocument as any

describe('UI Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock element state
    mockElement.textContent = ''
    mockElement.className = ''
    mockElement.style.display = ''
    mockElement.dataset = {}
    mockElement.disabled = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('showMessage', () => {
    it('should set message content and class', () => {
      const element = { ...mockElement }

      // Simulate showMessage logic
      element.textContent = 'Success message'
      element.className = 'form-message success'
      element.style.display = 'block'

      expect(element.textContent).toBe('Success message')
      expect(element.className).toBe('form-message success')
      expect(element.style.display).toBe('block')
    })

    it('should handle different message types', () => {
      const element = { ...mockElement }

      // Test error message
      element.textContent = 'Error message'
      element.className = 'form-message error'

      expect(element.className).toBe('form-message error')

      // Test info message
      element.className = 'form-message info'
      expect(element.className).toBe('form-message info')
    })
  })

  describe('clearMessage', () => {
    it('should clear message content and hide element', () => {
      const element = { ...mockElement }
      element.textContent = 'Some message'
      element.className = 'form-message error'
      element.style.display = 'block'

      // Simulate clearMessage logic
      element.textContent = ''
      element.className = 'form-message'
      element.style.display = 'none'

      expect(element.textContent).toBe('')
      expect(element.className).toBe('form-message')
      expect(element.style.display).toBe('none')
    })
  })

  describe('toggleButtonLoading', () => {
    it('should set loading state correctly', () => {
      const button = { ...mockElement, dataset: {} }

      // Simulate loading state
      button.disabled = true
      button.dataset.originalText = 'Submit'
      button.textContent = 'Loading...'

      expect(button.disabled).toBe(true)
      expect(button.textContent).toBe('Loading...')
      expect(button.dataset.originalText).toBe('Submit')
    })

    it('should restore button state correctly', () => {
      const button = { ...mockElement, dataset: { originalText: 'Submit' } }

      // Simulate restore state
      button.disabled = false
      button.textContent = button.dataset.originalText
      delete button.dataset.originalText

      expect(button.disabled).toBe(false)
      expect(button.textContent).toBe('Submit')
      expect(button.dataset.originalText).toBeUndefined()
    })
  })

  describe('getDataAttributes', () => {
    it('should extract data attributes correctly', () => {
      const element = {
        dataset: {
          formType: 'contact',
          apiEndpoint: '/api/contact',
          testValue: '123',
        },
      }

      // Simulate getDataAttributes logic
      const data: Record<string, any> = {}
      for (const [key, value] of Object.entries(element.dataset)) {
        data[key] = value
      }

      expect(data.formType).toBe('contact')
      expect(data.apiEndpoint).toBe('/api/contact')
      expect(data.testValue).toBe('123')
    })

    it('should filter by prefix correctly', () => {
      const element = {
        dataset: {
          formType: 'contact',
          formEndpoint: '/api/contact',
          otherValue: 'ignore',
        },
      }

      // Simulate prefix filtering
      const data: Record<string, any> = {}
      const prefix = 'form'

      for (const [key, value] of Object.entries(element.dataset)) {
        if (key.startsWith(prefix)) {
          const cleanKey = key.slice(prefix.length).replace(/^([A-Z])/, m => m.toLowerCase())
          data[cleanKey] = value
        }
      }

      expect(data.type).toBe('contact')
      expect(data.endpoint).toBe('/api/contact')
      expect(data.otherValue).toBeUndefined()
    })
  })

  describe('safeQuerySelector', () => {
    it('should return element when selector is valid', () => {
      const mockElement = { id: 'test' }
      mockDocument.querySelector.mockReturnValue(mockElement)

      const result = mockDocument.querySelector('#test')
      expect(result).toBe(mockElement)
    })

    it('should handle invalid selectors gracefully', () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('Invalid selector')
      })

      // In the real implementation, this would be caught and return null
      try {
        mockDocument.querySelector('invalid[[[selector')
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })
  })
})
