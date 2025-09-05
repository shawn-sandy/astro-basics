# Supabase Migrations for Blog Comments

This directory contains the database migrations for the blog comment system.

## Migration Files

### 003_create_comments_table.sql

- **Purpose**: Creates the base polymorphic comments table
- **Features**: Supports multiple entity types, threading, RLS policies
- **Status**: Base migration (should be applied first)

### 004_add_blog_support_to_comments.sql

- **Purpose**: Adds blog post support to the comments table
- **Features**:
  - Extends commentable_type to include 'post' and 'doc'
  - Creates simplified RLS policies for public blog comments
  - Adds helper function `get_blog_comment_count()`
  - Creates view `public_blog_comment_threads` for threaded display
  - Adds performance index for blog queries

### 004_add_blog_support_to_comments_rollback.sql

- **Purpose**: Rolls back blog support modifications
- **Warning**: Deletes all blog post comments!

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Apply migration
supabase db push --include-all

# Or apply specific file
supabase db push scripts/supabase-migrations/004_add_blog_support_to_comments.sql
```

### Option 2: Manual Application

1. Copy the SQL content from the migration file
2. Run it in your Supabase SQL Editor
3. Verify the changes using the test script

## Testing

After applying the migration, test the schema:

```bash
npm run test:blog-comments
```

This will verify:

- Schema constraints allow 'post' and 'doc' types
- Helper functions are available
- Views are accessible
- RLS policies are working
- Performance indexes are in place

## Environment Requirements

Make sure these environment variables are set in your `.env` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

## Migration Order

Apply migrations in this order:

1. `003_create_comments_table.sql` (if not already applied)
2. `004_add_blog_support_to_comments.sql`

## Rollback Process

To rollback blog support (WARNING: This deletes blog comment data):

```bash
# Apply rollback migration
supabase db push scripts/supabase-migrations/004_add_blog_support_to_comments_rollback.sql
```

## Next Steps

After Phase 1 is complete:

1. Implement Phase 2: API endpoints (`/api/comments.ts`)
2. Implement Phase 3: React components (`CommentForm`, `CommentsList`)
3. Implement Phase 4: Astro integration (`Comments.astro`)

See `/docs/comment-system-implementation.md` for the complete implementation plan.
