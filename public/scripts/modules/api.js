/**
 * API utilities module
 * Provides secure fetch utilities with error handling
 */

/**
 * Makes a secure API request with proper error handling
 * @param {string} url - The API endpoint
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{data?: any, error?: string, success: boolean}>}
 */
export async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { data, success: true };
    } else {
      return { 
        error: data.error || 'Request failed', 
        success: false 
      };
    }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Network error', 
      success: false 
    };
  }
}

/**
 * Posts form data to an API endpoint
 * @param {string} url - The API endpoint
 * @param {FormData|Object} formData - Form data to send
 * @returns {Promise<{data?: any, error?: string, success: boolean}>}
 */
export async function postForm(url, formData) {
  let body;
  
  if (formData instanceof FormData) {
    body = JSON.stringify(Object.fromEntries(formData.entries()));
  } else {
    body = JSON.stringify(formData);
  }

  return apiRequest(url, {
    method: 'POST',
    body,
  });
}