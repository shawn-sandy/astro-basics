import { createClient } from '@libsql/client'
import type { Client, InArgs, ResultSet } from '@libsql/client'

// Memoized environment configuration
let cachedEnv: { url: string; authToken: string } | null = null

const getTursoEnv = () => {
  if (!cachedEnv) {
    cachedEnv = {
      url: import.meta.env.TURSO_DATABASE_URL || '',
      authToken: import.meta.env.TURSO_AUTH_TOKEN || '',
    }
  }
  return cachedEnv
}

// Singleton client and error state
let client: Client | null = null
let initializationError: Error | null = null

// Retry configuration
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

/**
 * Check if Turso database is properly configured with required environment variables
 */
export function isTursoConfigured(): boolean {
  const env = getTursoEnv()
  return Boolean(env.url && env.authToken)
}

/**
 * Validate Turso configuration and throw descriptive error if missing
 */
export function validateTursoConfig(): void {
  const env = getTursoEnv()
  const missing: string[] = []

  if (!env.url) missing.push('TURSO_DATABASE_URL')
  if (!env.authToken) missing.push('TURSO_AUTH_TOKEN')

  if (missing.length > 0) {
    throw new Error(
      `Turso database not configured. Missing environment variables: ${missing.join(', ')}`
    )
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
    const env = getTursoEnv()
    validateTursoConfig()

    client = createClient({
      url: env.url,
      authToken: env.authToken,
      intMode: 'number', // Use numbers for integers
    })

    return client
  } catch (error) {
    // Cache the initialization error to avoid retrying
    initializationError = error as Error
    throw error
  }
}

/**
 * Execute a query with retry logic and proper error handling
 * @param query SQL query string
 * @param params Query parameters
 * @returns Query result
 * @throws {Error} If database operation fails after retries
 */
export async function executeQuery<T = ResultSet>(query: string, params?: InArgs): Promise<T> {
  const tursoClient = getTursoClient()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await tursoClient.execute(query, params)
      return result as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      const canRetry =
        lastError.message.includes('SQLITE_BUSY') || lastError.message.includes('connection')

      if (!canRetry || attempt === RETRY_ATTEMPTS) {
        console.error(`Turso query failed (attempt ${attempt}/${RETRY_ATTEMPTS}):`, {
          query: query.substring(0, 100),
          error: lastError.message,
        })
        throw new Error(`Database operation failed after ${attempt} attempts: ${lastError.message}`)
      }

      // Exponential backoff
      await new Promise(resolve => globalThis.setTimeout(resolve, RETRY_DELAY_MS * attempt))
    }
  }

  throw lastError || new Error('Database operation failed')
}

/**
 * Execute multiple queries in a transaction
 * @param queries Array of query objects with SQL and optional parameters
 * @returns Array of query results
 */
export async function executeTransaction<T = ResultSet>(
  queries: Array<{ query: string; params?: InArgs }>
): Promise<T[]> {
  const tursoClient = getTursoClient()

  try {
    const results = await tursoClient.batch(
      queries.map(q => ({ sql: q.query, args: q.params || [] }))
    )
    return results as T[]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Turso transaction failed:', errorMessage)
    throw new Error(`Transaction failed: ${errorMessage}`)
  }
}

/**
 * Reset the client state (useful for testing)
 */
export function resetTursoClient(): void {
  if (client) {
    client.close()
  }
  client = null
  initializationError = null
  cachedEnv = null
}

// Export the default client getter for backwards compatibility
export default getTursoClient
