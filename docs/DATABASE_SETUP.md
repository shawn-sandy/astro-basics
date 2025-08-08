# Database Setup Guide

## Overview

This project uses Turso (LibSQL) as the database backend with a comprehensive migration system and setup scripts.

## Quick Start

```bash
# Setup database (first time)
npm run db:setup

# Check if schema exists
npm run db:check

# Reset database (drop and recreate)
npm run db:reset

# Run migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status
```

## Environment Configuration

Add these variables to your `.env` file:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

## Scripts

### Setup Scripts

#### `scripts/setup-db.js`

Production-ready database setup script with comprehensive features:

- **Commands:**
  - `npm run db:setup` - Initial database setup
  - `npm run db:reset` - Drop and recreate schema
  - `npm run db:check` - Check if schema exists
- **Options:**

  - `--reset, -r` - Drop and recreate the schema
  - `--check, -c` - Check schema existence without modifications
  - `--verbose, -v` - Show detailed output including SQL and table structure
  - `--help, -h` - Display help message

- **Features:**
  - Environment validation with helpful error messages
  - Retry logic for connection failures
  - Schema verification after setup
  - Detailed error reporting
  - Table structure display in verbose mode

#### `scripts/setup-db.ts`

TypeScript version with additional features:

- **Additional Options:**

  - `--show-config` - Display current database configuration
  - `--dry-run` - Preview changes without executing

- **Enhanced Features:**
  - Colored terminal output for better readability
  - Execution plan preview
  - Integration with `src/libs/schema-setup.ts`
  - Type safety and better error handling

### Migration System

#### `scripts/migrate.js`

Full-featured migration runner for database schema evolution:

- **Commands:**

  - `npm run db:migrate` - Run pending migrations
  - `npm run db:migrate:status` - Show migration status
  - `npm run db:migrate:create <name>` - Create new migration
  - `npm run db:migrate:rollback` - Rollback last migration

- **Features:**
  - Automatic migration tracking in `_migrations` table
  - Transaction-based execution for safety
  - Up and down migrations support
  - Migration file naming with timestamps
  - Status overview showing pending/applied migrations

## Database Schema

### Messages Table

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  subject TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

- `idx_messages_email` - Fast email lookups
- `idx_messages_is_read` - Unread messages queries
- `idx_messages_created_at` - Date-based queries (DESC)

## TypeScript Integration

### Schema Setup Module (`src/libs/schema-setup.ts`)

```typescript
import { setupDatabaseSchema, checkSchemaExists, resetSchema } from '#libs/schema-setup'

// Setup database
const result = await setupDatabaseSchema()

// Check if schema exists
const exists = await checkSchemaExists()

// Reset schema (drop and recreate)
const resetResult = await resetSchema()
```

### Turso Client (`src/libs/turso.ts`)

```typescript
import getTursoClient from '#libs/turso'

const client = getTursoClient()
const result = await client.execute('SELECT * FROM messages')
```

## Migration Workflow

### Creating a Migration

```bash
# Create a new migration
npm run db:migrate:create add_user_table

# This creates two files:
# - db/migrations/2025-08-08T12-00-00_add_user_table.up.sql
# - db/migrations/2025-08-08T12-00-00_add_user_table.down.sql
```

### Migration File Structure

**Up Migration** (`*.up.sql`):

```sql
-- Forward migration: creates or modifies schema
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);
```

**Down Migration** (`*.down.sql`):

```sql
-- Rollback migration: undoes the up migration
DROP TABLE users;
```

### Running Migrations

```bash
# Check status first
npm run db:migrate:status

# Run all pending migrations
npm run db:migrate

# Rollback last migration if needed
npm run db:migrate:rollback
```

## Best Practices

1. **Always use migrations** for schema changes in production
2. **Test migrations** locally before deploying
3. **Include down migrations** for rollback capability
4. **Use transactions** for data migrations
5. **Version control** all migration files
6. **Never modify** applied migrations
7. **Use indexes** for frequently queried columns
8. **Add constraints** at the database level

## Troubleshooting

### Connection Issues

```bash
# Check configuration
node scripts/setup-db.js --show-config

# Test with verbose output
npm run db:setup -- --verbose

# Verify environment variables
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN
```

### Schema Issues

```bash
# Check current schema state
npm run db:check -- --verbose

# Reset if corrupted
npm run db:reset

# Verify table structure
sqlite3 local.db "PRAGMA table_info(messages);"
```

### Migration Issues

```bash
# Check migration status
npm run db:migrate:status

# Manual rollback if needed
npm run db:migrate:rollback

# Reset migrations table
sqlite3 local.db "DROP TABLE _migrations;"
npm run db:migrate
```

## Performance Optimization

1. **Use prepared statements** for repeated queries
2. **Batch operations** when possible
3. **Create appropriate indexes** for query patterns
4. **Monitor slow queries** in production
5. **Use connection pooling** for high traffic

## Security Considerations

1. **Never commit** `.env` files
2. **Use read-only tokens** when possible
3. **Validate all inputs** before database operations
4. **Use parameterized queries** to prevent SQL injection
5. **Implement rate limiting** for API endpoints
6. **Audit database access** in production

## Additional Resources

- [Turso Documentation](https://docs.turso.tech)
- [LibSQL Client Documentation](https://github.com/libsql/libsql-client-ts)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Database Migration Best Practices](https://www.prisma.io/dataguide/types/relational/migration-strategies)
