# Turso Database Integration Guide

This guide provides comprehensive instructions for integrating Turso, a distributed SQLite database, with the Astro Basics project.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Turso is a distributed database built on libSQL (a fork of SQLite) that provides:

- Low query latency through edge deployment
- SQLite compatibility with distributed features
- Built-in replication and consistency
- Simple integration with modern web frameworks

## Prerequisites

Before integrating Turso with your Astro project, ensure you have:

1. **Turso CLI installed**

   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Turso account created**

   ```bash
   turso auth signup
   ```

3. **Node.js 18+** installed
4. **Astro project** initialized

## Installation

Install the LibSQL client package:

```bash
npm install @libsql/client
```

## Configuration

### 1. Create a Turso Database

```bash
# Create a new database
turso db create astro-basics-db

# Get the database URL
turso db show astro-basics-db --url

# Create an auth token
turso db tokens create astro-basics-db
```

### 2. Set Environment Variables

Add the following to your `.env` file:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

### 3. Create Turso Client

The project includes an improved Turso client at `src/libs/turso.ts` with built-in error handling and lazy initialization:

```typescript
import { createClient } from '@libsql/client'
import type { Client, InArgs } from '@libsql/client'

// The client now includes:
// ✅ Lazy initialization - no crashes on import
// ✅ Configuration validation - clear error messages
// ✅ Error boundaries - graceful failure handling
// ✅ Singleton pattern - efficient resource usage

// Check if Turso is properly configured
import { isTursoConfigured } from '#libs/turso'

if (isTursoConfigured()) {
  // Safe to use Turso
  const client = getTursoClient()
} else {
  // Handle unconfigured state gracefully
  console.log('Turso database not configured, falling back to alternative')
}
```

#### Key Improvements

**Before (Problematic):**

- Module crashed immediately if environment variables were missing
- No graceful fallback when database was unavailable
- Poor error messages for configuration issues
- Eager client creation regardless of usage

**After (Fixed):**

- Module imports safely even without configuration
- Lazy initialization only when database is actually needed
- Clear, descriptive error messages for configuration issues
- Graceful error handling with proper fallbacks

## Database Setup

### Creating Tables

Connect to your database and create tables:

```bash
turso db shell astro-basics-db
```

Example schema for a posts table:

```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  tags TEXT
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published);
```

## Usage Examples

### Configuration Checking

Before using the database, always check if it's configured:

```typescript
import { isTursoConfigured, validateTursoConfig } from '#libs/turso'

// Check configuration status
if (isTursoConfigured()) {
  // Safe to use database
} else {
  // Handle unconfigured state
  console.log('Database not configured, using fallback')
}

// Validate configuration (throws descriptive error)
try {
  validateTursoConfig()
  console.log('Database configuration is valid')
} catch (error) {
  console.error('Configuration error:', error.message)
}
```

### Basic Query with Error Handling

```typescript
import { executeQuery, getTursoClient } from '#libs/turso'

try {
  // Option 1: Use the helper function (recommended)
  const posts = await executeQuery<Post[]>('SELECT * FROM posts WHERE published = TRUE')

  // Option 2: Use the client directly
  const client = getTursoClient()
  const { rows } = await client.execute('SELECT * FROM posts WHERE published = TRUE')
} catch (error) {
  console.error('Database operation failed:', error.message)
  // Handle error appropriately (show fallback content, etc.)
}
```

### Parameterized Queries

```typescript
import { executeQuery } from '#libs/turso'

try {
  // Fetch a single post by slug with type safety
  const post = await executeQuery<Post>('SELECT * FROM posts WHERE slug = ? AND published = TRUE', [
    slug,
  ])
} catch (error) {
  console.error('Failed to fetch post:', error.message)
  // Handle error (show 404 page, fallback content, etc.)
}
```

### Insert Data

```typescript
const result = await turso.execute({
  sql: `INSERT INTO posts (slug, title, content, author, published) 
        VALUES (?, ?, ?, ?, ?)`,
  args: [slug, title, content, author, true],
})
```

### Update Data

```typescript
const result = await turso.execute({
  sql: `UPDATE posts 
        SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE slug = ?`,
  args: [title, content, slug],
})
```

### Delete Data

```typescript
const result = await turso.execute({
  sql: 'DELETE FROM posts WHERE slug = ?',
  args: [slug],
})
```

### Using in Astro Pages

