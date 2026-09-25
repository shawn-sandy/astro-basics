/**
 * Unified Environment Configuration Abstraction Layer
 *
 * Provides a consistent interface for accessing environment variables across the application.
 * It offers:
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

  // Supabase
  isSupabaseConfigured(): boolean
  getSupabaseUrl(): string | null
  getSupabaseAnonKey(): string | null
  getSupabaseServiceRoleKey(): string | null

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
      configured: boolean
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

  // Supabase
  SUPABASE_URL: string | undefined
  SUPABASE_ANON_KEY: string | undefined
  SUPABASE_SERVICE_ROLE_KEY: string | undefined

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
 * Loaded lazily on first use.
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

      // Supabase
      SUPABASE_URL: import.meta.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,

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

  // Supabase
  isSupabaseConfigured(): boolean {
    return !!(this.getSupabaseUrl() && this.getSupabaseAnonKey())
  }

  /**
   * Returns the Supabase URL only when it is actually usable as one.
   *
   * `.env.example` ships `SUPABASE_URL=YOUR_SUPABASE_URL`, which is truthy but not a
   * URL. `createClient` throws on it, and that throw used to happen while this module
   * graph was still loading - taking middleware, and so every route, down with it.
   * Treating an unusable value as "not configured" keeps an unconfigured project
   * running with Supabase features simply switched off.
   *
   * The scheme check matters as much as the parse: `URL.canParse` accepts `ftp://` and
   * `javascript:`, but Supabase rejects anything that is not HTTP(S), so a scheme typo
   * would otherwise sail through this guard and throw exactly where it used to.
   */
  getSupabaseUrl(): string | null {
    const url = this.env.SUPABASE_URL
    if (!url || !URL.canParse(url)) return null

    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : null
  }

  getSupabaseAnonKey(): string | null {
    const key = this.env.SUPABASE_ANON_KEY
    return key && key !== 'YOUR_SUPABASE_ANON_KEY' ? key : null
  }

  getSupabaseServiceRoleKey(): string | null {
    const key = this.env.SUPABASE_SERVICE_ROLE_KEY
    return key && key !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY' ? key : null
  }

  // Axiom Logging
  isAxiomConfigured(): boolean {
    return !!(this.getAxiomToken() && this.getAxiomDataset())
  }

  /**
   * Returns the Axiom token only when it is a real one.
   *
   * `.env.example` ships `AXIOM_TOKEN=YOUR_AXIOM_API_TOKEN` alongside a real-looking
   * `AXIOM_DATASET`, so the logger used to consider itself configured and ship every
   * request's logs to an endpoint that answers `forbidden`. The console-only fallback in
   * `initializeAxiom` is the intended behaviour here; it just never got the chance.
   */
  getAxiomToken(): string | null {
    const token = this.env.AXIOM_TOKEN
    return token && token !== 'YOUR_AXIOM_API_TOKEN' ? token : null
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

    if (!hasSupabase) {
      missingConfig.push('Database (SUPABASE_URL, SUPABASE_ANON_KEY)')
    }

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
          configured: hasSupabase,
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
