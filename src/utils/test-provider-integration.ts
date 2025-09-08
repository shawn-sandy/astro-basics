/**
 * Provider Integration Test Utility
 *
 * This utility helps test the database provider integration and ensures
 * both Supabase and Turso providers work correctly with the same interface.
 */

import {
  getDatabaseConfigStatus,
  getCommentProvider,
  validateDatabaseConfig,
  getDatabaseConfigDescription,
} from './database-config'

/**
 * Test database provider availability and configuration
 */
export async function testProviderIntegration(): Promise<{
  success: boolean
  provider: string | null
  tests: Array<{ name: string; passed: boolean; error?: string }>
}> {
  const tests: Array<{ name: string; passed: boolean; error?: string }> = []
  let provider: string | null = null

  // Test 1: Configuration Status
  try {
    const configStatus = getDatabaseConfigStatus()
    tests.push({
      name: 'Database Configuration Status',
      passed: configStatus.hasAnyProvider,
      error: !configStatus.hasAnyProvider ? 'No database providers configured' : undefined,
    })

    provider = configStatus.resolvedProvider
  } catch (error) {
    tests.push({
      name: 'Database Configuration Status',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // Test 2: Configuration Validation
  try {
    const validation = validateDatabaseConfig()
    tests.push({
      name: 'Database Configuration Validation',
      passed: validation.isValid,
      error: validation.error,
    })
  } catch (error) {
    tests.push({
      name: 'Database Configuration Validation',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // Test 3: Provider Instantiation
  try {
    const commentProvider = getCommentProvider()
    tests.push({
      name: 'Provider Instantiation',
      passed: commentProvider !== null,
      error: !commentProvider ? 'Provider could not be instantiated' : undefined,
    })

    // Test 4: Provider Availability Check
    if (commentProvider) {
      try {
        const isAvailable = await commentProvider.checkAvailability()
        tests.push({
          name: 'Provider Availability Check',
          passed: isAvailable,
          error: !isAvailable ? 'Provider reported as unavailable' : undefined,
        })
      } catch (error) {
        tests.push({
          name: 'Provider Availability Check',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Test 5: Provider Name
      try {
        const providerName = commentProvider.getProviderName()
        tests.push({
          name: 'Provider Name Retrieval',
          passed: typeof providerName === 'string' && providerName.length > 0,
          error: typeof providerName !== 'string' ? 'Provider name is not a string' : undefined,
        })
      } catch (error) {
        tests.push({
          name: 'Provider Name Retrieval',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  } catch (error) {
    tests.push({
      name: 'Provider Instantiation',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  const success = tests.every(test => test.passed)

  return {
    success,
    provider,
    tests,
  }
}

/**
 * Get detailed provider information for debugging
 */
export function getProviderInfo(): {
  description: string
  configStatus: ReturnType<typeof getDatabaseConfigStatus>
  validation: ReturnType<typeof validateDatabaseConfig>
} {
  return {
    description: getDatabaseConfigDescription(),
    configStatus: getDatabaseConfigStatus(),
    validation: validateDatabaseConfig(),
  }
}

/**
 * Log provider test results to console
 */
export async function logProviderTestResults(): Promise<void> {
  console.log('🧪 Testing Provider Integration...\n')

  const info = getProviderInfo()
  console.log('📊 Provider Info:')
  console.log(`   Description: ${info.description}`)
  console.log(`   Selected: ${info.configStatus.selectedProvider}`)
  console.log(`   Resolved: ${info.configStatus.resolvedProvider}`)
  console.log(`   Has Any Provider: ${info.configStatus.hasAnyProvider}`)
  console.log(`   Is Ready: ${info.configStatus.isReady}`)
  console.log('')

  console.log('🔧 Configuration Status:')
  console.log(
    `   Supabase - Configured: ${info.configStatus.supabase.configured}, Available: ${info.configStatus.supabase.available}`
  )
  console.log(
    `   Turso - Configured: ${info.configStatus.turso.configured}, Available: ${info.configStatus.turso.available}`
  )
  console.log('')

  const testResults = await testProviderIntegration()

  console.log('🧪 Test Results:')
  testResults.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌'
    console.log(`   ${status} ${test.name}`)
    if (test.error) {
      console.log(`      Error: ${test.error}`)
    }
  })
  console.log('')

  const overallStatus = testResults.success ? '✅ PASS' : '❌ FAIL'
  console.log(`🎯 Overall: ${overallStatus}`)
  if (testResults.provider) {
    console.log(`📦 Active Provider: ${testResults.provider}`)
  }
}
