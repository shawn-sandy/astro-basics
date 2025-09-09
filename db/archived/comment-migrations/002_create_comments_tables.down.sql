-- Rollback: Create users and comments tables for comment system
-- Created: 2025-01-07
-- Description: Safely removes all database objects created by the up migration.
--              Order is critical to handle foreign key dependencies properly.

-- Enable foreign key constraints to ensure proper cleanup
PRAGMA foreign_keys = ON;

-- Drop views first (depend on tables)
DROP VIEW IF EXISTS comments_with_authors;

-- Drop triggers (attached to tables)
DROP TRIGGER IF EXISTS validate_user_uuid;
DROP TRIGGER IF EXISTS validate_comment_uuid;
DROP TRIGGER IF EXISTS update_comments_timestamp;
DROP TRIGGER IF EXISTS update_users_timestamp;

-- Drop indexes on comments table
DROP INDEX IF EXISTS idx_comments_organization;
DROP INDEX IF EXISTS idx_comments_author_content;
DROP INDEX IF EXISTS idx_comments_active_content;
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_status;
DROP INDEX IF EXISTS idx_comments_parent;
DROP INDEX IF EXISTS idx_comments_author;
DROP INDEX IF EXISTS idx_comments_commentable;

-- Drop indexes on users table
DROP INDEX IF EXISTS idx_users_clerk_id;

-- Drop comments table first (has foreign key to users)
DROP TABLE IF EXISTS comments;

-- Drop users table (referenced by comments foreign key)
DROP TABLE IF EXISTS users;

-- Remove migration log entry (if table exists)
-- Use INSERT OR IGNORE to handle case where __migration_log doesn't exist
DELETE FROM __migration_log WHERE migration = '002_create_comments_tables' AND EXISTS (
    SELECT 1 FROM sqlite_master WHERE type='table' AND name='__migration_log'
);

-- Note: We don't drop __migration_log table itself as other migrations may use it