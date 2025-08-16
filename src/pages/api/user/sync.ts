import { clerkClient } from '@clerk/astro/server'
import type { APIRoute } from 'astro'

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'

/**
 * Manual user sync endpoint
 * Syncs current user data from Clerk to Supabase
 * Useful when webhooks are not properly configured
 */
export const POST: APIRoute = async ({ locals }) => {
  console.log('🔄 User sync - userId:', locals.userId)

  if (!locals.userId) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'User ID not found in request',
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
        message: 'User sync requires Supabase configuration',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const supabase = getSupabaseServiceRole()

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: 'Supabase service role not available',
        message: 'Cannot initialize Supabase service client',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Fetch user data from Clerk
    const user = await clerkClient.users.getUser(locals.userId)

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'User not found in Clerk',
          userId: locals.userId,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract primary email
    const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId)

    const userData = {
      clerk_id: user.id,
      email: primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress,
      username: user.username,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      avatar_url: user.imageUrl,
      metadata: user.publicMetadata || {},
      last_sign_in_at: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
    }

    // Upsert user data to Supabase
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'clerk_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to sync user to Supabase:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to sync user',
          details: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ User synced successfully:', data.clerk_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User synced successfully',
        user: data,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('User sync failed:', error)
    return new Response(
      JSON.stringify({
        error: 'User sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
