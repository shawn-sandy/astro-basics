/**
 * Supabase Test Manager
 * Handles testing functionality for Supabase integration
 */
import { apiRequest } from '../modules/api.js'
import { toggleButtonLoading, safeQuerySelector } from '../modules/ui.js'

/**
 * Initializes Supabase test functionality
 */
export function initSupabaseTest() {
  const connectionButton = safeQuerySelector('#testConnection')
  const queryButton = safeQuerySelector('#testQuery')
  const connectionResult = safeQuerySelector('#connectionResult')
  const queryResult = safeQuerySelector('#queryResult')

  if (!connectionButton || !queryButton || !connectionResult || !queryResult) {
    console.warn('Supabase test missing required elements')
    return
  }

  connectionButton.addEventListener('click', () =>
    testConnection(connectionButton, connectionResult)
  )
  queryButton.addEventListener('click', () => testQuery(queryButton, queryResult))
}

/**
 * Tests Supabase connection
 * @param {HTMLButtonElement} button - Test button
 * @param {HTMLElement} resultDiv - Result display element
 */
async function testConnection(button, resultDiv) {
  toggleButtonLoading(button, true, 'Testing...', 'Test Connection')

  resultDiv.className = 'result-box'
  resultDiv.textContent = 'Testing connection...'

  try {
    const { data, error, success } = await apiRequest('/api/supabase-test')

    resultDiv.textContent = JSON.stringify(data || { error }, null, 2)
    resultDiv.className = `result-box ${success ? 'success' : 'error'}`
  } catch (err) {
    resultDiv.textContent = `Error: ${err.message}`
    resultDiv.className = 'result-box error'
  } finally {
    toggleButtonLoading(button, false, 'Testing...', 'Test Connection')
  }
}

/**
 * Tests Supabase query functionality
 * @param {HTMLButtonElement} button - Test button
 * @param {HTMLElement} resultDiv - Result display element
 */
async function testQuery(button, resultDiv) {
  toggleButtonLoading(button, true, 'Testing...', 'Test Query')

  resultDiv.className = 'result-box'
  resultDiv.textContent = 'Testing query...'

  try {
    const { data, error, success } = await apiRequest('/api/supabase-test', {
      method: 'POST',
      body: JSON.stringify({ action: 'test-query' }),
    })

    resultDiv.textContent = JSON.stringify(data || { error }, null, 2)
    resultDiv.className = `result-box ${success ? 'success' : 'error'}`
  } catch (err) {
    resultDiv.textContent = `Error: ${err.message}`
    resultDiv.className = 'result-box error'
  } finally {
    toggleButtonLoading(button, false, 'Testing...', 'Test Query')
  }
}
