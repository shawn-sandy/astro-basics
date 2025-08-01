# Astro DB Quick Reference

A quick reference guide for common Astro DB operations in the astro-basics project.

## Essential Commands

```bash
# Start development (auto-creates and seeds DB)
npm run dev

# Database management
npm run db:push              # Push schema to local DB
npm run db:push:remote       # Push schema to production
npm run db:verify            # Verify database schema
npm run db:execute           # Execute SQL commands
```

## Import Statements

```typescript
// Basic imports
import { db, Post, User, Comment, Analytics, ContactSubmission, Newsletter } from 'astro:db'
import { eq, ne, gt, gte, lt, lte, and, or, desc, asc, sql, like } from 'astro:db'
```

## Common Query Patterns

### Basic CRUD Operations

```typescript
// CREATE - Insert new record
const newPost = await db
  .insert(Post)
  .values({
    title: 'My Title',
    slug: 'my-title',
    content: 'Content here',
    author: 'Author Name',
    tags: JSON.stringify(['tag1', 'tag2']),
    published: true,
    pubDate: new Date(),
  })
  .returning()
  .get()

// READ - Get all records
const allPosts = await db.select().from(Post).all()

// READ - Get single record
const post = await db.select().from(Post).where(eq(Post.slug, 'my-slug')).get()

// UPDATE - Update record
await db
  .update(Post)
  .set({
    title: 'Updated Title',
    updatedAt: new Date(),
  })
  .where(eq(Post.id, postId))

// DELETE - Delete record
await db.delete(Post).where(eq(Post.id, postId))
```

### Filtering and Sorting

```typescript
// Published posts, newest first
const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .all()

// Featured posts only
const featured = await db
  .select()
  .from(Post)
  .where(and(eq(Post.published, true), eq(Post.featured, true)))
  .all()

// Posts by author
const authorPosts = await db.select().from(Post).where(eq(Post.author, 'Shawn Sandy')).all()

// Search posts
const results = await db
  .select()
  .from(Post)
  .where(or(like(Post.title, `%${search}%`), like(Post.content, `%${search}%`)))
  .all()
```

### Pagination

```typescript
const page = 1
const pageSize = 10

const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .limit(pageSize)
  .offset((page - 1) * pageSize)
  .all()
```

### Joins

```typescript
// Posts with user info
const postsWithUsers = await db
  .select({
    postTitle: Post.title,
    postSlug: Post.slug,
    authorName: User.name,
    authorAvatar: User.avatar,
  })
  .from(Post)
  .leftJoin(User, eq(Post.userId, User.id))
  .all()

// Comments with post info
const commentsWithPosts = await db
  .select()
  .from(Comment)
  .innerJoin(Post, eq(Comment.postId, Post.id))
  .where(eq(Comment.approved, true))
  .all()
```

### Aggregations

```typescript
// Count posts
const postCount = await db
  .select({ count: sql`COUNT(*)`.as('count') })
  .from(Post)
  .where(eq(Post.published, true))
  .get()

// Sum views
const totalViews = await db
  .select({ total: sql`SUM(${Post.viewCount})`.as('total') })
  .from(Post)
  .get()

// Average views per post
const avgViews = await db
  .select({ avg: sql`AVG(${Post.viewCount})`.as('avg') })
  .from(Post)
  .get()

// Posts with comment count
const postsWithCommentCount = await db
  .select({
    id: Post.id,
    title: Post.title,
    commentCount: sql`(
      SELECT COUNT(*) 
      FROM ${Comment} 
      WHERE ${Comment.postId} = ${Post.id}
    )`.as('commentCount'),
  })
  .from(Post)
  .all()
```

### Working with JSON Fields

```typescript
// Tags are stored as JSON strings
const post = await db.select().from(Post).get()
const tags = JSON.parse(post.tags) // ['tag1', 'tag2']

// Search by tag
const taggedPosts = await db
  .select()
  .from(Post)
  .where(sql`${Post.tags} LIKE ${`%"${tag}"%`}`)
  .all()

// Update tags
await db
  .update(Post)
  .set({ tags: JSON.stringify(['new', 'tags']) })
  .where(eq(Post.id, postId))
```

## Page Examples

### Blog Listing Page

