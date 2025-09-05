# Comment System Implementation Plan

## Overview

This document outlines the complete implementation plan for adding a comment system to the Astro Basics website, leveraging the existing Supabase comments table structure and following the project's established patterns.

## Database Schema Review

The Supabase comments table (`003_create_comments_table.sql`) provides a sophisticated polymorphic comment system with the following key features:

### Table Structure

```sql
comments
├── id (UUID, primary key)
├── content (TEXT, required)
├── author_id (UUID, references users)
├── commentable_type (TEXT: 'event', 'client_visit', 'user', 'clothing_history')
├── commentable_id (UUID)
├── parent_comment_id (UUID, nullable for threading)
├── status (TEXT: 'active', 'hidden', 'archived', 'flagged')
├── is_internal (BOOLEAN, default false)
├── organization_id (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### Security Features

- Row Level Security (RLS) policies enforced
- Users can view their own comments or public comments in their organization
- Users can only create/update their own comments
- Coordinators/admins have deletion privileges
- Internal comments restricted to staff roles

## Implementation Phases

### Phase 1: Database Adaptation

#### 1.1 Modify Schema for Blog Posts

Since the current schema is designed for different entity types, we need to adapt it for blog posts:

```sql
-- Add 'post' to the allowed commentable_type values
ALTER TABLE public.comments
DROP CONSTRAINT comments_commentable_type_check;

ALTER TABLE public.comments
ADD CONSTRAINT comments_commentable_type_check CHECK (
    commentable_type IN ('event', 'client_visit', 'user', 'clothing_history', 'post', 'doc')
);
```

#### 1.2 Create Simplified RLS Policies for Blog Comments

```sql
-- Simplified policy for blog post comments
CREATE POLICY "Users can view post comments" ON public.comments
    FOR SELECT
    USING (
        commentable_type IN ('post', 'doc') AND
        status = 'active' AND
        is_internal = FALSE
    );

CREATE POLICY "Authenticated users can create post comments" ON public.comments
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        author_id = auth.uid() AND
        commentable_type IN ('post', 'doc')
    );
```

### Phase 2: API Implementation

#### 2.1 Create `/api/comments.ts` Endpoint

```typescript
// src/pages/api/comments.ts
import type { APIRoute } from 'astro'
import { getAuthenticatedSupabase } from '#libs/supabase-server'

interface CommentData {
  content: string
  commentable_type: 'post' | 'doc'
  commentable_id: string
  parent_comment_id?: string
}

export const GET: APIRoute = async context => {
  // Get comments for a specific post/doc
  // Query params: type, id, limit, offset
}

export const POST: APIRoute = async context => {
  // Create new comment (requires authentication)
  // Validate: content length, rate limiting, sanitization
}

export const PATCH: APIRoute = async context => {
  // Update own comment (requires authentication)
  // Allow: content edit, status change
}

export const DELETE: APIRoute = async context => {
  // Soft delete (set status to 'archived')
  // Hard delete only for admins
}
```

### Phase 3: React Components

#### 3.1 CommentForm Component

```typescript
// src/components/react/CommentForm.tsx

interface CommentFormProps {
  postId: string
  postType: 'post' | 'doc'
  parentCommentId?: string
  onSubmitSuccess?: (comment: Comment) => void
  csrfToken?: string
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  postType,
  parentCommentId,
  onSubmitSuccess,
  csrfToken,
}) => {
  // Implementation following ContactForm.tsx patterns:
  // - Form validation
  // - Error handling with Alert component
  // - CSRF token inclusion
  // - Loading states
  // - Character counter (1000 char limit)
  // - Markdown preview (optional)
}
```

Key Features:

- Character limit: 1000 characters
- Required authentication check
- Real-time validation
- Markdown support with preview
- Rate limiting indicator
- Accessibility: ARIA labels and error announcements

#### 3.2 CommentsList Component

```typescript
// src/components/react/CommentsList.tsx

interface CommentsListProps {
  postId: string
  postType: 'post' | 'doc'
  initialComments?: Comment[]
  currentUserId?: string
}

const CommentsList: React.FC<CommentsListProps> = ({
  postId,
  postType,
  initialComments,
  currentUserId,
}) => {
  // Features:
  // - Nested comment threads (max depth: 3)
  // - Pagination (load more button)
  // - Edit/delete controls for own comments
  // - Timestamp formatting
  // - Author info display
  // - Reply functionality
  // - Flagging/reporting (phase 2)
}
```

#### 3.3 Comment Component

```typescript
// src/components/react/Comment.tsx

interface CommentProps {
  comment: CommentData
  currentUserId?: string
  depth: number
  onReply?: (parentId: string) => void
  onEdit?: (commentId: string, content: string) => void
  onDelete?: (commentId: string) => void
}
```

### Phase 4: Astro Integration

#### 4.1 Create Astro Wrapper Component

```astro
---
// src/components/astro/Comments.astro
import CommentsList from '#components/react/CommentsList'
import CommentForm from '#components/react/CommentForm'
import { getAuthenticatedSupabase } from '#libs/supabase-server'

export interface Props {
  postId: string
  postType: 'post' | 'doc'
}

const { postId, postType } = Astro.props
const auth = Astro.locals.auth()
const csrfToken = Astro.locals.csrfToken

let initialComments = []

// Server-side load initial comments
if (postId) {
  const supabase = await getAuthenticatedSupabase(Astro)
  if (supabase) {
    const { data } = await supabase
      .from('comments')
      .select(
        `
        *,
        author:users!author_id(
          id,
          full_name,
          avatar_url,
          clerk_id
        )
      `
      )
      .eq('commentable_type', postType)
      .eq('commentable_id', postId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)

    initialComments = data || []
  }
}
---

