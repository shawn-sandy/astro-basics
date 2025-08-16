export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string | undefined
  endpoint?: string | undefined
  method?: string | undefined
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext | undefined
}

class Logger {
  private isDev = import.meta.env.DEV
  private isProd = import.meta.env.PROD

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

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

  // Helper method for API endpoints
  apiRequest(endpoint: string, method: string, userId?: string | undefined): LogContext {
    return {
      endpoint,
      method: method.toUpperCase(),
      userId: userId || undefined,
    }
  }

  // Helper method for API responses
  apiResponse(endpoint: string, status: number, userId?: string | undefined): LogContext {
    return {
      endpoint,
      status,
      userId: userId || undefined,
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Helper functions for common logging patterns
export const logApiRequest = (endpoint: string, method: string, userId?: string | undefined) => {
  logger.debug(`API request to ${endpoint}`, logger.apiRequest(endpoint, method, userId))
}

export const logApiResponse = (endpoint: string, status: number, userId?: string | undefined) => {
  logger.debug(`API response from ${endpoint}`, logger.apiResponse(endpoint, status, userId))
}

export const logApiError = (endpoint: string, error: unknown, userId?: string | undefined) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  logger.error(`API error in ${endpoint}: ${message}`, {
    endpoint,
    userId: userId || undefined,
    error: error instanceof Error ? error.name : 'UnknownError',
  })
}