```astro
---
import { isTursoConfigured, executeQuery } from '#libs/turso'

interface Post {
  id: number
  slug: string
  title: string
  content: string
  author: string
  created_at: string
}

let posts: Post[] = []
let errorMessage = ''

// Graceful handling of database operations
if (isTursoConfigured()) {
  try {
    posts = await executeQuery<Post[]>(`
      SELECT * FROM posts 
      WHERE published = TRUE 
      ORDER BY created_at DESC 
      LIMIT 10
    `)
  } catch (error) {
    console.error('Failed to load posts:', error.message)
    errorMessage = 'Unable to load posts at this time'
    // Could also load from static files as fallback
  }
} else {
  // Fallback when database is not configured
  errorMessage = 'Database not configured - showing demo content'
  posts = [
    {
      id: 1,
      slug: 'demo-post',
      title: 'Demo Post',
      content: 'This is demo content shown when the database is not configured.',
      author: 'System',
      created_at: new Date().toISOString(),
    },
  ]
}
---

<div>
  {
    errorMessage && (
      <div class="alert alert-info">
        <p>{errorMessage}</p>
      </div>
    )
  }

  {
    posts.length > 0 ? (
      posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By {post.author}</p>
          <div>{post.content}</div>
        </article>
      ))
    ) : (
      <div class="no-content">
        <p>No posts available at this time.</p>
      </div>
    )
  }
</div>

<style>
  .alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 0.375rem;
  }

  .alert-info {
    background-color: #e1f5fe;
    border: 1px solid #0288d1;
    color: #0277bd;
  }

  .no-content {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
</style>
```

### API Routes Example

Create an API route at `src/pages/api/posts/[slug].ts`:

```typescript
import type { APIRoute } from 'astro'
import { isTursoConfigured, executeQuery } from '#libs/turso'

interface Post {
  id: number
  slug: string
  title: string
  content: string
  author: string
  published: boolean
}

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params

  // Early return if database not configured
  if (!isTursoConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database service unavailable',
        message: 'Database not configured',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const posts = await executeQuery<Post[]>(
      'SELECT * FROM posts WHERE slug = ? AND published = TRUE',
      [slug!]
    )

    if (posts.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Post not found',
          message: `No post found with slug: ${slug}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify(posts[0]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      },
    })
  } catch (error) {
    console.error('Database error in API route:', error)

    return new Response(
      JSON.stringify({
        error: 'Database error',
        message: 'Unable to fetch post at this time',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
```

## Best Practices

### 1. Connection Management

The Turso client handles connection pooling automatically. Use the singleton instance from `src/libs/turso.ts`.

### 2. Error Handling

Always wrap database operations in try-catch blocks:

```typescript
try {
  const result = await turso.execute(query)
  // Handle success
} catch (error) {
  console.error('Database error:', error)
  // Handle error appropriately
}
```

### 3. Type Safety

Define TypeScript interfaces for your data:

```typescript
interface Post {
  id: number
  slug: string
  title: string
  content: string
  author: string
  created_at: string
  updated_at: string
  published: boolean
  featured: boolean
  tags: string | null
}

// Type assertion when fetching
const posts = rows as unknown as Post[]
```

### 4. SQL Injection Prevention

Always use parameterized queries:

```typescript
// Good - Safe from SQL injection
await turso.execute({
  sql: 'SELECT * FROM posts WHERE slug = ?',
  args: [userInput],
})

// Bad - Vulnerable to SQL injection
await turso.execute(`SELECT * FROM posts WHERE slug = '${userInput}'`)
```

### 5. Database Migrations

Store migrations in a `migrations` folder:

```sql
-- migrations/001_create_posts.sql
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- ... rest of schema
);

-- migrations/002_add_tags_index.sql
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts(tags);
```

## Troubleshooting

### Common Issues

1. **Connection Failed**

   - Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set correctly
   - Check network connectivity
   - Ensure the database exists: `turso db list`

2. **Query Errors**

   - Verify table and column names
   - Check SQL syntax compatibility with SQLite
   - Use `turso db shell` to test queries directly

3. **Type Errors**
   - LibSQL returns rows as plain objects
   - Use type assertions or validation libraries
   - Handle null values appropriately

### Debug Mode

Enable debug logging:

```typescript
import { createClient } from '@libsql/client/web'

export const turso = createClient({
  url: import.meta.env.TURSO_DATABASE_URL!,
  authToken: import.meta.env.TURSO_AUTH_TOKEN!,
  // Add debug logging in development
  ...(import.meta.env.DEV && {
    fetch: (input, init) => {
      console.log('Turso query:', input)
      return fetch(input, init)
    },
  }),
})
```

## Performance Optimization

### 1. Indexing

Create indexes for frequently queried columns:

```sql
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_posts_author ON posts(author);
```

### 2. Query Optimization

- Use `LIMIT` for pagination
- Select only needed columns
- Use prepared statements for repeated queries

### 3. Caching

Implement caching for frequently accessed data:

```typescript
import { turso } from '#libs/turso'

const cache = new Map()

export async function getCachedPost(slug: string) {
  if (cache.has(slug)) {
    return cache.get(slug)
  }

  const { rows } = await turso.execute({
    sql: 'SELECT * FROM posts WHERE slug = ?',
    args: [slug],
  })

  if (rows.length > 0) {
    cache.set(slug, rows[0])
  }

  return rows[0]
}
```

## Additional Resources

- [Turso Documentation](https://docs.turso.tech/)
- [LibSQL Client Reference](https://github.com/libsql/libsql-client-ts)
- [SQLite SQL Reference](https://www.sqlite.org/lang.html)
- [Astro Database Integration Guide](https://docs.astro.build/en/guides/backend/)

## License

This integration guide follows the same license as the Astro Basics project.
