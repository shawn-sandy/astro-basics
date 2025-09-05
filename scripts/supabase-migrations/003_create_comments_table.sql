-- Migration: Create comments table with polymorphic relationships and RLS
-- Author: Claude Code
-- Date: 2025-09-05
-- Description: Creates a flexible comments system that can attach to any entity type

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Polymorphic reference fields
    commentable_type TEXT NOT NULL,
    commentable_id UUID NOT NULL,
    
    -- Optional parent comment for threading
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    
    -- Status and visibility
    status TEXT DEFAULT 'active',
    is_internal BOOLEAN DEFAULT FALSE,
    
    -- Organization scope
    organization_id TEXT DEFAULT 'serve513-beta',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT comments_commentable_type_check CHECK (
        commentable_type IN ('event', 'client_visit', 'user', 'clothing_history')
    ),
    CONSTRAINT comments_status_check CHECK (
        status IN ('active', 'hidden', 'archived', 'flagged')
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_commentable 
    ON public.comments(commentable_type, commentable_id);

CREATE INDEX IF NOT EXISTS idx_comments_author 
    ON public.comments(author_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent 
    ON public.comments(parent_comment_id) 
    WHERE parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_organization 
    ON public.comments(organization_id);

CREATE INDEX IF NOT EXISTS idx_comments_created_at 
    ON public.comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_status 
    ON public.comments(status) 
    WHERE status != 'active';

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_comments_entity_status_created 
    ON public.comments(commentable_type, commentable_id, status, created_at)
    WHERE status = 'active';

-- Add trigger to auto-update updated_at (reuse existing function)
CREATE TRIGGER IF NOT EXISTS update_comments_updated_at 
    BEFORE UPDATE ON public.comments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Coordinators can delete comments" ON public.comments;

-- Create RLS policies

-- Policy 1: Users can view comments they authored or non-internal comments in their organization
CREATE POLICY "Users can view comments" ON public.comments
    FOR SELECT 
    USING (
        author_id = auth.uid() OR 
        (
            organization_id = (
                SELECT organization_id 
                FROM public.users 
                WHERE id = auth.uid()
            ) 
            AND (
                is_internal = FALSE OR 
                (
                    SELECT role 
                    FROM public.users 
                    WHERE id = auth.uid()
                ) IN ('coordinator', 'super_admin')
            )
        )
    );

-- Policy 2: Users can create comments in their organization
CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT 
    WITH CHECK (
        author_id = auth.uid() AND
        organization_id = (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Policy 3: Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE 
    USING (author_id = auth.uid()) 
    WITH CHECK (author_id = auth.uid());

-- Policy 4: Only coordinators and super_admins can delete comments
CREATE POLICY "Coordinators can delete comments" ON public.comments
    FOR DELETE 
    USING (
        author_id = auth.uid() OR 
        (
            SELECT role 
            FROM public.users 
            WHERE id = auth.uid()
        ) IN ('coordinator', 'super_admin')
    );

-- Add helpful comments to table and columns
COMMENT ON TABLE public.comments IS 
    'Comments that can be attached to various entities like events, client visits, etc.';

COMMENT ON COLUMN public.comments.commentable_type IS 
    'Type of entity this comment is attached to (event, client_visit, user, clothing_history)';

COMMENT ON COLUMN public.comments.commentable_id IS 
    'UUID of the entity this comment is attached to';

COMMENT ON COLUMN public.comments.parent_comment_id IS 
    'For threaded comments - references parent comment ID';

COMMENT ON COLUMN public.comments.is_internal IS 
    'Whether this comment is only visible to staff members (coordinators and super_admins)';

COMMENT ON COLUMN public.comments.status IS 
    'Comment status: active (visible), hidden (moderated), archived (preserved), flagged (needs review)';

-- Create helper function to get comment counts for entities
CREATE OR REPLACE FUNCTION get_comment_count(
    entity_type TEXT,
    entity_id UUID,
    include_internal BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
BEGIN
    IF include_internal THEN
        RETURN (
            SELECT COUNT(*)
            FROM public.comments
            WHERE commentable_type = entity_type
                AND commentable_id = entity_id
                AND status = 'active'
        );
    ELSE
        RETURN (
            SELECT COUNT(*)
            FROM public.comments
            WHERE commentable_type = entity_type
                AND commentable_id = entity_id
                AND status = 'active'
                AND is_internal = FALSE
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the helper function
GRANT EXECUTE ON FUNCTION get_comment_count TO authenticated;

-- Create view for comment threads (helpful for UI)
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

-- Grant access to the view
GRANT SELECT ON comment_threads TO authenticated;

-- Migration complete notification
DO $$ 
BEGIN 
    RAISE NOTICE 'Comments table migration completed successfully';
    RAISE NOTICE 'Created table: public.comments';
    RAISE NOTICE 'Created indexes: 7 performance indexes';
    RAISE NOTICE 'Created policies: 4 RLS security policies';
    RAISE NOTICE 'Created function: get_comment_count()';
    RAISE NOTICE 'Created view: comment_threads';
END $$;