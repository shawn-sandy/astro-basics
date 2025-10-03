import type { APIRoute } from 'astro'

import { getAuthenticatedSupabase } from '#libs/supabase-server'

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = await getAuthenticatedSupabase({ locals })

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch messages for the authenticated user
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `clerk_user_id.eq.${locals.userId},user_id.in.(select id from users where clerk_id='${locals.userId}')`
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch messages:', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        messages: data || [],
        count: data?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const POST: APIRoute = async context => {
  const auth = context.locals.auth()

  if (!auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await context.request.json()

    // Validate required fields
    if (!body.message || !body.email || !body.name) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['name', 'email', 'message'],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', auth.userId)
      .single()

    // Create the message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        name: body.name,
        email: body.email,
        subject: body.subject || null,
        message: body.message,
        user_id: user?.id,
        clerk_user_id: auth.userId,
        is_read: false,
        is_archived: false,
        ip_address: context.clientAddress || null,
        user_agent: context.request.headers.get('user-agent') || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create message:', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        message: data,
        success: true,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to create message:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create message',
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
    const messageId = body.id

    if (!messageId) {
      return new Response(JSON.stringify({ error: 'Message ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update the message (RLS will ensure user owns it)
    const updateData: Record<string, boolean> = {}
    if (typeof body.is_read === 'boolean') updateData.is_read = body.is_read
    if (typeof body.is_archived === 'boolean') updateData.is_archived = body.is_archived

    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .eq('clerk_user_id', auth.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Message not found or unauthorized' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw error
    }

    return new Response(
      JSON.stringify({
        message: data,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to update message:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to update message',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const DELETE: APIRoute = async context => {
  const auth = context.locals.auth()

  if (!auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(context.request.url)
    const messageId = url.searchParams.get('id')

    if (!messageId) {
      return new Response(JSON.stringify({ error: 'Message ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = await getAuthenticatedSupabase(context)

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Delete the message (RLS will ensure user owns it)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('clerk_user_id', auth.userId)

    if (error) {
      console.error('Failed to delete message:', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Failed to delete message:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to delete message',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
