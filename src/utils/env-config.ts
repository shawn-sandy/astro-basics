/**
 * Unified Environment Configuration Abstraction Layer
 *
 * Provides a consistent interface for accessing environment variables across the application.
 * This abstraction follows the same patterns as the database abstraction layer, offering:
 * - Centralized environment variable access
 * - Type safety and validation
 * - Configuration status checking
 * - Caching for performance
 * - Descriptive error messages
 *
 * @fileoverview Environment configuration abstraction
 * @version 1.0.0
 * @author Astro Basics Team
 * @see {@link EnvironmentConfig} for the unified configuration interface
 * @see {@link getEnvironmentConfig} for configuration factory
 * @example
 * // Get configuration with validation
 * const config = getEnvironmentConfig();
 * if (config.isClerkConfigured()) {
 *   const clerkKey = config.getClerkPublishableKey();
 * }
 *
 * // Check configuration status
 * const status = getEnvironmentStatus();
 * console.log(`Environment: ${status.environment} (${status.mode})`);
 */

/**
 * Core environment configuration interface providing unified access
 * to all environment variables used throughout the application.
 */
export interface EnvironmentConfig {
  // Environment detection
  isDevelopment(): boolean
  isProduction(): boolean
  isTest(): boolean
  getEnvironment(): 'development' | 'production' | 'test'

  // Astro-specific
  getAstroAdapter(): string | null
  getPublicSiteUrl(): string | null

  // Clerk Authentication
  isClerkConfigured(): boolean
  getClerkPublishableKey(): string | null
  getClerkSecretKey(): string | null
  getClerkWebhookSecret(): string | null

  // Database Configuration
  getDatabaseProvider(): 'turso' | 'supabase' | 'auto' | null
  
  // Supabase
  isSupabaseConfigured(): boolean
  getSupabaseUrl(): string | null
  getSupabaseAnonKey(): string | null
  getSupabaseServiceRoleKey(): string | null
  
  // Turso
  isTursoConfigured(): boolean
  getTursoDatabaseUrl(): string | null
  getTursoAuthToken(): string | null

  // Logging (Axiom)
  isAxiomConfigured(): boolean
  getAxiomToken(): string | null
  getAxiomDataset(): string | null
  getAxiomOrgId(): string | null

  // General configuration status
  getConfigurationStatus(): EnvironmentStatus
}

/**
 * Environment configuration status for monitoring and debugging
 */
export interface EnvironmentStatus {
  environment: 'development' | 'production' | 'test'
  mode: string
  isFullyConfigured: boolean
  services: {
    clerk: {
      configured: boolean
      hasWebhook: boolean
    }
    database: {
      provider: string | null
      configured: boolean
      availableProviders: string[]
    }
    logging: {
      configured: boolean
      provider: string | null
    }
  }
  missingConfiguration: string[]
}

/**
 * Cached environment variables for performance optimization
 */
interface CachedEnvironment {
  // Astro environment
  DEV: boolean
  PROD: boolean
  MODE: string
  
  // Astro adapter
  ASTRO_ADAPTER: string | undefined
  PUBLIC_SITE_URL: string | undefined

  // Clerk
  PUBLIC_CLERK_PUBLISHABLE_KEY: string | undefined
  CLERK_SECRET_KEY: string | undefined
  CLERK_WEBHOOK_SECRET: string | undefined

  // Database selection
  DATABASE_PROVIDER: string | undefined

  // Supabase
  SUPABASE_URL: string | undefined
  SUPABASE_ANON_KEY: string | undefined
  SUPABASE_SERVICE_ROLE_KEY: string | undefined

  // Turso
  TURSO_DATABASE_URL: string | undefined
  TURSO_AUTH_TOKEN: string | undefined

  // Axiom Logging
  AXIOM_TOKEN: string | undefined
  AXIOM_DATASET: string | undefined
  AXIOM_ORG_ID: string | undefined
}

/**
 * Memoized environment cache for performance
 */
let cachedEnvironment: CachedEnvironment | null = null

