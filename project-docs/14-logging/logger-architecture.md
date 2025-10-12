# Logger Architecture & Technical Reference

**Version:** 1.0.0
**File Location:** [`src/utils/logger.ts`](../../src/utils/logger.ts)
**Last Updated:** 2025-10-11

## Overview

The logger utility is a production-ready logging system designed for the astro-basics project. It implements a sophisticated dual-mode logging approach with Axiom integration for persistent log storage, distributed tracing support, and automatic security sanitization.

### Key Features

- **Dual-mode logging:** Rich console output in development, structured JSON in production
- **Axiom integration:** Persistent log storage with automatic batching
- **Distributed tracing:** Correlation ID support for request tracking across services
- **Security-first:** Automatic PII redaction and context sanitization
- **Performance monitoring:** Built-in request duration tracking and slow request detection
- **Serverless-optimized:** Fire-and-forget delivery with critical flush mechanism
- **Type-safe:** Full TypeScript support with comprehensive interfaces

## Architecture

### Design Pattern: Singleton

The logger uses the singleton pattern to ensure consistent configuration and behavior across the entire application:

```typescript
// Single instance exported from module
export const logger = createLogger()

// Factory function for testing scenarios
export const createLogger = (): Logger => new Logger()
```

**Why Singleton?**

- Ensures consistent logging configuration application-wide
- Shares single Axiom client instance for efficient batching
- Prevents multiple initialization attempts in serverless environments
- Simplifies import and usage patterns

### Core Components

```
Logger Class
├── Initialization
│   ├── Environment detection (dev/prod)
│   ├── Axiom client setup (lazy, async)
│   └── Configuration validation
├── Logging Methods
│   ├── debug() - Development details
│   ├── info() - Informational messages
│   ├── warn() - Warning conditions
│   └── error() - Error conditions
├── API Helpers
│   ├── apiRequest() - Start request tracking
│   ├── apiComplete() - End request tracking
│   └── apiResponse() - Response context
├── Tracing
│   ├── createCorrelationId() - UUID v4 generation
│   └── Context propagation
└── Infrastructure
    ├── flush() - Force log delivery
    ├── sanitizeContext() - Security filtering
    └── logToAxiom() - Remote delivery
```

## Implementation Details

### 1. Environment Detection

```typescript
class Logger {
  private isDev = import.meta.env.DEV
  private isProd = import.meta.env.PROD
  // ...
}
```

**Impact:**

- Development: Emoji-prefixed console output with full context
- Production: Structured JSON for machine parsing, console filtering (warn/error only)

### 2. Axiom Initialization

```typescript
private initializeAxiom(): void {
  const axiomToken = import.meta.env.AXIOM_TOKEN
  const axiomDataset = import.meta.env.AXIOM_DATASET

  if (!axiomToken || !axiomDataset) {
    // Graceful fallback to console-only logging
    return
  }

  // Dynamic import prevents bundling in non-Axiom environments
  this._axiomInitialization = import('@axiomhq/js')
    .then(({ Axiom }) => {
      this.axiom = new Axiom({ token: axiomToken })
      this.axiomEnabled = true
    })
    .catch(() => {
      this.axiomEnabled = false
    })
}
```

**Design Decisions:**

- **Dynamic import:** Reduces bundle size when Axiom not used
- **Async initialization:** Non-blocking, happens in background
- **Graceful degradation:** Missing credentials don't break the app
- **Silent failure:** Logging errors don't disrupt application flow

### 3. Security: Context Sanitization

```typescript
private sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined

  const sanitized = { ...context }

  // Automatic PII redaction
  if (sanitized.token) sanitized.token = '[REDACTED]'
  if (sanitized.password) sanitized.password = '[REDACTED]'
  if (sanitized.secret) sanitized.secret = '[REDACTED]'
  if (sanitized.clerkToken) sanitized.clerkToken = '[REDACTED]'

  // Production: aggressive context filtering
  if (this.isProd) {
    return {
      userId: sanitized.userId,
      endpoint: sanitized.endpoint,
      method: sanitized.method,
    }
  }

  return sanitized
}
```

**Security Features:**

1. **Immutable sanitization:** Creates new object, doesn't modify original
2. **Known PII fields:** Automatic redaction of common sensitive fields
3. **Production filtering:** Only essential debugging fields retained
4. **Defense in depth:** Works even if developers accidentally log sensitive data

### 4. Dual-Mode Logging Strategy

#### Development Mode

