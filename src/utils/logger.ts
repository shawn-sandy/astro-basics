import { randomUUID } from 'node:crypto'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured context for log entries with distributed tracing support.
 *
 * Extended to support request correlation across services, performance
 * monitoring, and integration with third-party service trace IDs.
 *
 * @property {string} [userId] - User identifier for request tracing
 * @property {string} [endpoint] - API endpoint for request correlation
 * @property {string} [method] - HTTP method for debugging context
 * @property {string} [correlationId] - Unique ID for tracing requests across services
 * @property {number} [requestDuration] - Request processing time in milliseconds
 * @property {string} [traceId] - OpenTelemetry trace ID (future integration)
 * @property {string} [spanId] - OpenTelemetry span ID (future integration)
 * @property {string} [clerkTraceId] - Clerk operation ID for cross-service correlation
 * @property {string} [supabaseQueryId] - Supabase query ID for slow query analysis
 * @property {number} [status] - HTTP status code for response logging
 */
interface LogContext {
  userId?: string | undefined
  endpoint?: string | undefined
  method?: string | undefined
  correlationId?: string | undefined
  requestDuration?: number | undefined
  traceId?: string | undefined
  spanId?: string | undefined
  clerkTraceId?: string | undefined
  supabaseQueryId?: string | undefined
  status?: number | undefined
  [key: string]: unknown
}

/**
 * Structured log entry format for consistent output across environments.
 *
 * @property {string} timestamp - ISO timestamp for log correlation
 * @property {LogLevel} level - Log severity level
 * @property {string} message - Human-readable log message
 * @property {LogContext} [context] - Additional structured data
 */
interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext | undefined
}

/**
 * Production-ready logger with Axiom integration and distributed tracing support.
 *
 * Implements dual-mode logging: rich development experience with emojis and colors,
 * structured JSON logging for production environments. Includes automatic context
 * sanitization to prevent sensitive data leakage in logs.
 *
 * Enhanced with Axiom integration for persistent log storage, searchable history,
 * and real-time alerting. Supports correlation IDs for distributed tracing across
 * services and performance monitoring with request duration tracking.
 *
 * Design decisions:
 * - Singleton pattern for consistent logging across the application
 * - Environment detection for appropriate output formatting
 * - Security-first approach with automatic PII redaction
 * - Performance optimization by filtering log levels in production
 * - Graceful fallback to console-only if Axiom unavailable
 * - Async operations for non-blocking log delivery
 *
 * @class Logger
 * @example
 * // Basic usage with correlation
 * await logger.info('User authenticated', { userId: 'user123', correlationId })
 *
 * // API request logging with timing
 * const ctx = logger.apiRequest('/api/users', 'GET', 'user123', correlationId)
 * // ... process request ...
 * await logger.apiComplete(ctx, 200)
 * await logger.flush() // Critical for serverless
 *
 * @since 1.0.0
 */
class Logger {
  private isDev = import.meta.env.DEV
  private isProd = import.meta.env.PROD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Axiom SDK types not available at compile time due to dynamic import
  private axiom: any | null = null
  private axiomEnabled = false
  private _axiomInitialization: Promise<void> | null = null

  constructor() {
    // Initialize Axiom client if configured
    this.initializeAxiom()
  }

