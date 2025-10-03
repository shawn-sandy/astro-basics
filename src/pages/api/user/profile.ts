import type { APIRoute } from 'astro'

import { createServerSupabaseClient, isSupabaseConfigured } from '#libs/supabase-native'
import { logger, logApiRequest, logApiResponse, logApiError } from '#utils/logger'

export const GET: APIRoute = async ({ locals }) => {
  const enhancedLocals = locals as typeof locals & {
    userId?: string | null
    clerkToken?: string | null
  }
  // Convert null to undefined for type safety with logger
  const userId = enhancedLocals.userId ?? undefined
  logApiRequest('/api/user/profile', 'GET', userId)

  logger.debug('Profile API - Authentication check', {
    userId,
    hasToken: !!enhancedLocals.clerkToken,
  })

  if (!userId || !enhancedLocals.clerkToken) {
    logger.warn('Profile API - Unauthorized access attempt', {
      endpoint: '/api/user/profile',
      hasUserId: !!userId,
      hasToken: !!enhancedLocals.clerkToken,
    })
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        debug: {
          hasUserId: !!userId,
          hasToken: !!enhancedLocals.clerkToken,
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Supabase not configured',
        message: 'User profile feature requires Supabase configuration',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const supabase = createServerSupabaseClient(enhancedLocals.clerkToken)

    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: 'Failed to initialize Supabase client',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch user profile with preferences using native integration
    const { data, error } = await supabase
      .from('users')
      .select(
        `
        *,
        user_preferences (*)
      `
      )
      .eq('clerk_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found in database - this is expected for new users
        logger.info('User profile not found in database - new user', {
          endpoint: '/api/user/profile',
          userId,
        })
        logApiResponse('/api/user/profile', 200, userId)
        return new Response(
          JSON.stringify({
            user: null,
            message: 'User profile not yet synced',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      throw error
    }

    logApiResponse('/api/user/profile', 200, userId)
    return new Response(
      JSON.stringify({
        user: data,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logApiError('/api/user/profile', error, userId)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch user profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const PATCH: APIRoute = async ({ request, locals }) => {
  const enhancedLocals = locals as typeof locals & {
    userId?: string | null
    clerkToken?: string | null
  }
  // Convert null to undefined for type safety with logger
  const userId = enhancedLocals.userId ?? undefined
  logApiRequest('/api/user/profile', 'PATCH', userId)

  if (!userId || !enhancedLocals.clerkToken) {
    logger.warn('Profile API PATCH - Unauthorized access attempt', {
      endpoint: '/api/user/profile',
      method: 'PATCH',
      hasUserId: !!userId,
      hasToken: !!enhancedLocals.clerkToken,
    })
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Supabase not configured',
        message: 'User profile feature requires Supabase configuration',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient(enhancedLocals.clerkToken)

    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: 'Failed to initialize Supabase client',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare update data (only allow certain fields to be updated)
    const allowedFields = ['username', 'full_name', 'avatar_url', 'metadata']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No valid fields to update',
          allowed: allowedFields,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Update user profile
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('clerk_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('Profile update failed - user not found', {
          endpoint: '/api/user/profile',
          method: 'PATCH',
          userId,
        })
        return new Response(
          JSON.stringify({
            error: 'User profile not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      throw error
    }

    logApiResponse('/api/user/profile', 200, userId)
    return new Response(
      JSON.stringify({
        user: data,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logApiError('/api/user/profile', error, userId)
    return new Response(
      JSON.stringify({
        error: 'Failed to update user profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
