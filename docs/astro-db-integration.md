# Adding Astro DB to Your Project: Complete Guide

This comprehensive guide covers integrating Astro DB into the `@shawnsandy/astro-kit` project, providing a type-safe database solution that works seamlessly with your existing Astro setup.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Database Configuration](#database-configuration)
- [Querying Your Database](#querying-your-database)
- [Production Setup](#production-setup)
- [Integration with Existing Content](#integration-with-existing-content)
- [Testing and Development](#testing-and-development)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Your project is already well-configured with:
- Astro 5.8.0
- Node.js adapter with server output mode
- TypeScript support
- Content collections structure

## Installation and Setup

### 1. Install Astro DB

The easiest way to add Astro DB is using the automated setup:

```bash
npx astro add db
```

This command will:
- Install the `@astrojs/db` package
- Add the integration to your `astro.config.mjs`
- Create the necessary configuration files

### 2. Manual Installation (Alternative)

If you prefer manual setup:

```bash
npm install @astrojs/db
```

Then update your `astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";
import embeds from "astro-embed/integration";
import { astroImageTools } from "astro-imagetools";
import lighthouse from "astro-lighthouse";
import node from "@astrojs/node";
import clerk from "@clerk/astro";
import db from "@astrojs/db"; // Add this import

export default defineConfig({
  site: "https://example.com",
  integrations: [
    react(),
    sitemap(),
    lighthouse(),
    embeds(),
    mdx(),
    clerk(),
    astroImageTools,
    db(), // Add this integration
  ],
  adapter: node({
    mode: "standalone",
  }),
  output: "server",
});
```

## Database Configuration

### 3. Define Your Database Schema

After installation, you'll have a `db/config.ts` file. Define your tables based on your content structure:

```typescript
// db/config.ts
import { defineDb, defineTable, column } from 'astro:db';

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    email: column.text({ unique: true }),
    name: column.text(),
    avatar: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
  }
});

const Post = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    slug: column.text({ unique: true }),
    content: column.text(),
    excerpt: column.text({ optional: true }),
    author: column.text(),
    tags: column.json(), // Store array of tags
    featured: column.boolean({ default: false }),
    published: column.boolean({ default: false }),
    pubDate: column.date(),
    userId: column.number({ references: () => User.columns.id, optional: true }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  }
});

const Comment = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    content: column.text(),
    author: column.text(),
    email: column.text(),
    postId: column.number({ references: () => Post.columns.id }),
    parentId: column.number({ references: () => Comment.columns.id, optional: true }),
    approved: column.boolean({ default: false }),
    createdAt: column.date({ default: new Date() }),
  }
});

const Analytics = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    path: column.text(),
    views: column.number({ default: 0 }),
    uniqueViews: column.number({ default: 0 }),
    lastViewed: column.date({ default: new Date() }),
  }
});

export default defineDb({
  tables: { User, Post, Comment, Analytics }
});
```

### 4. Seed Your Database (Development)

Create a `db/seed.ts` file for development data:

```typescript
// db/seed.ts
import { db, User, Post, Comment, Analytics } from 'astro:db';

export default async function seed() {
  // Seed users
  await db.insert(User).values([
    {
      id: 1,
      email: 'shawn@example.com',
      name: 'Shawn Sandy',
      avatar: '/avatars/shawn.jpg',
    },
    {
      id: 2,
      email: 'demo@example.com',
      name: 'Demo User',
    }
  ]);

  // Seed posts
  await db.insert(Post).values([
    {
      id: 1,
      title: 'Getting Started with Astro DB',
      slug: 'getting-started-astro-db',
      content: 'This is a comprehensive guide to using Astro DB...',
      excerpt: 'Learn how to integrate Astro DB into your project',
      author: 'Shawn Sandy',
      tags: JSON.stringify(['astro', 'database', 'tutorial']),
      featured: true,
      published: true,
      pubDate: new Date('2024-01-15'),
      userId: 1,
    },
    {
      id: 2,
      title: 'Building with Astro Components',
      slug: 'building-astro-components',
      content: 'Component architecture in Astro...',
      excerpt: 'Best practices for creating reusable Astro components',
      author: 'Shawn Sandy',
      tags: JSON.stringify(['astro', 'components', 'development']),
      featured: false,
      published: true,
      pubDate: new Date('2024-01-20'),
      userId: 1,
    }
  ]);

  // Seed comments
  await db.insert(Comment).values([
    {
      id: 1,
      content: 'Great tutorial! Very helpful for beginners.',
      author: 'Jane Doe',
      email: 'jane@example.com',
      postId: 1,
      approved: true,
    },
    {
      id: 2,
      content: 'Looking forward to more Astro content!',
      author: 'John Smith',
      email: 'john@example.com',
      postId: 1,
      approved: true,
    }
  ]);

  // Seed analytics
  await db.insert(Analytics).values([
    {
      id: 1,
      path: '/',
      views: 150,
      uniqueViews: 120,
    },
    {
      id: 2,
      path: '/blog/getting-started-astro-db',
      views: 89,
      uniqueViews: 67,
    }
  ]);
}
```

## Querying Your Database

### 5. Using Astro DB in Pages

Here's how to query your database in Astro pages:

```astro
---
// src/pages/blog/index.astro
import { db, Post } from 'astro:db';
import Layout from '#layouts/Layout.astro';

// Get all published posts
const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate));

// Get featured posts
const featuredPosts = await db
  .select()
  .from(Post)
  .where(and(eq(Post.published, true), eq(Post.featured, true)))
  .limit(3);
---

<Layout title="Blog">
  <main>
    <h1>Featured Posts</h1>
    <div class="featured-grid">
      {featuredPosts.map(post => (
        <article>
          <h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
          <p>{post.excerpt}</p>
          <p>By {post.author} on {post.pubDate.toLocaleDateString()}</p>
        </article>
      ))}
    </div>

    <h1>All Posts</h1>
    <div class="posts-list">
      {posts.map(post => (
        <article>
          <h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3>
          <p>{post.excerpt}</p>
          <p>By {post.author} on {post.pubDate.toLocaleDateString()}</p>
        </article>
      ))}
    </div>
  </main>
</Layout>
```

### 6. Dynamic Routes with Database

```astro
---
// src/pages/blog/[slug].astro
import { db, Post, Comment } from 'astro:db';
import { eq } from 'astro:db';
import Layout from '#layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await db.select().from(Post).where(eq(Post.published, true));
  
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post }
  }));
}

const { post } = Astro.props;

// Get comments for this post
const comments = await db
  .select()
  .from(Comment)
  .where(and(eq(Comment.postId, post.id), eq(Comment.approved, true)))
  .orderBy(asc(Comment.createdAt));
---

<Layout title={post.title}>
  <article>
    <header>
      <h1>{post.title}</h1>
      <p>By {post.author} on {post.pubDate.toLocaleDateString()}</p>
      {post.tags && (
        <div class="tags">
          {JSON.parse(post.tags).map(tag => (
            <span class="tag">{tag}</span>
          ))}
        </div>
      )}
    </header>
    
    <div class="content">
      {post.content}
    </div>

    <section class="comments">
      <h2>Comments</h2>
      {comments.map(comment => (
        <div class="comment">
          <h4>{comment.author}</h4>
          <p>{comment.content}</p>
          <time>{comment.createdAt.toLocaleDateString()}</time>
        </div>
      ))}
    </section>
  </article>
</Layout>
```

### 7. API Endpoints with Database

```typescript
// src/pages/api/posts.ts
import type { APIRoute } from 'astro';
import { db, Post } from 'astro:db';
import { eq, desc } from 'astro:db';

export const GET: APIRoute = async ({ url }) => {
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 10;
  const featured = url.searchParams.get('featured') === 'true';

  let query = db.select().from(Post).where(eq(Post.published, true));

  if (featured) {
    query = query.where(eq(Post.featured, true));
  }

  const posts = await query
    .orderBy(desc(Post.pubDate))
    .limit(limit);

  return new Response(JSON.stringify(posts), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    const newPost = await db.insert(Post).values({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      author: data.author,
      tags: JSON.stringify(data.tags || []),
      published: data.published || false,
      pubDate: new Date(data.pubDate),
    }).returning();

    return new Response(JSON.stringify(newPost[0]), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create post' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
```

## Production Setup

### 8. Environment Configuration

For production, you'll need to set up environment variables:

```bash
# .env
ASTRO_DB_REMOTE_URL=your-database-url
ASTRO_DB_APP_TOKEN=your-auth-token
```

#### Using Turso (Recommended)

1. Install the Turso CLI:
```bash
npm install -g @tursodatabase/cli
```

2. Create an account and database:
```bash
turso auth signup
turso db create your-project-name
```

3. Get your database URL:
```bash
turso db show your-project-name
```

4. Create an auth token:
```bash
turso db tokens create your-project-name
```

5. Set environment variables:
```bash
ASTRO_DB_REMOTE_URL=libsql://your-project-name-[user].turso.io
ASTRO_DB_APP_TOKEN=your-generated-token
```

### 9. Deploy Database Schema

Before deploying, push your schema to production:

```bash
# Push to remote database
npx astro db push --remote
```

## Integration with Existing Content

### 10. Hybrid Approach

You can use both your existing content collections and Astro DB:

```astro
---
// src/pages/content/[slug].astro
import { getCollection } from 'astro:content';
import { db, Analytics } from 'astro:db';
import { eq } from 'astro:db';

// Get content from collections
export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post }
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();

// Track page views in database
const currentPath = Astro.url.pathname;
const analytics = await db
  .select()
  .from(Analytics)
  .where(eq(Analytics.path, currentPath))
  .get();

if (analytics) {
  await db
    .update(Analytics)
    .set({ 
      views: analytics.views + 1,
      lastViewed: new Date()
    })
    .where(eq(Analytics.path, currentPath));
} else {
  await db.insert(Analytics).values({
    path: currentPath,
    views: 1,
    uniqueViews: 1,
    lastViewed: new Date()
  });
}
---

<Layout title={post.data.title}>
  <Content />
</Layout>
```

### 11. Migrating Content Collections to Database

You can create a migration script to move existing content to the database:

```typescript
// scripts/migrate-content.ts
import { getCollection } from 'astro:content';
import { db, Post } from 'astro:db';

export async function migrateContent() {
  const posts = await getCollection('posts');
  
  for (const post of posts) {
    await db.insert(Post).values({
      title: post.data.title,
      slug: post.slug,
      content: post.body,
      excerpt: post.data.description,
      author: post.data.author,
      tags: JSON.stringify(post.data.tags || []),
      featured: post.data.featured || false,
      published: true,
      pubDate: post.data.pubDate,
    });
  }
}
```

## Testing and Development

### 12. Development Commands

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:push": "astro db push",
    "db:push:remote": "astro db push --remote",
    "db:studio": "astro db studio",
    "db:seed": "astro db seed"
  }
}
```

### 13. Database Studio

Astro DB includes a web interface for managing your database:

```bash
npm run db:studio
```

This opens a local web interface where you can view and edit your database tables.

### 14. Testing with Vitest

Create database tests using your existing Vitest setup:

```typescript
// tests/database.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db, Post, User } from 'astro:db';

describe('Database Operations', () => {
  beforeEach(async () => {
    // Clear test data
    await db.delete(Post);
    await db.delete(User);
  });

  it('should create and retrieve a user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const [user] = await db.insert(User).values(userData).returning();
    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);

    const retrievedUser = await db.select().from(User).where(eq(User.id, user.id)).get();
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.email).toBe(userData.email);
  });

  it('should create posts with relationships', async () => {
    const [user] = await db.insert(User).values({
      email: 'author@example.com',
      name: 'Author Name',
    }).returning();

    const postData = {
      title: 'Test Post',
      slug: 'test-post',
      content: 'This is test content',
      author: user.name,
      published: true,
      pubDate: new Date(),
      userId: user.id,
    };

    const [post] = await db.insert(Post).values(postData).returning();
    expect(post.title).toBe(postData.title);
    expect(post.userId).toBe(user.id);
  });
});
```

## Best Practices

### 15. Database Design Principles

1. **Normalization**: Keep related data in separate tables with proper relationships
2. **Indexing**: Add indexes for frequently queried columns
3. **Type Safety**: Always use the generated types from `astro:db`
4. **Validation**: Use Zod or similar for input validation before database operations

### 16. Performance Optimization

1. **Query Optimization**: Use `select()` to fetch only needed columns
2. **Pagination**: Implement pagination for large datasets
3. **Caching**: Cache expensive queries using Astro's built-in caching or external solutions
4. **Connection Pooling**: Configure connection limits for production

### 17. Security Best Practices

1. **Input Validation**: Validate all user inputs before database operations
2. **Parameterized Queries**: Astro DB automatically handles SQL injection prevention
3. **Environment Variables**: Store sensitive configuration in environment variables
4. **Access Control**: Implement proper authentication and authorization

### 18. Data Migration Strategy

1. **Version Control**: Track schema changes in version control
2. **Backup Strategy**: Regular backups of production data
3. **Migration Scripts**: Create scripts for schema updates
4. **Rollback Plan**: Have rollback procedures for failed migrations

## Troubleshooting

### Common Issues and Solutions

1. **Type Errors**: Ensure you're importing types from `astro:db` correctly
2. **Connection Issues**: Verify environment variables and network connectivity
3. **Schema Mismatches**: Run `astro db push` to sync schema changes
4. **Performance Issues**: Add indexes and optimize queries

### Debug Tools

1. **Database Studio**: Use `npm run db:studio` for visual debugging
2. **Query Logging**: Enable query logging in development
3. **Error Handling**: Implement comprehensive error handling in API routes

### Environment-Specific Issues

1. **Development**: Ensure local database is properly seeded
2. **Production**: Verify environment variables and remote database connectivity
3. **CI/CD**: Include database operations in deployment pipeline

## Migration from Other Databases

If you're migrating from another database system:

1. **Export Data**: Export existing data in a format compatible with Astro DB
2. **Schema Mapping**: Map existing schema to Astro DB table definitions
3. **Data Transformation**: Transform data to match new schema
4. **Validation**: Verify data integrity after migration

## Conclusion

Astro DB provides a powerful, type-safe database solution that integrates seamlessly with your Astro project. With its built-in ORM, development tools, and production-ready features, it's an excellent choice for content-rich applications that need dynamic data capabilities alongside static content.

For more information, consult the [official Astro DB documentation](https://docs.astro.build/en/guides/astro-db/).