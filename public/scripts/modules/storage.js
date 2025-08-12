/**
 * Storage utilities module
 * Provides safe localStorage operations with fallbacks
 */

/**
 * Safely gets an item from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} Stored value or default
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Error reading from localStorage for key "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Safely sets an item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Error writing to localStorage for key "${key}":`, e);
    return false;
  }
}

/**
 * Safely removes an item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Error removing from localStorage for key "${key}":`, e);
    return false;
  }
}

/**
 * Checks if localStorage is available
 * @returns {boolean} Storage availability
 */
export function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, 'test');
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}