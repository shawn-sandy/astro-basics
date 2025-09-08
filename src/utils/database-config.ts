/**
 * Database Configuration for Comments System
 * 
 * This module handles the selection and instantiation of database providers
 * for the comment system. It supports automatic detection based on environment
 * variables or explicit configuration via DATABASE_PROVIDER.
 * 
 * Supported providers:
 * - supabase: PostgreSQL with Row-Level Security
 * - turso: SQLite/LibSQL with application-level security
 * - auto: Automatic detection based on available configuration
 */

import type { CommentDatabaseProvider } from '../libs/database-provider'
import { SupabaseCommentProvider } from '../libs/providers/supabase-comments'
import { TursoCommentProvider } from '../libs/providers/turso-comments'
import { validateSupabaseConfig } from '../libs/supabase-server'
import { isTursoConfigured } from '../libs/turso'

/**
 * Available database provider types
 */
export type DatabaseProvider = 'supabase' | 'turso' | 'auto'

/**
 * Database configuration status for debugging and monitoring
 */
export type DatabaseConfigStatus = {
  selectedProvider: DatabaseProvider
  resolvedProvider: DatabaseProvider | null
  supabase: {
    configured: boolean
    available: boolean
  }
  turso: {
    configured: boolean
    available: boolean
  }
  hasAnyProvider: boolean
  isReady: boolean
}

/**
 * Check if Supabase is configured with required environment variables
 */
export function hasSupabaseConfig(): boolean {
  return validateSupabaseConfig()
}

/**
 * Check if Turso is configured with required environment variables
 */
export function hasTursoConfig(): boolean {
  return isTursoConfigured()
}

/**
 * Determine which database provider to use
 * 
 * Priority order:
 * 1. Explicit DATABASE_PROVIDER environment variable
 * 2. Auto-detection: Supabase first, then Turso
 * 3. Return 'auto' if no providers configured
 */
export function getDatabaseProvider(): DatabaseProvider {
  const explicitProvider = import.meta.env.DATABASE_PROVIDER as DatabaseProvider

  // If explicitly configured, validate and use it
  if (explicitProvider === 'supabase' || explicitProvider === 'turso') {
    return explicitProvider
  }

  // Auto-detection: prioritize Supabase (existing default)
  if (hasSupabaseConfig()) {
    return 'supabase'
  }
  
  if (hasTursoConfig()) {
    return 'turso'
  }

  // No database configured - return 'auto' to indicate detection attempted
  return 'auto'
}

/**
 * Get the resolved provider name (what will actually be used)
 * 
 * This differs from getDatabaseProvider() in that it returns null
 * when no valid provider can be instantiated, rather than 'auto'.
 */
export function getResolvedProvider(): DatabaseProvider | null {
  const provider = getDatabaseProvider()

  switch (provider) {
    case 'supabase':
      return hasSupabaseConfig() ? 'supabase' : null
    case 'turso':
      return hasTursoConfig() ? 'turso' : null
    case 'auto':
      // Auto-detection failed
      return null
    default:
      return null
  }
}

/**
 * Create and return a configured comment provider instance
 * 
 * This is the main factory function used by the API endpoints.
 * Returns null if no valid provider can be created.
 */
export function getCommentProvider(): CommentDatabaseProvider | null {
  const provider = getDatabaseProvider()

  try {
    switch (provider) {
      case 'supabase':
        if (!hasSupabaseConfig()) {
          console.warn('Supabase provider selected but configuration is missing')
          return null
        }
        return new SupabaseCommentProvider()

      case 'turso':
        if (!hasTursoConfig()) {
          console.warn('Turso provider selected but configuration is missing')
          return null
        }
        return new TursoCommentProvider()

      case 'auto':
        // No provider configured
        console.info('No database provider configured for comments system')
        return null

      default:
        console.warn(`Unknown database provider: ${provider}`)
        return null
    }
  } catch (error) {
    console.error('Failed to create comment provider:', error)
    return null
  }
}

/**
 * Get comprehensive configuration status for debugging and monitoring
 * 
 * Useful for health checks, debugging, and administrative interfaces.
 */
export function getDatabaseConfigStatus(): DatabaseConfigStatus {
  const selectedProvider = getDatabaseProvider()
  const resolvedProvider = getResolvedProvider()
  const supabaseConfigured = hasSupabaseConfig()
  const tursoConfigured = hasTursoConfig()

  return {
    selectedProvider,
    resolvedProvider,
    supabase: {
      configured: supabaseConfigured,
      available: supabaseConfigured, // Could add connection test here
    },
    turso: {
      configured: tursoConfigured,
      available: tursoConfigured, // Could add connection test here
    },
    hasAnyProvider: supabaseConfigured || tursoConfigured,
    isReady: resolvedProvider !== null,
  }
}

/**
 * Validate that the current configuration can provide a working comment provider
 * 
 * @returns Object with validation result and optional error message
 */
export function validateDatabaseConfig(): {
  isValid: boolean
  provider: DatabaseProvider | null
  error?: string
} {
  const status = getDatabaseConfigStatus()

  if (!status.hasAnyProvider) {
    return {
      isValid: false,
      provider: null,
      error: 'No database providers configured. Set up either Supabase or Turso environment variables.',
    }
  }

  if (!status.isReady) {
    return {
      isValid: false,
      provider: status.selectedProvider,
      error: `Selected provider '${status.selectedProvider}' is not properly configured.`,
    }
  }

  return {
    isValid: true,
    provider: status.resolvedProvider,
  }
}

/**
 * Helper function to check if comments are available
 * 
 * This is a quick check that can be used by components to determine
 * if they should render comment-related UI.
 */
export function areCommentsAvailable(): boolean {
  return getCommentProvider() !== null
}

/**
 * Get a human-readable description of the current database configuration
 * 
 * Useful for admin panels, debug output, and user-facing status messages.
 */
export function getDatabaseConfigDescription(): string {
  const status = getDatabaseConfigStatus()

  if (!status.hasAnyProvider) {
    return 'No database providers configured'
  }

  if (!status.isReady) {
    return `Database provider '${status.selectedProvider}' is configured but not available`
  }

  const providerName = status.resolvedProvider === 'supabase' ? 'Supabase (PostgreSQL)' : 'Turso (LibSQL/SQLite)'
  const configSource = status.selectedProvider === 'auto' ? 'auto-detected' : 'explicitly configured'

  return `Using ${providerName} (${configSource})`
}

/**
 * Environment variable configuration guide
 * 
 * This object provides documentation for setting up each provider.
 */
export const DATABASE_CONFIG_GUIDE = {
  supabase: {
    required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    optional: ['SUPABASE_ANON_KEY'],
    description: 'PostgreSQL database with Row-Level Security',
    example: {
      SUPABASE_URL: 'https://your-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  },
  turso: {
    required: ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'],
    optional: [],
    description: 'LibSQL/SQLite database with edge distribution',
    example: {
      TURSO_DATABASE_URL: 'libsql://your-database.turso.io',
      TURSO_AUTH_TOKEN: 'your-auth-token',
    },
  },
  selection: {
    variable: 'DATABASE_PROVIDER',
    values: ['supabase', 'turso', 'auto'],
    default: 'auto',
    description: 'Explicit provider selection (optional)',
  },
} as const