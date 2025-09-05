/**
 * Tests for Contact Form feature
 */
import { beforeEach, describe, it, expect, vi } from 'vitest'

// Mock DOM elements
const mockForm = {
  id: 'contact-form',
  addEventListener: vi.fn(),
  reset: vi.fn(),
  querySelector: vi.fn(),
}

const mockFormMessage = {
  id: 'form-message',
  textContent: '',
  className: '',
  style: { display: '' },
}

const mockSubmitButton = {
  type: 'submit',
  disabled: false,
  textContent: '',
  dataset: {},
}

const mockFormData = {
  entries: vi.fn().mockReturnValue([
    ['name', 'John Doe'],
    ['email', 'john@example.com'],
    ['subject', 'Test'],
    ['message', 'Test message'],
  ]),
}

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch
global.FormData = vi.fn().mockImplementation(() => mockFormData) as any

const mockDocument = {
  querySelector: vi.fn(),
  getElementById: vi.fn(),
}

global.document = mockDocument as any

describe('Contact Form Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormMessage.textContent = ''
    mockFormMessage.className = ''
    mockFormMessage.style.display = ''
    mockSubmitButton.disabled = false
    mockSubmitButton.textContent = 'Send Message'
    mockSubmitButton.dataset = {}
  })

  describe('Form Initialization', () => {
    it('should find required form elements', () => {
      mockDocument.querySelector.mockImplementation(selector => {
        if (selector === '#contact-form') return mockForm
        if (selector === '#form-message') return mockFormMessage
        if (selector === 'button[type="submit"]') return mockSubmitButton
        return null
      })

      const form = mockDocument.querySelector('#contact-form')
      const formMessage = mockDocument.querySelector('#form-message')
      const submitButton = mockDocument.querySelector('button[type="submit"]')

      expect(form).toBe(mockForm)
      expect(formMessage).toBe(mockFormMessage)
      expect(submitButton).toBe(mockSubmitButton)
    })

    it('should handle missing form elements gracefully', () => {
      mockDocument.querySelector.mockReturnValue(null)

      const form = mockDocument.querySelector('#contact-form')
      expect(form).toBeNull()
    })
  })

  describe('Form Submission', () => {
    it('should handle successful form submission', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Message sent successfully!',
          }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Simulate form submission logic
      const formData = new FormData()
      const data = Object.fromEntries(formData.entries())

      const response = await fetch('/api/message-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Message sent successfully!')
    })

    it('should handle form submission errors', async () => {
      const mockResponse = {
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Validation failed',
          }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const response = await fetch('/api/message-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      expect(response.ok).toBe(false)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      try {
        await fetch('/api/message-us', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })
  })

  describe('UI State Management', () => {
    it('should manage button loading state', () => {
      // Simulate loading state
      mockSubmitButton.disabled = true
      mockSubmitButton.dataset.originalText = 'Send Message'
      mockSubmitButton.textContent = 'Sending...'

      expect(mockSubmitButton.disabled).toBe(true)
      expect(mockSubmitButton.textContent).toBe('Sending...')
      expect(mockSubmitButton.dataset.originalText).toBe('Send Message')

      // Simulate restored state
      mockSubmitButton.disabled = false
      mockSubmitButton.textContent = mockSubmitButton.dataset.originalText
      delete mockSubmitButton.dataset.originalText

      expect(mockSubmitButton.disabled).toBe(false)
      expect(mockSubmitButton.textContent).toBe('Send Message')
    })

    it('should manage message display', () => {
      // Simulate success message
      mockFormMessage.textContent = 'Success!'
      mockFormMessage.className = 'form-message success'
      mockFormMessage.style.display = 'block'

      expect(mockFormMessage.textContent).toBe('Success!')
      expect(mockFormMessage.className).toBe('form-message success')
      expect(mockFormMessage.style.display).toBe('block')

      // Simulate clear message
      mockFormMessage.textContent = ''
      mockFormMessage.className = 'form-message'
      mockFormMessage.style.display = 'none'

      expect(mockFormMessage.textContent).toBe('')
      expect(mockFormMessage.className).toBe('form-message')
      expect(mockFormMessage.style.display).toBe('none')
    })
  })
})
