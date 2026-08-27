import { clerkClient } from '@clerk/astro/server'
import type { APIRoute } from 'astro'

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'
import { extractPrimaryEmail, buildUserData } from '#utils/user'

/**
 * Test endpoint to manually sync a specific user by their Clerk ID
 * This is useful for testing the full sync functionality
 */
export const POST: APIRoute = async context => {
  const { request } = context
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
    const user = await clerkClient(context).users.getUser(userId)

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

    // Extract primary email using utility function
    const validEmail = extractPrimaryEmail(user)

    if (!validEmail) {
      return new Response(
        JSON.stringify({
          error: 'No valid email address found',
          message: 'User sync requires at least one email address',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Build user data object using utility function
    const userData = buildUserData(user, validEmail)

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
          email: validEmail,
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