  /**
   * Initializes Axiom client with graceful fallback.
   *
   * Attempts to load Axiom SDK and configure client with environment
   * variables. If configuration is missing or initialization fails,
   * falls back to console-only logging without throwing errors.
   *
   * @private
   */
  private initializeAxiom(): void {
    const axiomToken = import.meta.env.AXIOM_TOKEN
    const axiomDataset = import.meta.env.AXIOM_DATASET

    if (!axiomToken || !axiomDataset) {
      if (this.isProd) {
        console.warn('⚠️ Axiom not configured - using console-only logging')
      }
      return
    }

    try {
      // Dynamic import to avoid bundling Axiom in environments that don't need it
      this._axiomInitialization = import('@axiomhq/js')
        .then(({ Axiom }) => {
          const orgId = import.meta.env.AXIOM_ORG_ID
          this.axiom = new Axiom({
            token: axiomToken,
            ...(orgId ? { orgId } : {}),
          })
          this.axiomEnabled = true
          if (this.isDev) {
            console.log('✅ Axiom logging initialized')
          }
        })
        .catch(error => {
          console.error('❌ Failed to initialize Axiom:', error)
          this.axiomEnabled = false
        })
    } catch (error) {
      console.error('❌ Failed to load Axiom SDK:', error)
      this.axiomEnabled = false
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * Sanitizes log context to prevent sensitive data exposure in logs.
   *
   * Implements security-first logging by automatically redacting common
   * sensitive fields (tokens, passwords, secrets) and applying environment-specific
   * filtering. In production, only essential debugging fields are preserved
   * to minimize log size and reduce exposure risk.
   *
   * Security patterns implemented:
   * - Automatic PII redaction for common field names
   * - Production context filtering to essential fields only
   * - Immutable sanitization (creates new object, doesn't modify original)
   * - Clerk-specific token handling for authentication flows
   *
   * @param {LogContext} [context] - Raw context that may contain sensitive data
   * @returns {LogContext | undefined} Sanitized context safe for logging
   * @example
   * // Input: { userId: '123', token: 'secret', customData: 'value' }
   * // Output (dev): { userId: '123', token: '[REDACTED]', customData: 'value' }
   * // Output (prod): { userId: '123' }
   * @since 1.0.0
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined

    const sanitized = { ...context }

    // Remove or mask sensitive fields
    if (sanitized.token) sanitized.token = '[REDACTED]'
    if (sanitized.password) sanitized.password = '[REDACTED]'
    if (sanitized.secret) sanitized.secret = '[REDACTED]'
    if (sanitized.clerkToken) sanitized.clerkToken = '[REDACTED]'

    // In production, only keep essential context
    if (this.isProd) {
      return {
        userId: sanitized.userId,
        endpoint: sanitized.endpoint,
        method: sanitized.method,
      }
    }

    return sanitized
  }

  private formatLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message,
      context: this.sanitizeContext(context),
    }
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case 'error':
        return console.error
      case 'warn':
        return console.warn
      case 'info':
        return console.info
      case 'debug':
      default:
        return console.log
    }
  }

  private getDevEmoji(level: LogLevel): string {
    switch (level) {
      case 'error':
        return '❌'
      case 'warn':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      case 'debug':
        return '🔍'
      default:
        return '📝'
    }
  }

  /**
   * Core logging method with dual output (console + Axiom) and performance optimization.
   *
   * Implements three-way logging strategy:
   * 1. Development: Human-friendly console output with emojis
   * 2. Production console: Structured JSON for warn/error only
   * 3. Axiom: All log levels sent to persistent storage
   *
   * Business logic decisions:
   * - Production console filtering reduces noise (warn/error only)
   * - Axiom receives all log levels for comprehensive debugging
   * - Context sanitization happens before any output
   * - Fire-and-forget Axiom delivery doesn't block request processing
   *
   * @param {LogLevel} level - Log severity level for filtering and formatting
   * @param {string} message - Primary log message
   * @param {LogContext} [context] - Additional structured data (will be sanitized)
   * @returns {Promise<void>}
   * @example
   * // Development: "🔍 [DEBUG] API request { endpoint: '/api/users' }"
   * // Production console: {"timestamp":"2023-...","level":"error","message":"..."}
   * // Axiom: All logs persisted with full context
   * @since 1.0.0
   */
  private async log(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    const logEntry = this.formatLogEntry(level, message, context)

    // Send to Axiom first (fire-and-forget, non-blocking)
    if (this.axiomEnabled) {
      this.logToAxiom(level, message, context).catch(() => {
        // Silent failure - logging errors shouldn't break the app
      })
    }

    // In production console, only log warnings and errors
    if (this.isProd && (level === 'debug' || level === 'info')) {
      return
    }

    try {
      const consoleMethod = this.getConsoleMethod(level)

      if (this.isDev) {
        // Development: Rich formatting with emojis and colors
        const emoji = this.getDevEmoji(level)
        const prefix = `${emoji} [${level.toUpperCase()}]`

        if (context && Object.keys(context).length > 0) {
          consoleMethod(`${prefix} ${message}`, logEntry.context)
        } else {
          consoleMethod(`${prefix} ${message}`)
        }
      } else {
        // Production: Structured JSON logging
        consoleMethod(JSON.stringify(logEntry))
      }
    } catch {
      // Gracefully handle console errors - logging failures shouldn't break the app
      // This is extremely rare but possible in test environments or unusual runtime scenarios
    }
  }

  /**
   * Sends log entry to Axiom with automatic batching and error handling.
   *
   * Implements fire-and-forget logging with graceful degradation. If Axiom
   * ingestion fails, logs the error to console but doesn't throw to prevent
   * application disruption. Axiom SDK automatically batches logs for efficiency.
   *
   * @param {LogLevel} level - Log severity level
   * @param {string} message - Log message
   * @param {LogContext} [context] - Additional structured context
   * @returns {Promise<void>}
   * @private
   */
  private async logToAxiom(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    if (!this.axiom || !this.axiomEnabled) return

    const dataset = import.meta.env.AXIOM_DATASET
    if (!dataset) return

    try {
      const logEntry = this.formatLogEntry(level, message, context)

      // Axiom expects flat objects for optimal querying
      await this.axiom.ingest(dataset, [
        {
          _time: logEntry.timestamp,
          level: logEntry.level,
          message: logEntry.message,
          ...(logEntry.context || {}), // Flatten context for better Axiom querying
          // Add metadata for filtering and monitoring
          environment: this.isProd ? 'production' : 'development',
          service: 'astro-basics',
        },
      ])
    } catch (error) {
      // Fail silently to prevent log failures from breaking the app
      console.error('Failed to send log to Axiom:', error)
    }
  }

  async debug(message: string, context?: LogContext): Promise<void> {
    await this.log('debug', message, context)
  }

  async info(message: string, context?: LogContext): Promise<void> {
    await this.log('info', message, context)
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    await this.log('warn', message, context)
  }

  async error(message: string, context?: LogContext): Promise<void> {
    await this.log('error', message, context)
  }

  /**
   * Generates a unique correlation ID for request tracing.
   *
   * Creates a cryptographically random UUID v4 for uniquely identifying
   * requests across distributed services. Use this at the entry point of
   * each request (middleware, API routes) and pass it through the entire
   * request lifecycle for end-to-end tracing.
   *
   * @returns {string} Unique correlation ID (UUID v4 format)
   * @example
   * const correlationId = logger.createCorrelationId()
   * await logger.info('Request started', { correlationId })
   * @since 1.0.0
   */
  createCorrelationId(): string {
    return randomUUID()
  }

  /**
   * Flushes pending logs to Axiom.
   *
   * CRITICAL for serverless environments: Must be called before function
   * completion to ensure all logs are delivered. Axiom batches logs for
   * efficiency, but serverless functions terminate immediately after response,
   * potentially losing batched logs.
   *
   * @returns {Promise<void>} Resolves when all pending logs are sent
   * @example
   * // In API routes
   * export const POST: APIRoute = async ({ request }) => {
   *   try {
   *     // ... business logic ...
   *   } finally {
   *     await logger.flush() // Ensure logs are delivered
   *   }
   * }
   * @since 1.0.0
   */
  async flush(): Promise<void> {
    if (!this.axiom || !this.axiomEnabled) return

    try {
      await this.axiom.flush()
    } catch (error) {
      console.error('Failed to flush Axiom logs:', error)
    }
  }

  /**
   * Creates enriched API request context with timing and tracing.
   *
   * Enhanced to support performance monitoring and distributed tracing.
   * Returns an extended context object with a `startTime` property for
   * duration calculation when paired with `apiComplete()`. Automatically
   * generates correlation ID if not provided.
   *
   * @param {string} endpoint - API route being accessed (e.g., '/api/users')
   * @param {string} method - HTTP method, will be normalized to uppercase
   * @param {string} [userId] - User identifier for request correlation
   * @param {string} [correlationId] - Correlation ID from middleware or parent request
   * @returns {LogContext & { startTime: number }} Context with performance tracking
   * @example
   * const ctx = logger.apiRequest('/api/posts', 'GET', 'user123', correlationId)
   * // ... process request ...
   * await logger.apiComplete(ctx, 200)
   * @since 1.0.0
   */
  apiRequest(
    endpoint: string,
    method: string,
    userId?: string | undefined,
    correlationId?: string | undefined
  ): LogContext & { startTime: number } {
    return {
      endpoint,
      method: method.toUpperCase(),
      userId: userId || undefined,
      correlationId: correlationId || this.createCorrelationId(),
      startTime: Date.now(),
    }
  }

  /**
   * Logs API request completion with performance metrics.
   *
   * Calculates request duration and logs completion with status code.
   * Automatically flags slow requests (>2000ms for Netlify Functions)
   * with a warning for performance monitoring.
   *
   * Performance thresholds:
   * - <500ms: Normal
   * - 500-2000ms: Acceptable
   * - >2000ms: Slow (triggers warning)
   *
   * @param {LogContext & { startTime: number }} requestContext - Context from apiRequest()
   * @param {number} status - HTTP response status code
   * @returns {Promise<void>}
   * @example
   * const ctx = logger.apiRequest('/api/posts', 'GET', 'user123')
   * try {
   *   const result = await fetchPosts()
   *   await logger.apiComplete(ctx, 200)
   *   return result
   * } catch (error) {
   *   await logger.apiComplete(ctx, 500)
   *   throw error
   * }
   * @since 1.0.0
   */
  async apiComplete(
    requestContext: LogContext & { startTime: number },
    status: number
  ): Promise<void> {
    const duration = Date.now() - requestContext.startTime

    const { startTime: _startTime, ...context } = requestContext

    await this.info('API request completed', {
      ...context,
      status,
      requestDuration: duration,
    })

    // Alert on slow requests (Netlify Functions have 10s timeout, warn at 2s)
    if (duration > 2000) {
      await this.warn('Slow API request detected', {
        ...context,
        status,
        requestDuration: duration,
        threshold: 2000,
      })
    }
  }

  /**
   * Creates standardized API response context for consistent logging patterns.
   *
   * Implements structured logging convention for API responses to enable
   * effective debugging and monitoring. Includes HTTP status for quick
   * identification of successful vs failed requests.
   *
   * @param {string} endpoint - API endpoint that responded
   * @param {number} status - HTTP status code for response categorization
   * @param {string} [userId] - User identifier for request correlation
   * @returns {LogContext} Structured context optimized for API response logging
   * @example
   * logger.info('API response', logger.apiResponse('/api/posts', 200, 'user123'))
   * @since 1.0.0
   */
  apiResponse(endpoint: string, status: number, userId?: string | undefined): LogContext {
    return {
      endpoint,
      status,
      userId: userId || undefined,
    }
  }
}

