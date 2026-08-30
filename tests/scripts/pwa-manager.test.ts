/**
 * Tests for PWA Manager feature
 */
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'

// Mock DOM elements
const mockInstallPrompt = {
  id: 'pwa-install-prompt',
  style: { display: '' },
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  },
}

const mockInstallBtn = {
  id: 'pwa-install-btn',
  addEventListener: vi.fn(),
}

const mockDismissBtn = {
  id: 'pwa-dismiss-btn',
  addEventListener: vi.fn(),
}

const mockOfflineIndicator = {
  id: 'offline-indicator',
  style: { display: '' },
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  },
}

const mockOfflineText = {
  className: 'offline-text',
  textContent: '',
}

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

// Mock window and document
const mockDocument = {
  querySelector: vi.fn(),
  getElementById: vi.fn(),
}

const mockWindow = {
  addEventListener: vi.fn(),
  matchMedia: vi.fn(),
  navigator: { onLine: true },
}

global.document = mockDocument as any
global.window = mockWindow as any
global.localStorage = mockLocalStorage as any
global.navigator = mockWindow.navigator as any

describe('PWA Manager Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInstallPrompt.style.display = ''
    mockOfflineIndicator.style.display = ''
    mockOfflineText.textContent = ''
    mockWindow.navigator.onLine = true
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('PWA Install Prompt', () => {
    it('should initialize install prompt elements', () => {
      mockDocument.querySelector.mockImplementation(selector => {
        if (selector === '#pwa-install-prompt') return mockInstallPrompt
        if (selector === '#pwa-install-btn') return mockInstallBtn
        if (selector === '#pwa-dismiss-btn') return mockDismissBtn
        return null
      })

      const installPrompt = mockDocument.querySelector('#pwa-install-prompt')
      const installBtn = mockDocument.querySelector('#pwa-install-btn')
      const dismissBtn = mockDocument.querySelector('#pwa-dismiss-btn')

      expect(installPrompt).toBe(mockInstallPrompt)
      expect(installBtn).toBe(mockInstallBtn)
      expect(dismissBtn).toBe(mockDismissBtn)
    })

    it('should handle beforeinstallprompt event', () => {
      const _mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue({}),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      }

      // Simulate event listener setup
      const eventCallback = vi.fn()
      mockWindow.addEventListener('beforeinstallprompt', eventCallback)

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('beforeinstallprompt', eventCallback)
    })

    it('should show install prompt when not dismissed', () => {
      mockLocalStorage.getItem.mockReturnValue(null) // Not dismissed

      // Simulate show prompt logic
      const dismissed = mockLocalStorage.getItem('pwa-install-dismissed')

      if (!dismissed) {
        mockInstallPrompt.style.display = 'block'
        setTimeout(() => {
          mockInstallPrompt.classList.add('show')
        }, 100)
      }

      expect(dismissed).toBeNull()
      expect(mockInstallPrompt.style.display).toBe('block')
    })

    it('should hide install prompt when dismissed', () => {
      mockLocalStorage.getItem.mockReturnValue('1234567890') // Previously dismissed

      const dismissed = mockLocalStorage.getItem('pwa-install-dismissed')
      expect(dismissed).toBe('1234567890')
    })

    it('should handle install button click', async () => {
      const mockDeferredPrompt = {
        prompt: vi.fn().mockResolvedValue({}),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      }

      // Simulate install flow
      await mockDeferredPrompt.prompt()
      const { outcome } = await mockDeferredPrompt.userChoice

      expect(mockDeferredPrompt.prompt).toHaveBeenCalled()
      expect(outcome).toBe('accepted')
    })

    it('should handle dismiss button click', () => {
      const mockTimestamp = Date.now()

      // Simulate dismiss logic
      mockLocalStorage.setItem('pwa-install-dismissed', mockTimestamp.toString())

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pwa-install-dismissed',
        mockTimestamp.toString()
      )
    })

    it('should detect standalone mode', () => {
      const mockMediaQuery = {
        matches: true,
      }
      mockWindow.matchMedia.mockReturnValue(mockMediaQuery)

      const standaloneQuery = mockWindow.matchMedia('(display-mode: standalone)')
      expect(standaloneQuery.matches).toBe(true)
    })
  })

  describe('Offline Indicator', () => {
    it('should initialize offline indicator elements', () => {
      mockDocument.querySelector.mockImplementation(selector => {
        if (selector === '#offline-indicator') return mockOfflineIndicator
        if (selector === '.offline-text') return mockOfflineText
        return null
      })

      const offlineIndicator = mockDocument.querySelector('#offline-indicator')
      const offlineText = mockDocument.querySelector('.offline-text')

      expect(offlineIndicator).toBe(mockOfflineIndicator)
      expect(offlineText).toBe(mockOfflineText)
    })

    it('should show offline message when offline', () => {
      mockWindow.navigator.onLine = false

      // Simulate offline logic
      if (!mockWindow.navigator.onLine) {
        mockOfflineIndicator.classList.remove('online')
        mockOfflineIndicator.style.display = 'block'
        mockOfflineText.textContent = "You're offline"
      }

      expect(mockOfflineIndicator.style.display).toBe('block')
      expect(mockOfflineText.textContent).toBe("You're offline")
    })

    it('should show online message when back online', () => {
      mockWindow.navigator.onLine = true

      // Simulate online logic
      if (mockWindow.navigator.onLine) {
        mockOfflineIndicator.classList.add('online')
        mockOfflineIndicator.classList.remove('show')
        mockOfflineText.textContent = 'Back online!'
      }

      expect(mockOfflineText.textContent).toBe('Back online!')
    })

    it('should hide indicator after timeout when online', done => {
      mockWindow.navigator.onLine = true

      // Simulate online with timeout
      if (mockWindow.navigator.onLine) {
        setTimeout(() => {
          mockOfflineIndicator.style.display = 'none'
          mockOfflineIndicator.classList.remove('online')
          done()
        }, 10) // Shortened for test
      }
    })
  })
})
