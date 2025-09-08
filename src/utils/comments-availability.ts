/**
 * Comment system availability checker
 * Determines if the comment system can be enabled based on environment and database configuration
 *
 * Supports multiple database providers (Supabase and Turso) through
 * the database configuration system. Provides detailed status information
 * for debugging and monitoring.
 */

import {
  getDatabaseConfigStatus,
  getCommentProvider,
  getDatabaseProvider,
  getResolvedProvider,
  type DatabaseProvider,
} from './database-config'

interface CommentSystemStatus {
  enabled: boolean
  provider?: DatabaseProvider | null
  reason?: string | undefined
  details?: {
    hasAnyProvider: boolean
    hasWorkingProvider: boolean
    providerStatus: {
      supabase: { configured: boolean; available: boolean }
      turso: { configured: boolean; available: boolean }
    }
    selectedProvider: DatabaseProvider
    resolvedProvider: DatabaseProvider | null
  }
}

// Cache for availability check (to avoid repeated database queries and provider instantiation)
let cachedStatus: CommentSystemStatus | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Test if a comment provider can be instantiated and is working
 */
async function testProviderAvailability(provider: unknown): Promise<boolean> {
  if (!provider || typeof provider !== 'object') {
    return false
  }

  const providerObj = provider as {
    checkAvailability?: () => Promise<boolean>
    getProviderName?: () => string
  }

  try {
    // Test the provider's availability check method
    if (typeof providerObj.checkAvailability === 'function') {
      const available = await providerObj.checkAvailability()
      return available
    }
    return false
  } catch (error) {
    console.warn(
      `Provider availability check failed for ${providerObj.getProviderName?.() || 'unknown'}:`,
      error instanceof Error ? error.message : 'Unknown error'
    )
    return false
  }
}

/**
 * Comprehensive check for comment system availability
 */
export async function checkCommentSystemAvailability(
  _context?: unknown
): Promise<CommentSystemStatus> {
  // Return cached result if still valid
  const now = Date.now()
  if (cachedStatus && now - cacheTimestamp < CACHE_DURATION) {
    return cachedStatus
  }

  // Get database configuration status
  const configStatus = getDatabaseConfigStatus()
  const provider = getCommentProvider()
  const selectedProvider = getDatabaseProvider()
  const resolvedProvider = getResolvedProvider()

  // Test provider availability if one exists
  let providerAvailable = false
  if (provider) {
    providerAvailable = await testProviderAvailability(provider)
  }

  const enabled = configStatus.hasAnyProvider && configStatus.isReady && providerAvailable

  const status: CommentSystemStatus = {
    enabled,
    provider: resolvedProvider,
    reason: enabled ? undefined : getDisabledReason(configStatus, providerAvailable),
    details: {
      hasAnyProvider: configStatus.hasAnyProvider,
      hasWorkingProvider: providerAvailable,
      providerStatus: {
        supabase: configStatus.supabase,
        turso: configStatus.turso,
      },
      selectedProvider,
      resolvedProvider,
    },
  }

  // Cache the result
  cachedStatus = status
  cacheTimestamp = now

  return status
}

/**
 * Get human-readable reason for disabled comments
 */
function getDisabledReason(
  configStatus: {
    hasAnyProvider: boolean
    isReady: boolean
    selectedProvider: string
    resolvedProvider: string | null
  },
  providerAvailable: boolean
): string {
  if (!configStatus.hasAnyProvider) {
    return 'No database providers configured. Set up either Supabase or Turso environment variables.'
  }

  if (!configStatus.isReady) {
    const selectedProvider = configStatus.selectedProvider
    if (selectedProvider === 'supabase') {
      return 'Supabase configuration incomplete. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    } else if (selectedProvider === 'turso') {
      return 'Turso configuration incomplete. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.'
    } else {
      return `Database provider '${selectedProvider}' is not properly configured.`
    }
  }

  if (!providerAvailable) {
    const resolvedProvider = configStatus.resolvedProvider
    if (resolvedProvider === 'supabase') {
      return 'Cannot connect to Supabase database. Check your credentials and network connection.'
    } else if (resolvedProvider === 'turso') {
      return 'Cannot connect to Turso database. Check your credentials and network connection.'
    } else {
      return 'Database provider is not available. Check your database connection.'
    }
  }

  return 'Comment system is not available'
}

/**
 * Quick synchronous check (uses cached result or basic environment check)
 */
export function isCommentSystemLikelyAvailable(): boolean {
  // If we have a cached result, use it
  if (cachedStatus && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedStatus.enabled
  }

  // Otherwise, do basic checks without database query
  const configStatus = getDatabaseConfigStatus()
  return configStatus.hasAnyProvider && configStatus.isReady
}

/**
 * Clear the availability cache (useful for testing or after configuration changes)
 */
export function clearCommentSystemCache(): void {
  cachedStatus = null
  cacheTimestamp = 0
}

/**
 * Get status for administrative/debugging purposes
 */
export function getCommentSystemCacheStatus(): {
  cached: boolean
  timestamp: number
  status: CommentSystemStatus | null
} {
  return {
    cached: cachedStatus !== null,
    timestamp: cacheTimestamp,
    status: cachedStatus,
  }
}
