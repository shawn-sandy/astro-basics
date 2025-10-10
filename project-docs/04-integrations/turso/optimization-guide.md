# Turso Optimization Guide for Astro Basics

This guide provides optimized setup and best practices for integrating Turso with the Astro Basics project, based on the official Astro documentation and production-ready patterns.

## Table of Contents

- [Optimized Setup](#optimized-setup)
- [Enhanced Client Configuration](#enhanced-client-configuration)
- [Type-Safe Database Operations](#type-safe-database-operations)
- [Performance Optimizations](#performance-optimizations)
- [Error Handling & Resilience](#error-handling--resilience)
- [Migration Strategy](#migration-strategy)
- [Security Best Practices](#security-best-practices)
- [Monitoring & Debugging](#monitoring--debugging)

## Optimized Setup

### 1. Environment Configuration

Update `.env.example` to include Turso variables:

```env
# Turso Database Configuration
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Optional: Turso configuration
TURSO_SYNC_INTERVAL=60 # seconds
TURSO_ENABLE_DEBUG=false
```

### 2. Enhanced Client Configuration

Create an optimized Turso client at `src/libs/turso.ts`:

```typescript
import { createClient } from '@libsql/client/web'
import type { Client, Config, InArgs, InStatement } from '@libsql/client'

// Environment variables
const TURSO_DATABASE_URL = import.meta.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = import.meta.env.TURSO_AUTH_TOKEN
const TURSO_SYNC_INTERVAL = import.meta.env.TURSO_SYNC_INTERVAL || '60'
const TURSO_ENABLE_DEBUG = import.meta.env.TURSO_ENABLE_DEBUG === 'true'

// Singleton client instance
let tursoClient: Client | null = null

// Configuration checker
export const isTursoConfigured = (): boolean => {
  return !!(TURSO_DATABASE_URL && TURSO_AUTH_TOKEN)
}

// Client configuration
const getClientConfig = (): Config => ({
  url: TURSO_DATABASE_URL!,
  authToken: TURSO_AUTH_TOKEN!,
  intMode: 'number',
  // Performance optimizations
  syncInterval: Number(TURSO_SYNC_INTERVAL),
  // Development helpers
  ...(import.meta.env.DEV &&
    TURSO_ENABLE_DEBUG && {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        console.log('[Turso Debug] Request:', input)
        return fetch(input, init)
      },
    }),
})

// Get or create client instance
export const getTursoClient = (): Client => {
  if (!isTursoConfigured()) {
    throw new Error(
      'Turso not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your .env file.'
    )
  }

  if (!tursoClient) {
    tursoClient = createClient(getClientConfig())
  }

  return tursoClient
}

// Type-safe query builder
export const tursoQuery = async <T = unknown>(statement: InStatement): Promise<T[]> => {
  const client = getTursoClient()
  const result = await client.execute(statement)
  return result.rows as T[]
}

// Batch operations support
export const tursoBatch = async (statements: InStatement[]): Promise<void> => {
  const client = getTursoClient()
  await client.batch(statements)
}

// Transaction support
export const tursoTransaction = async <T>(callback: (tx: Client) => Promise<T>): Promise<T> => {
  const client = getTursoClient()
  // Note: Full transaction support depends on libSQL version
  // For now, use batch operations for atomic updates
  return callback(client)
}

export default getTursoClient
```

## Type-Safe Database Operations

### 1. Define Database Types

Create `src/types/database.ts`:

```typescript
// Post table schema
export interface DbPost {
  id: number
  slug: string
  title: string
  content: string
  author: string
  created_at: string
  updated_at: string
  published: 0 | 1 // SQLite boolean
  featured: 0 | 1
  tags: string | null
  view_count: number
}

// User table schema
export interface DbUser {
  id: number
  clerk_id: string
  email: string
  username: string | null
  created_at: string
  updated_at: string
}

// Type conversions
export const toBoolean = (value: 0 | 1): boolean => value === 1
export const fromBoolean = (value: boolean): 0 | 1 => (value ? 1 : 0)
```

### 2. Create Repository Pattern

Create `src/repositories/posts.ts`:

```typescript
import { tursoQuery, tursoBatch } from '#libs/turso'
import type { DbPost } from '#types/database'
import { toBoolean, fromBoolean } from '#types/database'

export class PostRepository {
  // Get all published posts
  static async getPublishedPosts(limit = 10, offset = 0) {
    const posts = await tursoQuery<DbPost>({
      sql: `
        SELECT * FROM posts 
        WHERE published = 1 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    })

    return posts.map(this.mapPost)
  }

  // Get post by slug
  static async getPostBySlug(slug: string) {
    const posts = await tursoQuery<DbPost>({
      sql: 'SELECT * FROM posts WHERE slug = ? AND published = 1',
      args: [slug],
    })

    return posts.length > 0 ? this.mapPost(posts[0]) : null
  }

  // Create post
  static async createPost(data: {
    slug: string
    title: string
    content: string
    author: string
    tags?: string[]
  }) {
    await tursoQuery({
      sql: `
        INSERT INTO posts (slug, title, content, author, tags, published)
        VALUES (?, ?, ?, ?, ?, 0)
      `,
      args: [data.slug, data.title, data.content, data.author, data.tags?.join(',') || null],
    })
  }

  // Update view count
  static async incrementViewCount(slug: string) {
    await tursoQuery({
      sql: `
        UPDATE posts 
        SET view_count = view_count + 1 
        WHERE slug = ?
      `,
      args: [slug],
    })
  }

  // Map database row to application model
  private static mapPost(row: DbPost) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      content: row.content,
      author: row.author,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      published: toBoolean(row.published),
      featured: toBoolean(row.featured),
      tags: row.tags ? row.tags.split(',') : [],
      viewCount: row.view_count,
    }
  }
}
```

## Performance Optimizations

### 1. Connection Pooling

The libSQL client handles connection pooling automatically, but you can optimize it:

```typescript
// In src/libs/turso.ts
const getClientConfig = (): Config => ({
  // ... other config
  // Connection pool settings
  concurrency: 10, // Max concurrent requests
  maxRetries: 3, // Retry failed requests
})
```

### 2. Query Caching

Implement a simple cache for frequently accessed data:

```typescript
// src/libs/cache.ts
interface CacheEntry<T> {
  data: T
  expiry: number
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set<T>(key: string, data: T, ttlSeconds = 300): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const queryCache = new QueryCache()

// Usage in repository
static async getPostBySlug(slug: string) {
  const cacheKey = `post:${slug}`
  const cached = queryCache.get<Post>(cacheKey)
  if (cached) return cached

  const posts = await tursoQuery<DbPost>({
    sql: 'SELECT * FROM posts WHERE slug = ? AND published = 1',
    args: [slug]
  })

  const post = posts.length > 0 ? this.mapPost(posts[0]) : null
  if (post) {
    queryCache.set(cacheKey, post, 600) // Cache for 10 minutes
  }

  return post
}
```

### 3. Database Indexes

Create optimal indexes in your migrations:

```sql
-- migrations/001_optimize_posts.sql
-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

-- Composite index for published posts queries
CREATE INDEX IF NOT EXISTS idx_posts_published_created
  ON posts(published, created_at DESC);

-- Index for tag searches
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts(tags);

-- Full-text search index (if using FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title, content, author, tags,
  content=posts
);
```

## Error Handling & Resilience

### 1. Wrapper Functions with Error Handling

```typescript
// src/libs/turso-utils.ts
import { getTursoClient } from './turso'

export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === retries - 1) throw error

      console.error(`Operation failed, retry ${i + 1}/${retries}:`, error)
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }
  throw new Error('Operation failed after retries')
}