/**
 * Load and cache environment variables for optimal performance.
 * Similar to database abstraction pattern with lazy loading.
 */
function loadEnvironment(): CachedEnvironment {
  if (!cachedEnvironment) {
    cachedEnvironment = {
      // Astro environment detection
      DEV: import.meta.env.DEV ?? false,
      PROD: import.meta.env.PROD ?? false,
      MODE: import.meta.env.MODE ?? 'development',

      // Astro configuration
      ASTRO_ADAPTER: import.meta.env.ASTRO_ADAPTER,
      PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL,

      // Clerk Authentication
      PUBLIC_CLERK_PUBLISHABLE_KEY: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: import.meta.env.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SECRET: import.meta.env.CLERK_WEBHOOK_SECRET,

      // Database selection
      DATABASE_PROVIDER: import.meta.env.DATABASE_PROVIDER,

      // Supabase
      SUPABASE_URL: import.meta.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,

      // Turso
      TURSO_DATABASE_URL: import.meta.env.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: import.meta.env.TURSO_AUTH_TOKEN,

      // Axiom Logging
      AXIOM_TOKEN: import.meta.env.AXIOM_TOKEN,
      AXIOM_DATASET: import.meta.env.AXIOM_DATASET,
      AXIOM_ORG_ID: import.meta.env.AXIOM_ORG_ID,
    }
  }
  return cachedEnvironment
}

/**
 * Production environment configuration implementation.
 * Provides safe, validated access to all environment variables.
 */
class AstroBasicsEnvironmentConfig implements EnvironmentConfig {
  private env: CachedEnvironment

  constructor() {
    this.env = loadEnvironment()
  }

  // Environment detection
  isDevelopment(): boolean {
    return this.env.DEV
  }

  isProduction(): boolean {
    return this.env.PROD
  }

  isTest(): boolean {
    return this.env.MODE === 'test'
  }

  getEnvironment(): 'development' | 'production' | 'test' {
    if (this.env.MODE === 'test') return 'test'
    return this.env.PROD ? 'production' : 'development'
  }

  // Astro configuration
  getAstroAdapter(): string | null {
    return this.env.ASTRO_ADAPTER || null
  }

  getPublicSiteUrl(): string | null {
    return this.env.PUBLIC_SITE_URL || null
  }

  // Clerk Authentication
  isClerkConfigured(): boolean {
    const publishableKey = this.env.PUBLIC_CLERK_PUBLISHABLE_KEY
    const secretKey = this.env.CLERK_SECRET_KEY
    
    return !!(
      publishableKey &&
      publishableKey !== 'YOUR_CLERK_PUBLISHABLE_KEY' &&
      secretKey &&
      secretKey !== 'YOUR_CLERK_SECRET_KEY'
    )
  }

  getClerkPublishableKey(): string | null {
    const key = this.env.PUBLIC_CLERK_PUBLISHABLE_KEY
    return key && key !== 'YOUR_CLERK_PUBLISHABLE_KEY' ? key : null
  }

  getClerkSecretKey(): string | null {
    const key = this.env.CLERK_SECRET_KEY
    return key && key !== 'YOUR_CLERK_SECRET_KEY' ? key : null
  }

  getClerkWebhookSecret(): string | null {
    const secret = this.env.CLERK_WEBHOOK_SECRET
    return secret && secret !== 'YOUR_CLERK_WEBHOOK_SECRET' ? secret : null
  }

  // Database configuration
  getDatabaseProvider(): 'turso' | 'supabase' | 'auto' | null {
    const provider = this.env.DATABASE_PROVIDER
    if (provider === 'turso' || provider === 'supabase' || provider === 'auto') {
      return provider
    }
    return null
  }

  // Supabase
  isSupabaseConfigured(): boolean {
    return !!(this.env.SUPABASE_URL && this.env.SUPABASE_ANON_KEY)
  }

  getSupabaseUrl(): string | null {
    return this.env.SUPABASE_URL || null
  }

  getSupabaseAnonKey(): string | null {
    return this.env.SUPABASE_ANON_KEY || null
  }

