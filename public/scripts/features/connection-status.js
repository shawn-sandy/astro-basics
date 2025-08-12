/**
 * Connection Status Manager
 * Handles offline page functionality and connection monitoring
 */

/**
 * Initializes connection status monitoring for offline page
 */
export function initConnectionStatus() {
  // Auto-reload when connection is restored
  window.addEventListener('online', () => {
    window.location.reload();
  });

  // Update visual connection indicator
  updateConnectionIndicator();
  window.addEventListener('online', updateConnectionIndicator);
  window.addEventListener('offline', updateConnectionIndicator);
}

/**
 * Updates the visual connection status indicator
 */
function updateConnectionIndicator() {
  if (navigator.onLine) {
    document.body.style.borderTop = '3px solid #10b981';
  } else {
    document.body.style.borderTop = '3px solid #ef4444';
  }
}

/**
 * Handles manual page refresh
 */
export function handleRefresh() {
  window.location.reload();
}