export async function safeQuery<T>(statement: InStatement, defaultValue: T): Promise<T> {
  try {
    return await tursoQuery<T>(statement)
  } catch (error) {
    console.error('Query failed:', error)
    return defaultValue
  }
}
```

### 2. Graceful Degradation

```typescript
// In Astro pages
---
import { PostRepository } from '#repositories/posts'
import { isTursoConfigured } from '#libs/turso'

let posts = []
let dbError = false

if (isTursoConfigured()) {
  try {
    posts = await PostRepository.getPublishedPosts()
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    dbError = true
    // Fallback to static content or cache
    posts = await getStaticPosts()
  }
} else {
  // Use static content when database is not configured
  posts = await getStaticPosts()
}
---

{dbError && (
  <div class="alert alert-warning">
    Currently showing cached content. Live updates temporarily unavailable.
  </div>
)}
```

## Migration Strategy

### 1. Migration Runner

Create `src/libs/migrations.ts`:

```typescript
import { getTursoClient } from './turso'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export async function runMigrations() {
  const client = getTursoClient()

  // Create migrations table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Get executed migrations
  const { rows } = await client.execute('SELECT filename FROM migrations')
  const executed = new Set(rows.map(r => r.filename as string))

  // Read migration files
  const migrationsDir = join(process.cwd(), 'migrations')
  const files = await readdir(migrationsDir)
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()

  // Execute new migrations
  for (const file of sqlFiles) {
    if (!executed.has(file)) {
      const sql = await readFile(join(migrationsDir, file), 'utf-8')

      await client.batch([
        sql,
        {
          sql: 'INSERT INTO migrations (filename) VALUES (?)',
          args: [file],
        },
      ])

      console.log(`Executed migration: ${file}`)
    }
  }
}
```

### 2. Migration Files

```sql
-- migrations/001_initial_schema.sql
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  tags TEXT,
  view_count INTEGER DEFAULT 0
);

