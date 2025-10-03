/**
 * Enhanced Supabase authentication utilities for Clerk integration
 *
 * Provides factory functions for creating Supabase clients with Clerk JWT tokens.
 * Supports both React components (via callback) and server-side rendering (via token).
 *
 * @module supabase-auth
 * @see {@link https://clerk.com/docs/guides/development/integrations/databases/supabase}
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

// Environment variables - validated at runtime
const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

/**
 * Checks if Supabase is properly configured
 *
 * Validates that required environment variables are present before
 * attempting to create clients. Prevents runtime errors in misconfigured environments.
 *
 * @returns True if SUPABASE_URL and SUPABASE_ANON_KEY are set
 *
 * @example
 * if (!isSupabaseConfigured()) {
 *   console.warn('Supabase not available')
 *   return null
 * }
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey)
}

/**
 * Creates authenticated Supabase client with Clerk JWT token (React pattern)
 *
 * Uses Clerk's session token as access token for Supabase RLS policies.
 * The token is fetched dynamically via callback, enabling automatic refresh
 * when Clerk rotates tokens (default: every 60 seconds, refresh at 10s before expiry).
 *
 * This pattern is optimized for React components where useAuth() provides
 * a getToken function that always returns the current valid token.
 *
 * @param getToken - Async function returning current Clerk session token
 * @returns Supabase client configured for RLS with Clerk authentication, or null if not configured
 *
 * @performance Token callback is invoked per request, cached by Clerk for ~50s
 * @security Uses anon key for public access, JWT for authenticated RLS enforcement
 *
 * @example
 * // React component with Clerk hook
 * import { useAuth } from '@clerk/astro/react'
 *
 * function MyComponent() {
 *   const { getToken } = useAuth()
 *   const supabase = createClerkSupabaseClient(getToken)
 *
 *   const { data } = await supabase.from('users').select('*')
 * }
 *
 * @example
 * // Server component with locals
 * const supabase = createClerkSupabaseClient(async () => Astro.locals.clerkToken)
 */
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - missing SUPABASE_URL or SUPABASE_ANON_KEY')
    return null
  }

  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        // Fallback to anon key if no token (enables public access patterns)
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
    auth: {
      // Disable Supabase's built-in auth (we use Clerk)
      autoRefreshToken: false,
      persistSession: false,
    },
    // Critical: This callback enables Clerk token → Supabase RLS flow
    // Supabase will call this before each request to get fresh JWT
    accessToken: getToken,
  })
}

/**
 * Creates server-side Supabase client with pre-fetched Clerk token (Astro pattern)
 *
 * Optimized for Astro server components and API routes where the Clerk token
 * is already available in locals from middleware. Avoids the async callback
 * overhead by using the token directly.
 *
 * This pattern is more efficient for server-side rendering because:
 * 1. Token is fetched once in middleware
 * 2. No additional async lookups needed
 * 3. Simpler synchronous client creation
 *
 * @param token - Clerk session token from middleware (locals.clerkToken)
 * @returns Supabase client with user authentication or anon access, or null if not configured
 *
 * @performance No async overhead, uses pre-fetched token from middleware
 * @security Falls back to anon key if token is null (public access)
 *
 * @example
 * // In Astro server component (.astro file)
 * ---
 * const supabase = createServerClerkSupabaseClient(Astro.locals.clerkToken)
 *
 * const { data: user } = await supabase
 *   .from('users')
 *   .select('*')
 *   .eq('clerk_id', Astro.locals.userId)
 *   .single()
 * ---
 *
 * @example
 * // In API route
 * export const GET: APIRoute = async ({ locals }) => {
 *   const supabase = createServerClerkSupabaseClient(locals.clerkToken)
 *   const { data } = await supabase.from('posts').select('*')
 *   return new Response(JSON.stringify(data))
 * }
 */
export function createServerClerkSupabaseClient(
  token: string | null
): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - missing SUPABASE_URL or SUPABASE_ANON_KEY')
    return null
  }

  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: token
        ? {
            // Use Clerk JWT for authenticated requests
            Authorization: `Bearer ${token}`,
          }
        : {
            // Fall back to anon key for public access
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
    },
    auth: {
      // Disable Supabase's built-in auth
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Type-safe helper to get authenticated user's database UUID from Clerk ID
 *
 * Resolves the Clerk user ID (clerk_id) to the internal database UUID (id).
 * Required for foreign key relationships since most tables reference users.id.
 *
 * Handles edge cases gracefully:
 * - User doesn't exist yet (webhook lag)
 * - Database errors
 * - Multiple results (should never happen due to UNIQUE constraint)
 *
 * @param supabase - Authenticated Supabase client
 * @param clerkId - Clerk user ID from auth context (locals.userId or auth().userId)
 * @returns User's database UUID or null if not found
 *
 * @performance Single indexed query, typically <10ms
 * @throws Never throws - returns null on any error
 *
 * @example
 * // Get user ID for inserting related records
 * const supabase = createServerClerkSupabaseClient(locals.clerkToken)
 * const userId = await getUserIdFromClerkId(supabase, locals.userId)
 *
 * if (userId) {
 *   await supabase.from('posts').insert({
 *     user_id: userId,
 *     title: 'My Post'
 *   })
 * }
 *
 * @example
 * // Check if user exists before operation
 * const userId = await getUserIdFromClerkId(supabase, clerkId)
 * if (!userId) {
 *   return new Response('User not found. Please try signing in again.', {
 *     status: 404
 *   })
 * }
 */
export async function getUserIdFromClerkId(
  supabase: SupabaseClient<Database>,
  clerkId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single()

    if (error) {
      console.warn('Failed to resolve Clerk ID to database UUID:', {
        clerkId,
        error: error.message,
      })
      return null
    }

    if (!data) {
      console.warn('User not found in database:', { clerkId })
      return null
    }

    return data.id
  } catch (error) {
    console.error('Unexpected error in getUserIdFromClerkId:', error)
    return null
  }
}

/**
 * Type-safe helper to get user's organization memberships
 *
 * Retrieves all organizations the user belongs to with their roles.
 * Useful for multi-tenant features and organization switchers.
 *
 * @param supabase - Authenticated Supabase client
 * @param clerkId - Clerk user ID from auth context
 * @returns Array of organization memberships or empty array on error
 *
 * @example
 * const memberships = await getUserOrganizations(supabase, locals.userId)
 * const isAdmin = memberships.some(m => m.clerk_org_role === 'org:admin')
 */
export async function getUserOrganizations(
  supabase: SupabaseClient<Database>,
  clerkId: string
): Promise<
  Array<{
    clerk_org_id: string
    clerk_org_role: string
    org_name: string | null
    org_slug: string | null
  }>
> {
  try {
    const userId = await getUserIdFromClerkId(supabase, clerkId)
    if (!userId) return []

    const { data, error } = await supabase
      .from('organization_memberships')
      .select('clerk_org_id, clerk_org_role, org_name, org_slug')
      .eq('user_id', userId)

    if (error) {
      console.warn('Failed to fetch user organizations:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error in getUserOrganizations:', error)
    return []
  }
}