```typescript
if (this.isDev) {
  const emoji = this.getDevEmoji(level)
  const prefix = `${emoji} [${level.toUpperCase()}]`

  if (context && Object.keys(context).length > 0) {
    consoleMethod(`${prefix} ${message}`, logEntry.context)
  } else {
    consoleMethod(`${prefix} ${message}`)
  }
}
```

**Output Example:**

```
ℹ️ [INFO] User authenticated { userId: 'user123', method: 'oauth' }
```

#### Production Mode

```typescript
else {
  // Structured JSON logging
  consoleMethod(JSON.stringify(logEntry))
}
```

**Output Example:**

```json
{
  "timestamp": "2025-10-11T12:34:56.789Z",
  "level": "info",
  "message": "User authenticated",
  "context": { "userId": "user123" }
}
```

**Why Dual-Mode?**

- Development: Human-friendly, quick scanning, context-rich
- Production: Machine-parseable, log aggregation compatible, consistent format

### 5. Axiom Integration

```typescript
private async logToAxiom(level: LogLevel, message: string, context?: LogContext): Promise<void> {
  if (!this.axiom || !this.axiomEnabled) return

  const logEntry = this.formatLogEntry(level, message, context)

  try {
    await this.axiom.ingest(dataset, [{
      _time: logEntry.timestamp,
      level: logEntry.level,
      message: logEntry.message,
      ...(logEntry.context || {}), // Flatten for querying
      environment: this.isProd ? 'production' : 'development',
      service: 'astro-basics',
    }])
  } catch (error) {
    // Fail silently - logging failures shouldn't break the app
    console.error('Failed to send log to Axiom:', error)
  }
}
```

**Key Characteristics:**

- **Fire-and-forget:** Non-blocking, doesn't slow down requests
- **Automatic batching:** Axiom SDK batches logs for efficiency
- **Flat structure:** Context flattened for optimal Axiom querying
- **Metadata enrichment:** Adds environment and service tags
- **Silent failure:** Axiom errors don't propagate to application

### 6. Performance Monitoring

```typescript
apiRequest(endpoint: string, method: string, userId?: string, correlationId?: string) {
  return {
    endpoint,
    method: method.toUpperCase(),
    userId: userId || undefined,
    correlationId: correlationId || this.createCorrelationId(),
    startTime: Date.now(), // Performance tracking
  }
}

async apiComplete(requestContext: LogContext & { startTime: number }, status: number) {
  const duration = Date.now() - requestContext.startTime

  await this.info('API request completed', {
    ...context,
    status,
    requestDuration: duration,
  })

  // Automatic slow request detection
  if (duration > 2000) {
    await this.warn('Slow API request detected', {
      ...context,
      requestDuration: duration,
      threshold: 2000,
    })
  }
}
```

**Performance Features:**

- **Automatic timing:** No manual duration calculation needed
- **Threshold alerting:** Warns on requests >2000ms (Netlify Functions have 10s timeout)
- **Zero overhead:** Timing happens regardless of Axiom availability
- **Metric collection:** Duration data flows to Axiom for analysis

### 7. Distributed Tracing

```typescript
createCorrelationId(): string {
  return randomUUID() // Cryptographically random UUID v4
}
```

**Correlation ID Flow:**

```
Middleware → Generate UUID
     ↓
API Route → Receives correlationId from locals
     ↓
Service Layer → Passes correlationId to functions
     ↓
Database/External APIs → Includes in context
     ↓
All Logs → Tagged with same correlationId
```

**Benefits:**

- End-to-end request tracing across services
- Debugging distributed systems
- Performance analysis by request
- Cross-service correlation with Clerk, Supabase

### 8. Serverless Flush Mechanism

```typescript
async flush(): Promise<void> {
  if (!this.axiom || !this.axiomEnabled) return

  try {
    await this.axiom.flush()
  } catch (error) {
    console.error('Failed to flush Axiom logs:', error)
  }
}
```

**Critical for Serverless:**

- Serverless functions terminate immediately after response
- Batched logs may not be delivered without explicit flush
- Must be called in `finally` block to ensure delivery
- Non-blocking but should complete before function exit

**Usage Pattern:**

```typescript
export const POST: APIRoute = async ({ request }) => {
  try {
    // Business logic
  } finally {
    await logger.flush() // CRITICAL
  }
}
```

## TypeScript Interfaces

