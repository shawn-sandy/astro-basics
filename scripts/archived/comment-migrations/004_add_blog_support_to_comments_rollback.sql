-- Rollback Migration: Remove blog post support from comments table
-- Author: Claude Code
-- Date: 2025-09-05
-- Description: Rolls back blog post support modifications to comments table

-- WARNING: This will remove all blog post comments and related functionality
-- Make sure to backup data before running this rollback

BEGIN;

-- Drop the view first (depends on table)
DROP VIEW IF EXISTS public_blog_comment_threads;

-- Drop the helper function
DROP FUNCTION IF EXISTS get_blog_comment_count(TEXT, UUID);

-- Drop blog-specific RLS policies
DROP POLICY IF EXISTS "Users can view post comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create post comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own post comments" ON public.comments;
DROP POLICY IF EXISTS "Users can soft delete own post comments" ON public.comments;

-- Drop the blog-specific index
DROP INDEX IF EXISTS idx_comments_blog_public;

-- Remove blog post comments (WARNING: This deletes data!)
DELETE FROM public.comments 
WHERE commentable_type IN ('post', 'doc');

-- Restore original constraint (remove 'post' and 'doc' from allowed types)
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_commentable_type_check;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_commentable_type_check CHECK (
    commentable_type IN ('event', 'client_visit', 'user', 'clothing_history')
);

-- Restore original comment on commentable_type column
COMMENT ON COLUMN public.comments.commentable_type IS 
    'Type of entity this comment is attached to (event, client_visit, user, clothing_history)';

-- Rollback complete notification
DO $$ 
BEGIN 
    RAISE NOTICE 'Blog comments rollback completed successfully';
    RAISE NOTICE 'Removed support for commentable_type: post, doc';
    RAISE NOTICE 'Dropped 4 blog-specific RLS policies';
    RAISE NOTICE 'Dropped function: get_blog_comment_count()';
    RAISE NOTICE 'Dropped view: public_blog_comment_threads';
    RAISE NOTICE 'Dropped performance index: idx_comments_blog_public';
    RAISE NOTICE 'WARNING: All blog post comments have been deleted';
END $$;

COMMIT;