/**
 * Creates a fresh logger instance. Useful for testing scenarios where environment
 * variables need to be stubbed before instantiation.
 */
export const createLogger = (): Logger => new Logger()

/**
 * Singleton logger instance for consistent logging across the application.
 *
 * Provides centralized logging with automatic security sanitization and
 * environment-specific formatting. Use this instance for all application logging.
 *
 * @constant {Logger} logger - Configured logger instance
 * @example
 * import { logger } from '#utils/logger'
 * logger.info('User authenticated', { userId: 'user123' })
 */
export const logger = createLogger()

/**
 * Convenience function for standardized API request logging.
 *
 * Simplifies the common pattern of logging API requests with consistent
 * message formatting and structured context data. Now supports async
 * logging with Axiom integration.
 *
 * @param {string} endpoint - API endpoint being accessed
 * @param {string} method - HTTP method
 * @param {string} [userId] - User identifier for correlation
 * @returns {Promise<void>}
 * @example
 * await logApiRequest('/api/posts', 'GET', 'user123')
 * // Outputs: "API request to /api/posts" with structured context
 * @since 1.0.0
 */
export const logApiRequest = async (
  endpoint: string,
  method: string,
  userId?: string | undefined
): Promise<void> => {
  await logger.debug(`API request to ${endpoint}`, logger.apiRequest(endpoint, method, userId))
}

