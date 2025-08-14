# Clerk-Supabase Advanced Features - Product Requirements Document

## Executive Summary

This document outlines advanced feature enhancements for the Clerk-Supabase integration, focusing on production-ready improvements including error handling, security, session management, monitoring, and developer experience. These enhancements build upon the basic integration to create a robust, scalable authentication system.

## Goals & Objectives

- **Reliability**: Implement retry logic and error handling for 99.9% uptime
- **Security**: Add rate limiting and audit logging for protection against abuse
- **Observability**: Enable health monitoring and session tracking
- **Developer Experience**: Provide TypeScript types and testing utilities
- **Performance**: Optimize database queries and implement caching

## Implementation Phases

### Phase 1: Error Handling & Retry Logic (Week 1)

#### 1.1 Technical Requirements

Implement robust error handling with exponential backoff for all Clerk-Supabase interactions.

#### 1.2 Implementation Details

**Enhanced Webhook Handler** (`src/pages/api/webhooks/clerk.ts`):

```typescript
import type { APIRoute } from 'astro'
import { Webhook } from 'svix'
import { createServerSupabaseClient } from '#libs/supabase-server'
import { retryWithBackoff } from '#utils/retry'
import { logger } from '#utils/logger'

interface WebhookEvent {
  type: string
  data: any
  timestamp: string
}

class WebhookProcessor {
  private supabase
  private maxRetries = 3
  private deadLetterQueue: WebhookEvent[] = []

  constructor() {
    this.supabase = createServerSupabaseClient()
  }

  async processEvent(event: WebhookEvent) {
    try {
      await retryWithBackoff(() => this.handleEvent(event), this.maxRetries, {
        initialDelay: 1000,
        maxDelay: 10000,
        factor: 2,
      })
    } catch (error) {
      logger.error('Webhook processing failed', { event, error })
      await this.sendToDeadLetter(event, error)
    }
  }

  private async handleEvent(event: WebhookEvent) {
    const startTime = Date.now()

    try {
      switch (event.type) {
        case 'user.created':
        case 'user.updated':
          await this.upsertUser(event.data)
          break
        case 'session.created':
          await this.updateLastSignIn(event.data)
          break
        default:
          logger.warn('Unhandled webhook event type', { type: event.type })
      }

      // Log success metrics
      await this.supabase.from('webhook_metrics').insert({
        event_type: event.type,
        status: 'success',
        duration_ms: Date.now() - startTime,
      })
    } catch (error) {
      // Log failure metrics
      await this.supabase.from('webhook_metrics').insert({
        event_type: event.type,
        status: 'failed',
        error_message: error.message,
        duration_ms: Date.now() - startTime,
      })
      throw error
    }
  }

  private async sendToDeadLetter(event: WebhookEvent, error: any) {
    await this.supabase.from('webhook_dead_letter').insert({
      event_type: event.type,
      event_data: event.data,
      error_message: error.message,
      retry_count: this.maxRetries,
      created_at: new Date().toISOString(),
    })
  }
}
```

**Retry Utility** (`src/utils/retry.ts`):

```typescript
interface RetryOptions {
  initialDelay?: number
  maxDelay?: number
  factor?: number
  onRetry?: (error: Error, attempt: number) => void
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  options: RetryOptions = {}
): Promise<T> {
  const { initialDelay = 1000, maxDelay = 30000, factor = 2, onRetry } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxAttempts) {
        throw lastError
      }

      const delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay)

      if (onRetry) {
        onRetry(lastError, attempt)
      }

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
```

#### 1.3 Database Schema

```sql
-- Webhook metrics table
CREATE TABLE webhook_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  status TEXT CHECK(status IN ('success', 'failed', 'retrying')),
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dead letter queue for failed webhooks
CREATE TABLE webhook_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_webhook_metrics_created_at ON webhook_metrics(created_at DESC);
CREATE INDEX idx_dead_letter_processed ON webhook_dead_letter(processed, created_at);
```

#### 1.4 Success Metrics

- Webhook success rate > 99.5%
- Average retry count < 1.5
- Dead letter queue size < 100 items
- P95 processing time < 2 seconds

### Phase 2: Rate Limiting (Week 2)

#### 2.1 Technical Requirements

Implement rate limiting at multiple levels to prevent abuse and ensure fair usage.

#### 2.2 Implementation Details

**Rate Limiter Service** (`src/libs/rate-limiter.ts`):

