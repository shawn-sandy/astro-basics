# Comments Table Feature Documentation

## Overview

The comments system provides a flexible, secure way to add commentary and discussion
functionality to any entity in the serve513 database. Built with a polymorphic design
pattern, the comments table can attach comments to events, client visits, users,
clothing history, or any future entity types.

## Table Schema

### Core Structure

```sql
CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    author_id uuid NOT NULL,

    -- Polymorphic reference fields
    commentable_type text NOT NULL CHECK (
        commentable_type IN ('event', 'client_visit', 'user', 'clothing_history')
    ),
    commentable_id uuid NOT NULL,

    -- Optional parent comment for threading
    parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,

    -- Status and visibility
    status text DEFAULT 'active' CHECK (
        status IN ('active', 'hidden', 'archived', 'flagged')
    ),
    is_internal boolean DEFAULT false,

    -- Organization scope
    organization_id text DEFAULT 'serve513-beta',

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### Column Definitions

| Column              | Type        | Description                    | Constraints             |
| ------------------- | ----------- | ------------------------------ | ----------------------- |
| `id`                | uuid        | Primary key                    | Auto-generated          |
| `content`           | text        | Comment content                | NOT NULL                |
| `author_id`         | uuid        | Reference to users.id          | NOT NULL, FK            |
| `commentable_type`  | text        | Entity type being commented on | CHECK constraint        |
| `commentable_id`    | uuid        | ID of the entity               | NOT NULL                |
| `parent_comment_id` | uuid        | For threaded comments          | FK to comments.id       |
| `status`            | text        | Comment visibility status      | CHECK constraint        |
| `is_internal`       | boolean     | Staff-only visibility flag     | Default false           |
| `organization_id`   | text        | Organization scope             | Default 'serve513-beta' |
| `created_at`        | timestamptz | Creation timestamp             | Auto-generated          |
| `updated_at`        | timestamptz | Update timestamp               | Auto-updated            |

### Relationships

- **Author**: `author_id` → `users.id` (CASCADE DELETE)
- **Parent Comment**: `parent_comment_id` → `comments.id` (CASCADE DELETE)
- **Polymorphic Target**: References any entity via `commentable_type` + `commentable_id`

## Security Model

### Row Level Security (RLS)

The comments table has RLS enabled with comprehensive policies:

#### View Policy

```sql
-- Users can view comments they authored or non-internal comments in their organization
CREATE POLICY "Users can view comments" ON public.comments
    FOR SELECT USING (
        author_id = auth.uid() OR
        (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
         AND (is_internal = false OR
              (SELECT role FROM public.users WHERE id = auth.uid()) IN ('coordinator', 'super_admin')))
    );
```

#### Insert Policy

```sql
-- Users can create comments in their organization
CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );
```

#### Update Policy

```sql
-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());
```

#### Delete Policy

```sql
-- Only coordinators and super_admins can delete comments
CREATE POLICY "Coordinators can delete comments" ON public.comments
    FOR DELETE USING (
        author_id = auth.uid() OR
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('coordinator', 'super_admin')
    );
```

### Access Control Matrix

| Role        | Create | Read Own | Read Others         | Update Own | Delete Own | Delete Others |
| ----------- | ------ | -------- | ------------------- | ---------- | ---------- | ------------- |
| volunteer   | ✓      | ✓        | Public only         | ✓          | ✗          | ✗             |
| coordinator | ✓      | ✓        | All (inc. internal) | ✓          | ✓          | ✓             |
| super_admin | ✓      | ✓        | All (inc. internal) | ✓          | ✓          | ✓             |

## Performance Optimizations

### Indexes

The following indexes are created for optimal query performance:

```sql
-- Query by entity type and ID
CREATE INDEX idx_comments_commentable ON public.comments(commentable_type, commentable_id);

-- Query by author
CREATE INDEX idx_comments_author ON public.comments(author_id);

-- Query by parent comment (for threading)
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);

