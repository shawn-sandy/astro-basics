import type { APIRoute } from 'astro'

import { checkCommentSystemAvailability } from '#utils/comments-availability'
import { getCommentProvider } from '#utils/database-config'

/**
 * POST /api/users/sync - Synchronize user from Clerk to database
 *
 * This endpoint ensures a user exists in the database, creating them if needed.
 * Used by the comment system when a user tries to create their first comment.
 */
export const POST: APIRoute = async context => {
  // Check if comment system is available
  const availability = await checkCommentSystemAvailability(context)

  if (!availability.enabled) {
    return new Response(
      JSON.stringify({
        error: 'User sync unavailable',
        reason: availability.reason,
        code: 'SYNC_DISABLED',
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
    const provider = getCommentProvider()

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Database provider not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user already exists
    let user = await provider.getUserByClerkId(userId)

    if (!user) {
      // Get user data from request body (provided by client from Clerk)
      const body = await context.request.json()

      if (!body.full_name && !body.email) {
        return new Response(
          JSON.stringify({
            error: 'User data required',
            required: ['full_name or email'],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Create user in database
      user = await provider.createUser({
        clerk_id: userId,
        full_name: body.full_name || null,
        email: body.email || null,
        avatar_url: body.avatar_url || null,
      })
    }

    return new Response(
      JSON.stringify({
        user,
        created: user.created_at === user.updated_at, // Indicates if user was just created
        success: true,
        message: 'User synchronized successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to sync user:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to sync user',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
