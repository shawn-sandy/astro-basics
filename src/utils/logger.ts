export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured context for log entries with security-conscious design.
 *
 * Supports both common API patterns (userId, endpoint, method) and
 * arbitrary context data while maintaining type safety for sanitization.
 *
 * @interface LogContext
 * @property {string} [userId] - User identifier for request tracing
 * @property {string} [endpoint] - API endpoint for request correlation
 * @property {string} [method] - HTTP method for debugging context
 */
interface LogContext {
  userId?: string | undefined
  endpoint?: string | undefined
  method?: string | undefined
  [key: string]: unknown
}

/**
 * Structured log entry format for consistent output across environments.
 *
 * @interface LogEntry
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
 * Production-ready logger with environment-specific behavior and security features.
 *
 * Implements dual-mode logging: rich development experience with emojis and colors,
 * structured JSON logging for production environments. Includes automatic context
 * sanitization to prevent sensitive data leakage in logs.
 *
 * Design decisions:
 * - Singleton pattern for consistent logging across the application
 * - Environment detection for appropriate output formatting
 * - Security-first approach with automatic PII redaction
 * - Performance optimization by filtering log levels in production
 *
 * @class Logger
 * @example
 * // Basic usage
 * logger.info('User authenticated', { userId: 'user123' })
 *
 * // API request logging
 * logger.debug('API request', logger.apiRequest('/api/users', 'GET', 'user123'))
 *
 * @since 1.0.0
 */
class Logger {
  private isDev = import.meta.env.DEV
  private isProd = import.meta.env.PROD

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
   * Core logging method with environment-specific output formatting and performance optimization.
   *
   * Implements dual-mode logging strategy: human-friendly development output with visual
   * indicators versus machine-parseable JSON for production environments. Includes
   * production performance optimization by filtering verbose log levels.
   *
   * Business logic decisions:
   * - Production log level filtering reduces noise and improves performance
   * - Development mode prioritizes developer experience with visual formatting
   * - Structured JSON in production enables log aggregation and monitoring
   * - Context sanitization happens before output formatting for security
   *
   * @param {LogLevel} level - Log severity level for filtering and formatting
   * @param {string} message - Primary log message
   * @param {LogContext} [context] - Additional structured data (will be sanitized)
   * @returns {void}
   * @example
   * // Development output: "🔍 [DEBUG] API request { endpoint: '/api/users' }"
   * // Production output: {"timestamp":"2023-...","level":"debug","message":"API request","context":{...}}
   * @since 1.0.0
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // In production, only log warnings and errors
    if (this.isProd && (level === 'debug' || level === 'info')) {
      return
    }

    const logEntry = this.formatLogEntry(level, message, context)
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
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context)
  }

  /**
   * Creates standardized API request context for consistent logging patterns.
   *
   * Implements structured logging convention for API requests to enable
   * effective request tracing and debugging across the application.
   * Normalizes HTTP method casing for consistent log analysis.
   *
   * @param {string} endpoint - API endpoint being accessed (e.g., '/api/users')
   * @param {string} method - HTTP method, will be normalized to uppercase
   * @param {string} [userId] - User identifier for request correlation
   * @returns {LogContext} Structured context optimized for API request logging
   * @example
   * logger.debug('API request initiated', logger.apiRequest('/api/posts', 'get', 'user123'))
   * @since 1.0.0
   */
  apiRequest(endpoint: string, method: string, userId?: string | undefined): LogContext {
    return {
      endpoint,
      method: method.toUpperCase(),
      userId: userId || undefined,
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
export const logger = new Logger()

/**
 * Convenience function for standardized API request logging.
 *
 * Simplifies the common pattern of logging API requests with consistent
 * message formatting and structured context data.
 *
 * @param {string} endpoint - API endpoint being accessed
 * @param {string} method - HTTP method
 * @param {string} [userId] - User identifier for correlation
 * @example
 * logApiRequest('/api/posts', 'GET', 'user123')
 * // Outputs: "API request to /api/posts" with structured context
 * @since 1.0.0
 */
export const logApiRequest = (endpoint: string, method: string, userId?: string | undefined) => {
  logger.debug(`API request to ${endpoint}`, logger.apiRequest(endpoint, method, userId))
}

/**
 * Convenience function for standardized API response logging.
 *
 * @param {string} endpoint - API endpoint that responded
 * @param {number} status - HTTP status code
 * @param {string} [userId] - User identifier for correlation
 * @example
 * logApiResponse('/api/posts', 200, 'user123')
 * @since 1.0.0
 */
export const logApiResponse = (endpoint: string, status: number, userId?: string | undefined) => {
  logger.debug(`API response from ${endpoint}`, logger.apiResponse(endpoint, status, userId))
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
 * @example
 * try {
 *   await apiCall()
 * } catch (error) {
 *   logApiError('/api/posts', error, 'user123')
 * }
 * @since 1.0.0
 */
export const logApiError = (endpoint: string, error: unknown, userId?: string | undefined) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  logger.error(`API error in ${endpoint}: ${message}`, {
    endpoint,
    userId: userId || undefined,
    error: error instanceof Error ? error.name : 'UnknownError',
  })
}