```typescript
import { LRUCache } from 'lru-cache'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: Request) => string
}

export class RateLimiter {
  private cache: LRUCache<string, number[]>

  constructor(private config: RateLimitConfig) {
    this.cache = new LRUCache({
      max: 10000, // Maximum number of keys to track
      ttl: config.windowMs,
    })
  }

  async check(request: Request): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = this.getKey(request)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get existing requests for this key
    let requests = this.cache.get(key) || []

    // Filter out requests outside the current window
    requests = requests.filter(timestamp => timestamp > windowStart)

    if (requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...requests)
      const resetAt = new Date(oldestRequest + this.config.windowMs)

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }

    // Add current request
    requests.push(now)
    this.cache.set(key, requests)

    return {
      allowed: true,
      remaining: this.config.maxRequests - requests.length,
      resetAt: new Date(now + this.config.windowMs),
    }
  }

  private getKey(request: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request)
    }

    // Default: Use IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    return `rate_limit:${ip}`
  }
}

// Preset configurations
export const rateLimiters = {
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  }),

  webhook: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),

  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: request => {
      // Rate limit by user ID if authenticated
      const userId = request.headers.get('x-user-id')
      return userId ? `user:${userId}` : `ip:${request.headers.get('x-forwarded-for')}`
    },
  }),
}
```

**Rate Limit Middleware** (`src/middleware/rate-limit.ts`):

```typescript
import { rateLimiters } from '#libs/rate-limiter'

export async function applyRateLimit(
  request: Request,
  type: 'api' | 'webhook' | 'auth' = 'api'
): Promise<Response | null> {
  const limiter = rateLimiters[type]
  const result = await limiter.check(request)

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: result.resetAt.toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter.config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
          'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  // Add rate limit headers to successful responses
  return null
}
```

#### 2.3 Database Schema

```sql
-- Rate limit violations tracking
CREATE TABLE rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP or user ID
  endpoint TEXT NOT NULL,
  violation_count INTEGER DEFAULT 1,
  first_violation TIMESTAMPTZ DEFAULT NOW(),
  last_violation TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);

CREATE INDEX idx_rate_limit_identifier ON rate_limit_violations(identifier, blocked_until);
```

#### 2.4 Success Metrics

- < 0.1% of legitimate requests rate limited
- Zero successful DDoS attempts
- P99 rate limit check time < 10ms

### Phase 3: Session Management (Week 3)

#### 3.1 Technical Requirements

Track and manage user sessions across devices with analytics.

#### 3.2 Implementation Details

**Session Manager** (`src/libs/session-manager.ts`):

```typescript
interface Session {
  id: string
  clerk_session_id: string
  user_id: string
  device_info: {
    type: 'desktop' | 'mobile' | 'tablet'
    browser: string
    os: string
  }
  ip_address: string
  location?: {
    country: string
    city: string
  }
  created_at: Date
  last_activity: Date
  expires_at: Date
}

export class SessionManager {
  constructor(private supabase: SupabaseClient) {}

  async createSession(data: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    const session = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date(),
    }

    const { data: dbSession, error } = await this.supabase
      .from('user_sessions')
      .insert(session)
      .select()
      .single()

    if (error) throw error

    // Track session analytics
    await this.trackSessionEvent('session_started', session.id)

    return dbSession
  }

  async updateActivity(sessionId: string): Promise<void> {
    await this.supabase
      .from('user_sessions')
      .update({ last_activity: new Date() })
      .eq('id', sessionId)

    await this.trackSessionEvent('session_active', sessionId)
  }

  async endSession(sessionId: string): Promise<void> {
    await this.supabase
      .from('user_sessions')
      .update({
        ended_at: new Date(),
        is_active: false,
      })
      .eq('id', sessionId)

    await this.trackSessionEvent('session_ended', sessionId)
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity', { ascending: false })

    if (error) throw error
    return data
  }

  async terminateAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const query = this.supabase
      .from('user_sessions')
      .update({ is_active: false, ended_at: new Date() })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (exceptSessionId) {
      query.neq('id', exceptSessionId)
    }

    await query
  }

  private async trackSessionEvent(event: string, sessionId: string): Promise<void> {
    await this.supabase.from('session_events').insert({
      session_id: sessionId,
      event_type: event,
      timestamp: new Date(),
    })
  }
}
```

#### 3.3 Database Schema

```sql
-- Enhanced session tracking
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_session_id TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(clerk_id),
  device_type TEXT,
  browser TEXT,
  os TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Session analytics events
CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id),
  event_type TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_session_events_session ON session_events(session_id, timestamp DESC);

-- Cleanup old sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS void AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;
```

#### 3.4 Success Metrics

- Average active sessions per user < 3
- Session tracking accuracy > 99%
- Session cleanup runs daily
- Zero ghost sessions (expired but active)

### Phase 4: Health Monitoring (Week 4)

