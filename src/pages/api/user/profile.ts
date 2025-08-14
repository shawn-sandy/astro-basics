import type { APIRoute } from 'astro'

import { getAuthenticatedSupabase } from '#libs/supabase-server'

export const GET: APIRoute = async context => {
  const auth = context.locals.auth()

  if (!auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch user profile from Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', auth.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found in database - this is expected for new users
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
    console.error('Failed to fetch user profile:', error)
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

export const PATCH: APIRoute = async context => {
  const auth = context.locals.auth()

  if (!auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await context.request.json()
    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
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
      .eq('clerk_id', auth.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
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
    console.error('Failed to update user profile:', error)
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
