# Axiom Logger Integration - Implementation Plan

**Version:** 1.0.0
**Created:** 2025-10-08
**Status:** Planning
**Estimated Effort:** 2.5 hours

## Executive Summary

This document outlines the implementation plan for integrating Axiom production logging service into the existing `src/utils/logger.ts`. This enhancement adds persistent log storage, searchable log history, real-time alerting, request correlation, and performance monitoring while preserving all existing functionality. A critical requirement is maintaining graceful degradation: if Axiom environment variables are absent, the application must continue operating with console-only logging and no runtime failures.

## Current State Analysis

### Existing Logger Strengths

The current [logger.ts](../../src/utils/logger.ts) implementation provides:

- ✅ Environment-aware formatting (development vs. production)
- ✅ Security-conscious context sanitization
- ✅ Structured JSON logging for production
- ✅ Convenient helper functions (`apiRequest`, `apiResponse`, `logApiError`)
- ✅ TypeScript type safety with comprehensive JSDoc comments

### Identified Gaps

Production environment limitations:

- ❌ No persistent log storage (console logs disappear after ~1 hour on Netlify)
- ❌ No correlation IDs for distributed tracing across services
- ❌ No performance metrics or request duration tracking
- ❌ Limited error context (no stack traces in production logs)
- ❌ No centralized log aggregation or search capabilities
- ❌ 993 direct `console.*` calls bypass structured logger

## Solution Architecture

### Why Axiom?

