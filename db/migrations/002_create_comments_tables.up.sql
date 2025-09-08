-- Migration: Create users and comments tables for comment system
-- Created: 2025-01-07
-- Description: Creates the users and comments tables with proper foreign key relationships,
--              indexes, and triggers for the polymorphic comment system supporting
--              both 'post' and 'doc' content types with threaded comments.

-- Enable foreign key constraints (must be first)
PRAGMA foreign_keys = ON;

-- Users table for Clerk authentication synchronization
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    clerk_id TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_clerk_id_length CHECK(length(clerk_id) > 0 AND length(clerk_id) <= 255),
    CONSTRAINT users_full_name_length CHECK(full_name IS NULL OR length(full_name) <= 255),
    CONSTRAINT users_email_format CHECK(email IS NULL OR email GLOB '*@*.*'),
    CONSTRAINT users_email_length CHECK(email IS NULL OR length(email) <= 320),
    CONSTRAINT users_avatar_url_length CHECK(avatar_url IS NULL OR length(avatar_url) <= 2048)
);

-- Comments table for polymorphic comment system
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    author_id TEXT NOT NULL,
    commentable_type TEXT NOT NULL,
    commentable_id TEXT NOT NULL,
    parent_comment_id TEXT,
    status TEXT DEFAULT 'active',
    is_internal INTEGER DEFAULT 0,
    organization_id TEXT DEFAULT 'serve513-beta',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Check constraints for data integrity
    CONSTRAINT comments_id_format CHECK(length(id) = 36 AND id GLOB '*-*-*-*-*'),
    CONSTRAINT comments_content_length CHECK(length(content) > 0 AND length(content) <= 10000),
    CONSTRAINT comments_commentable_type_valid CHECK(commentable_type IN ('post', 'doc')),
    CONSTRAINT comments_commentable_id_length CHECK(length(commentable_id) > 0 AND length(commentable_id) <= 255),
    CONSTRAINT comments_status_valid CHECK(status IN ('active', 'hidden', 'archived', 'flagged')),
    CONSTRAINT comments_is_internal_valid CHECK(is_internal IN (0, 1)),
    CONSTRAINT comments_organization_id_length CHECK(organization_id IS NULL OR length(organization_id) <= 255)
    
    -- Note: Deep nesting validation will be handled at application level
    -- SQLite doesn't support subqueries in CHECK constraints
);

-- Performance indexes for common query patterns
-- User lookups by Clerk ID (authentication)
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Comments by content type and ID (main query pattern)
CREATE INDEX IF NOT EXISTS idx_comments_commentable ON comments(commentable_type, commentable_id);

-- Comments by author (user's own comments)
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);

-- Comments by parent (threaded replies)
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- Comments by status (filtering active/archived)
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- Comments by creation time (chronological ordering)
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Composite index for main query pattern (status + commentable filtering)
CREATE INDEX IF NOT EXISTS idx_comments_active_content ON comments(commentable_type, commentable_id, status, is_internal);

-- Composite index for author + content queries (user's comments on specific content)
CREATE INDEX IF NOT EXISTS idx_comments_author_content ON comments(author_id, commentable_type, commentable_id);

-- Organization-level filtering (if needed for multi-tenant scenarios)
CREATE INDEX IF NOT EXISTS idx_comments_organization ON comments(organization_id);

-- Trigger to automatically update the updated_at timestamp for users
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at <= OLD.updated_at
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to automatically update the updated_at timestamp for comments
CREATE TRIGGER IF NOT EXISTS update_comments_timestamp
AFTER UPDATE ON comments
FOR EACH ROW
WHEN NEW.updated_at <= OLD.updated_at
BEGIN
  UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to validate UUID format on insert (additional safety)
CREATE TRIGGER IF NOT EXISTS validate_comment_uuid
BEFORE INSERT ON comments
FOR EACH ROW
WHEN NEW.id NOT GLOB '????????-????-4???-????-????????????'
BEGIN
  SELECT RAISE(ABORT, 'Comment ID must be a valid UUID v4 format');
END;

-- Trigger to validate user UUID format on insert
CREATE TRIGGER IF NOT EXISTS validate_user_uuid
BEFORE INSERT ON users
FOR EACH ROW
WHEN NEW.id NOT GLOB '????????-????-4???-????-????????????'
BEGIN
  SELECT RAISE(ABORT, 'User ID must be a valid UUID v4 format');
END;

-- View for easy comment retrieval with author information (matches provider query patterns)
CREATE VIEW IF NOT EXISTS comments_with_authors AS
SELECT 
    c.id,
    c.content,
    c.author_id,
    c.commentable_type,
    c.commentable_id,
    c.parent_comment_id,
    c.status,
    c.is_internal,
    c.organization_id,
    c.created_at,
    c.updated_at,
    u.id as author_user_id,
    u.full_name as author_full_name,
    u.avatar_url as author_avatar_url,
    u.clerk_id as author_clerk_id
FROM comments c
INNER JOIN users u ON c.author_id = u.id;

-- Create initial database statistics for query optimization
ANALYZE;

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS __migration_log (
    migration TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Log successful migration
INSERT OR IGNORE INTO __migration_log (migration, applied_at) 
VALUES ('002_create_comments_tables', CURRENT_TIMESTAMP);