-- Query by organization
CREATE INDEX idx_comments_organization ON public.comments(organization_id);

-- Query by creation date (for sorting)
CREATE INDEX idx_comments_created_at ON public.comments(created_at);
```

### Auto-Update Trigger

```sql
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Usage Examples

### Basic Comment Operations

#### Add a Comment to an Event

```sql
INSERT INTO comments (content, author_id, commentable_type, commentable_id)
VALUES (
    'Great turnout at today event! Looking forward to the next one.',
    '123e4567-e89b-12d3-a456-426614174000',  -- user UUID
    'event',
    '987fcdeb-51d2-43a1-9876-543210987654'   -- event UUID
);
```

#### Reply to a Comment (Threading)

```sql
INSERT INTO comments (content, author_id, commentable_type, commentable_id, parent_comment_id)
VALUES (
    'I completely agree! The volunteers did amazing work.',
    '234f5678-f90c-23e4-b567-537725285111',  -- replying user UUID
    'event',
    '987fcdeb-51d2-43a1-9876-543210987654',  -- same event UUID
    'abc12345-1234-5678-9abc-123456789abc'   -- parent comment UUID
);
```

#### Add Internal Staff Note

```sql
INSERT INTO comments (content, author_id, commentable_type, commentable_id, is_internal)
VALUES (
    'Client mentioned needing follow-up for housing assistance. Schedule for next week.',
    '345g6789-g01d-34f5-c678-648836396222',  -- staff member UUID
    'client_visit',
    '456h7890-h12e-45g6-d789-759947407333',  -- client visit UUID
    true  -- internal comment
);
```

### Query Examples

#### Get All Comments for an Event

```sql
SELECT
    c.*,
    u.full_name as author_name,
    u.avatar_url as author_avatar
FROM comments c
JOIN users u ON c.author_id = u.id
WHERE c.commentable_type = 'event'
    AND c.commentable_id = '987fcdeb-51d2-43a1-9876-543210987654'
    AND c.status = 'active'
ORDER BY c.created_at ASC;
```

#### Get Comment Thread (Parent + Replies)

```sql
WITH RECURSIVE comment_thread AS (
    -- Root comment
    SELECT c.*, 0 as depth
    FROM comments c
    WHERE c.id = 'abc12345-1234-5678-9abc-123456789abc'

    UNION ALL

    -- Recursive replies
    SELECT c.*, ct.depth + 1
    FROM comments c
    JOIN comment_thread ct ON c.parent_comment_id = ct.id
)
SELECT
    ct.*,
    u.full_name as author_name
FROM comment_thread ct
JOIN users u ON ct.author_id = u.id
ORDER BY ct.depth, ct.created_at;
```

#### Get Recent Comments for Dashboard

```sql
SELECT
    c.*,
    u.full_name as author_name,
    CASE c.commentable_type
        WHEN 'event' THEN e.name
        WHEN 'client_visit' THEN 'Client Visit'
        ELSE c.commentable_type
    END as entity_name
FROM comments c
JOIN users u ON c.author_id = u.id
LEFT JOIN events e ON c.commentable_type = 'event' AND c.commentable_id = e.id
WHERE c.organization_id = 'serve513-beta'
    AND c.status = 'active'
    AND (c.is_internal = false OR u.role IN ('coordinator', 'super_admin'))
ORDER BY c.created_at DESC
LIMIT 20;
```

## Integration Patterns

### Frontend Integration

#### React Hook Example

