/**
 * Comment system availability checker
 * Determines if the comment system can be enabled based on environment and database configuration
 */

import { getAuthenticatedSupabase } from '#libs/supabase-server'

interface CommentSystemStatus {
  enabled: boolean
  reason?: string
  details?: {
    hasEnvironment: boolean
    hasDatabase: boolean
    hasCommentsTable: boolean
  }
}

// Cache for availability check (to avoid repeated database queries)
let cachedStatus: CommentSystemStatus | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Check if required environment variables are configured
 */
function hasRequiredEnvironment(): boolean {
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '')
}

/**
 * Check if the comments table exists and is accessible
 */
async function hasCommentsTable(context?: unknown): Promise<boolean> {
  try {
    const supabase = context
      ? await getAuthenticatedSupabase(context)
      : await getAuthenticatedSupabase({
          locals: {
            userId: undefined,
            clerkToken: undefined,
          },
        })

    if (!supabase) {
      return false
    }

    // Try to query the comments table structure
    const { error } = await supabase.from('comments').select('id').limit(1)

    // If no error, table exists and is accessible
    return !error || error.code !== 'PGRST116' // PGRST116 = relation not found
  } catch (error) {
    console.warn(
      'Comments table check failed:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return false
  }
}

/**
 * Comprehensive check for comment system availability
 */
export async function checkCommentSystemAvailability(
  context?: unknown
): Promise<CommentSystemStatus> {
  // Return cached result if still valid
  const now = Date.now()
  if (cachedStatus && now - cacheTimestamp < CACHE_DURATION) {
    return cachedStatus
  }

  const hasEnvironment = hasRequiredEnvironment()

  // If environment is missing, don't check database
  if (!hasEnvironment) {
    const status: CommentSystemStatus = {
      enabled: false,
      reason: 'Supabase environment variables not configured',
      details: {
        hasEnvironment: false,
        hasDatabase: false,
        hasCommentsTable: false,
      },
    }

    cachedStatus = status
    cacheTimestamp = now
    return status
  }

  // Check database and table availability
  const hasDatabase = true // If env vars exist, assume database exists
  const hasTable = await hasCommentsTable(context)

  const enabled = hasEnvironment && hasDatabase && hasTable
  const status: CommentSystemStatus = {
    enabled,
    reason: enabled ? undefined : getDisabledReason(hasEnvironment, hasDatabase, hasTable),
    details: {
      hasEnvironment,
      hasDatabase,
      hasCommentsTable: hasTable,
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
function getDisabledReason(hasEnv: boolean, hasDb: boolean, hasTable: boolean): string {
  if (!hasEnv) {
    return 'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables'
  }
  if (!hasDb) {
    return 'Cannot connect to Supabase database'
  }
  if (!hasTable) {
    return 'Comments table not found in database. Run the migration: npm run db:migrate'
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
  return hasRequiredEnvironment()
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