#### 4.1 Technical Requirements

Implement comprehensive health checks for all system components.

#### 4.2 Implementation Details

**Health Check Service** (`src/libs/health-check.ts`):

```typescript
interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  details?: any
  lastChecked: Date
}

export class HealthMonitor {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map()
  private cache: Map<string, HealthCheckResult> = new Map()
  private cacheTimeout = 30000 // 30 seconds

  constructor() {
    this.registerDefaultChecks()
  }

  private registerDefaultChecks() {
    // Clerk health check
    this.register('clerk', async () => {
      const start = Date.now()
      try {
        const response = await fetch('https://api.clerk.dev/v1/health', {
          headers: {
            Authorization: `Bearer ${import.meta.env.CLERK_SECRET_KEY}`,
          },
        })

        return {
          service: 'clerk',
          status: response.ok ? 'healthy' : 'degraded',
          responseTime: Date.now() - start,
          details: { statusCode: response.status },
          lastChecked: new Date(),
        }
      } catch (error) {
        return {
          service: 'clerk',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          details: { error: error.message },
          lastChecked: new Date(),
        }
      }
    })

    // Supabase health check
    this.register('supabase', async () => {
      const start = Date.now()
      try {
        const supabase = createServerSupabaseClient()
        const { error } = await supabase
          .from('users')
          .select('count(*)', { count: 'exact', head: true })

        return {
          service: 'supabase',
          status: error ? 'degraded' : 'healthy',
          responseTime: Date.now() - start,
          details: { error: error?.message },
          lastChecked: new Date(),
        }
      } catch (error) {
        return {
          service: 'supabase',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          details: { error: error.message },
          lastChecked: new Date(),
        }
      }
    })

    // Database connection health
    this.register('database', async () => {
      const start = Date.now()
      try {
        const supabase = createServerSupabaseClient()
        const { data, error } = await supabase.rpc('ping')

        return {
          service: 'database',
          status: error ? 'unhealthy' : 'healthy',
          responseTime: Date.now() - start,
          details: {
            connectionPoolSize: data?.pool_size,
            activeConnections: data?.active_connections,
          },
          lastChecked: new Date(),
        }
      } catch (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          details: { error: error.message },
          lastChecked: new Date(),
        }
      }
    })
  }

  register(name: string, check: () => Promise<HealthCheckResult>) {
    this.checks.set(name, check)
  }

  async checkAll(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: HealthCheckResult[]
    timestamp: Date
  }> {
    const results = await Promise.all(
      Array.from(this.checks.entries()).map(async ([name, check]) => {
        // Check cache first
        const cached = this.cache.get(name)
        if (cached && Date.now() - cached.lastChecked.getTime() < this.cacheTimeout) {
          return cached
        }

        // Run check and cache result
        const result = await check()
        this.cache.set(name, result)
        return result
      })
    )

    // Determine overall status
    const hasUnhealthy = results.some(r => r.status === 'unhealthy')
    const hasDegraded = results.some(r => r.status === 'degraded')

    const overallStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy'

    // Store metrics
    await this.storeMetrics(results)

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date(),
    }
  }

  private async storeMetrics(results: HealthCheckResult[]) {
    const supabase = createServerSupabaseClient()

    await supabase.from('health_metrics').insert(
      results.map(r => ({
        service: r.service,
        status: r.status,
        response_time_ms: r.responseTime,
        details: r.details,
        checked_at: r.lastChecked,
      }))
    )
  }
}
```

**Health Check Endpoint** (`src/pages/api/health.ts`):

```typescript
import type { APIRoute } from 'astro'
import { HealthMonitor } from '#libs/health-check'

const monitor = new HealthMonitor()

export const GET: APIRoute = async ({ request }) => {
  // Optional: Add authentication for detailed health info
  const isAuthenticated =
    request.headers.get('x-health-token') === import.meta.env.HEALTH_CHECK_TOKEN

  const health = await monitor.checkAll()

  // Return simplified response for unauthenticated requests
  if (!isAuthenticated) {
    return new Response(
      JSON.stringify({
        status: health.status,
        timestamp: health.timestamp,
      }),
      {
        status: health.status === 'healthy' ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Return detailed response for authenticated requests
  return new Response(JSON.stringify(health), {
    status: health.status === 'healthy' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  })
}
```

#### 4.3 Database Schema

