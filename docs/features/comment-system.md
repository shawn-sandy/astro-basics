# Comment System User Guide

The comment system provides interactive discussion capabilities for blog posts and documentation pages, enabling authenticated users to engage with content through threaded conversations.

## Overview

The comment system features:

- **Threaded Discussions**: Reply to comments with up to 3 levels of nesting
- **Real-time Interactions**: Create, edit, and delete comments instantly
- **Secure Authentication**: Requires sign-in via Clerk authentication
- **Content Safety**: Automatic content sanitization and spam protection
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## Getting Started

### Prerequisites

- You must be signed in to post, edit, or delete comments
- Comments are available on published blog posts and documentation pages
- A valid email address is required for account creation

### Creating an Account

1. Click "Sign In" in the navigation menu
2. Choose to sign up with email or social authentication
3. Verify your email address if required
4. Complete your profile setup

## Using Comments

### Viewing Comments

Comments are displayed at the bottom of blog posts and documentation pages:

- **Latest First**: Newest comments appear at the top
- **Author Information**: Each comment shows the author's name and avatar
- **Timestamps**: Relative time displays (e.g., "2 minutes ago", "3 days ago")
- **Threading**: Replies are indented and connected to parent comments

### Writing Comments

1. **Navigate** to any blog post or documentation page
2. **Scroll down** to the comments section
3. **Sign in** if you haven't already
4. **Write your comment** in the text area (maximum 1000 characters)
5. **Click "Post Comment"** to submit

#### Content Guidelines

- Maximum 1000 characters per comment
- Basic HTML tags are stripped for security
- Links are automatically converted to clickable links
- Markdown formatting is not currently supported

### Replying to Comments

1. **Click "Reply"** under any existing comment
2. **Write your response** in the reply form
3. **Submit** your reply using the "Post Reply" button

Replies are limited to 3 levels deep to maintain readability.

### Editing Comments

You can edit your own comments within a reasonable time frame:

1. **Click "Edit"** on your comment
2. **Modify** the content as needed
3. **Click "Save"** to update the comment

Note: Edit history is not preserved, and there may be time limits on editing.

### Deleting Comments

To remove your own comments:

1. **Click "Delete"** on your comment
2. **Confirm** the deletion in the dialog

Deleted comments are soft-deleted (marked as archived) and may still be visible to administrators.

## Rate Limiting

To prevent spam and maintain quality discussions:

- **5 comments per minute** maximum per user
- **Duplicate content detection** prevents repeated submissions
- **Automatic flagging** for suspicious activity

If you hit rate limits, wait a moment before posting again.

## Security Features

### Content Protection

- **XSS Prevention**: All user input is sanitized before display
- **CSRF Protection**: Forms use secure tokens to prevent attacks
- **Authentication Required**: Only signed-in users can post comments

### Privacy Considerations

- **Public Visibility**: All comments are publicly visible
- **Author Information**: Your name and profile picture are displayed
- **Data Retention**: Comments remain in the system even after account deletion

## Troubleshooting

### Common Issues

**"You must be signed in to comment"**

- Ensure you're logged into your account
- Try refreshing the page if you just signed in

**"Rate limit exceeded"**

- You've posted too many comments quickly
- Wait 60 seconds before trying again

**"Comment failed to post"**

- Check your internet connection
- Ensure your comment is under 1000 characters
- Try refreshing the page and posting again

**"Edit/Delete options not showing"**

- You can only edit/delete your own comments
- These options may disappear after a certain time period

### Getting Help

If you encounter persistent issues:

1. **Check the browser console** for error messages
2. **Try a different browser** or clear your cache
3. **Contact support** through the site's contact form
4. **Report bugs** via the GitHub repository issues page

## API Reference

For developers integrating with the comment system:

### Endpoints

**GET /api/comments**

- Retrieve comments for a post or doc
- Parameters: `type`, `id`, `limit`, `offset`, `parent_id`

**POST /api/comments**

- Create a new comment
- Requires authentication and CSRF token
- Body: `content`, `commentable_type`, `commentable_id`, `parent_comment_id`

**PATCH /api/comments**

- Update an existing comment
- Requires ownership and authentication
- Body: `id`, `content`, `status`

**DELETE /api/comments**

- Soft delete a comment
- Requires ownership and authentication
- Parameter: `id`

### Response Format

```json
{
  "success": true,
  "data": {
    "id": "comment-uuid",
    "content": "Comment text",
    "author": {
      "id": "user-uuid",
      "full_name": "User Name",
      "avatar_url": "https://...",
      "clerk_id": "clerk_user_id"
    },
    "commentable_type": "post",
    "commentable_id": "post-slug",
    "parent_comment_id": null,
    "status": "active",
    "created_at": "2025-01-12T10:00:00Z",
    "updated_at": "2025-01-12T10:00:00Z"
  }
}
```

### Error Handling

Standard HTTP status codes are used:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (CSRF token invalid)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Server Error

## Technical Details

### Database Schema

Comments are stored in a polymorphic table structure:

```sql
comments (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  commentable_type TEXT CHECK (commentable_type IN ('post', 'doc')),
  commentable_id TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id),
  status TEXT DEFAULT 'active',
  is_internal BOOLEAN DEFAULT false,
  organization_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Security Policies

Row-Level Security (RLS) policies ensure:

- Users can only edit their own comments
- Only active, public comments are visible
- Internal comments are restricted to staff roles

### Performance Considerations

- Comments are paginated (20 per page by default)
- Database indexes on `commentable_type`, `commentable_id`, and `created_at`
- Client-side caching with React Query (if implemented)

## Accessibility Features

### Keyboard Navigation

- **Tab**: Navigate through comment elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modal dialogs

### Screen Reader Support

- **ARIA labels** on all interactive elements
- **Live regions** for dynamic content updates
- **Semantic HTML** structure with proper headings

### Visual Accessibility

- **High contrast** color scheme support
- **Focus indicators** for keyboard navigation
- **Scalable text** respects browser zoom settings
- **Dark mode** compatibility

## Future Enhancements

Planned features for upcoming releases:

- **Rich text editor** with markdown toolbar
- **Comment reactions** (like/dislike system)
- **User mentions** with @username notifications
- **Email notifications** for comment replies
- **Moderation dashboard** for administrators
- **Comment search** functionality
- **Export capabilities** for data portability

---

For technical support or feature requests, please visit our [GitHub repository](https://github.com/shawn-sandy/astro-basics) or contact the development team.
