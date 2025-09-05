import type { APIRoute } from 'astro'

import { getAuthenticatedSupabase } from '#libs/supabase-server'
import { sanitizeComment } from '#utils/sanitize'
import { enhancedCommentRateLimiter, getClientIP, createRateLimitResponse } from '#utils/comment-rate-limiter'
import { CSRF_CONFIG, validateCsrfToken } from '#utils/csrf'
import { checkCommentSystemAvailability } from '#utils/comments-availability'

interface _CommentData {
  content: string
  commentable_type: 'post' | 'doc'
  commentable_id: string
  parent_comment_id?: string
}

interface CommentRow {
  id: string
  content: string
  author_id: string
  commentable_type: string
  commentable_id: string
  parent_comment_id: string | null
  status: string
  is_internal: boolean
  organization_id: string
  created_at: string
  updated_at: string
  author: {
    id: string
    full_name: string | null
    avatar_url: string | null
    clerk_id: string
  }
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
        code: 'COMMENTS_DISABLED'
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
    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    let query = supabase
      .from('comments')
      .select(`
        id,
        content,
        author_id,
        commentable_type,
        commentable_id,
        parent_comment_id,
        status,
        is_internal,
        organization_id,
        created_at,
        updated_at,
        author:users!author_id(
          id,
          full_name,
          avatar_url,
          clerk_id
        )
      `)
      .eq('commentable_type', commentable_type)
      .eq('commentable_id', commentable_id)
      .eq('status', 'active')
      .eq('is_internal', false)

    // Filter by parent comment if specified (for threaded loading)
    if (parent_id) {
      query = query.eq('parent_comment_id', parent_id)
    } else {
      // Get root comments only for initial load
      query = query.is('parent_comment_id', null)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch comments:', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        comments: data || [],
        count: count || 0,
        has_more: (data?.length || 0) === limit,
        pagination: {
          limit,
          offset,
          next_offset: offset + limit,
        },
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
        code: 'COMMENTS_DISABLED'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const auth = context.locals.auth()

  if (!auth?.userId) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const body = await context.request.json()

    // Enhanced rate limiting check
    const clientIP = getClientIP(context.request)
    const rateLimitResult = enhancedCommentRateLimiter.checkCommentLimit(
      clientIP,
      auth.userId,
      body.content
    )

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, rateLimitResult.reason)
    }

    // CSRF token validation
    const csrfToken = body[CSRF_CONFIG.FIELD_NAME]
    const csrfValid = await validateCsrfToken(csrfToken, context)

    if (!csrfValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired CSRF token' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
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

    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', auth.userId)
      .single()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create the comment
    const commentData = {
      content: sanitizedContent,
      author_id: user.id,
      commentable_type: body.commentable_type,
      commentable_id: body.commentable_id,
      parent_comment_id: body.parent_comment_id || null,
      status: 'active',
      is_internal: false,
      organization_id: 'serve513-beta', // Default organization
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select(`
        id,
        content,
        author_id,
        commentable_type,
        commentable_id,
        parent_comment_id,
        status,
        is_internal,
        organization_id,
        created_at,
        updated_at,
        author:users!author_id(
          id,
          full_name,
          avatar_url,
          clerk_id
        )
      `)
      .single()

    if (error) {
      console.error('Failed to create comment:', error)
      throw error
    }

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
        code: 'COMMENTS_DISABLED'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const auth = context.locals.auth()

  if (!auth?.userId) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const body = await context.request.json()
    const commentId = body.id

    if (!commentId) {
      return new Response(
        JSON.stringify({ error: 'Comment ID required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // CSRF token validation
    const csrfToken = body[CSRF_CONFIG.FIELD_NAME]
    const csrfValid = await validateCsrfToken(csrfToken, context)

    if (!csrfValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired CSRF token' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', auth.userId)
      .single()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare update data
    const updateData: Partial<CommentRow> = {}

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
      return new Response(
        JSON.stringify({ error: 'No valid fields to update' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Update the comment (RLS will ensure user owns it)
    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .eq('author_id', user.id)
      .in('commentable_type', ['post', 'doc'])
      .select(`
        id,
        content,
        author_id,
        commentable_type,
        commentable_id,
        parent_comment_id,
        status,
        is_internal,
        organization_id,
        created_at,
        updated_at,
        author:users!author_id(
          id,
          full_name,
          avatar_url,
          clerk_id
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Comment not found or unauthorized' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      throw error
    }

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
        code: 'COMMENTS_DISABLED'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const auth = context.locals.auth()

  if (!auth?.userId) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const url = new URL(context.request.url)
    const commentId = url.searchParams.get('id')

    if (!commentId) {
      return new Response(
        JSON.stringify({ error: 'Comment ID required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', auth.userId)
      .single()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Soft delete the comment (set status to archived)
    const { error } = await supabase
      .from('comments')
      .update({ status: 'archived' })
      .eq('id', commentId)
      .eq('author_id', user.id)
      .in('commentable_type', ['post', 'doc'])

    if (error) {
      console.error('Failed to delete comment:', error)
      throw error
    }

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