/**
 * Main initialization script
 * Progressive enhancement entry point
 */
import { initContactForm } from './features/contact-form.js'
import { initPWAInstallPrompt, initOfflineIndicator } from './features/pwa-manager.js'
import { initConnectionStatus } from './features/connection-status.js'
import { initSupabaseTest } from './features/supabase-test.js'

/**
 * Initialize all features based on what elements are present
 */
function initializeFeatures() {
  // Contact form (message-us page)
  if (document.getElementById('contact-form')) {
    initContactForm()
  }

  // PWA install prompt
  if (document.getElementById('pwa-install-prompt')) {
    initPWAInstallPrompt()
  }

  // Offline indicator
  if (document.getElementById('offline-indicator')) {
    initOfflineIndicator()
  }

  // Connection status (offline page)
  const isOfflinePage = document
    .querySelector('section[data-flex*="center"]')
    ?.textContent?.includes("You're Offline")
  if (isOfflinePage) {
    initConnectionStatus()
  }

  // Supabase test page
  if (document.getElementById('testConnection')) {
    initSupabaseTest()
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFeatures)
} else {
  initializeFeatures()
}
