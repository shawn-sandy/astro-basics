-- Migration: Fix commentable_id type for blog posts and docs
-- Author: Claude Code  
-- Date: 2025-09-05
-- Description: Changes commentable_id from UUID to TEXT to support blog post/doc slugs

BEGIN;

-- Drop existing indexes and constraints that depend on the column type
DROP INDEX IF EXISTS idx_comments_commentable;
DROP INDEX IF EXISTS idx_comments_entity_status_created;
DROP INDEX IF EXISTS idx_comments_blog_public;

-- Drop functions that use the UUID type
DROP FUNCTION IF EXISTS get_comment_count(TEXT, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_blog_comment_count(TEXT, UUID);

-- Drop views that depend on the column
DROP VIEW IF EXISTS comment_threads CASCADE;
DROP VIEW IF EXISTS public_blog_comment_threads CASCADE;

-- Change the commentable_id column type from UUID to TEXT
ALTER TABLE public.comments 
ALTER COLUMN commentable_id TYPE TEXT;

-- Recreate the indexes with the new type
CREATE INDEX IF NOT EXISTS idx_comments_commentable 
    ON public.comments(commentable_type, commentable_id);

CREATE INDEX IF NOT EXISTS idx_comments_entity_status_created 
    ON public.comments(commentable_type, commentable_id, status, created_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_comments_blog_public 
    ON public.comments(commentable_type, commentable_id, status, is_internal, created_at)
    WHERE commentable_type IN ('post', 'doc') AND status = 'active' AND is_internal = FALSE;

-- Recreate helper functions with TEXT type
CREATE OR REPLACE FUNCTION get_comment_count(
    entity_type TEXT,
    entity_id TEXT,
    include_internal BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
BEGIN
    IF include_internal THEN
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM public.comments
            WHERE commentable_type = entity_type
                AND commentable_id = entity_id
                AND status = 'active'
        );
    ELSE
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM public.comments
            WHERE commentable_type = entity_type
                AND commentable_id = entity_id
                AND status = 'active'
                AND is_internal = FALSE
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate blog comment count function with TEXT type
CREATE OR REPLACE FUNCTION get_blog_comment_count(
    entity_type TEXT,
    entity_id TEXT
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.comments
        WHERE commentable_type = entity_type
            AND commentable_id = entity_id
            AND status = 'active'
            AND is_internal = FALSE
            AND commentable_type IN ('post', 'doc')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the helper functions
GRANT EXECUTE ON FUNCTION get_comment_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_blog_comment_count TO anon;
GRANT EXECUTE ON FUNCTION get_blog_comment_count TO authenticated;

-- Recreate comment threads view
CREATE OR REPLACE VIEW comment_threads AS
WITH RECURSIVE comment_tree AS (
    -- Root comments
    SELECT 
        c.*,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        0 as depth,
        ARRAY[c.created_at] as sort_path
    FROM public.comments c
    JOIN public.users u ON c.author_id = u.id
    WHERE c.parent_comment_id IS NULL
        AND c.status = 'active'
    
    UNION ALL
    
    -- Child comments
    SELECT 
        c.*,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        ct.depth + 1,
        ct.sort_path || c.created_at
    FROM public.comments c
    JOIN public.users u ON c.author_id = u.id
    JOIN comment_tree ct ON c.parent_comment_id = ct.id
    WHERE c.status = 'active'
        AND ct.depth < 10  -- Prevent infinite recursion
)
SELECT * FROM comment_tree
ORDER BY sort_path;

-- Recreate public blog comment threads view
CREATE OR REPLACE VIEW public_blog_comment_threads AS
WITH RECURSIVE comment_tree AS (
    -- Root comments for blog posts only
    SELECT 
        c.*,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        0 as depth,
        ARRAY[c.created_at] as sort_path
    FROM public.comments c
    JOIN public.users u ON c.author_id = u.id
    WHERE c.parent_comment_id IS NULL
        AND c.status = 'active'
        AND c.is_internal = FALSE
        AND c.commentable_type IN ('post', 'doc')
    
    UNION ALL
    
    -- Child comments for blog posts only
    SELECT 
        c.*,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        ct.depth + 1,
        ct.sort_path || c.created_at
    FROM public.comments c
    JOIN public.users u ON c.author_id = u.id
    JOIN comment_tree ct ON c.parent_comment_id = ct.id
    WHERE c.status = 'active'
        AND c.is_internal = FALSE
        AND c.commentable_type IN ('post', 'doc')
        AND ct.depth < 5  -- Prevent infinite recursion, allow deeper nesting for blogs
)
SELECT * FROM comment_tree
ORDER BY sort_path;

-- Grant access to the views
GRANT SELECT ON comment_threads TO authenticated;
GRANT SELECT ON public_blog_comment_threads TO anon;
GRANT SELECT ON public_blog_comment_threads TO authenticated;

-- Update column comment
COMMENT ON COLUMN public.comments.commentable_id IS 
    'ID of the entity this comment is attached to (UUID for internal entities, TEXT slug for blog posts/docs)';

-- Migration complete notification
DO $$ 
BEGIN 
    RAISE NOTICE 'Blog commentable_id type fix migration completed successfully';
    RAISE NOTICE 'Changed commentable_id type from UUID to TEXT';
    RAISE NOTICE 'Recreated all dependent indexes, functions, and views';
    RAISE NOTICE 'Blog posts and docs can now use string slugs as IDs';
END $$;

COMMIT;