### LogLevel

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
```

### LogContext

```typescript
interface LogContext {
  userId?: string
  endpoint?: string
  method?: string
  correlationId?: string
  requestDuration?: number
  traceId?: string // OpenTelemetry (future)
  spanId?: string // OpenTelemetry (future)
  clerkTraceId?: string // Clerk operation correlation
  supabaseQueryId?: string // Supabase query correlation
  status?: number
  [key: string]: unknown // Extensible for custom fields
}
```

### LogEntry

```typescript
interface LogEntry {
  timestamp: string // ISO 8601 format
  level: LogLevel
  message: string
  context?: LogContext
}
```

## API Reference

### Core Logging Methods

#### `debug(message: string, context?: LogContext): Promise<void>`

Log debug-level information. Filtered from production console output, but sent to Axiom.

**Usage:**

```typescript
await logger.debug('Processing data', { step: 1, data: result })
```

#### `info(message: string, context?: LogContext): Promise<void>`

Log informational messages about application flow.

**Usage:**

```typescript
await logger.info('User logged in', { userId: 'user123', method: 'oauth' })
```

#### `warn(message: string, context?: LogContext): Promise<void>`

Log warning conditions that may require attention.

**Usage:**

```typescript
await logger.warn('API rate limit approaching', { current: 450, limit: 500 })
```

#### `error(message: string, context?: LogContext): Promise<void>`

Log error conditions requiring immediate attention.

**Usage:**

```typescript
await logger.error('Database connection failed', { error: err.message, retryCount: 3 })
```

### API Helper Methods

#### `apiRequest(endpoint: string, method: string, userId?: string, correlationId?: string)`

Creates enriched context for API request tracking with performance monitoring.

**Returns:** `LogContext & { startTime: number }`

**Usage:**

```typescript
const ctx = logger.apiRequest('/api/users', 'GET', 'user123', correlationId)
```

#### `apiComplete(requestContext: LogContext & { startTime: number }, status: number): Promise<void>`

Logs API request completion with automatic duration calculation and slow request detection.

**Usage:**

```typescript
await logger.apiComplete(ctx, 200)
```

#### `apiResponse(endpoint: string, status: number, userId?: string): LogContext`

Creates standardized context for API response logging.

**Usage:**

```typescript
logger.info('API response', logger.apiResponse('/api/users', 200, 'user123'))
```

### Tracing Methods

#### `createCorrelationId(): string`

Generates cryptographically random UUID v4 for request correlation.

**Usage:**

```typescript
const correlationId = logger.createCorrelationId()
await logger.info('Request started', { correlationId })
```

### Infrastructure Methods

#### `flush(): Promise<void>`

Flushes pending logs to Axiom. **CRITICAL for serverless environments.**

**Usage:**

```typescript
await logger.flush()
```

## Convenience Functions

### `logApiRequest(endpoint: string, method: string, userId?: string): Promise<void>`

Simplified API request logging with standardized message format.

### `logApiResponse(endpoint: string, status: number, userId?: string): Promise<void>`

Simplified API response logging with standardized message format.

### `logApiError(endpoint: string, error: unknown, userId?: string): Promise<void>`

Simplified API error logging with safe error handling.

## Performance Characteristics

### Benchmarks

| Operation       | Duration | Notes                          |
| --------------- | -------- | ------------------------------ |
| Log creation    | <1ms     | Synchronous formatting         |
| Console output  | 1-5ms    | Native console methods         |
| Axiom delivery  | 5-50ms   | Fire-and-forget, non-blocking  |
| Flush operation | 10-100ms | Blocks until delivery complete |

### Memory Usage

- **Logger instance:** ~2KB (singleton, shared)
- **Per log entry:** ~500 bytes (average)
- **Axiom batch buffer:** ~10KB (max 1000 events)

### Scalability

- **Throughput:** 1000+ logs/second
- **Batch size:** Up to 1000 events per Axiom request
- **Buffer limit:** Automatic flushing at batch size
- **Rate limiting:** None (Axiom-side handled by SDK)

## Error Handling

### Graceful Degradation Strategy

1. **Missing Axiom credentials:** Fall back to console-only logging
2. **Axiom SDK load failure:** Disable remote logging, continue with console
3. **Axiom ingestion failure:** Log to console, don't throw error
4. **Console method failure:** Silent catch (extremely rare edge case)

### Error Flow

```
Log Method Called
    ↓
Context Sanitized (always succeeds)
    ↓
Try Console Output
    ↓ (failure)
Caught silently
    ↓
Try Axiom Delivery (fire-and-forget)
    ↓ (failure)
Console error, but app continues
    ↓
Application continues normally
```

## Integration Points

### Middleware Integration

```typescript
// src/middleware.ts
export const correlationMiddleware: MiddlewareHandler = async (context, next) => {
  context.locals.correlationId = logger.createCorrelationId()
  return next()
}
```

### API Route Integration

```typescript
// src/pages/api/*.ts
import { logger } from '#utils/logger'

