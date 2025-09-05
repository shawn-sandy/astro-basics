/**
 * UI utilities module
 * Provides DOM manipulation and progressive enhancement utilities
 */

/**
 * Shows a message in a target element
 * @param {HTMLElement} element - Target element
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'} type - Message type
 */
export function showMessage(element, message, type = 'info') {
  if (!element) return

  element.textContent = message
  element.className = `form-message ${type}`
  element.style.display = 'block'
}

/**
 * Clears messages from a target element
 * @param {HTMLElement} element - Target element
 */
export function clearMessage(element) {
  if (!element) return

  element.textContent = ''
  element.className = 'form-message'
  element.style.display = 'none'
}

/**
 * Toggles button loading state
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} loading - Loading state
 * @param {string} loadingText - Text to show when loading
 * @param {string} defaultText - Default button text
 */
export function toggleButtonLoading(button, loading, loadingText = 'Loading...', defaultText = '') {
  if (!button) return

  if (loading) {
    button.disabled = true
    button.dataset.originalText = button.textContent
    button.textContent = loadingText
  } else {
    button.disabled = false
    button.textContent = button.dataset.originalText || defaultText
    delete button.dataset.originalText
  }
}

/**
 * Gets data attributes from an element
 * @param {HTMLElement} element - Target element
 * @param {string} prefix - Data attribute prefix (without 'data-')
 * @returns {Object} Object with data attribute values
 */
export function getDataAttributes(element, prefix = '') {
  if (!element) return {}

  const data = {}
  const attrs = element.dataset

  for (const [key, value] of Object.entries(attrs)) {
    if (!prefix || key.startsWith(prefix)) {
      const cleanKey = prefix
        ? key.startsWith(prefix)
          ? key.slice(prefix.length).replace(/^([A-Z])/, m => m.toLowerCase())
          : key
        : key
      data[cleanKey] = value
    }
  }

  return data
}

/**
 * Safely query selector with null check
 * @param {string} selector - CSS selector
 * @param {Document|HTMLElement} context - Search context
 * @returns {HTMLElement|null}
 */
export function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector)
  } catch (e) {
    console.warn(`Invalid selector: ${selector}`, e)
    return null
  }
}

/**
 * Safely query all with null check
 * @param {string} selector - CSS selector
 * @param {Document|HTMLElement} context - Search context
 * @returns {NodeList|[]}
 */
export function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector)
  } catch (e) {
    console.warn(`Invalid selector: ${selector}`, e)
    return []
  }
}