<section class="comments-section">
  <h2>Comments</h2>

  {
    auth?.userId ? (
      <CommentForm postId={postId} postType={postType} csrfToken={csrfToken} client:load />
    ) : (
      <div class="auth-prompt">
        <p>
          Please <a href="/sign-in">sign in</a> to leave a comment.
        </p>
      </div>
    )
  }

  <CommentsList
    postId={postId}
    postType={postType}
    initialComments={initialComments}
    currentUserId={auth?.userId}
    client:load
  />
</section>
```

#### 4.2 Add to Blog Post Layout

```astro
---
// src/layouts/Post.astro
import Comments from '#components/astro/Comments.astro'

// ... existing code ...
---

<Layout>
  <!-- Existing post content -->

  <!-- Add comments section after post content -->
  <Comments postId={post.id || post.slug} postType="post" />
</Layout>
```

### Phase 5: Security Implementation

#### 5.1 Content Sanitization

```typescript
// src/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeComment(content: string): string {
  // Allow basic markdown but strip dangerous content
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: [],
  })

  return clean.substring(0, 1000) // Enforce character limit
}
```

#### 5.2 Rate Limiting

```typescript
// src/utils/comment-rate-limiter.ts
import { RateLimiter } from '#utils/rate-limiter'

export const commentRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 comments
  windowMs: 60 * 1000, // per minute
  identifier: 'comment-submission',
})
```

#### 5.3 Moderation Queue (Future Enhancement)

```typescript
// src/pages/dashboard/moderation.astro
// Admin interface for reviewing flagged comments
// - View flagged comments
// - Approve/reject comments
// - Ban users from commenting
// - Bulk moderation actions
```

### Phase 6: Styling

#### 6.1 SCSS Styles

```scss
// src/styles/components/_comments.scss

.comments-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);

  .comment-form {
    background: var(--background-subtle);
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;

    textarea {
      width: 100%;
      min-height: 100px;
      resize: vertical;
    }

    .char-counter {
      text-align: right;
      color: var(--text-muted);
      font-size: 0.875rem;

      &.warning {
        color: var(--color-warning);
      }
      &.error {
        color: var(--color-error);
      }
    }
  }

  .comment {
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-light);

    &.depth-1 {
      margin-left: 2rem;
    }
    &.depth-2 {
      margin-left: 4rem;
    }
    &.depth-3 {
      margin-left: 6rem;
    }

    .comment-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;

      .author-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }

      .author-name {
        font-weight: 500;
      }

      .comment-time {
        color: var(--text-muted);
        font-size: 0.875rem;
      }
    }

    .comment-actions {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;

      button {
        background: none;
        border: none;
        color: var(--link-color);
        cursor: pointer;
        font-size: 0.875rem;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/components/CommentForm.test.tsx
- Validation logic
- Character counting
- Error handling
- Form submission

// tests/api/comments.test.ts
- CRUD operations
- Authentication checks
- Rate limiting
- Input sanitization
```

### E2E Tests

```typescript
// e2e/comments.spec.ts
- Full comment flow (create, edit, delete)
- Authentication requirement
- Threading functionality
- Error scenarios
```

## Performance Considerations

1. **Lazy Loading**: Load comments after initial page render
2. **Pagination**: Load 20 comments initially, then load more on demand
3. **Caching**: Use React Query or SWR for client-side caching
4. **Database Indexes**: Already configured in migration
5. **CDN**: Serve static assets via CDN

## Accessibility Requirements

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements for actions
- Focus management after actions
- Color contrast compliance (WCAG AA)

## Deployment Checklist

- [ ] Run database migration in Supabase
- [ ] Configure environment variables
- [ ] Test authentication flow
- [ ] Verify RLS policies
- [ ] Load test comment submission
- [ ] Security audit
- [ ] Accessibility audit
- [ ] Documentation update

## Future Enhancements

1. **Rich Text Editor**: Add markdown toolbar
2. **Reactions**: Like/upvote system
3. **Mentions**: @username notifications
4. **Moderation**: Admin dashboard
5. **Email Notifications**: Comment reply alerts
6. **Search**: Full-text comment search
7. **Export**: Comment data export for GDPR
8. **Analytics**: Comment engagement metrics

## Security Checklist

- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (content sanitization)
- [x] CSRF protection (token validation)
- [x] Rate limiting (prevent spam)
- [x] Authentication required (Clerk integration)
- [x] Authorization checks (RLS policies)
- [x] Input validation (client & server)
- [x] Content length limits
- [ ] Profanity filter (optional)
- [ ] Spam detection (optional)

## Migration Steps

1. Review and adjust Supabase migration file
2. Run migration in development environment
3. Implement API endpoints
4. Build React components
5. Integrate with Astro pages
6. Add styling
7. Write tests
8. Security review
9. Deploy to staging
10. Production deployment

## Estimated Timeline

- Phase 1-2 (Database & API): 2-3 hours
- Phase 3 (React Components): 3-4 hours
- Phase 4 (Integration): 1-2 hours
- Phase 5 (Security): 2-3 hours
- Phase 6 (Styling & Polish): 1-2 hours
- Testing & Documentation: 2-3 hours

**Total Estimate**: 12-18 hours for complete implementation

## Notes

- The existing Supabase comments table is designed for multiple entity types, providing flexibility for future use cases
- Threading support is built-in with a maximum recommended depth of 3 levels for UI clarity
- The system uses soft deletes (status changes) rather than hard deletes for data preservation
- Internal comments feature can be used for admin notes in the future
- Organization scoping allows for multi-tenant scenarios if needed