  getSupabaseServiceRoleKey(): string | null {
    return this.env.SUPABASE_SERVICE_ROLE_KEY || null
  }

  // Turso
  isTursoConfigured(): boolean {
    return !!(this.env.TURSO_DATABASE_URL && this.env.TURSO_AUTH_TOKEN)
  }

  getTursoDatabaseUrl(): string | null {
    return this.env.TURSO_DATABASE_URL || null
  }

  getTursoAuthToken(): string | null {
    return this.env.TURSO_AUTH_TOKEN || null
  }

  // Axiom Logging
  isAxiomConfigured(): boolean {
    return !!(this.env.AXIOM_TOKEN && this.env.AXIOM_DATASET)
  }

  getAxiomToken(): string | null {
    return this.env.AXIOM_TOKEN || null
  }

  getAxiomDataset(): string | null {
    return this.env.AXIOM_DATASET || null
  }

  getAxiomOrgId(): string | null {
    return this.env.AXIOM_ORG_ID || null
  }

  // Configuration status
  getConfigurationStatus(): EnvironmentStatus {
    const missingConfig: string[] = []
    
    // Check essential services
    if (!this.isClerkConfigured()) {
      missingConfig.push('Clerk Authentication (PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)')
    }

    const hasSupabase = this.isSupabaseConfigured()
    const hasTurso = this.isTursoConfigured()
    
    if (!hasSupabase && !hasTurso) {
      missingConfig.push('Database Provider (Supabase or Turso configuration)')
    }

    // Determine available database providers
    const availableProviders: string[] = []
    if (hasSupabase) availableProviders.push('supabase')
    if (hasTurso) availableProviders.push('turso')

    return {
      environment: this.getEnvironment(),
      mode: this.env.MODE,
      isFullyConfigured: missingConfig.length === 0,
      services: {
        clerk: {
          configured: this.isClerkConfigured(),
          hasWebhook: !!this.getClerkWebhookSecret(),
        },
        database: {
          provider: this.getDatabaseProvider(),
          configured: hasSupabase || hasTurso,
          availableProviders,
        },
        logging: {
          configured: this.isAxiomConfigured(),
          provider: this.isAxiomConfigured() ? 'axiom' : null,
        },
      },
      missingConfiguration: missingConfig,
    }
  }
}

/**
 * Factory function for environment configuration with singleton pattern.
 * Primary entry point for all environment variable access throughout the application.
 * 
 * @returns {EnvironmentConfig} Configured environment instance ready for use
 * @example
 * const config = getEnvironmentConfig();
 * if (config.isClerkConfigured()) {
 *   const publishableKey = config.getClerkPublishableKey();
 * }
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return new AstroBasicsEnvironmentConfig()
}

/**
 * Environment system introspection and health monitoring utility.
 * Provides comprehensive information about the current environment configuration.
 * 
 * @returns {EnvironmentStatus} Complete environment status information
 * @example
 * const status = getEnvironmentStatus();
 * console.log(`Environment: ${status.environment}`);
 * if (!status.isFullyConfigured) {
 *   console.warn('Missing configuration:', status.missingConfiguration);
 * }
 */
export function getEnvironmentStatus(): EnvironmentStatus {
  const config = getEnvironmentConfig()
  return config.getConfigurationStatus()
}

/**
 * Validate essential environment configuration and throw descriptive errors.
 * Useful for startup validation and debugging.
 * 
 * @throws {Error} When essential configuration is missing
 * @example
 * // In middleware or startup code
 * try {
 *   validateEnvironmentConfig();
 * } catch (error) {
 *   console.error('Configuration error:', error.message);
 * }
 */
export function validateEnvironmentConfig(): void {
  const status = getEnvironmentStatus()
  
  if (!status.isFullyConfigured) {
    throw new Error(
      `Environment configuration incomplete. Missing: ${status.missingConfiguration.join(', ')}`
    )
  }
}

// Export types for use in other files
export type { EnvironmentConfig, EnvironmentStatus }