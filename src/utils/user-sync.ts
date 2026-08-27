/**
 * User synchronization utilities
 *
 * Provides reusable functions for fetching user data from Clerk and syncing
 * with Supabase. Handles automatic user creation when users don't exist in
 * the local database yet.
 *
 * @module utils/user-sync
 */

import { clerkClient } from '@clerk/astro/server'
import type { User as ClerkUser } from '@clerk/backend'
import type { AstroGlobal } from 'astro'

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'
import type { UserRole } from '#utils/role-types'

/**
 * Result object returned by fetchUserWithRole
 *
 * Contains user data, role information, and any errors encountered during
 * the fetch/sync process. Errors are returned as strings rather than thrown
 * to allow graceful handling in components.
 */
export interface UserWithRoleResult {
  /** Clerk user object (null if fetch failed or user not found) */
  user: ClerkUser | null
  /** User's role from Supabase (null if not found or error occurred) */
  userRole: UserRole | null
  /** Error message from Clerk user fetch (null if successful) */
  error: string | null
  /** Error message from Supabase role fetch (null if successful) */
  roleError: string | null
}

/**
 * Fetches user data from Clerk and syncs role information with Supabase
 *
 * This utility consolidates the common pattern of:
 * 1. Fetching user data from Clerk
 * 2. Fetching user role from Supabase
 * 3. Auto-creating user record if it doesn't exist (PGRST116 error)
 *
 * Handles all error scenarios gracefully by returning error messages in the
 * result object rather than throwing exceptions. This allows components to
 * display appropriate error messages to users.
 *
 * @param userId - Clerk user ID (from Astro.locals.userId)
 * @param astroContext - Astro global context (used to initialize clerkClient)
 * @returns Result object with user data, role, and any errors
 *
 * @example
 * ```typescript
 * // In an Astro component
 * const { userId } = Astro.locals
 * if (userId) {
 *   const result = await fetchUserWithRole(userId, Astro)
 *   const { user, userRole, error, roleError } = result
 *
 *   if (error) {
 *     // Handle Clerk fetch error
 *   }
 *   if (roleError) {
 *     // Handle Supabase role error
 *   }
 *   if (user && userRole) {
 *     // Display user info with role
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In an API endpoint
 * export const GET: APIRoute = async ({ locals }) => {
 *   if (!locals.userId) {
 *     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
 *   }
 *
 *   const result = await fetchUserWithRole(locals.userId, Astro)
 *   if (result.error) {
 *     return new Response(JSON.stringify({ error: result.error }), { status: 500 })
 *   }
 *
 *   return new Response(JSON.stringify({
 *     user: result.user,
 *     role: result.userRole
 *   }))
 * }
 * ```
 */
export async function fetchUserWithRole(
  userId: string,
  astroContext: AstroGlobal
): Promise<UserWithRoleResult> {
  let user: ClerkUser | null = null
  let error: string | null = null
  let userRole: UserRole | null = null
  let roleError: string | null = null

  // Step 1: Fetch user data from Clerk
  try {
    const client = clerkClient(astroContext)
    user = await client.users.getUser(userId)
  } catch (err) {
    console.error('Failed to fetch user data from Clerk:', err)
    error = `Failed to load user information: ${err instanceof Error ? err.message : 'Unknown error'}`
    // Return early if we can't get user from Clerk
    return { user: null, userRole: null, error, roleError: null }
  }

  // Step 2: Fetch user role from Supabase (if configured)
  if (!isSupabaseConfigured()) {
    // Supabase not configured - return user without role
    return { user, userRole: null, error: null, roleError: 'Database not configured' }
  }

  try {
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      roleError = 'Database connection unavailable'
      return { user, userRole: null, error: null, roleError }
    }

    // Query for user role by clerk_id
    const { data, error: roleQueryError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (roleQueryError) {
      // PGRST116 means user not found - auto-create user record
      if (roleQueryError.code === 'PGRST116' && user) {
        // Extract primary email for user record
        const primaryEmail = user.emailAddresses?.find(
          email => email.id === user?.primaryEmailAddressId
        )

        // Build user data object using existing utility
        const newUser = {
          clerk_id: userId,
          email: primaryEmail?.emailAddress || user.emailAddresses?.[0]?.emailAddress || null,
          username: user.username,
          full_name: user.fullName || `${user.firstName} ${user.lastName}`.trim() || null,
          avatar_url: user.imageUrl,
          role: 'member' as UserRole, // Default role for new users
        }

        // Use upsert to handle race condition with webhook
        // If webhook already created user, this will update instead of failing
        const { data: upsertedUser, error: upsertError } = await supabase
          .from('users')
          .upsert(newUser, {
            onConflict: 'clerk_id',
            ignoreDuplicates: false,
          })
          .select('role')
          .single()

        if (upsertError) {
          console.error('Failed to create/update user in Supabase:', upsertError.message)
          roleError = 'Role information unavailable'
        } else if (upsertedUser && 'role' in upsertedUser) {
          userRole = upsertedUser.role as UserRole
        }
      } else {
        console.warn('Failed to fetch user role:', roleQueryError.message)
        roleError = 'Role information unavailable'
      }
    } else if (data && 'role' in data) {
      // Successfully fetched user role
      userRole = data.role as UserRole
    } else {
      roleError = 'Role information unavailable'
    }
  } catch (err) {
    console.error('Error fetching user role from Supabase:', err)
    roleError = 'Role information unavailable'
  }

  return { user, userRole, error, roleError }
}
