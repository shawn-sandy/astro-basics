// src/utils/env-config.ts
// Centralized environment variable configuration and validation

export type DatabaseType = 'turso' | 'supabase' | 'clerk'

export type EnvVarConfig = {
  name: string
  required: boolean
  description?: string
}

export type DatabaseConfig = {
  turso: {
    url: string
    authToken: string
  }
  supabase: {
    url: string
    anonKey: string
  }
  clerk: {
    publishableKey: string
    secretKey: string
  }
}

const ENV_VAR_CONFIGS: Record<DatabaseType, EnvVarConfig[]> = {
  turso: [
    {
      name: 'TURSO_DATABASE_URL',
      required: true,
      description: 'Turso database URL',
    },
    {
      name: 'TURSO_AUTH_TOKEN',
      required: true,
      description: 'Turso authentication token',
    },
  ],
  supabase: [
    {
      name: 'SUPABASE_URL',
      required: true,
      description: 'Supabase database URL',
    },
    {
      name: 'SUPABASE_ANON_KEY',
      required: true,
      description: 'Supabase anonymous key',
    },
  ],
  clerk: [
    {
      name: 'PUBLIC_CLERK_PUBLISHABLE_KEY',
      required: true,
      description: 'Clerk publishable key',
    },
    {
      name: 'CLERK_SECRET_KEY',
      required: true,
      description: 'Clerk secret key',
    },
  ],
}

/**
 * Validates environment variables for a specific database type
 * @param type - Database type to validate
 * @throws Error if required environment variables are missing
 */
export const validateEnvVars = (type: DatabaseType): void => {
  const configs = ENV_VAR_CONFIGS[type]
  const missingVars: string[] = []

  for (const config of configs) {
    const value = import.meta.env[config.name]
    if (config.required && (!value || value.trim() === '')) {
      missingVars.push(config.name)
    }
  }

  if (missingVars.length > 0) {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1)
    throw new Error(
      `Missing required ${typeCapitalized} environment variables: ${missingVars.join(
        ', '
      )}. Please check your .env file.`
    )
  }
}

/**
 * Checks if environment variables for a database type are configured
 * @param type - Database type to check
 * @returns Boolean indicating if all required env vars are present
 */
export const isDatabaseConfigured = (type: DatabaseType): boolean => {
  const configs = ENV_VAR_CONFIGS[type]

  return configs.every((config) => {
    const value = import.meta.env[config.name]
    return !config.required || (value && value.trim() !== '')
  })
}

/**
 * Gets environment variable value with validation
 * @param name - Environment variable name
 * @param required - Whether the variable is required
 * @returns Environment variable value or undefined
 */
export const getEnvVar = (name: string, required = false): string | undefined => {
  const value = import.meta.env[name]

  if (required && (!value || value.trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}. Please check your .env file.`)
  }

  return value || undefined
}

/**
 * Gets validated database configuration
 * @param type - Database type
 * @returns Typed configuration object
 */
export const getDatabaseConfig = (type: DatabaseType): DatabaseConfig[DatabaseType] => {
  validateEnvVars(type)

  switch (type) {
    case 'turso':
      return {
        url: import.meta.env.TURSO_DATABASE_URL!,
        authToken: import.meta.env.TURSO_AUTH_TOKEN!,
      }
    case 'supabase':
      return {
        url: import.meta.env.SUPABASE_URL!,
        anonKey: import.meta.env.SUPABASE_ANON_KEY!,
      }
    case 'clerk':
      return {
        publishableKey: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY!,
        secretKey: import.meta.env.CLERK_SECRET_KEY!,
      }
    default:
      throw new Error(`Unknown database type: ${type}`)
  }
}

// Convenience functions for specific database types
export const isTursoConfigured = (): boolean => isDatabaseConfigured('turso')
export const isSupabaseConfigured = (): boolean => isDatabaseConfigured('supabase')
export const isClerkConfigured = (): boolean => isDatabaseConfigured('clerk')

export const getTursoConfig = () => getDatabaseConfig('turso')
export const getSupabaseConfig = () => getDatabaseConfig('supabase')
export const getClerkConfig = () => getDatabaseConfig('clerk')