```typescript
// useComments.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Comment {
  id: string
  content: string
  author_id: string
  author_name?: string
  created_at: string
  parent_comment_id?: string
}

export function useComments(entityType: string, entityId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchComments() {
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          users!comments_author_id_fkey(full_name, avatar_url)
        `
        )
        .eq('commentable_type', entityType)
        .eq('commentable_id', entityId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })

      if (!error && data) {
        setComments(data)
      }
      setLoading(false)
    }

    fetchComments()
  }, [entityType, entityId])

  const addComment = async (content: string, parentId?: string) => {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        content,
        commentable_type: entityType,
        commentable_id: entityId,
        parent_comment_id: parentId,
      })
      .select()
      .single()

    if (!error && data) {
      setComments(prev => [...prev, data])
    }

    return { data, error }
  }

  return { comments, loading, addComment }
}
```

### API Integration

#### Astro API Route Example

```typescript
// src/pages/api/comments/[entityType]/[entityId].ts
import type { APIRoute } from 'astro'
import { supabase } from '../../../../lib/supabase'

export const GET: APIRoute = async ({ params, request }) => {
  const { entityType, entityId } = params

  if (!entityType || !entityId) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        users!comments_author_id_fkey(id, full_name, avatar_url),
        parent_comment:comments!parent_comment_id(id, content, author_id)
      `
      )
      .eq('commentable_type', entityType)
      .eq('commentable_id', entityId)
      .eq('status', 'active')
      .order('created_at')

    if (error) throw error

    return new Response(JSON.stringify({ comments }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const POST: APIRoute = async ({ params, request }) => {
  const { entityType, entityId } = params
  const body = await request.json()

  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content: body.content,
        commentable_type: entityType,
        commentable_id: entityId,
        parent_comment_id: body.parent_comment_id,
        is_internal: body.is_internal || false,
      })
      .select(
        `
        *,
        users!comments_author_id_fkey(full_name, avatar_url)
      `
      )
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ comment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

## Extending the System

### Adding New Entity Types

To support comments on new entity types:

1. **Update the CHECK constraint:**

```sql
ALTER TABLE comments
DROP CONSTRAINT comments_commentable_type_check;

ALTER TABLE comments
ADD CONSTRAINT comments_commentable_type_check
CHECK (commentable_type IN (
    'event', 'client_visit', 'user', 'clothing_history', 'new_entity_type'
));
```

2. **Update your application logic** to handle the new entity type in queries and UI components.

### Comment Status Workflow

The `status` field supports these values:

- `active`: Visible comment (default)
- `hidden`: Temporarily hidden by moderators
- `archived`: Archived but preserved
- `flagged`: Flagged for review

### Moderation Features

Future moderation capabilities can be built on top of the existing structure:

```sql
-- Example: Flag inappropriate comments
UPDATE comments
SET status = 'flagged'
WHERE id = 'comment-uuid';

-- Example: Hide comments pending review
UPDATE comments
SET status = 'hidden'
WHERE author_id = 'problematic-user-uuid';
```

## Best Practices

### Performance

1. **Always include entity filters** in queries to leverage indexes
2. **Limit comment depth** in threaded discussions (recommend max 3 levels)
3. **Paginate results** for entities with many comments
4. **Use appropriate SELECT clauses** - don't fetch unnecessary data

### Security

1. **Never bypass RLS** - always use authenticated connections
2. **Validate entity existence** before creating comments
3. **Sanitize content** on the frontend before submission
4. **Monitor flagged comments** regularly

### User Experience

1. **Show author information** with comments (name, avatar)
2. **Implement real-time updates** using Supabase subscriptions
3. **Provide editing capabilities** with clear time limits
4. **Support markdown formatting** for richer content

## Monitoring and Maintenance

### Regular Tasks

1. **Review flagged comments** weekly
2. **Archive old comments** on completed events (optional)
3. **Monitor comment volume** per entity
4. **Check for spam patterns**

### Performance Monitoring

```sql
-- Monitor comment activity
SELECT
    commentable_type,
    COUNT(*) as comment_count,
    COUNT(DISTINCT author_id) as unique_commenters,
    MAX(created_at) as last_comment
FROM comments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY commentable_type
ORDER BY comment_count DESC;
```

This comments system provides a robust foundation for community engagement while maintaining the security and organizational structure of your serve513 platform.
