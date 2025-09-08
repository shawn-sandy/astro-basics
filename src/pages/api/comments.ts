import type { APIRoute } from 'astro'

import {
  enhancedCommentRateLimiter,
  getClientIP,
  createRateLimitResponse,
} from '#utils/comment-rate-limiter'
import { checkCommentSystemAvailability } from '#utils/comments-availability'
import { CSRF_CONFIG, validateCsrfToken } from '#utils/csrf'
import { getCommentProvider } from '#utils/database-config'
import { sanitizeComment } from '#utils/sanitize'

interface _CommentData {
  content: string
  commentable_type: 'post' | 'doc'
  commentable_id: string
  parent_comment_id?: string
}

/**
 * GET /api/comments - Get comments for a specific post/doc
 * Query params: type, id, limit, offset, parent_id
 */
export const GET: APIRoute = async context => {
  // Check if comment system is available
  const availability = await checkCommentSystemAvailability(context)

  if (!availability.enabled) {
    return new Response(
      JSON.stringify({
        error: 'Comment system unavailable',
        reason: availability.reason,
        code: 'COMMENTS_DISABLED',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const { url } = context
  const searchParams = url.searchParams

  const commentable_type = searchParams.get('type') as 'post' | 'doc'
  const commentable_id = searchParams.get('id')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const parent_id = searchParams.get('parent_id')

  // Validate required parameters
  if (!commentable_type || !commentable_id) {
    return new Response(
      JSON.stringify({
        error: 'Missing required parameters',
        required: ['type', 'id'],
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  if (!['post', 'doc'].includes(commentable_type)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid commentable_type',
        allowed: ['post', 'doc'],
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const provider = getCommentProvider()

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Database provider not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await provider.getComments({
      type: commentable_type,
      id: commentable_id,
      limit,
      offset,
      parent_id: parent_id || undefined,
    })

    return new Response(
      JSON.stringify({
        comments: result.comments,
        count: result.count,
        has_more: result.has_more,
        pagination: result.pagination,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch comments',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * POST /api/comments - Create new comment (requires authentication)
 */
export const POST: APIRoute = async context => {
  // Check if comment system is available
  const availability = await checkCommentSystemAvailability(context)

  if (!availability.enabled) {
    return new Response(
      JSON.stringify({
        error: 'Comment system unavailable',
        reason: availability.reason,
        code: 'COMMENTS_DISABLED',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const userId = context.locals.userId

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await context.request.json()

    // Enhanced rate limiting check
    const clientIP = getClientIP(context.request)
    const rateLimitResult = enhancedCommentRateLimiter.checkCommentLimit(
      clientIP,
      userId,
      body.content
    )

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, rateLimitResult.reason)
    }

    // CSRF token validation
    const csrfToken = body[CSRF_CONFIG.FIELD_NAME]
    const csrfValid = await validateCsrfToken(csrfToken, context)

    if (!csrfValid) {
      return new Response(JSON.stringify({ error: 'Invalid or expired CSRF token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate required fields
    if (!body.content || !body.commentable_type || !body.commentable_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['content', 'commentable_type', 'commentable_id'],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate commentable_type
    if (!['post', 'doc'].includes(body.commentable_type)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid commentable_type',
          allowed: ['post', 'doc'],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Sanitize content
    const sanitizedContent = sanitizeComment(body.content)
    if (!sanitizedContent.trim()) {
      return new Response(
        JSON.stringify({ error: 'Comment content cannot be empty after sanitization' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const provider = getCommentProvider()

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Database provider not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user from database, create if doesn't exist
    let user = await provider.getUserByClerkId(userId)

    if (!user) {
      // Auto-create user with minimal data from Clerk context
      // In a real application, you might get this data from Clerk's user object
      user = await provider.createUser({
        clerk_id: userId,
        full_name: null, // Could be populated from Clerk user data if available
        email: null, // Could be populated from Clerk user data if available
        avatar_url: null, // Could be populated from Clerk user data if available
      })
    }

    // Create the comment
    const data = await provider.createComment({
      content: sanitizedContent,
      author_id: user.id,
      commentable_type: body.commentable_type,
      commentable_id: body.commentable_id,
      parent_comment_id: body.parent_comment_id || null,
      status: 'active',
      is_internal: false,
      organization_id: import.meta.env.ORGANIZATION_ID || 'serve513-beta',
    })

    return new Response(
      JSON.stringify({
        comment: data,
        success: true,
        message: 'Comment created successfully',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to create comment:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create comment',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * PATCH /api/comments - Update own comment (requires authentication)
 */
export const PATCH: APIRoute = async context => {
  // Check if comment system is available
  const availability = await checkCommentSystemAvailability(context)

  if (!availability.enabled) {
    return new Response(
      JSON.stringify({
        error: 'Comment system unavailable',
        reason: availability.reason,
        code: 'COMMENTS_DISABLED',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const userId = context.locals.userId

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await context.request.json()
    const commentId = body.id

    if (!commentId) {
      return new Response(JSON.stringify({ error: 'Comment ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // CSRF token validation
    const csrfToken = body[CSRF_CONFIG.FIELD_NAME]
    const csrfValid = await validateCsrfToken(csrfToken, context)

    if (!csrfValid) {
      return new Response(JSON.stringify({ error: 'Invalid or expired CSRF token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const provider = getCommentProvider()

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Database provider not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user from database, create if doesn't exist
    let user = await provider.getUserByClerkId(userId)

    if (!user) {
      // Auto-create user with minimal data from Clerk context
      user = await provider.createUser({
        clerk_id: userId,
        full_name: null,
        email: null,
        avatar_url: null,
      })
    }

    // Prepare update data
    const updateData: { content?: string; status?: string } = {}

    if (body.content) {
      const sanitizedContent = sanitizeComment(body.content)
      if (!sanitizedContent.trim()) {
        return new Response(
          JSON.stringify({ error: 'Comment content cannot be empty after sanitization' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      updateData.content = sanitizedContent
    }

    if (body.status && ['active', 'archived'].includes(body.status)) {
      updateData.status = body.status
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update the comment using provider
    try {
      const data = await provider.updateComment({
        id: commentId,
        author_id: user.id,
        ...updateData,
      })

      return new Response(
        JSON.stringify({
          comment: data,
          success: true,
          message: 'Comment updated successfully',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      // Handle provider-specific errors
      if (error instanceof Error && error.message.includes('not found')) {
        return new Response(JSON.stringify({ error: 'Comment not found or unauthorized' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to update comment:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to update comment',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * DELETE /api/comments - Soft delete own comment (requires authentication)
 */
export const DELETE: APIRoute = async context => {
  // Check if comment system is available
  const availability = await checkCommentSystemAvailability(context)

  if (!availability.enabled) {
    return new Response(
      JSON.stringify({
        error: 'Comment system unavailable',
        reason: availability.reason,
        code: 'COMMENTS_DISABLED',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const userId = context.locals.userId

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(context.request.url)
    const commentId = url.searchParams.get('id')

    if (!commentId) {
      return new Response(JSON.stringify({ error: 'Comment ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const provider = getCommentProvider()

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Database provider not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user from database, create if doesn't exist
    let user = await provider.getUserByClerkId(userId)

    if (!user) {
      // Auto-create user with minimal data from Clerk context
      user = await provider.createUser({
        clerk_id: userId,
        full_name: null,
        email: null,
        avatar_url: null,
      })
    }

    // Soft delete the comment using provider
    await provider.deleteComment({
      id: commentId,
      author_id: user.id,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Comment deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to delete comment:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to delete comment',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