```sql
-- Health check metrics
CREATE TABLE health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  details JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create database ping function
CREATE OR REPLACE FUNCTION ping() RETURNS JSONB AS $$
DECLARE
  pool_size INTEGER;
  active_conn INTEGER;
BEGIN
  SELECT count(*) INTO active_conn FROM pg_stat_activity WHERE state = 'active';
  SELECT setting::int INTO pool_size FROM pg_settings WHERE name = 'max_connections';

  RETURN jsonb_build_object(
    'status', 'ok',
    'timestamp', NOW(),
    'pool_size', pool_size,
    'active_connections', active_conn
  );
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_health_metrics_service_time ON health_metrics(service, checked_at DESC);

-- Cleanup old metrics (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics() RETURNS void AS $$
BEGIN
  DELETE FROM health_metrics WHERE checked_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
```

#### 4.4 Success Metrics

- Health check endpoint response time < 500ms
- Zero false positive unhealthy reports
- Uptime monitoring accuracy > 99.9%
- Alert response time < 1 minute

### Phase 5: TypeScript Types Generation (Week 5)

#### 5.1 Technical Requirements

Auto-generate TypeScript types from database schema and API contracts.

#### 5.2 Implementation Details

**Type Generation Script** (`scripts/generate-types.ts`):

```typescript
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function generateSupabaseTypes() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Generate types from database schema
  const { data: tables } = await supabase.rpc('get_table_schemas')

  let typeDefinitions = `// Auto-generated Supabase types
// Generated at: ${new Date().toISOString()}

export namespace Database {
  export interface Tables {
`

  for (const table of tables) {
    typeDefinitions += `    ${table.name}: {
      Row: ${generateRowType(table)}
      Insert: ${generateInsertType(table)}
      Update: ${generateUpdateType(table)}
    }\n`
  }

  typeDefinitions += `  }
}

// Helper types
export type Tables<T extends keyof Database['Tables']> = Database['Tables'][T]['Row']
export type Insertable<T extends keyof Database['Tables']> = Database['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['Tables']> = Database['Tables'][T]['Update']
`

  writeFileSync(join(process.cwd(), 'src/types/supabase.ts'), typeDefinitions)

  console.log('✅ Supabase types generated successfully')
}

function generateRowType(table: any): string {
  const fields = table.columns
    .map(col => {
      const tsType = postgresTypeToTS(col.type)
      const nullable = col.nullable ? ' | null' : ''
      return `      ${col.name}: ${tsType}${nullable}`
    })
    .join('\n')

  return `{
${fields}
    }`
}

function generateInsertType(table: any): string {
  const fields = table.columns
    .filter(col => !col.default && !col.generated)
    .map(col => {
      const tsType = postgresTypeToTS(col.type)
      const optional = col.nullable ? '?' : ''
      return `      ${col.name}${optional}: ${tsType}`
    })
    .join('\n')

  return `{
${fields}
    }`
}

function generateUpdateType(table: any): string {
  const fields = table.columns
    .filter(col => !col.generated)
    .map(col => {
      const tsType = postgresTypeToTS(col.type)
      return `      ${col.name}?: ${tsType} | null`
    })
    .join('\n')

  return `{
${fields}
    }`
}

function postgresTypeToTS(pgType: string): string {
  const typeMap: Record<string, string> = {
    text: 'string',
    varchar: 'string',
    uuid: 'string',
    timestamptz: 'string',
    timestamp: 'string',
    date: 'string',
    integer: 'number',
    bigint: 'number',
    decimal: 'number',
    boolean: 'boolean',
    jsonb: 'Record<string, any>',
    json: 'Record<string, any>',
    inet: 'string',
  }

  return typeMap[pgType.toLowerCase()] || 'any'
}

// Run generation
generateSupabaseTypes().catch(console.error)
```

**Clerk Types Extension** (`src/types/clerk.ts`):

```typescript
import type { User, Session, Organization } from '@clerk/types'

// Extend Clerk types with custom properties
export interface ClerkUserWithSupabase extends User {
  supabaseId?: string
  lastSyncedAt?: Date
}

export interface ClerkSessionWithDevice extends Session {
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet'
    browser: string
    os: string
  }
}

// Webhook event types
export type ClerkWebhookEvent =
  | { type: 'user.created'; data: User }
  | { type: 'user.updated'; data: User }
  | { type: 'user.deleted'; data: { id: string } }
  | { type: 'session.created'; data: Session }
  | { type: 'session.ended'; data: Session }
  | { type: 'organization.created'; data: Organization }
  | { type: 'organizationMembership.created'; data: any }

// API response types
export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string
    sessionId: string
    orgId?: string
  }
}

export interface SupabaseAuthContext {
  token: string
  userId: string
  supabase: SupabaseClient
}
```

**Shared Type Utilities** (`src/types/shared.ts`):

```typescript
// Generic API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    timestamp: string
    requestId: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Utility types
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys]

// Database operation types
export interface QueryOptions {
  select?: string[]
  where?: Record<string, any>
  orderBy?: { column: string; direction: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
}

export interface MutationResult<T = any> {
  data?: T
  error?: Error
  affected?: number
}
```

#### 5.3 Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "types:generate": "tsx scripts/generate-types.ts",
    "types:watch": "nodemon --watch src/database --exec 'npm run types:generate'",
    "types:check": "tsc --noEmit",
    "prebuild": "npm run types:generate"
  }
}
```

#### 5.4 Success Metrics

- Type generation time < 5 seconds
- Zero type errors in production
- 100% database schema coverage
- Auto-generation on schema changes

## Testing Strategy

### Unit Tests

```typescript
// tests/error-handling.test.ts
describe('Error Handling', () => {
  test('retries failed operations with backoff', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce('Success')

    const result = await retryWithBackoff(mockFn, 3)

    expect(result).toBe('Success')
    expect(mockFn).toHaveBeenCalledTimes(3)
  })
})