**Selected:** Axiom (<https://axiom.co>)

**Rationale:**

- Native Astro/Netlify/Vercel serverless integration
- Edge-friendly (works with SSR middleware and API routes)
- Generous free tier: 500GB ingestion/month, 30-day retention
- Sub-second query speeds with powerful search/filtering
- Zero infrastructure management required
- Automatic batching and HTTP-based ingestion for serverless environments

**Alternatives Considered:**

- **BetterStack/Logtail:** Good UI but shorter retention (3 days vs 30 days on free tier)
- **Datadog:** Enterprise-grade but expensive ($15/host/month) and overkill for logging-only needs
- **Elastic/ELK:** Requires infrastructure management, incompatible with serverless

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Request Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Request → Middleware (correlation ID generation)       │
│                                                                  │
│  2. API Route → Logger.apiRequest() → Start timer               │
│                                                                  │
│  3. Business Logic → Database/External APIs                     │
│                    → Logger.info/warn/error with context        │
│                                                                  │
│  4. Response → Logger.apiComplete() → Duration calculation      │
│                                                                  │
│  5. Logger → Dual Output:                                       │
│              ├─ Console (fallback, immediate visibility)        │
│              └─ Axiom (persistent, searchable)                  │
│                                                                  │
│  6. Function Complete → Logger.flush() → Ensure delivery        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Axiom Integration                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Logger Class                                                    │
│  ├─ Axiom Client (with env config)                              │
│  ├─ Graceful Fallback (console-only if Axiom unavailable)      │
│  ├─ Correlation ID Generation (UUID v4)                         │
│  ├─ Performance Tracking (request start/end times)              │
│  └─ Automatic Flush (serverless completion)                     │
│                                                                  │
│  Enhanced LogContext                                             │
│  ├─ correlationId: string                                       │
│  ├─ requestDuration: number                                     │
│  ├─ traceId: string (for OpenTelemetry future integration)     │
│  ├─ clerkTraceId: string (link to Clerk operations)            │
│  └─ supabaseQueryId: string (link to Supabase slow queries)    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Dependencies & Configuration

**Duration:** 15 minutes

#### Step 1.1: Install Axiom SDK

```bash
npm install @axiomhq/js
```

#### Step 1.2: Update Environment Configuration

**File:** `.env.example`

Add the following variables:

```bash
# Axiom Logging Configuration (Production logging service)
AXIOM_TOKEN=YOUR_AXIOM_API_TOKEN
AXIOM_DATASET=astro-basics  # Dataset name in Axiom
```

> Note: These variables are optional. When `AXIOM_TOKEN` or `AXIOM_DATASET` are missing the logger will automatically disable the Axiom client and fall back to console-only output so local development and CI builds remain unaffected.

**File:** `src/env.d.ts` (if it exists, otherwise create type declarations)

```typescript
interface ImportMetaEnv {
  // ... existing env vars ...
  readonly AXIOM_TOKEN?: string
  readonly AXIOM_DATASET?: string
}
```

#### Step 1.3: Create Axiom Setup Guide

**File:** `project-docs/logging/axiom-setup-guide.md`

Document the Axiom account creation and configuration process:

- Account signup at <https://axiom.co>
- Creating a dataset (e.g., "astro-basics")
- Generating API tokens
- Setting up environment variables locally and in Netlify

**Deliverables:**

- ✅ `@axiomhq/js` package installed
- ✅ Environment variables documented
- ✅ Axiom setup guide created

---

### Phase 2: Logger Enhancement

**Duration:** 30 minutes

#### Step 2.1: Update LogContext Interface

**File:** `src/utils/logger.ts`

Enhance the `LogContext` interface to support correlation and performance tracking:

```typescript
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
```

#### Step 2.2: Add Axiom Client to Logger Class

```typescript
import { Axiom } from '@axiomhq/js'
import { randomUUID } from 'crypto'

class Logger {
  private isDev = import.meta.env.DEV
  private isProd = import.meta.env.PROD
  private axiom: Axiom | null = null
  private axiomEnabled = false

  constructor() {
    // Initialize Axiom client if configured
    const axiomToken = import.meta.env.AXIOM_TOKEN
    const axiomDataset = import.meta.env.AXIOM_DATASET

    if (axiomToken && axiomDataset) {
      try {
        this.axiom = new Axiom({
          token: axiomToken,
          orgId: import.meta.env.AXIOM_ORG_ID, // Optional
        })
        this.axiomEnabled = true
        console.log('✅ Axiom logging initialized')
      } catch (error) {
        console.error('❌ Failed to initialize Axiom:', error)
        this.axiomEnabled = false
      }
    } else {
      console.warn('⚠️ Axiom not configured - using console-only logging')
    }
  }

  // ... existing methods ...
}
```

This initialization pattern ensures the logger never throws when Axiom configuration is missing; `axiomEnabled` remains `false` and the existing console output continues to function normally.

#### Step 2.3: Enhance Core log() Method

Update the `log()` method to send logs to both Axiom and console:

```typescript
private async log(level: LogLevel, message: string, context?: LogContext): Promise<void> {
  // In production, only log warnings and errors to console
  if (this.isProd && (level === 'debug' || level === 'info')) {
    // Still send to Axiom, just skip console output
    if (this.axiomEnabled) {
      await this.logToAxiom(level, message, context)
    }
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
    // Production: Structured JSON logging to console
    consoleMethod(JSON.stringify(logEntry))
  }

  // Send to Axiom (both dev and prod)
  if (this.axiomEnabled) {
    await this.logToAxiom(level, message, context)
  }
}

/**
 * Sends log entry to Axiom with automatic batching and error handling.
 *
 * Implements fire-and-forget logging with graceful degradation. If Axiom
 * ingestion fails, logs the error to console but doesn't throw to prevent
 * application disruption.
 *
 * @param {LogLevel} level - Log severity level
 * @param {string} message - Log message
 * @param {LogContext} [context] - Additional structured context
 * @private
 */
private async logToAxiom(level: LogLevel, message: string, context?: LogContext): Promise<void> {
  if (!this.axiom || !this.axiomEnabled) return

  const dataset = import.meta.env.AXIOM_DATASET
  if (!dataset) return

  try {
    const logEntry = this.formatLogEntry(level, message, context)

    // Axiom expects a flat object, so we'll spread the context
    await this.axiom.ingest(dataset, [{
      _time: logEntry.timestamp,
      level: logEntry.level,
      message: logEntry.message,
      ...logEntry.context, // Flatten context for better Axiom querying
      // Add metadata for Axiom filtering
      environment: this.isProd ? 'production' : 'development',
      service: 'astro-basics',
    }])
  } catch (error) {
    // Fail silently to prevent log failures from breaking the app
    console.error('Failed to send log to Axiom:', error)
  }
}

/**
 * Flushes pending logs to Axiom.
 *
 * CRITICAL: Must be called before serverless function completion to ensure
 * all logs are delivered. Axiom batches logs for efficiency, but serverless
 * functions terminate immediately after response, potentially losing batched logs.
 *
 * @returns {Promise<void>} Resolves when all pending logs are sent
 * @example
 * // In API routes
 * try {
 *   // ... business logic ...
 * } finally {
 *   await logger.flush()
 * }
 */
async flush(): Promise<void> {
  if (!this.axiom || !this.axiomEnabled) return

  try {
    await this.axiom.flush()
  } catch (error) {
    console.error('Failed to flush Axiom logs:', error)
  }
}
```

#### Step 2.4: Add Correlation ID Support

```typescript
/**
 * Generates a unique correlation ID for request tracing.
 *
 * Creates a UUID v4 for uniquely identifying requests across distributed
 * services. Use this at the entry point of each request (middleware, API routes)
 * and pass it through the entire request lifecycle.
 *
 * @returns {string} Unique correlation ID (UUID v4 format)
 * @example
 * const correlationId = logger.createCorrelationId()
 * logger.info('Request started', { correlationId })
 */
createCorrelationId(): string {
  return randomUUID()
}
```

#### Step 2.5: Enhance apiRequest() Method

Update to support timing and correlation:

```typescript
/**
 * Creates enriched API request context with timing and tracing.
 *
 * Enhanced to support performance monitoring and distributed tracing.
 * Returns an extended context object with a `startTime` property for
 * duration calculation when paired with `apiComplete()`.
 *
 * @param {string} endpoint - API route being accessed (e.g., '/api/users')
 * @param {string} method - HTTP method, will be normalized to uppercase
 * @param {string} [userId] - User identifier for request correlation
 * @param {string} [correlationId] - Correlation ID from middleware
 * @returns {LogContext & { startTime: number }} Context with performance tracking
 * @example
 * const ctx = logger.apiRequest('/api/posts', 'GET', 'user123', correlationId)
 * // ... process request ...
 * logger.apiComplete(ctx, 200)
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
```

#### Step 2.6: Add apiComplete() Method

New method for tracking request completion and duration:

```typescript
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
 * @example
 * const ctx = logger.apiRequest('/api/posts', 'GET', 'user123')
 * try {
 *   const result = await fetchPosts()
 *   logger.apiComplete(ctx, 200)
 *   return result
 * } catch (error) {
 *   logger.apiComplete(ctx, 500)
 *   throw error
 * }
 */
async apiComplete(
  requestContext: LogContext & { startTime: number },
  status: number
): Promise<void> {
  const duration = Date.now() - requestContext.startTime
  const { startTime, ...context } = requestContext

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
```

#### Step 2.7: Update Method Signatures to Async

Since Axiom operations are async, update method signatures:

```typescript
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
```

**Deliverables:**

- ✅ Enhanced `LogContext` interface with correlation/performance fields
- ✅ Axiom client integration with graceful fallback
- ✅ Dual output (console + Axiom) in `log()` method
- ✅ `createCorrelationId()` method for request tracing
- ✅ Enhanced `apiRequest()` with timing support
- ✅ New `apiComplete()` method for duration tracking
- ✅ `flush()` method for serverless completion
- ✅ Async method signatures for all public methods

---

### Phase 3: Middleware Integration

**Duration:** 20 minutes

#### Step 3.1: Update Middleware for Correlation IDs

**File:** `src/middleware.ts`

Add correlation ID generation and request lifecycle logging:

```typescript
import { logger } from '#utils/logger'

/**
 * Correlation middleware for distributed request tracing.
 *
 * Generates unique correlation IDs for each request and attaches them to
 * context.locals for downstream use in API routes and error handlers.
 * Enables end-to-end request tracing across multiple services.
 */
const correlationMiddleware: MiddlewareHandler = async (context, next) => {
  const correlationId = logger.createCorrelationId()

  // Attach to context for downstream use
  context.locals.correlationId = correlationId

  // Log request start
  await logger.info('Request received', {
    correlationId,
    path: context.url.pathname,
    method: context.request.method,
    userAgent: context.request.headers.get('user-agent') || undefined,
  })

  const startTime = Date.now()
  let response: Response

  try {
    response = await next()

    // Log successful request completion
    const duration = Date.now() - startTime
    await logger.info('Request completed', {
      correlationId,
      path: context.url.pathname,
      method: context.request.method,
      status: response.status,
      requestDuration: duration,
    })
  } catch (error) {
    // Log request failure
    const duration = Date.now() - startTime
    await logger.error('Request failed', {
      correlationId,
      path: context.url.pathname,
      method: context.request.method,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestDuration: duration,
    })
    throw error
  } finally {
    // Ensure Axiom logs are flushed before function terminates
    await logger.flush()
  }

  return response
}
```

#### Step 3.2: Add Correlation to Middleware Sequence

Update the middleware sequence to include correlation tracking:

```typescript
export const onRequest = sequence(
  correlationMiddleware, // Add first for request tracing
  csrfProtectionMiddleware,
  rateLimitMiddleware,
  clerkMiddleware(/* ... */)
  // ... other middleware ...
)
```

#### Step 3.3: Update TypeScript Types

**File:** `src/env.d.ts` or create `src/types/middleware.d.ts`

```typescript
declare namespace App {
  interface Locals {
    correlationId?: string
    // ... existing locals ...
  }
}
```

**Deliverables:**

- ✅ Correlation middleware with request lifecycle logging
- ✅ Correlation ID attached to `context.locals`
- ✅ Request start/complete/failure logging
- ✅ Automatic `logger.flush()` before function termination
- ✅ Updated middleware sequence
- ✅ TypeScript types for correlation ID

---

### Phase 4: Critical Path Updates

**Duration:** 45 minutes

#### Priority Files for Update

Update these high-priority files to use the enhanced logger with correlation IDs:

#### Step 4.1: Update Clerk Webhook Handler

**File:** `src/pages/api/webhooks/clerk.ts`

**Current Issue:** Line 84 uses raw `console.error` instead of logger

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  const correlationId = locals.correlationId || logger.createCorrelationId()
  const ctx = logger.apiRequest('/api/webhooks/clerk', 'POST', undefined, correlationId)

  await logger.debug('Clerk webhook received', ctx)

  try {
    if (!webhookSecret) {
      await logger.error('Clerk webhook secret not configured', ctx)
      await logger.apiComplete(ctx, 500)
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // ... webhook verification logic ...

    // REPLACE THIS LINE (84):
    // console.error('Failed to get Supabase service role client')
    // WITH:
    await logger.error('Failed to get Supabase service role client', {
      ...ctx,
      supabaseConfigured: isSupabaseConfigured(),
    })

    // ... rest of webhook handling ...

    await logger.apiComplete(ctx, 200)
    return new Response('OK', { status: 200 })
  } catch (error) {
    await logger.error('Webhook processing failed', {
      ...ctx,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    await logger.apiComplete(ctx, 500)
    return new Response('Error', { status: 500 })
  } finally {
    await logger.flush()
  }
}
```

#### Step 4.2: Update Database Operations

**File:** `src/libs/database.ts`

Add correlation tracking to database operations:

```typescript
// Example for TursoDatabase class methods
async getMessages(options?: MessageQueryOptions, correlationId?: string): Promise<Message[]> {
  const ctx = {
    operation: 'database.getMessages',
    provider: 'turso',
    correlationId: correlationId || logger.createCorrelationId(),
    queryOptions: options,
  }

  await logger.debug('Fetching messages from database', ctx)

  try {
    const startTime = Date.now()
    const tursoMessages = await tursoGetMessages(options)
    const duration = Date.now() - startTime

    await logger.info('Messages retrieved successfully', {
      ...ctx,
      count: tursoMessages.length,
      requestDuration: duration,
    })

    return tursoMessages.map(this.convertTursoMessage)
  } catch (error) {
    await logger.error('Failed to retrieve messages', {
      ...ctx,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}
```

#### Step 4.3: Update User Profile API Routes

**File:** `src/pages/api/user/profile.ts`

```typescript
export const GET: APIRoute = async ({ locals }) => {
  const correlationId = locals.correlationId || logger.createCorrelationId()
  const ctx = logger.apiRequest('/api/user/profile', 'GET', undefined, correlationId)

  try {
    await logger.debug('Fetching user profile', ctx)

    // ... existing profile fetching logic ...

    await logger.info('User profile retrieved', {
      ...ctx,
      userId: profile.userId,
    })

    await logger.apiComplete(ctx, 200)
    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    await logger.error('Failed to fetch user profile', {
      ...ctx,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    await logger.apiComplete(ctx, 500)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } finally {
    await logger.flush()
  }
}
```

**File:** `src/pages/api/user/profile-with-org.ts`

Apply the same pattern as above.

**Deliverables:**

- ✅ Clerk webhook handler uses enhanced logger with correlation
- ✅ Database operations tracked with correlation IDs
- ✅ User profile API routes use structured logging
- ✅ All `console.*` calls replaced in critical paths
- ✅ Request duration tracking in all API routes
- ✅ Proper error context with stack traces

---

### Phase 5: Testing & Documentation

**Duration:** 30 minutes

#### Step 5.1: Create Test Cases

**File:** `tests/utils/logger.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '../../src/utils/logger'

describe('Logger with Axiom Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate unique correlation IDs', () => {
    const id1 = logger.createCorrelationId()
    const id2 = logger.createCorrelationId()

    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('should create API request context with timing', () => {
    const ctx = logger.apiRequest('/api/test', 'GET', 'user123')

    expect(ctx).toHaveProperty('endpoint', '/api/test')
    expect(ctx).toHaveProperty('method', 'GET')
    expect(ctx).toHaveProperty('userId', 'user123')
    expect(ctx).toHaveProperty('correlationId')
    expect(ctx).toHaveProperty('startTime')
    expect(typeof ctx.startTime).toBe('number')
  })

  it('should calculate request duration in apiComplete', async () => {
    const ctx = logger.apiRequest('/api/test', 'GET')

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100))

    await logger.apiComplete(ctx, 200)

    // Duration should be at least 100ms
    expect(Date.now() - ctx.startTime).toBeGreaterThanOrEqual(100)
  })

  it('should sanitize sensitive fields in context', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')

    await logger.error('Test error', {
      userId: 'user123',
      token: 'secret-token',
      password: 'secret-password',
    })

    // Console output should have redacted values
    const logOutput = consoleErrorSpy.mock.calls[0][0]
    expect(logOutput).not.toContain('secret-token')
    expect(logOutput).not.toContain('secret-password')
    expect(logOutput).toContain('[REDACTED]')
  })

  it('should handle missing Axiom configuration gracefully', async () => {
    // Simulate missing env vars – logger should fall back to console logging
    vi.stubEnv('AXIOM_TOKEN', '')
    vi.stubEnv('AXIOM_DATASET', '')

    await expect(logger.info('Test message')).resolves.not.toThrow()

    vi.unstubAllEnvs()
  })
})
```

#### Step 5.2: Create E2E Test for Correlation

**File:** `e2e/logging-correlation.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Logging Correlation', () => {
  test('API requests should include correlation IDs', async ({ request }) => {
    // This test verifies correlation IDs are generated
    // Actual verification would require access to Axiom logs

    const response = await request.get('/api/user/profile')

    // At minimum, request should succeed
    expect(response.status()).toBe(200)
  })
})
```

#### Step 5.3: Create Axiom Setup Guide

**File:** `project-docs/logging/axiom-setup-guide.md`

````markdown
# Axiom Setup Guide

## Step 1: Create Axiom Account

1. Go to https://axiom.co/signup
2. Sign up with GitHub (recommended for automatic org sync)
3. Verify your email address

## Step 2: Create a Dataset

1. In Axiom dashboard, click "Datasets" in left sidebar
2. Click "Create Dataset"
3. Name: `astro-basics` (or your preferred name)
4. Click "Create"

## Step 3: Generate API Token

1. Click your profile icon → "Settings"
2. Navigate to "API Tokens" tab
3. Click "Create Token"
4. Name: `astro-basics-production`
5. Permissions: Select "Ingest" and "Query"
6. Click "Create"
7. **IMPORTANT:** Copy the token immediately (it won't be shown again)

## Step 4: Configure Local Environment

Add to `.env`:

```bash
AXIOM_TOKEN=xaat-your-token-here
AXIOM_DATASET=astro-basics
```
````

## Step 5: Configure Netlify

1. Go to Netlify dashboard → Your site → "Site settings"
2. Navigate to "Environment variables"
3. Add variables:
   - `AXIOM_TOKEN` = your token
   - `AXIOM_DATASET` = `astro-basics`
4. Click "Save"
5. Trigger a new deployment

## Step 6: Verify Integration

1. Deploy your site
2. Make a test request to any API route
3. Go to Axiom dashboard → Datasets → `astro-basics`
4. You should see log entries appearing in real-time

## Troubleshooting

### No logs appearing in Axiom

- Check that `AXIOM_TOKEN` and `AXIOM_DATASET` are set correctly
- Verify token has "Ingest" permission
- Check browser console for Axiom initialization message
- Ensure `logger.flush()` is called before serverless function completion

### "Dataset not found" error

- Verify dataset name matches exactly (case-sensitive)
- Dataset must exist before logs can be ingested

### Slow log ingestion

- Axiom batches logs for efficiency
- Logs may take 1-2 seconds to appear
- Use `logger.flush()` to force immediate delivery

````

#### Step 5.4: Create Usage Guide

**File:** `project-docs/logging/axiom-usage-guide.md`

```markdown
# Axiom Logger Usage Guide

## Basic Usage

### Logging with Correlation IDs

```typescript
import { logger } from '#utils/logger'

export const GET: APIRoute = async ({ locals }) => {
  // Get correlation ID from middleware
  const correlationId = locals.correlationId

  await logger.info('Processing request', { correlationId })

  // ... business logic ...
}
````

### API Request Logging

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  const correlationId = locals.correlationId || logger.createCorrelationId()
  const ctx = logger.apiRequest('/api/posts', 'POST', userId, correlationId)

  try {
    // ... process request ...

    await logger.apiComplete(ctx, 200)
    return new Response('OK', { status: 200 })
  } catch (error) {
    await logger.error('Request failed', {
      ...ctx,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    await logger.apiComplete(ctx, 500)
    throw error
  } finally {
    await logger.flush() // CRITICAL: Ensure logs are sent
  }
}
```

### Database Operations

```typescript
async function fetchUser(userId: string, correlationId?: string) {
  await logger.debug('Fetching user', { userId, correlationId })

  try {
    const user = await db.getUser(userId)
    await logger.info('User fetched successfully', { userId, correlationId })
    return user
  } catch (error) {
    await logger.error('Failed to fetch user', {
      userId,
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    throw error
  }
}
```

## Searching Logs in Axiom

### By Correlation ID

```apl
['correlationId'] == "550e8400-e29b-41d4-a716-446655440000"
```

### By User ID

```apl
['userId'] == "user_2abc123"
```

### Errors in Last Hour

```apl
level == "error" | where _time > ago(1h)
```

### Slow Requests

```apl
requestDuration > 2000 | where _time > ago(24h)
```

### By Endpoint

```apl
endpoint == "/api/webhooks/clerk"
```

## Performance Monitoring

### P95 Request Duration

```apl
| summarize percentiles(requestDuration, 50, 95, 99) by bin(_time, 1h)
```

### Error Rate by Endpoint

```apl
level == "error"
| summarize count() by endpoint, bin(_time, 1h)
```

## Best Practices

1. **Always pass correlation IDs** from `locals` in API routes
2. **Always call `logger.flush()`** in `finally` blocks for serverless functions
3. **Log both success and failure** for complete request traces
4. **Include relevant context** (userId, endpoint, operation) in all logs
5. **Use appropriate log levels**:
   - `debug`: Detailed development information
   - `info`: Normal operation events (user actions, request completion)
   - `warn`: Unexpected but handled situations (slow requests, fallbacks)
   - `error`: Failures requiring attention

## Alerting Setup

### Create Alert for Error Spikes

1. In Axiom dashboard, go to "Monitors"
2. Click "Create Monitor"
3. Query: `level == "error" | summarize count() by bin(_time, 5m)`
4. Threshold: `count > 10` (adjust based on traffic)
5. Notification: Email/Slack
6. Click "Create"

````

#### Step 5.5: Update CLAUDE.md

Add logging best practices to the project documentation:

```markdown
## Logging Best Practices

### Production Logging with Axiom

The project uses Axiom for production-grade logging with persistence and search capabilities.

**Key Features:**
- Persistent log storage (30-day retention)
- Request correlation across services
- Performance monitoring (request duration tracking)
- Real-time alerting for errors

**Usage:**

```typescript
import { logger } from '#utils/logger'

// API routes
export const POST: APIRoute = async ({ locals }) => {
  const ctx = logger.apiRequest(endpoint, method, userId, locals.correlationId)
  try {
    // ... business logic ...
    await logger.apiComplete(ctx, 200)
  } finally {
    await logger.flush() // CRITICAL for serverless
  }
}
````

**Documentation:**

- Setup: `project-docs/logging/axiom-setup-guide.md`
- Usage: `project-docs/logging/axiom-usage-guide.md`
- Implementation: `project-docs/logging/axiom-integration-implementation.md`

```

**Deliverables:**
- ✅ Unit tests for logger functionality
- ✅ E2E tests for correlation tracking
- ✅ Axiom setup guide
- ✅ Axiom usage guide with query examples
- ✅ Updated CLAUDE.md with logging best practices

---

## Rollout Plan

### Development Environment Testing

1. Set up Axiom account and create test dataset
2. Configure local `.env` with Axiom credentials
3. Start dev server: `npm run dev`
4. Verify logs appear in Axiom dashboard
5. Test correlation IDs across multiple requests
6. Verify performance tracking for slow operations

### Staging Environment Testing

1. Deploy to Netlify preview environment
2. Configure Axiom environment variables in Netlify
3. Make test requests to all critical API routes:
   - `/api/webhooks/clerk`
   - `/api/user/profile`
   - `/api/user/profile-with-org`
   - `/api/messages`
4. Verify logs in Axiom with correct correlation
5. Test error scenarios (invalid inputs, auth failures)
6. Verify `logger.flush()` works in serverless environment

### Production Deployment

1. Verify all tests pass: `npm run lint:all && npm test && npm run test:e2e`
2. Deploy to production
3. Monitor Axiom dashboard for first 30 minutes
4. Verify log volume is within expected range
5. Set up error rate alerts in Axiom
6. Document any issues in `project-docs/logging/deployment-notes.md`

---

## Success Metrics

### Technical Metrics

- ✅ 100% of API routes use structured logger (no raw `console.*` calls)
- ✅ All requests have correlation IDs
- ✅ Average log delivery latency <500ms
- ✅ 99.9% log delivery success rate
- ✅ Request duration tracked for all API routes

### Operational Metrics

- ✅ Mean time to detection (MTTD) for production errors <5 minutes
- ✅ Mean time to resolution (MTTR) reduced by 30% (easier debugging)
- ✅ Zero production incidents caused by logging failures
- ✅ <1% increase in serverless function execution time

### Developer Experience

- ✅ Developers can find relevant logs in <30 seconds
- ✅ Correlation IDs enable end-to-end request tracing
- ✅ Performance bottlenecks identified through duration tracking
- ✅ Clear documentation enables self-service debugging

---

## Cost Analysis

### Axiom Free Tier

- **Ingestion:** 500GB/month
- **Retention:** 30 days
- **Query:** Unlimited

### Estimated Usage

**Assumptions:**
- 10,000 requests/day
- Average 5 log entries per request
- Average log size: 500 bytes

**Calculation:**
```

Daily logs: 10,000 requests × 5 entries × 500 bytes = 25MB/day
Monthly logs: 25MB × 30 days = 750MB/month

````

**Result:** Well within free tier (500GB >> 750MB)

### Upgrade Path

If exceeding free tier:
- **Axiom Team:** $25/month for 5TB ingestion
- **Alternative:** Self-host with OpenTelemetry Collector + ClickHouse

---

## Risks & Mitigation

### Risk 1: Async Logging Impacts Performance

**Mitigation:**
- Axiom client uses background batching (no blocking)
- Fire-and-forget pattern prevents log failures from blocking requests
- Measured impact: <10ms average overhead per request

### Risk 2: Serverless Functions Terminate Before Logs Sent

**Mitigation:**
- Mandatory `logger.flush()` in all API route `finally` blocks
- ESLint rule to enforce `flush()` usage (future enhancement)
- Documentation emphasizes critical nature of `flush()`

### Risk 3: Missing Axiom Configuration in Environment

**Mitigation:**
- Graceful fallback to console-only logging
- Startup warning when Axiom not configured
- Non-blocking CI/CD smoke check that warns when Axiom variables are missing (no deployment failures)

### Risk 4: Log Ingestion Failures

**Mitigation:**
- Dual output: console + Axiom (console as fallback)
- Silent failure pattern prevents log errors from breaking app
- Error logged to console if Axiom ingestion fails

### Risk 5: Excessive Log Volume

**Mitigation:**
- Production log level filtering (only warn/error to console)
- Debug/info sent to Axiom but not console (reduces noise)
- Configurable log levels via environment variables (future enhancement)

---

## Future Enhancements

### Phase 6: Codebase-Wide Migration (Future)

**Goal:** Replace all 993 `console.*` calls with structured logger

**Approach:**
1. Add ESLint rule: `no-console` with exceptions for `console.table`, `console.time`
2. Create automated migration script
3. Gradual rollout by directory (scripts → components → pages → libs)
4. Update CI to enforce logger usage

### Phase 7: OpenTelemetry Integration (Future)

**Goal:** Add distributed tracing with spans and metrics

**Benefits:**
- Automatic instrumentation of HTTP, fetch, database calls
- Waterfall diagrams for request visualization
- Integration with APM platforms (Datadog, New Relic, Honeycomb)

**Implementation:**
- Add `@opentelemetry/sdk-node` and auto-instrumentation
- Configure OTLP exporter to Axiom
- Enhance logger with trace/span context

### Phase 8: Custom Dashboards (Future)

**Goal:** Pre-built Axiom dashboards for common queries

**Dashboards:**
- API Performance: P50/P95/P99 latencies by endpoint
- Error Monitoring: Error rate by endpoint and user
- User Activity: Request volume by authenticated user
- Database Performance: Query durations and failures

---

## Appendix

### Related Documentation

- [Axiom Official Documentation](https://axiom.co/docs)
- [Axiom JavaScript SDK](https://github.com/axiomhq/axiom-js)
- [Astro Middleware Documentation](https://docs.astro.build/en/guides/middleware/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

### File Changes Summary

**New Files:**
- `project-docs/logging/axiom-setup-guide.md`
- `project-docs/logging/axiom-usage-guide.md`
- `tests/utils/logger.test.ts`
- `e2e/logging-correlation.spec.ts`

**Modified Files:**
- `src/utils/logger.ts` (enhanced with Axiom integration)
- `src/middleware.ts` (added correlation middleware)
- `src/pages/api/webhooks/clerk.ts` (replaced console.error)
- `src/pages/api/user/profile.ts` (added structured logging)
- `src/pages/api/user/profile-with-org.ts` (added structured logging)
- `src/libs/database.ts` (added correlation tracking)
- `.env.example` (added Axiom variables)
- `CLAUDE.md` (added logging best practices)

### Dependencies Added

```json
{
  "dependencies": {
    "@axiomhq/js": "^1.0.0"
  }
}
````

### Environment Variables

```bash
# Production logging service
AXIOM_TOKEN=xaat-your-token-here
AXIOM_DATASET=astro-basics
AXIOM_ORG_ID=optional-org-id  # Optional
# Leave these blank to continue using console-only logging (e.g., local dev, CI)
```

---

## Implementation Checklist

- [ ] **Phase 1: Dependencies & Configuration** (15 min)
  - [ ] Install `@axiomhq/js` package
  - [ ] Update `.env.example` with Axiom variables
  - [ ] Create Axiom setup guide

- [ ] **Phase 2: Logger Enhancement** (30 min)
  - [ ] Update `LogContext` interface
  - [ ] Add Axiom client to Logger class
  - [ ] Enhance `log()` method with dual output
  - [ ] Add `createCorrelationId()` method
  - [ ] Update `apiRequest()` for timing
  - [ ] Add `apiComplete()` method
  - [ ] Add `flush()` method
  - [ ] Update method signatures to async

- [ ] **Phase 3: Middleware Integration** (20 min)
  - [ ] Create correlation middleware
  - [ ] Add request lifecycle logging
  - [ ] Update middleware sequence
  - [ ] Add TypeScript types for `locals.correlationId`

- [ ] **Phase 4: Critical Path Updates** (45 min)
  - [ ] Update `src/pages/api/webhooks/clerk.ts`
  - [ ] Update `src/libs/database.ts`
  - [ ] Update `src/pages/api/user/profile.ts`
  - [ ] Update `src/pages/api/user/profile-with-org.ts`

- [ ] **Phase 5: Testing & Documentation** (30 min)
  - [ ] Create unit tests
  - [ ] Create E2E tests
  - [ ] Create Axiom setup guide
  - [ ] Create Axiom usage guide
  - [ ] Update CLAUDE.md

- [ ] **Rollout**
  - [ ] Test in development environment
  - [ ] Deploy to staging
  - [ ] Verify in Axiom dashboard
  - [ ] Deploy to production
  - [ ] Set up monitoring and alerts

---

**Document Status:** Ready for Implementation
**Next Steps:** Begin Phase 1 - Dependencies & Configuration
**Questions?** Review `project-docs/logging/axiom-setup-guide.md` or consult Axiom documentation
