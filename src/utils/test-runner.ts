/**
 * Comprehensive Test Runner for Turso Comments System
 *
 * This utility runs all available tests to validate the complete
 * multi-provider comment system implementation.
 */

import { checkCommentSystemAvailability } from './comments-availability'
import { getDatabaseConfigDescription, getDatabaseConfigStatus } from './database-config'
import { logMigrationTestResults } from './test-migrations'
import { logProviderTestResults } from './test-provider-integration'

/**
 * Comprehensive system validation
 */
export interface SystemValidationResult {
  timestamp: string
  provider: string | null
  availability: {
    enabled: boolean
    reason?: string
    provider?: string | null
  }
  configuration: {
    description: string
    hasAnyProvider: boolean
    isReady: boolean
    selectedProvider: string
    resolvedProvider: string | null
  }
  overallHealth: 'healthy' | 'degraded' | 'unhealthy'
  recommendations: string[]
}

/**
 * Run comprehensive system validation
 */
export async function validateSystem(): Promise<SystemValidationResult> {
  const timestamp = new Date().toISOString()
  const recommendations: string[] = []

  // Check availability
  const availability = await checkCommentSystemAvailability()

  // Check configuration
  const configStatus = getDatabaseConfigStatus()
  const configDescription = getDatabaseConfigDescription()

  // Determine overall health
  let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  if (!availability.enabled) {
    overallHealth = 'unhealthy'
    recommendations.push(
      'Comment system is disabled. Check database configuration and connectivity.'
    )
  } else if (!configStatus.isReady) {
    overallHealth = 'degraded'
    recommendations.push(
      'Database configuration issues detected. Some features may not work properly.'
    )
  }

  if (!configStatus.hasAnyProvider) {
    recommendations.push(
      'No database providers configured. Set up Supabase or Turso environment variables.'
    )
  }

  if (configStatus.supabase.configured && !configStatus.supabase.available) {
    recommendations.push(
      'Supabase is configured but unavailable. Check credentials and network connectivity.'
    )
  }

  if (configStatus.turso.configured && !configStatus.turso.available) {
    recommendations.push(
      'Turso is configured but unavailable. Check credentials and network connectivity.'
    )
  }

  if (recommendations.length === 0 && overallHealth === 'healthy') {
    recommendations.push('System is healthy and ready for use.')
  }

  return {
    timestamp,
    provider: configStatus.resolvedProvider,
    availability: {
      enabled: availability.enabled,
      reason: availability.reason,
      provider: availability.provider,
    },
    configuration: {
      description: configDescription,
      hasAnyProvider: configStatus.hasAnyProvider,
      isReady: configStatus.isReady,
      selectedProvider: configStatus.selectedProvider,
      resolvedProvider: configStatus.resolvedProvider,
    },
    overallHealth,
    recommendations,
  }
}

/**
 * Run all tests with detailed logging
 */
export async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Comprehensive Test Suite for Turso Comments System')
  console.log('='.repeat(70))
  console.log('')

  // System validation overview
  console.log('📊 System Validation Overview')
  console.log('-'.repeat(35))

  const validation = await validateSystem()

  console.log(`🕐 Timestamp: ${validation.timestamp}`)
  console.log(
    `🎯 Overall Health: ${getHealthIcon(validation.overallHealth)} ${validation.overallHealth.toUpperCase()}`
  )
  console.log(`📦 Active Provider: ${validation.provider || 'None'}`)
  console.log(`🔧 Configuration: ${validation.configuration.description}`)
  console.log(`⚡ System Available: ${validation.availability.enabled ? '✅ Yes' : '❌ No'}`)

  if (validation.availability.reason) {
    console.log(`📋 Availability Reason: ${validation.availability.reason}`)
  }

  console.log('')

  console.log('💡 Recommendations:')
  validation.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`)
  })
  console.log('')

  // Run individual test suites
  console.log('🧪 Test Suites')
  console.log('-'.repeat(20))
  console.log('')

  // Provider integration tests
  await logProviderTestResults()
  console.log('')

  // Migration and schema tests
  await logMigrationTestResults()
  console.log('')

  // Final summary
  console.log('📋 Test Suite Complete')
  console.log('='.repeat(30))

  const finalHealth = getHealthIcon(validation.overallHealth)
  console.log(`${finalHealth} System Status: ${validation.overallHealth.toUpperCase()}`)

  if (validation.overallHealth === 'healthy') {
    console.log('🎉 All systems operational! The Turso comments system is ready for production.')
  } else if (validation.overallHealth === 'degraded') {
    console.log('⚠️  System operational with issues. Review recommendations above.')
  } else {
    console.log('🚨 System not operational. Critical issues must be resolved.')
  }

  console.log('')
}

/**
 * Get health status icon
 */
function getHealthIcon(health: 'healthy' | 'degraded' | 'unhealthy'): string {
  switch (health) {
    case 'healthy':
      return '💚'
    case 'degraded':
      return '💛'
    case 'unhealthy':
      return '💔'
    default:
      return '❓'
  }
}

/**
 * Quick health check (minimal output)
 */
export async function quickHealthCheck(): Promise<boolean> {
  const validation = await validateSystem()

  if (validation.overallHealth === 'healthy') {
    console.log('💚 System Healthy')
    return true
  } else {
    console.log(`${getHealthIcon(validation.overallHealth)} System ${validation.overallHealth}`)
    console.log('Run `npm run test:comments:full` for detailed diagnostics')
    return false
  }
}

// Export validation result for use in other modules
export type { SystemValidationResult }
