-- Rollback Migration: Drop comments table and related objects
-- Author: Claude Code
-- Date: 2025-09-05
-- Description: Safely removes comments table and all associated objects

-- WARNING: This will permanently delete all comment data
-- Make sure to backup data before running this rollback

BEGIN;

-- Drop the view first (depends on table)
DROP VIEW IF EXISTS comment_threads;

-- Drop the helper function
DROP FUNCTION IF EXISTS get_comment_count(TEXT, UUID, BOOLEAN);

-- Drop RLS policies (will be automatically dropped with table, but explicit for clarity)
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Coordinators can delete comments" ON public.comments;

-- Drop indexes (will be automatically dropped with table, but explicit for completeness)
DROP INDEX IF EXISTS idx_comments_commentable;
DROP INDEX IF EXISTS idx_comments_author;
DROP INDEX IF EXISTS idx_comments_parent;
DROP INDEX IF EXISTS idx_comments_organization;
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_status;
DROP INDEX IF EXISTS idx_comments_entity_status_created;

-- Drop the trigger
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;

-- Finally, drop the table
DROP TABLE IF EXISTS public.comments;

-- Rollback complete notification
DO $$ 
BEGIN 
    RAISE NOTICE 'Comments table rollback completed successfully';
    RAISE NOTICE 'Dropped table: public.comments';
    RAISE NOTICE 'Dropped view: comment_threads';
    RAISE NOTICE 'Dropped function: get_comment_count()';
    RAISE NOTICE 'Dropped all associated indexes and policies';
END $$;

COMMIT;