// tests/rate-limiter.test.ts
describe('Rate Limiter', () => {
  test('blocks requests exceeding limit', async () => {
    const limiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 2,
    })

    const req = new Request('https://example.com')

    expect(await limiter.check(req)).toMatchObject({ allowed: true })
    expect(await limiter.check(req)).toMatchObject({ allowed: true })
    expect(await limiter.check(req)).toMatchObject({ allowed: false })
  })
})
```

### Integration Tests

```typescript
// tests/integration/session-management.test.ts
describe('Session Management', () => {
  test('creates and tracks user sessions', async () => {
    const sessionManager = new SessionManager(supabase)

    const session = await sessionManager.createSession({
      clerk_session_id: 'test_123',
      user_id: 'user_123',
      device_info: {
        type: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
      },
      ip_address: '192.168.1.1',
      expires_at: new Date(Date.now() + 3600000),
    })

    expect(session.id).toBeDefined()

    const activeSessions = await sessionManager.getActiveSessions('user_123')
    expect(activeSessions).toHaveLength(1)
  })
})
```

## Monitoring & Alerts

### Metrics to Track

1. **Error Rates**

   - Webhook failure rate
   - API error rate
   - Database connection errors

2. **Performance Metrics**

   - API response times (P50, P95, P99)
   - Database query times
   - Webhook processing times

3. **Business Metrics**
   - Active sessions per user
   - Session duration
   - Failed authentication attempts

### Alert Thresholds

| Metric                 | Warning  | Critical      |
| ---------------------- | -------- | ------------- |
| Error Rate             | > 1%     | > 5%          |
| Response Time P95      | > 1s     | > 3s          |
| Rate Limit Violations  | > 100/hr | > 1000/hr     |
| Health Check Failures  | 1        | 3 consecutive |
| Dead Letter Queue Size | > 50     | > 200         |

## Rollout Plan

### Week 1: Error Handling

- Deploy retry logic
- Monitor webhook success rates
- Set up dead letter queue processing

### Week 2: Rate Limiting

- Deploy rate limiters to staging
- Test with load testing tools
- Tune limits based on traffic patterns

### Week 3: Session Management

- Deploy session tracking
- Migrate existing sessions
- Enable session analytics

### Week 4: Health Monitoring

- Deploy health endpoints
- Configure monitoring dashboards
- Set up alerting rules

### Week 5: TypeScript Types

- Generate initial types
- Update all code to use types
- Set up CI type checking

## Success Criteria

- **Reliability**: 99.9% uptime achieved
- **Security**: Zero security incidents
- **Performance**: P95 response time < 500ms
- **Developer Experience**: Type coverage > 95%
- **Monitoring**: All critical paths monitored

## Risk Mitigation

| Risk                                     | Impact | Mitigation                             |
| ---------------------------------------- | ------ | -------------------------------------- |
| Rate limiting blocks legitimate users    | High   | Implement whitelist, gradual rollout   |
| Session tracking increases database load | Medium | Implement caching, optimize queries    |
| Type generation breaks on schema changes | Low    | Add validation, rollback mechanism     |
| Health checks create false positives     | Medium | Tune thresholds, implement retry logic |

## Dependencies

- `lru-cache`: For in-memory caching
- `svix`: For webhook signature verification
- `zod`: For runtime type validation
- `pino`: For structured logging
- `@supabase/supabase-js`: Latest version for type generation

## Approval

- [ ] Engineering Lead
- [ ] Security Team
- [ ] DevOps Team
- [ ] Product Owner

---

_Version: 1.0_  
_Last Updated: January 2025_  
_Implementation Timeline: 5 weeks_
