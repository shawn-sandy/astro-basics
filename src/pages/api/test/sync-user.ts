import { clerkClient } from '@clerk/astro/server'
import type { APIRoute } from 'astro'

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'

/**
 * Test endpoint to manually sync a specific user by their Clerk ID
 * This is useful for testing the full sync functionality
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: 'Missing userId in request body',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return new Response(
        JSON.stringify({
          error: 'Supabase not configured',
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
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch user data from Clerk
    const user = await clerkClient.users.getUser(userId)

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'User not found in Clerk',
          userId,
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User synced successfully',
        user: data,
        clerkData: {
          id: user.id,
          email: primaryEmail?.emailAddress,
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          imageUrl: user.imageUrl,
          lastSignInAt: user.lastSignInAt,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Test sync failed:', error)
    return new Response(
      JSON.stringify({
        error: 'Test sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