export const GET: APIRoute = async ({ locals }) => {
  const ctx = logger.apiRequest('/api/endpoint', 'GET', locals.userId, locals.correlationId)

  try {
    // Business logic
    await logger.apiComplete(ctx, 200)
    return response
  } finally {
    await logger.flush()
  }
}
```

### Service Layer Integration

```typescript
// src/libs/database.ts
async function queryDatabase(correlationId: string) {
  await logger.debug('Querying database', { correlationId, query: 'SELECT...' })

  try {
    const result = await db.query()
    await logger.info('Query successful', { correlationId, rows: result.length })
    return result
  } catch (error) {
    await logger.error('Query failed', { correlationId, error: error.message })
    throw error
  }
}
```

## Security Considerations

### Automatic PII Redaction

Protected fields (automatically redacted to `[REDACTED]`):

- `token`
- `password`
- `secret`
- `clerkToken`
- Custom: Add to `sanitizeContext()` method

### Production Context Filtering

In production mode, only these fields survive sanitization:

- `userId` (for user correlation)
- `endpoint` (for API tracking)
- `method` (for HTTP method tracking)

All other fields are stripped to minimize data exposure and log size.

### Recommendations

1. **Never log raw user input** - Always validate/sanitize first
2. **Use context objects** - Structured data is safer than string interpolation
3. **Review custom context** - Avoid adding sensitive fields
4. **Enable Axiom RBAC** - Restrict log access to authorized personnel only
5. **Rotate Axiom tokens** - Regularly update `AXIOM_TOKEN` environment variable

## Testing Considerations

### Unit Testing

```typescript
import { createLogger } from '#utils/logger'

describe('Logger', () => {
  it('should sanitize sensitive context', () => {
    const logger = createLogger()
    // Spy on console.* methods
    // Test context sanitization logic
  })
})
```

### Integration Testing

```typescript
// Test with real Axiom credentials (test dataset)
import { logger } from '#utils/logger'

test('should send logs to Axiom', async () => {
  await logger.info('Test log', { testId: 'integration-test-123' })
  await logger.flush()

  // Query Axiom to verify log delivery
  // Use Axiom Query API to check for testId
})
```

### Testing Patterns

1. **Mock Axiom client** for fast unit tests
2. **Use test dataset** for integration tests
3. **Spy on console methods** to verify console output
4. **Test correlation ID propagation** across service boundaries
5. **Verify flush behavior** in serverless scenarios

## Migration from console.\*

### Before (console-based logging)

```typescript
console.log('User logged in:', userId)
console.error('Failed to fetch data:', error)
```

### After (structured logging)

```typescript
await logger.info('User logged in', { userId })
await logger.error('Failed to fetch data', { endpoint: '/api/data', error: error.message })
```

### Migration Checklist

- [ ] Replace all `console.log()` with `logger.debug()` or `logger.info()`
- [ ] Replace all `console.warn()` with `logger.warn()`
- [ ] Replace all `console.error()` with `logger.error()`
- [ ] Add structured context objects to all log calls
- [ ] Implement correlation ID propagation
- [ ] Add `logger.flush()` to serverless functions
- [ ] Update types to include `correlationId` in `Locals` interface

## Future Enhancements

### Planned Features

1. **OpenTelemetry integration**
   - Span creation and propagation
   - Trace context injection
   - Distributed tracing visualization

2. **Log sampling**
   - Reduce log volume in high-traffic scenarios
   - Configurable sampling rates by log level

3. **Custom formatters**
   - User-defined log formatting
   - Plugin system for custom transports

4. **Log buffering**
   - Configurable batch sizes
   - Compression before delivery

5. **Metrics extraction**
   - Automatic metric generation from logs
   - Prometheus-compatible output

## Related Documentation

- [Axiom Setup Guide](./axiom-setup-guide.md) - Configuration and deployment
- [Axiom Usage Guide](./axiom-usage-guide.md) - Practical examples and patterns
- [Axiom Integration Implementation](./axiom-integration-implementation.md) - Implementation details
- [Implementation Status](./implementation-status.md) - Current state and roadmap

## References

- [Axiom Documentation](https://axiom.co/docs)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/)
- [Structured Logging Best Practices](https://www.honeycomb.io/blog/structured-logging-best-practices)
- [Serverless Observability](https://docs.aws.amazon.com/lambda/latest/dg/lambda-monitoring.html)

---

**Document Status:** Complete
**Maintainer:** astro-basics team
**Review Cycle:** Quarterly or on major logger changes