-- migrations/002_add_users.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Security Best Practices

### 1. Input Validation

```typescript
// src/utils/validation.ts
export function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug)
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

// Usage
if (!validateSlug(slug)) {
  throw new Error('Invalid slug format')
}
```

### 2. Rate Limiting

```typescript
// src/middleware/rate-limit.ts
const attempts = new Map<string, number[]>()

export function rateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  const userAttempts = attempts.get(key) || []

  // Remove old attempts
  const validAttempts = userAttempts.filter(time => now - time < windowMs)

  if (validAttempts.length >= maxAttempts) {
    return false
  }

  validAttempts.push(now)
  attempts.set(key, validAttempts)

  return true
}
```

## Monitoring & Debugging

### 1. Query Logging

```typescript
// Enhanced logging in development
if (import.meta.env.DEV) {
  const originalExecute = tursoClient.execute
  tursoClient.execute = async function (stmt) {
    const start = performance.now()
    try {
      const result = await originalExecute.call(this, stmt)
      const duration = performance.now() - start
      console.log(`[Turso] Query (${duration.toFixed(2)}ms):`, stmt)
      return result
    } catch (error) {
      console.error('[Turso] Query failed:', stmt, error)
      throw error
    }
  }
}
```

### 2. Health Check Endpoint

```typescript
// src/pages/api/health/turso.ts
import type { APIRoute } from 'astro'
import { getTursoClient, isTursoConfigured } from '#libs/turso'

export const GET: APIRoute = async () => {
  if (!isTursoConfigured()) {
    return new Response(
      JSON.stringify({
        status: 'unconfigured',
        message: 'Turso not configured',
      }),
      { status: 503 }
    )
  }

  try {
    const client = getTursoClient()
    const start = Date.now()
    await client.execute('SELECT 1')
    const latency = Date.now() - start

    return new Response(
      JSON.stringify({
        status: 'healthy',
        latency,
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error.message,
      }),
      { status: 503 }
    )
  }
}
```

## Integration Examples

### 1. Astro Page with Error Handling

```astro
---
import Layout from '#layouts/Layout.astro'
import { PostRepository } from '#repositories/posts'

const { slug } = Astro.params

try {
  const post = await PostRepository.getPostBySlug(slug!)

  if (!post) {
    return Astro.redirect('/404')
  }

  // Increment view count asynchronously
  PostRepository.incrementViewCount(slug!).catch(console.error)

  return { post }
} catch (error) {
  console.error('Failed to load post:', error)
  return Astro.redirect('/500')
}
---

<Layout title={post.title}>
  <article>
    <h1>{post.title}</h1>
    <p>By {post.author} • {post.viewCount} views</p>
    <div>{post.content}</div>
  </article>
</Layout>
```

### 2. API Route with Validation

```typescript
// src/pages/api/posts/[slug]/view.ts
import type { APIRoute } from 'astro'
import { PostRepository } from '#repositories/posts'
import { validateSlug } from '#utils/validation'
import { rateLimit } from '#middleware/rate-limit'

export const POST: APIRoute = async ({ params, clientAddress }) => {
  const { slug } = params

  if (!slug || !validateSlug(slug)) {
    return new Response('Invalid slug', { status: 400 })
  }

  // Rate limit by IP
  if (!rateLimit(clientAddress, 10, 60000)) {
    return new Response('Too many requests', { status: 429 })
  }

  try {
    await PostRepository.incrementViewCount(slug)
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Failed to increment view count:', error)
    return new Response('Internal error', { status: 500 })
  }
}
```

## Deployment Checklist

1. **Environment Variables**

   - [ ] Set `TURSO_DATABASE_URL` in production
   - [ ] Set `TURSO_AUTH_TOKEN` in production
   - [ ] Remove `TURSO_ENABLE_DEBUG` in production

2. **Database Setup**

   - [ ] Run all migrations
   - [ ] Create necessary indexes
   - [ ] Set up regular backups

3. **Performance**

   - [ ] Enable query caching
   - [ ] Configure appropriate sync intervals
   - [ ] Monitor query performance

4. **Security**

   - [ ] Validate all user inputs
   - [ ] Use parameterized queries exclusively
   - [ ] Implement rate limiting

5. **Monitoring**
   - [ ] Set up health check endpoint
   - [ ] Configure error alerting
   - [ ] Monitor database latency

## Conclusion

This optimized setup provides:

- Type-safe database operations
- Robust error handling
- Performance optimizations
- Security best practices
- Monitoring capabilities

The configuration is flexible enough to work in development without a database while providing full functionality when properly configured in production.