/**
 * Convenience function for standardized API response logging.
 *
 * @param {string} endpoint - API endpoint that responded
 * @param {number} status - HTTP status code
 * @param {string} [userId] - User identifier for correlation
 * @returns {Promise<void>}
 * @example
 * await logApiResponse('/api/posts', 200, 'user123')
 * @since 1.0.0
 */
export const logApiResponse = async (
  endpoint: string,
  status: number,
  userId?: string | undefined
): Promise<void> => {
  await logger.debug(`API response from ${endpoint}`, logger.apiResponse(endpoint, status, userId))
}

/**
 * Convenience function for standardized API error logging with error handling.
 *
 * Safely extracts error information from unknown error types and formats
 * them for consistent error logging. Handles both Error instances and
 * primitive error values.
 *
 * @param {string} endpoint - API endpoint where error occurred
 * @param {unknown} error - Error object or primitive value
 * @param {string} [userId] - User identifier for correlation
 * @returns {Promise<void>}
 * @example
 * try {
 *   await apiCall()
 * } catch (error) {
 *   await logApiError('/api/posts', error, 'user123')
 * }
 * @since 1.0.0
 */
export const logApiError = async (
  endpoint: string,
  error: unknown,
  userId?: string | undefined
): Promise<void> => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  await logger.error(`API error in ${endpoint}: ${message}`, {
    endpoint,
    userId: userId || undefined,
    error: error instanceof Error ? error.name : 'UnknownError',
  })
}
