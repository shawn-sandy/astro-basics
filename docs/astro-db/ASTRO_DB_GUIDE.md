# Astro DB Complete Guide

This guide provides comprehensive documentation for using Astro DB in the astro-basics project, including setup, usage examples, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Development Setup](#development-setup)
4. [Querying Data](#querying-data)
5. [API Endpoints](#api-endpoints)
6. [Working with Tables](#working-with-tables)
7. [Production Setup](#production-setup)
8. [Migration Guide](#migration-guide)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

Astro DB is a fully-managed SQL database designed specifically for Astro. It provides:

- **Type Safety**: Full TypeScript support with auto-generated types
- **Local Development**: Built-in SQLite database for development
- **Easy Deployment**: Push to production with a single command
- **SQL Power**: Built on LibSQL (SQLite fork) for powerful querying

### Key Features in Our Implementation

- 6 interconnected tables for comprehensive content management
- Full CRUD API endpoints
- Advanced querying with joins and aggregations
- Optimized indexes for performance
- Development seed data for testing

## Database Schema

### Tables Overview

```typescript
// User table - User accounts and profiles
const User = {
  id: number (primary key),
  email: string (unique),
  name: string,
  avatar?: string,
  bio?: string,
  createdAt: Date,
  updatedAt: Date
}

// Post table - Blog posts and articles
const Post = {
  id: number (primary key),
  title: string,
  slug: string (unique),
  content: string,
  excerpt?: string,
  author: string,
  tags: JSON (array of strings),
  featured: boolean,
  published: boolean,
  pubDate: Date,
  updatedDate?: Date,
  image?: string,
  imageAlt?: string,
  userId?: number (references User.id),
  viewCount: number,
  createdAt: Date,
  updatedAt: Date
}

// Comment table - Post comments with threading
const Comment = {
  id: number (primary key),
  content: string,
  author: string,
  email: string,
  website?: string,
  postId: number (references Post.id),
  parentId?: number (references Comment.id),
  approved: boolean,
  createdAt: Date
}

// Analytics table - Page view tracking
const Analytics = {
  id: number (primary key),
  path: string (unique),
  title?: string,
  referrer?: string,
  userAgent?: string,
  views: number,
  uniqueViews: number,
  lastViewed: Date,
  createdAt: Date
}

// ContactSubmission table - Form submissions
const ContactSubmission = {
  id: number (primary key),
  name: string,
  email: string,
  subject?: string,
  message: string,
  status: string ('pending' | 'reviewed' | 'responded'),
  ipAddress?: string,
  userAgent?: string,
  createdAt: Date
}

// Newsletter table - Email subscribers
const Newsletter = {
  id: number (primary key),
  email: string (unique),
  name?: string,
  subscribedAt: Date,
  unsubscribedAt?: Date,
  verified: boolean,
  token?: string
}
```

### Relationships

- **User → Post**: One-to-many (userId foreign key)
- **Post → Comment**: One-to-many (postId foreign key)
- **Comment → Comment**: Self-referencing for threading (parentId)

### Indexes

Optimized indexes for common queries:

- User: email (unique), createdAt
- Post: slug (unique), published+pubDate, featured+published, userId, tags
- Comment: postId+approved, parentId, createdAt
- Analytics: path (unique), lastViewed
- ContactSubmission: email, status, createdAt
- Newsletter: email (unique), verified

## Development Setup

### 1. Initial Setup

```bash
# Install Astro DB (already done)
npx astro add db

# Seed the development database
npm run dev
# The database will be automatically created and seeded on first run
```

### 2. Database Management Scripts

```bash
# Push schema changes to local database
npm run db:push

# Push schema to remote database
npm run db:push:remote

# Verify database schema
npm run db:verify

# Execute SQL commands
npm run db:execute
```

### 3. Development Database Location

The local database is stored at `.astro/content.db` and is automatically created when you run the dev server.

## Querying Data

### Basic Queries

```typescript
// Import database utilities
import { db, Post, User, Comment } from 'astro:db'
import { eq, desc, and, or, like, sql } from 'astro:db'

// Get all published posts
const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .all()

// Get a single post by slug
const post = await db.select().from(Post).where(eq(Post.slug, 'my-post-slug')).get()

// Get posts with pagination
const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .limit(10)
  .offset(20)
  .all()
```

### Advanced Queries with Joins

```typescript
// Get posts with author information
const postsWithAuthors = await db
  .select({
    id: Post.id,
    title: Post.title,
    slug: Post.slug,
    author: Post.author,
    userName: User.name,
    userAvatar: User.avatar,
  })
  .from(Post)
  .leftJoin(User, eq(Post.userId, User.id))
  .where(eq(Post.published, true))
  .all()

// Get posts with comment count
const postsWithCommentCount = await db
  .select({
    id: Post.id,
    title: Post.title,
    commentCount: sql`(
      SELECT COUNT(*) 
      FROM ${Comment} 
      WHERE ${Comment.postId} = ${Post.id} 
      AND ${Comment.approved} = true
    )`.as('commentCount'),
  })
  .from(Post)
  .all()
```

### Search and Filtering

```typescript
// Search posts by title or content
const searchResults = await db
  .select()
  .from(Post)
  .where(
    and(
      eq(Post.published, true),
      or(like(Post.title, `%${searchTerm}%`), like(Post.content, `%${searchTerm}%`))
    )
  )
  .all()

// Filter posts by tag
const taggedPosts = await db
  .select()
  .from(Post)
  .where(and(eq(Post.published, true), sql`${Post.tags} LIKE ${`%"${tag}"%`}`))
  .all()

// Get featured posts
const featuredPosts = await db
  .select()
  .from(Post)
  .where(and(eq(Post.published, true), eq(Post.featured, true)))
  .limit(3)
  .all()
```

### Aggregations

```typescript
// Get post statistics
const stats = await db
  .select({
    totalPosts: sql`COUNT(*)`.as('totalPosts'),
    totalViews: sql`SUM(${Post.viewCount})`.as('totalViews'),
    avgViews: sql`AVG(${Post.viewCount})`.as('avgViews'),
  })
  .from(Post)
  .where(eq(Post.published, true))
  .get()

// Get popular tags
const popularTags = await db
  .select({
    tag: sql`json_each.value`.as('tag'),
    count: sql`COUNT(*)`.as('count'),
  })
  .from(Post)
  .innerJoin(sql`json_each(${Post.tags})`, sql`1=1`)
  .groupBy(sql`json_each.value`)
  .orderBy(desc(sql`COUNT(*)`))
  .limit(10)
  .all()
```

## API Endpoints

### GET /api/posts

Retrieve posts with filtering and pagination.

#### Query Parameters

- `limit` (number): Number of posts to return (default: 10)
- `offset` (number): Number of posts to skip (default: 0)
- `featured` (boolean): Filter by featured status
- `search` (string): Search in title and content
- `tag` (string): Filter by tag
- `author` (string): Filter by author name

#### Example Requests

```bash
# Get latest 10 posts
GET /api/posts

# Get featured posts
GET /api/posts?featured=true

# Search for posts
GET /api/posts?search=astro

# Get posts by tag
GET /api/posts?tag=tutorial

# Pagination
GET /api/posts?limit=20&offset=40
```

#### Response Format

```json
{
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with Astro DB",
      "slug": "getting-started-astro-db",
      "excerpt": "Learn how to integrate Astro DB...",
      "author": "Shawn Sandy",
      "tags": "[\"astro\", \"database\", \"tutorial\"]",
      "featured": true,
      "pubDate": "2024-01-15T00:00:00.000Z",
      "viewCount": 156,
      "commentCount": 2
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 45,
    "hasMore": true
  }
}
```

### POST /api/posts

Create a new blog post.

#### Request Body

```json
{
  "title": "New Post Title",
  "slug": "new-post-title",
  "content": "Full post content in Markdown...",
  "excerpt": "Brief description",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "featured": false,
  "published": true,
  "pubDate": "2024-03-01",
  "image": "/images/hero.jpg",
  "imageAlt": "Hero image description",
  "userId": 1
}
```

#### Response

```json
{
  "id": 6,
  "title": "New Post Title",
  "slug": "new-post-title"
  // ... all post fields
}
```

### PATCH /api/posts/[id]

Update an existing post.

#### Request Body

Only include fields you want to update:

```json
{
  "title": "Updated Title",
  "featured": true,
  "tags": ["updated", "tags"]
}
```

### DELETE /api/posts/[id]

Delete a post and its associated comments.

## Working with Tables

### User Management

```typescript
// Create a new user
const newUser = await db
  .insert(User)
  .values({
    email: 'user@example.com',
    name: 'New User',
    bio: 'A new user bio',
  })
  .returning()
  .get()

// Update user profile
await db
  .update(User)
  .set({
    avatar: '/avatars/new-avatar.jpg',
    updatedAt: new Date(),
  })
  .where(eq(User.id, userId))

// Get user with their posts
const userWithPosts = await db
  .select()
  .from(User)
  .leftJoin(Post, eq(User.id, Post.userId))
  .where(eq(User.id, userId))
  .all()
```

### Comment Management

```typescript
// Add a comment
const comment = await db
  .insert(Comment)
  .values({
    content: 'Great post!',
    author: 'Reader',
    email: 'reader@example.com',
    postId: 1,
    approved: false, // Moderate first
  })
  .returning()
  .get()

// Get approved comments for a post
const comments = await db
  .select()
  .from(Comment)
  .where(and(eq(Comment.postId, postId), eq(Comment.approved, true)))
  .orderBy(desc(Comment.createdAt))
  .all()

// Get threaded comments
const threadedComments = await db
  .select({
    id: Comment.id,
    content: Comment.content,
    author: Comment.author,
    parentId: Comment.parentId,
    replies: sql`(
      SELECT COUNT(*) 
      FROM ${Comment} AS replies 
      WHERE replies.parentId = ${Comment.id}
    )`.as('replies'),
  })
  .from(Comment)
  .where(eq(Comment.postId, postId))
  .all()
```

### Analytics Tracking

```typescript
// Track page view
const path = '/blog/my-post'
const analytics = await db.select().from(Analytics).where(eq(Analytics.path, path)).get()

if (analytics) {
  // Update existing record
  await db
    .update(Analytics)
    .set({
      views: analytics.views + 1,
      lastViewed: new Date(),
    })
    .where(eq(Analytics.id, analytics.id))
} else {
  // Create new record
  await db.insert(Analytics).values({
    path,
    title: 'My Post',
    views: 1,
    uniqueViews: 1,
  })
}

// Get popular pages
const popularPages = await db
  .select()
  .from(Analytics)
  .orderBy(desc(Analytics.views))
  .limit(10)
  .all()
```

### Newsletter Management

```typescript
// Subscribe to newsletter
const subscriber = await db
  .insert(Newsletter)
  .values({
    email: 'subscriber@example.com',
    name: 'Subscriber Name',
    token: crypto.randomUUID(),
  })
  .returning()
  .get()

// Verify email
await db
  .update(Newsletter)
  .set({
    verified: true,
    token: null,
  })
  .where(eq(Newsletter.token, verificationToken))

// Unsubscribe
await db
  .update(Newsletter)
  .set({
    unsubscribedAt: new Date(),
  })
  .where(eq(Newsletter.email, email))

// Get active subscribers
const activeSubscribers = await db
  .select()
  .from(Newsletter)
  .where(and(eq(Newsletter.verified, true), sql`${Newsletter.unsubscribedAt} IS NULL`))
  .all()
```

## Production Setup

### 1. Choose a Database Provider

Astro DB works with any LibSQL-compatible database. We recommend Turso.

### 2. Turso Setup

```bash
# Install Turso CLI
npm install -g @turso/cli

# Sign up/login
turso auth signup

# Create database
turso db create astro-basics-db

# Get connection details
turso db show astro-basics-db

# Create auth token
turso db tokens create astro-basics-db
```

### 3. Environment Variables

```bash
# .env.production
ASTRO_DB_REMOTE_URL=libsql://your-db.turso.io
ASTRO_DB_APP_TOKEN=your-auth-token
```

### 4. Deploy Schema

```bash
# Push schema to production
npm run db:push:remote
```

### 5. Data Migration

```typescript
// scripts/migrate-to-production.ts
import { db, Post } from 'astro:db'
import { getCollection } from 'astro:content'

// Migrate content collections to database
const posts = await getCollection('posts')

for (const post of posts) {
  await db.insert(Post).values({
    title: post.data.title,
    slug: post.slug,
    content: post.body,
    excerpt: post.data.description,
    author: post.data.author,
    tags: JSON.stringify(post.data.tags),
    published: true,
    pubDate: post.data.pubDate,
  })
}
```

## Migration Guide

### From Content Collections to Database

1. **Export existing content**:

```typescript
// Export content collections
const posts = await getCollection('posts')
const docs = await getCollection('docs')
```

2. **Transform and import**:

```typescript
// Import to database
for (const post of posts) {
  await db.insert(Post).values({
    title: post.data.title,
    slug: post.slug,
    content: post.body,
    // ... map other fields
  })
}
```

3. **Update queries**:

```typescript
// Before (Content Collections)
const posts = await getCollection('posts')
const sortedPosts = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())

// After (Astro DB)
const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .all()
```

### Hybrid Approach

You can use both systems during migration:

```typescript
// Get from content collections
const contentPosts = await getCollection('posts')

// Get from database
const dbPosts = await db.select().from(Post).all()

// Combine and deduplicate
const allPosts = [...contentPosts, ...dbPosts].filter(
  (post, index, self) => index === self.findIndex(p => p.slug === post.slug)
)
```

## Best Practices

### 1. Query Optimization

```typescript
// ❌ Bad: N+1 queries
const posts = await db.select().from(Post).all()
for (const post of posts) {
  const comments = await db.select().from(Comment).where(eq(Comment.postId, post.id)).all()
}

// ✅ Good: Single query with aggregation
const postsWithComments = await db
  .select({
    ...Post,
    commentCount: sql`COUNT(${Comment.id})`.as('commentCount'),
  })
  .from(Post)
  .leftJoin(Comment, eq(Post.id, Comment.postId))
  .groupBy(Post.id)
  .all()
```

### 2. Type Safety

```typescript
// Define return types
type PostWithAuthor = {
  id: number
  title: string
  slug: string
  author: string
  userName: string | null
  userAvatar: string | null
}

// Use typed queries
const getPostsWithAuthors = async (): Promise<PostWithAuthor[]> => {
  return await db
    .select({
      id: Post.id,
      title: Post.title,
      slug: Post.slug,
      author: Post.author,
      userName: User.name,
      userAvatar: User.avatar,
    })
    .from(Post)
    .leftJoin(User, eq(Post.userId, User.id))
    .all()
}
```

### 3. Error Handling

```typescript
// Wrap database operations
try {
  const post = await db.insert(Post).values(postData).returning().get()

  return { success: true, post }
} catch (error) {
  console.error('Database error:', error)
  return {
    success: false,
    error: 'Failed to create post',
  }
}
```

### 4. Transaction Support

```typescript
// Use transactions for related operations
await db.transaction(async tx => {
  // Create post
  const post = await tx.insert(Post).values(postData).returning().get()

  // Update analytics
  await tx.insert(Analytics).values({
    path: `/blog/${post.slug}`,
    title: post.title,
  })

  // Create initial comment
  await tx.insert(Comment).values({
    postId: post.id,
    content: 'First comment!',
    author: 'System',
    approved: true,
  })
})
```

### 5. Caching Strategies

```typescript
// Cache expensive queries
import { cacheStore } from './cache'

const getPopularPosts = async () => {
  const cacheKey = 'popular-posts'
  const cached = cacheStore.get(cacheKey)

  if (cached) return cached

  const posts = await db
    .select()
    .from(Post)
    .where(eq(Post.published, true))
    .orderBy(desc(Post.viewCount))
    .limit(10)
    .all()

  cacheStore.set(cacheKey, posts, 300) // 5 minutes
  return posts
}
```

## Troubleshooting

### Common Issues

1. **Module not found errors**:

   - TypeScript doesn't recognize `astro:db` imports
   - This is normal - the types are generated at runtime
   - Your code will work despite the TS errors

2. **Database not created**:

   ```bash
   # Force recreation
   rm -rf .astro
   npm run dev
   ```

3. **Schema changes not applied**:

   ```bash
   # Push schema changes
   npm run db:push
   ```

4. **Seed data not loading**:

   - Check `db/seed.ts` for errors
   - Ensure IDs don't conflict
   - Delete `.astro/content.db` to reset

5. **Production connection issues**:
   - Verify environment variables
   - Check database URL format
   - Ensure auth token is valid

### Debug Queries

```typescript
// Log SQL queries
const debugQuery = async () => {
  const query = db.select().from(Post).where(eq(Post.published, true))

  console.log('SQL:', query.toSQL())
  const results = await query.all()
  console.log('Results:', results)
}
```

### Performance Monitoring

```typescript
// Time queries
const timedQuery = async () => {
  const start = performance.now()

  const posts = await db.select().from(Post).all()

  const duration = performance.now() - start
  console.log(`Query took ${duration}ms`)

  return posts
}
```

## Resources

- [Astro DB Documentation](https://docs.astro.build/en/guides/astro-db/)
- [Turso Documentation](https://docs.turso.tech/)
- [LibSQL Documentation](https://github.com/libsql/libsql)
- [SQL Tutorial](https://www.w3schools.com/sql/)

## Next Steps

1. Explore the example pages:

   - `/blog-db` - Database-powered blog
   - `/api/posts` - REST API

2. Customize the schema for your needs

3. Set up production database

4. Implement caching for better performance

5. Add more advanced features:
   - Full-text search
   - Real-time updates
   - Database backups
   - Migration scripts
