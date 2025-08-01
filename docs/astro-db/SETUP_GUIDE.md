# Astro DB Setup Guide

A comprehensive step-by-step guide for setting up and configuring Astro DB in the astro-basics project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Understanding the Database](#understanding-the-database)
4. [Customizing the Schema](#customizing-the-schema)
5. [Working with Seed Data](#working-with-seed-data)
6. [Database Management](#database-management)
7. [Production Setup](#production-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up Astro DB, ensure you have:

- Node.js 18+ installed
- npm or pnpm package manager
- The astro-basics project cloned locally
- Basic understanding of SQL and databases

## Development Setup

### Step 1: Install Dependencies

The project already has Astro DB installed, but if starting fresh:

```bash
# Install the project dependencies
npm install

# Or if Astro DB wasn't installed yet
npx astro add db
```

### Step 2: Start the Development Server

```bash
npm run dev
```

**What happens automatically:**

1. Astro creates a local SQLite database at `.astro/content.db`
2. The database schema is applied from `db/config.ts`
3. Sample data is inserted from `db/seed.ts`
4. The dev server starts on `http://localhost:4321`

### Step 3: Verify the Setup

Check these URLs to confirm everything is working:

- **Blog page**: `http://localhost:4321/blog-db`
- **API endpoint**: `http://localhost:4321/api/posts`
- **API with params**: `http://localhost:4321/api/posts?featured=true`

You should see sample blog posts and data.

### Step 4: Inspect the Database

The database file is located at:

```
.astro/content.db
```

You can inspect it using:

- [DB Browser for SQLite](https://sqlitebrowser.org/) (GUI)
- SQLite CLI: `sqlite3 .astro/content.db`
- VS Code SQLite extension

## Understanding the Database

### Database Schema Overview

The project includes 6 main tables:

#### 1. User Table

Stores user accounts and profiles:

```sql
CREATE TABLE User (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Post Table

Stores blog posts and articles:

```sql
CREATE TABLE Post (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author TEXT NOT NULL,
  tags TEXT, -- JSON array as string
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  pubDate DATETIME NOT NULL,
  updatedDate DATETIME,
  image TEXT,
  imageAlt TEXT,
  userId INTEGER REFERENCES User(id),
  viewCount INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Comment Table

Stores post comments with threading support:

```sql
CREATE TABLE Comment (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  postId INTEGER NOT NULL REFERENCES Post(id),
  parentId INTEGER REFERENCES Comment(id),
  approved BOOLEAN DEFAULT false,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Analytics Table

Tracks page views and statistics:

```sql
CREATE TABLE Analytics (
  id INTEGER PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  title TEXT,
  referrer TEXT,
  userAgent TEXT,
  views INTEGER DEFAULT 1,
  uniqueViews INTEGER DEFAULT 1,
  lastViewed DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. ContactSubmission Table

Stores contact form submissions:

```sql
CREATE TABLE ContactSubmission (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  ipAddress TEXT,
  userAgent TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. Newsletter Table

Manages email subscribers:

```sql
CREATE TABLE Newsletter (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscribedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  unsubscribedAt DATETIME,
  verified BOOLEAN DEFAULT false,
  token TEXT
);
```

### Relationships

- **User → Post**: One-to-many (userId foreign key)
- **Post → Comment**: One-to-many (postId foreign key)
- **Comment → Comment**: Self-referencing for threading (parentId)

### Indexes

Performance indexes are automatically created for:

- Unique constraints (email, slug, path)
- Foreign keys (userId, postId, parentId)
- Frequently queried fields (published, featured, approved)

## Customizing the Schema

### Adding a New Table

1. **Edit `db/config.ts`**:

```typescript
import { defineDb, defineTable, column, NOW } from 'astro:db'

// Add a new table
const Category = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({ unique: true }),
    slug: column.text({ unique: true }),
    description: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ['slug'], unique: true }],
})

// Update the database export
export default defineDb({
  tables: {
    User,
    Post,
    Comment,
    Analytics,
    ContactSubmission,
    Newsletter,
    Category, // Add the new table
  },
})
```

2. **Update seed data in `db/seed.ts`**:

```typescript
import { db, Category } from 'astro:db'

export default async function seed() {
  // ... existing seed data

  // Seed categories
  await db.insert(Category).values([
    {
      id: 1,
      name: 'Technology',
      slug: 'technology',
      description: 'Posts about technology and programming',
    },
    {
      id: 2,
      name: 'Design',
      slug: 'design',
      description: 'Posts about web design and UX',
    },
  ])
}
```

3. **Push the schema changes**:

```bash
npm run db:push
```

### Modifying Existing Tables

To add a column to an existing table:

1. **Update the schema in `db/config.ts`**:

```typescript
const Post = defineTable({
  columns: {
    // ... existing columns
    categoryId: column.number({
      references: () => Category.columns.id,
      optional: true,
    }),
  },
})
```

2. **Push changes**:

```bash
npm run db:push
```

**Note**: For production databases, you'll need migration strategies for schema changes.

## Working with Seed Data

### Understanding Seed Data

The `db/seed.ts` file contains sample data for development. It includes:

- 3 sample users with different roles
- 5 blog posts (mix of published and draft)
- Comments with threading examples
- Analytics data for popular pages
- Contact form submissions in different states
- Newsletter subscribers with various statuses

### Customizing Seed Data

1. **Edit `db/seed.ts`**:

```typescript
export default async function seed() {
  // Clear existing data (optional)
  await db.delete(Comment)
  await db.delete(Post)
  await db.delete(User)

  // Add your custom data
  await db.insert(User).values([
    {
      id: 1,
      email: 'your-email@example.com',
      name: 'Your Name',
      bio: 'Your bio here',
    },
  ])

  await db.insert(Post).values([
    {
      id: 1,
      title: 'Your First Post',
      slug: 'your-first-post',
      content: 'Your post content here...',
      author: 'Your Name',
      published: true,
      pubDate: new Date(),
      userId: 1,
    },
  ])
}
```

2. **Reset and reseed the database**:

```bash
# Delete the database and restart
rm -rf .astro
npm run dev
```

### Conditional Seeding

For more control over seeding:

```typescript
export default async function seed() {
  // Check if data already exists
  const existingUsers = await db.select().from(User).all()

  if (existingUsers.length === 0) {
    // Only seed if no users exist
    await db.insert(User).values([...])
  }
}
```

## Database Management

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (auto-creates DB)

# Schema Management
npm run db:push          # Apply schema to local DB
npm run db:verify        # Verify schema integrity
npm run db:push:remote   # Push schema to production

# Utilities
npm run db:execute       # Execute custom SQL
```

### Manual Database Operations

#### Reset the Database

```bash
# Complete reset
rm -rf .astro
npm run dev
```

#### Backup the Database

```bash
# Copy the database file
cp .astro/content.db ./backup-content.db

# Or use SQLite dump
sqlite3 .astro/content.db .dump > backup.sql
```

#### Restore from Backup

```bash
# Restore from file
cp ./backup-content.db .astro/content.db

# Restore from SQL dump
sqlite3 .astro/content.db < backup.sql
```

### Querying the Database

You can query the database directly in your code:

```typescript
import { db, Post } from 'astro:db'
import { eq, desc } from 'astro:db'

// Get all published posts
const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .all()
```

## Production Setup

### Option 1: Turso (Recommended)

Turso is the official LibSQL hosting service and integrates seamlessly with Astro DB.

#### Step 1: Install Turso CLI

```bash
npm install -g @turso/cli
```

#### Step 2: Create Account and Database

```bash
# Sign up/login
turso auth signup

# Create database
turso db create astro-basics-prod

# Get database info
turso db show astro-basics-prod
```

#### Step 3: Get Connection Details

```bash
# Get the database URL
turso db show astro-basics-prod

# Create auth token
turso db tokens create astro-basics-prod
```

#### Step 4: Configure Environment Variables

Create `.env.production`:

```bash
ASTRO_DB_REMOTE_URL=libsql://astro-basics-prod-[random].turso.io
ASTRO_DB_APP_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

#### Step 5: Deploy Schema

```bash
npm run db:push:remote
```

### Option 2: Self-hosted LibSQL

For self-hosting LibSQL:

#### Step 1: Install LibSQL Server

```bash
# Using Docker
docker run -p 8080:8080 -v $(pwd)/data:/var/lib/sqld -d ghcr.io/tursodatabase/libsql-server:latest
```

#### Step 2: Configure Connection

```bash
# .env.production
ASTRO_DB_REMOTE_URL=http://localhost:8080
ASTRO_DB_APP_TOKEN=your-auth-token
```

### Option 3: Local File Database

For simple deployments:

```bash
# .env.production
ASTRO_DB_REMOTE_URL=file:./prod-database.db
```

### Deployment Considerations

1. **Environment Variables**: Ensure production environment has the correct variables
2. **Schema Migrations**: Plan how to handle schema changes
3. **Data Migration**: Consider how to migrate existing data
4. **Backups**: Set up regular database backups
5. **Monitoring**: Monitor database performance and errors

## Troubleshooting

### Common Issues

#### 1. Database Not Created

**Problem**: `.astro/content.db` doesn't exist

**Solutions**:

```bash
# Restart dev server
npm run dev

# Force schema push
npm run db:push

# Check for errors in terminal
```

#### 2. Schema Errors

**Problem**: "Table doesn't exist" or schema mismatch

**Solutions**:

```bash
# Verify schema
npm run db:verify

# Reset database
rm -rf .astro
npm run dev

# Check db/config.ts for syntax errors
```

#### 3. Seed Data Errors

**Problem**: Seeding fails with constraint violations

**Solutions**:

```bash
# Check db/seed.ts for:
# - Duplicate IDs
# - Foreign key violations
# - Invalid data types

# Reset and try again
rm -rf .astro
npm run dev
```

#### 4. TypeScript Errors

**Problem**: "Cannot find module 'astro:db'"

**Solution**: This is normal - TypeScript doesn't recognize the virtual module, but it works at runtime.

#### 5. Production Connection Issues

**Problem**: Can't connect to remote database

**Solutions**:

```bash
# Verify environment variables
echo $ASTRO_DB_REMOTE_URL
echo $ASTRO_DB_APP_TOKEN

# Test connection manually
curl -H "Authorization: Bearer $ASTRO_DB_APP_TOKEN" $ASTRO_DB_REMOTE_URL

# Check firewall/network settings
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=astro:db npm run dev
```

### Health Checks

Create a health check endpoint:

```typescript
// src/pages/api/health.ts
import { db, Post } from 'astro:db'

export const GET = async () => {
  try {
    const count = await db.select().from(Post).all()
    return new Response(
      JSON.stringify({
        status: 'healthy',
        database: 'connected',
        posts: count.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
```

### Performance Tips

1. **Use Indexes**: Ensure frequently queried columns have indexes
2. **Limit Queries**: Always use `.limit()` for large datasets
3. **Select Specific Columns**: Don't use `SELECT *` unless necessary
4. **Use Prepared Statements**: Astro DB handles this automatically
5. **Connection Pooling**: Managed automatically in production

### Getting Help

If you encounter issues:

1. Check the [Astro DB documentation](https://docs.astro.build/en/guides/astro-db/)
2. Review the [Troubleshooting section](./ASTRO_DB_GUIDE.md#troubleshooting) in the main guide
3. Check the [GitHub issues](https://github.com/withastro/astro/issues)
4. Join the [Astro Discord](https://astro.build/chat) for community support

## Next Steps

Once your database is set up:

1. **Explore the examples**: Check `/blog-db` and `/api/posts`
2. **Read the guides**: Review the [Complete Guide](./ASTRO_DB_GUIDE.md)
3. **Try the API**: Use the [Quick Reference](./ASTRO_DB_QUICK_REFERENCE.md)
4. **Build features**: Follow the [Implementation Examples](./ASTRO_DB_IMPLEMENTATION_EXAMPLES.md)
5. **Plan production**: Set up your production database when ready

Your Astro DB setup is now complete and ready for development!
