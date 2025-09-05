# Comments Table Migration Usage Guide

## Overview

This guide explains how to use the comments table migration scripts to add
commenting functionality to your Supabase database in the serve513 project.

## Migration Files

The migration consists of two files:

- `003_create_comments_table.sql` - Creates the comments table and all related objects
- `003_create_comments_table_rollback.sql` - Safely removes all comments-related objects

## Running the Migration

### Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Apply the migration
supabase db reset --linked
# or
supabase migration up
```

### Option 2: Using Claude Code MCP Integration

```bash
# Apply directly via MCP
claude-code mcp supabase apply_migration \
  --project_id jjfbseverfowdtdkowpp \
  --name "create_comments_table" \
  --query "$(cat scripts/supabase-migrations/003_create_comments_table.sql)"
```

### Option 3: Manual Execution in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `003_create_comments_table.sql`
4. Click **Run** to execute

## What the Migration Creates

### Tables

- `public.comments` - Main comments table with polymorphic relationships

### Indexes (7 total)

- `idx_comments_commentable` - Query by entity type and ID
- `idx_comments_author` - Query by author
- `idx_comments_parent` - Query threaded comments
- `idx_comments_organization` - Query by organization
- `idx_comments_created_at` - Sort by creation date
- `idx_comments_status` - Filter by status
- `idx_comments_entity_status_created` - Composite index for common queries

### Security Policies (4 total)

- View policy - Users can see their comments + public org comments
- Insert policy - Users can create comments in their organization
- Update policy - Users can edit their own comments
- Delete policy - Only coordinators/admins can delete comments

### Helper Functions

- `get_comment_count()` - Returns comment counts for entities
- `update_updated_at_column()` - Auto-updates timestamps (reused from existing)

### Views

- `comment_threads` - Recursive view for displaying threaded comments

## Rollback Instructions

If you need to remove the comments functionality:

### Option 1: Using Rollback Script

```bash
# Execute the rollback script
supabase db reset --linked
# or manually run rollback script
```

### Option 2: Manual Rollback

```sql
-- Run the rollback script content
-- WARNING: This permanently deletes all comment data
-- Execute: scripts/supabase-migrations/003_create_comments_table_rollback.sql
```

## Verification

After running the migration, verify the installation:

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'comments';

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'comments';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'comments';

-- Check policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'comments';
```

Expected results:

- ✅ 1 table: `comments`
- ✅ 7 indexes starting with `idx_comments_`
- ✅ 4 RLS policies
- ✅ 1 helper function: `get_comment_count`
- ✅ 1 view: `comment_threads`

## Testing the Migration

### Basic Functionality Test

```sql
-- Test insert (replace UUIDs with actual values from your users table)
INSERT INTO comments (content, author_id, commentable_type, commentable_id)
VALUES (
    'Test comment',
    (SELECT id FROM users LIMIT 1),
    'event',
    gen_random_uuid()
);

-- Test select
SELECT * FROM comments WHERE content = 'Test comment';

-- Test helper function
SELECT get_comment_count('event', (SELECT commentable_id FROM comments LIMIT 1));

-- Clean up test
DELETE FROM comments WHERE content = 'Test comment';
```

### Security Test

```sql
-- Verify RLS is working (should return policies)
SELECT * FROM pg_policies WHERE tablename = 'comments';

-- Test view access (should work without errors)
SELECT * FROM comment_threads LIMIT 1;
```

## Integration with Existing Tables

The migration is designed to work with your existing schema:

### Compatible Entities

Comments can be attached to:

- `events` (existing table)
- `client_visits` (existing table)
- `users` (existing table)
- `clothing_history` (existing table)

### Adding New Entity Types

To add support for new entities, update the CHECK constraint:

```sql
ALTER TABLE comments
DROP CONSTRAINT comments_commentable_type_check;

ALTER TABLE comments
ADD CONSTRAINT comments_commentable_type_check
CHECK (commentable_type IN (
    'event', 'client_visit', 'user', 'clothing_history', 'new_type'
));
```

## Troubleshooting

### Migration Fails

1. **Permission Error**: Ensure you have superuser or owner privileges
2. **Constraint Violation**: Check if `users` table exists and has correct structure
3. **Function Exists**: If `update_updated_at_column()` exists, that's normal (reused)

### RLS Not Working

```sql
-- Verify auth context
SELECT auth.uid(); -- Should return user UUID when authenticated

-- Check user organization
SELECT organization_id FROM users WHERE id = auth.uid();
```

### Performance Issues

```sql
-- Verify indexes are being used
EXPLAIN ANALYZE
SELECT * FROM comments
WHERE commentable_type = 'event' AND commentable_id = 'some-uuid';
```

## Next Steps

After successful migration:

1. **Update Application Code** - Integrate comments into your Astro/React components
2. **Create API Routes** - Add comment CRUD endpoints
3. **Update UI Components** - Add comment forms and displays
4. **Test Security** - Verify RLS policies work in your application context
5. **Monitor Performance** - Watch query performance as comments grow

## Support

If you encounter issues:

1. Check the Supabase logs in your dashboard
2. Verify your user authentication is working
3. Test with the SQL examples in the main documentation
4. Review the complete feature documentation at `docs/database/comments-table-feature.md`