```astro
---
import { db, Post } from 'astro:db'
import { eq, desc } from 'astro:db'

const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .limit(10)
  .all()
---

<ul>
  {
    posts.map(post => (
      <li>
        <a href={`/blog/${post.slug}`}>{post.title}</a>
        <time>{post.pubDate.toLocaleDateString()}</time>
      </li>
    ))
  }
</ul>
```

### Single Post Page

```astro
---
import { db, Post, Comment } from 'astro:db'
import { eq, and } from 'astro:db'

const { slug } = Astro.params
const post = await db.select().from(Post).where(eq(Post.slug, slug)).get()

if (!post) return Astro.redirect('/404')

const comments = await db
  .select()
  .from(Comment)
  .where(and(eq(Comment.postId, post.id), eq(Comment.approved, true)))
  .all()
---

<article>
  <h1>{post.title}</h1>
  <div set:html={post.content} />

  <section>
    <h2>Comments ({comments.length})</h2>
    {
      comments.map(comment => (
        <div>
          <strong>{comment.author}</strong>
          <p>{comment.content}</p>
        </div>
      ))
    }
  </section>
</article>
```

## API Endpoint Examples

### GET Endpoint

```typescript
export const GET: APIRoute = async ({ url }) => {
  const limit = parseInt(url.searchParams.get('limit') || '10')

  const posts = await db.select().from(Post).where(eq(Post.published, true)).limit(limit).all()

  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### POST Endpoint

```typescript
export const POST: APIRoute = async ({ request }) => {
  const data = await request.json()

  const post = await db.insert(Post).values(data).returning().get()

  return new Response(JSON.stringify(post), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Common Patterns

### Increment View Counter

```typescript
await db
  .update(Post)
  .set({
    viewCount: sql`${Post.viewCount} + 1`,
  })
  .where(eq(Post.id, postId))
```

### Check if Record Exists

```typescript
const exists = await db.select({ id: Post.id }).from(Post).where(eq(Post.slug, slug)).get()

if (exists) {
  // Record exists
}
```

### Bulk Insert

```typescript
const posts = [
  { title: 'Post 1', slug: 'post-1', ... },
  { title: 'Post 2', slug: 'post-2', ... },
]

await db.insert(Post).values(posts)
```

### Transaction Example

```typescript
await db.transaction(async tx => {
  const post = await tx.insert(Post).values(postData).returning().get()

  await tx.insert(Analytics).values({
    path: `/blog/${post.slug}`,
    title: post.title,
  })
})
```

### Date Filtering

```typescript
// Posts from last 30 days
const recentPosts = await db
  .select()
  .from(Post)
  .where(and(eq(Post.published, true), gte(Post.pubDate, sql`datetime('now', '-30 days')`)))
  .all()

// Posts from specific month
const monthPosts = await db
  .select()
  .from(Post)
  .where(sql`strftime('%Y-%m', ${Post.pubDate}) = '2024-01'`)
  .all()
```

## Production Tips

### Environment Variables

```bash
# .env.production
ASTRO_DB_REMOTE_URL=libsql://your-db.turso.io
ASTRO_DB_APP_TOKEN=your-auth-token
```

### Push to Production

```bash
npm run db:push:remote
```

### Connection String Options

```bash
# In-memory database
ASTRO_DB_REMOTE_URL=memory:

# Local file
ASTRO_DB_REMOTE_URL=file:path/to/database.db

# Remote server
ASTRO_DB_REMOTE_URL=libsql://your-server.turso.io

# With encryption
ASTRO_DB_REMOTE_URL=file:local.db?encryptionKey=your-key

# With sync
ASTRO_DB_REMOTE_URL=memory:?syncUrl=libsql%3A%2F%2Fyour-server.io&syncInterval=60
```

## Debugging

### Log SQL Queries

```typescript
const query = db.select().from(Post).where(eq(Post.published, true))
console.log('SQL:', query.toSQL())
```

### Check Database File

```bash
# Database location
ls -la .astro/content.db

# Reset database
rm -rf .astro
npm run dev
```

### Common Errors

```typescript
// Error: UNIQUE constraint failed
// Solution: Check for duplicate unique fields (email, slug)

// Error: FOREIGN KEY constraint failed
// Solution: Ensure referenced record exists

// Error: no such table
// Solution: Run npm run db:push

// Error: Module "astro:db" not found
// Solution: Normal in TS - ignore, it works at runtime
```
