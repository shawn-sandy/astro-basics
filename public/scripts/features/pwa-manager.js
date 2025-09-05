/**
 * PWA Manager
 * Handles PWA installation prompts and offline indicators
 */
import { getStorageItem, setStorageItem } from '../modules/storage.js'
import { safeQuerySelector } from '../modules/ui.js'

/**
 * Initializes PWA install prompt functionality
 */
export function initPWAInstallPrompt() {
  const installPrompt = safeQuerySelector('#pwa-install-prompt')
  if (!installPrompt) return

  const installBtn = safeQuerySelector('#pwa-install-btn')
  const dismissBtn = safeQuerySelector('#pwa-dismiss-btn')

  if (!installBtn || !dismissBtn) {
    console.warn('PWA install prompt missing required buttons')
    return
  }

  let deferredPrompt = null

  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e

    // Check if user has previously dismissed the prompt
    const dismissed = getStorageItem('pwa-install-dismissed')
    if (!dismissed) {
      showInstallPrompt()
    }
  })

  // Handle install button click
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      console.log(
        outcome === 'accepted'
          ? 'User accepted the install prompt'
          : 'User dismissed the install prompt'
      )

      deferredPrompt = null
      hideInstallPrompt()
    }
  })

  // Handle dismiss button click
  dismissBtn.addEventListener('click', () => {
    setStorageItem('pwa-install-dismissed', Date.now())
    hideInstallPrompt()
  })

  // Listen for app installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed')
    hideInstallPrompt()
  })

  // Check if app is already installed
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    console.log('App is running in standalone mode')
  }

  function showInstallPrompt() {
    installPrompt.style.display = 'block'
    setTimeout(() => {
      installPrompt.classList.add('show')
    }, 100)
  }

  function hideInstallPrompt() {
    installPrompt.classList.remove('show')
    setTimeout(() => {
      installPrompt.style.display = 'none'
    }, 300)
  }
}

/**
 * Initializes offline indicator functionality
 */
export function initOfflineIndicator() {
  const offlineIndicator = safeQuerySelector('#offline-indicator')
  if (!offlineIndicator) return

  const offlineText = safeQuerySelector('.offline-text', offlineIndicator)
  if (!offlineText) {
    console.warn('Offline indicator missing text element')
    return
  }

  function updateConnectionStatus() {
    if (navigator.onLine) {
      // Show brief online message
      offlineIndicator.classList.add('online')
      offlineIndicator.classList.remove('show')
      offlineText.textContent = 'Back online!'

      // Hide after 2 seconds
      setTimeout(() => {
        offlineIndicator.style.display = 'none'
        offlineIndicator.classList.remove('online')
      }, 2000)
    } else {
      // Show offline message
      offlineIndicator.classList.remove('online')
      offlineIndicator.style.display = 'block'
      offlineText.textContent = "You're offline"

      setTimeout(() => {
        offlineIndicator.classList.add('show')
      }, 100)
    }
  }

  // Listen for online/offline events
  window.addEventListener('online', updateConnectionStatus)
  window.addEventListener('offline', updateConnectionStatus)

  // Check initial status
  updateConnectionStatus()
}
