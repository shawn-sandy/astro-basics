import { createClient } from '@libsql/client'
import type { Client, InArgs } from '@libsql/client'

// Environment variables (accessed lazily)
const getTursoEnv = () => {
  return {
    url: import.meta.env.TURSO_DATABASE_URL,
    authToken: import.meta.env.TURSO_AUTH_TOKEN,
  }
}

// Singleton client and error state
let client: Client | null = null
let initializationError: Error | null = null

/**
 * Check if Turso database is properly configured with required environment variables
 */
export function isTursoConfigured(): boolean {
  const env = getTursoEnv()
  return !!(env.url && env.authToken)
}

/**
 * Validate Turso configuration and throw descriptive error if missing
 */
export function validateTursoConfig(): void {
  const env = getTursoEnv()

  if (!env.url && !env.authToken) {
    throw new Error(
      'Turso database not configured. Both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables are required.'
    )
  }

  if (!env.url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required.')
  }

  if (!env.authToken) {
    throw new Error('TURSO_AUTH_TOKEN environment variable is required.')
  }
}

/**
 * Get the Turso client instance with lazy initialization
 * @throws {Error} If Turso is not configured or client creation fails
 */
export function getTursoClient(): Client {
  // If we previously failed to initialize, throw the cached error
  if (initializationError) {
    throw initializationError
  }

  // If client already exists, return it
  if (client) {
    return client
  }

  // Try to initialize the client
  try {
    validateTursoConfig()

    const env = getTursoEnv()
    client = createClient({
      url: env.url,
      authToken: env.authToken,
    })

    return client
  } catch (error) {
    // Cache the initialization error to avoid retrying
    initializationError = error as Error
    throw error
  }
}

/**
 * Execute a query with proper error handling
 * @param query SQL query string
 * @param params Query parameters
 * @returns Query result
 * @throws {Error} If database operation fails
 */
export async function executeQuery<T = unknown>(query: string, params?: InArgs): Promise<T> {
  try {
    const tursoClient = getTursoClient()
    const result = await tursoClient.execute(query, params)
    return result as T
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Turso query failed:', errorMessage)
    throw new Error(`Database operation failed: ${errorMessage}`)
  }
}

/**
 * Reset the client state (useful for testing)
 */
export function resetTursoClient(): void {
  client = null
  initializationError = null
}

// Export the default client getter for backwards compatibility
export default getTursoClient
