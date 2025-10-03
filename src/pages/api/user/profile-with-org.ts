/**
 * User Profile API with Organization Context
 *
 * Provides comprehensive user profile data including organization memberships
 * and preferences. Leverages Supabase RLS for automatic access control.
 *
 * @module api/user/profile-with-org
 */

import type { APIRoute } from 'astro'

import { createServerClerkSupabaseClient } from '#libs/supabase-auth'
import { logger } from '#utils/logger'

/**
 * GET /api/user/profile-with-org
 *
 * Retrieves the authenticated user's complete profile including:
 * - Basic user information (email, username, avatar)
 * - User preferences (theme, notifications, language)
 * - Organization memberships with roles
 *
 * @security Requires authentication via Clerk session token
 * @performance Single query with JOIN, typically <50ms
 * @rls Automatic filtering via Supabase Row Level Security
 *
 * @returns JSON response with user profile or error
 *
 * @example Response
 * ```json
 * {
 *   "id": "uuid",
 *   "clerk_id": "user_2ABC123",
 *   "email": "user@example.com",
 *   "username": "johndoe",
 *   "full_name": "John Doe",
 *   "avatar_url": "https://...",
 *   "user_preferences": [{
 *     "theme": "dark",
 *     "notifications_email": true,
 *     "language": "en"
 *   }],
 *   "organization_memberships": [{
 *     "clerk_org_id": "org_123",
 *     "clerk_org_role": "org:admin",
 *     "org_name": "Acme Corp",
 *     "org_slug": "acme-corp"
 *   }]
 * }
 * ```
 */
export const GET: APIRoute = async ({ locals }) => {
  // Verify authentication
  if (!locals.userId || !locals.clerkToken) {
    logger.warn('Unauthorized profile access attempt')
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const supabase = createServerClerkSupabaseClient(locals.clerkToken)

  if (!supabase) {
    logger.error('Supabase not configured')
    return new Response(
      JSON.stringify({
        error: 'Service unavailable',
        message: 'Database not configured',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Fetch user profile with related data (RLS automatically filters)
    const { data: user, error } = await supabase
      .from('users')
      .select(
        `
        id,
        clerk_id,
        email,
        username,
        full_name,
        avatar_url,
        app_metadata,
        last_sign_in_at,
        created_at,
        updated_at,
        user_preferences (
          theme,
          notifications_email,
          notifications_push,
          language,
          timezone
        ),
        organization_memberships (
          clerk_org_id,
          clerk_org_role,
          org_name,
          org_slug,
          joined_at
        )
      `
      )
      .eq('clerk_id', locals.userId)
      .single()

    if (error) {
      logger.error('Failed to fetch user profile', {
        userId: locals.userId,
        error: error.message,
        code: error.code,
      })

      // User not found - likely webhook hasn't synced yet
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({
            error: 'User not found',
            message: 'Your profile is being set up. Please try again in a moment.',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      return new Response(
        JSON.stringify({
          error: 'Database error',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!user) {
      logger.warn('User profile not found', { userId: locals.userId })
      return new Response(
        JSON.stringify({
          error: 'User not found',
          message: 'Profile data unavailable',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    logger.debug('User profile retrieved', {
      userId: locals.userId,
      hasPreferences: !!user.user_preferences,
      orgCount: user.organization_memberships?.length || 0,
    })

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    })
  } catch (err) {
    logger.error('Unexpected error in profile API', {
      userId: locals.userId,
      error: err instanceof Error ? err.message : 'Unknown error',
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to retrieve profile',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * PATCH /api/user/profile-with-org
 *
 * Updates user profile and preferences. Only allows updating safe fields,
 * prevents modification of system-managed data (clerk_id, created_at, etc).
 *
 * @security Requires authentication + RLS enforcement
 * @validation Sanitizes input to prevent unauthorized field updates
 *
 * @example Request Body
 * ```json
 * {
 *   "username": "newusername",
 *   "full_name": "New Name",
 *   "preferences": {
 *     "theme": "dark",
 *     "notifications_email": false
 *   }
 * }
 * ```
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
  // Verify authentication
  if (!locals.userId || !locals.clerkToken) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const supabase = createServerClerkSupabaseClient(locals.clerkToken)

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: 'Service unavailable',
        message: 'Database not configured',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const updates = await request.json()

    // Separate profile updates from preferences
    const { preferences, ...profileUpdates } = updates

    // Allowed profile fields (prevent updating system fields)
    const allowedProfileFields = ['username', 'full_name', 'app_metadata']

    const sanitizedProfileUpdates = Object.keys(profileUpdates)
      .filter(key => allowedProfileFields.includes(key))
      .reduce(
        (obj, key) => {
          obj[key] = profileUpdates[key]
          return obj
        },
        {} as Record<string, unknown>
      )

    let userData = null

    // Update user profile if there are valid fields
    if (Object.keys(sanitizedProfileUpdates).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update(sanitizedProfileUpdates)
        .eq('clerk_id', locals.userId)
        .select('id')
        .single()

      if (error) {
        logger.error('Failed to update user profile', {
          userId: locals.userId,
          error: error.message,
        })
        return new Response(
          JSON.stringify({
            error: 'Update failed',
            message: error.message,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      userData = data
    }

    // Update preferences if provided
    if (preferences && userData) {
      const allowedPreferenceFields = [
        'theme',
        'notifications_email',
        'notifications_push',
        'language',
        'timezone',
      ]

      const sanitizedPreferences = Object.keys(preferences)
        .filter(key => allowedPreferenceFields.includes(key))
        .reduce(
          (obj, key) => {
            obj[key] = preferences[key]
            return obj
          },
          {} as Record<string, unknown>
        )

      if (Object.keys(sanitizedPreferences).length > 0) {
        const { error: prefError } = await supabase
          .from('user_preferences')
          .update(sanitizedPreferences)
          .eq('user_id', userData.id)

        if (prefError) {
          logger.warn('Failed to update user preferences', {
            userId: locals.userId,
            error: prefError.message,
          })
        }
      }
    }

    logger.info('User profile updated', {
      userId: locals.userId,
      fieldsUpdated: Object.keys(sanitizedProfileUpdates),
      preferencesUpdated: !!preferences,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile updated successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    logger.error('Unexpected error in profile update', {
      userId: locals.userId,
      error: err instanceof Error ? err.message : 'Unknown error',
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to update profile',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
