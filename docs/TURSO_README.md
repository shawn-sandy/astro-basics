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

The project already includes a Turso client at `src/libs/turso.ts`:

```typescript
import { createClient } from '@libsql/client/web'

export const turso = createClient({
  url: import.meta.env.TURSO_DATABASE_URL!,
  authToken: import.meta.env.TURSO_AUTH_TOKEN!,
})
```

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

### Basic Query

```typescript
import { turso } from '#libs/turso'

// Fetch all posts
const { rows } = await turso.execute('SELECT * FROM posts WHERE published = TRUE')
const posts = rows
```

### Parameterized Queries

```typescript
// Fetch a single post by slug
const { rows } = await turso.execute({
  sql: 'SELECT * FROM posts WHERE slug = ? AND published = TRUE',
  args: [slug],
})
const post = rows[0]
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
import { turso } from '#libs/turso'

// Fetch posts for the homepage
const { rows } = await turso.execute(`
  SELECT * FROM posts 
  WHERE published = TRUE 
  ORDER BY created_at DESC 
  LIMIT 10
`)

const posts = rows.map(row => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  content: row.content,
  author: row.author,
  createdAt: row.created_at,
  tags: row.tags ? row.tags.split(',') : [],
}))
---

<div>
  {
    posts.map(post => (
      <article key={post.id}>
        <h2>{post.title}</h2>
        <p>By {post.author}</p>
        <div>{post.content}</div>
      </article>
    ))
  }
</div>
```

### API Routes Example

Create an API route at `src/pages/api/posts/[slug].ts`:

```typescript
import type { APIRoute } from 'astro'
import { turso } from '#libs/turso'

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params

  try {
    const { rows } = await turso.execute({
      sql: 'SELECT * FROM posts WHERE slug = ? AND published = TRUE',
      args: [slug!],
    })

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
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
