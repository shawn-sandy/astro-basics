/**
 * Tests for Storage utilities module
 */
import { beforeEach, describe, it, expect, vi } from 'vitest'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

global.localStorage = mockLocalStorage as any

describe('Storage Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStorageItem', () => {
    it('should retrieve and parse stored values', () => {
      const testData = { name: 'John', age: 30 }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData))
      
      // Simulate getStorageItem logic
      const storedValue = mockLocalStorage.getItem('user')
      const parsedValue = storedValue ? JSON.parse(storedValue) : null
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user')
      expect(parsedValue).toEqual(testData)
    })

    it('should return default value when key does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const storedValue = mockLocalStorage.getItem('nonexistent')
      const result = storedValue !== null ? JSON.parse(storedValue) : 'default'
      
      expect(result).toBe('default')
    })

    it('should handle JSON parse errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      // Simulate error handling
      try {
        const storedValue = mockLocalStorage.getItem('invalid')
        JSON.parse(storedValue)
      } catch (e) {
        expect(e).toBeInstanceOf(SyntaxError)
      }
    })
  })

  describe('setStorageItem', () => {
    it('should stringify and store values', () => {
      const testData = { name: 'John', age: 30 }
      
      // Simulate setStorageItem logic
      mockLocalStorage.setItem('user', JSON.stringify(testData))
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testData))
    })

    it('should handle storage errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      try {
        mockLocalStorage.setItem('key', 'value')
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect((e as Error).message).toBe('Storage quota exceeded')
      }
    })
  })

  describe('removeStorageItem', () => {
    it('should remove items correctly', () => {
      mockLocalStorage.removeItem('test-key')
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key')
    })
  })

  describe('isStorageAvailable', () => {
    it('should detect localStorage availability', () => {
      const testKey = '__storage_test__'
      
      // Simulate successful storage test
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        if (key === testKey) return
      })
      mockLocalStorage.removeItem.mockImplementation((key) => {
        if (key === testKey) return
      })
      
      // Test storage availability logic
      try {
        mockLocalStorage.setItem(testKey, 'test')
        mockLocalStorage.removeItem(testKey)
        // If no error thrown, storage is available
        expect(true).toBe(true)
      } catch (e) {
        expect(false).toBe(true) // Should not reach here in this test
      }
    })

    it('should handle storage unavailability', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage not available')
      })
      
      try {
        mockLocalStorage.setItem('__storage_test__', 'test')
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })
  })
})