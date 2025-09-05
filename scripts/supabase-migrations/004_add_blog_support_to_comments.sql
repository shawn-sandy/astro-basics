-- Migration: Add blog post support to comments table
-- Author: Claude Code
-- Date: 2025-09-05
-- Description: Modifies the comments table to support blog posts and docs, and adds simplified RLS policies

BEGIN;

-- Phase 1.1: Modify Schema for Blog Posts
-- Add 'post' and 'doc' to the allowed commentable_type values
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_commentable_type_check;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_commentable_type_check CHECK (
    commentable_type IN ('event', 'client_visit', 'user', 'clothing_history', 'post', 'doc')
);

-- Phase 1.2: Create Simplified RLS Policies for Blog Comments
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view post comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create post comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own post comments" ON public.comments;
DROP POLICY IF EXISTS "Users can soft delete own post comments" ON public.comments;

-- Policy 1: Anyone can view public blog post comments (no authentication required)
CREATE POLICY "Users can view post comments" ON public.comments
    FOR SELECT 
    USING (
        commentable_type IN ('post', 'doc') AND 
        status = 'active' AND 
        is_internal = FALSE
    );

-- Policy 2: Authenticated users can create blog post comments
CREATE POLICY "Authenticated users can create post comments" ON public.comments
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        author_id = auth.uid() AND
        commentable_type IN ('post', 'doc') AND
        status = 'active' AND
        is_internal = FALSE
    );

-- Policy 3: Users can update their own blog post comments
CREATE POLICY "Users can update own post comments" ON public.comments
    FOR UPDATE 
    USING (
        commentable_type IN ('post', 'doc') AND
        author_id = auth.uid()
    ) 
    WITH CHECK (
        commentable_type IN ('post', 'doc') AND
        author_id = auth.uid() AND
        -- Only allow updating content and status
        status IN ('active', 'archived')
    );

-- Policy 4: Users can soft delete their own blog post comments
CREATE POLICY "Users can soft delete own post comments" ON public.comments
    FOR UPDATE 
    USING (
        commentable_type IN ('post', 'doc') AND
        author_id = auth.uid() AND
        status = 'active'
    ) 
    WITH CHECK (
        commentable_type IN ('post', 'doc') AND
        author_id = auth.uid() AND
        status = 'archived'
    );

-- Add helpful comments for the new functionality
COMMENT ON COLUMN public.comments.commentable_type IS 
    'Type of entity this comment is attached to (event, client_visit, user, clothing_history, post, doc)';

-- Create helper function to get public comment counts for blog posts
CREATE OR REPLACE FUNCTION get_blog_comment_count(
    entity_type TEXT,
    entity_id UUID
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

-- Grant permissions for the helper function
GRANT EXECUTE ON FUNCTION get_blog_comment_count TO anon;
GRANT EXECUTE ON FUNCTION get_blog_comment_count TO authenticated;

-- Create view for public blog comment threads (no authentication required)
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

-- Grant access to the view (public read access for blog comments)
GRANT SELECT ON public_blog_comment_threads TO anon;
GRANT SELECT ON public_blog_comment_threads TO authenticated;

-- Add index for blog post comment queries (if not already exists)
CREATE INDEX IF NOT EXISTS idx_comments_blog_public 
    ON public.comments(commentable_type, commentable_id, status, is_internal, created_at)
    WHERE commentable_type IN ('post', 'doc') AND status = 'active' AND is_internal = FALSE;

-- Migration complete notification
DO $$ 
BEGIN 
    RAISE NOTICE 'Blog comments migration completed successfully';
    RAISE NOTICE 'Added support for commentable_type: post, doc';
    RAISE NOTICE 'Created 4 new RLS policies for blog comments';
    RAISE NOTICE 'Created function: get_blog_comment_count()';
    RAISE NOTICE 'Created view: public_blog_comment_threads';
    RAISE NOTICE 'Added performance index: idx_comments_blog_public';
END $$;

COMMIT;