import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

/**
 * Creates a Supabase client for server-side operations with Clerk JWT
 */
export function createServerSupabaseClient(clerkToken?: string): SupabaseClient<Database> | null {
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseKey = clerkToken
    ? import.meta.env.SUPABASE_ANON_KEY
    : import.meta.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables not configured')
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
    },
  })
}

/**
 * Get authenticated Supabase client from Astro context
 */
export async function getAuthenticatedSupabase(context: {
  locals: {
    auth: () => {
      userId?: string
      getToken: (options: { template: string }) => Promise<string | null>
    }
  }
}): Promise<SupabaseClient<Database> | null> {
  try {
    const auth = context.locals.auth()

    if (!auth || !auth.userId) {
      return createServerSupabaseClient()
    }

    // Try to get the Clerk JWT token with Supabase template
    try {
      const token = await auth.getToken({ template: 'supabase' })
      if (token) {
        return createServerSupabaseClient(token)
      }
    } catch (templateError: any) {
      // Handle missing JWT template gracefully - check both error message and Clerk API error structure
      const isJwtTemplateError =
        (templateError instanceof Error &&
          templateError.message.includes('No JWT template exists with name')) ||
        (templateError?.clerkError &&
          templateError?.errors?.[0]?.code === 'resource_not_found' &&
          templateError?.errors?.[0]?.longMessage?.includes('No JWT template exists with name'))

      if (isJwtTemplateError) {
        console.warn(
          'Clerk JWT template "supabase" not configured. Using service role key for authenticated operations.',
          'To enable full JWT authentication, create a JWT template named "supabase" in your Clerk Dashboard.',
          'See docs/jwt-implementation-guide.md for setup instructions.'
        )

        // Fall back to service role client for authenticated operations
        // This allows the system to work while JWT template is being set up
        return createServerSupabaseClient()
      }

      // Re-throw other token errors
      throw templateError
    }

    console.warn('Failed to get Supabase token from Clerk - no token returned')
    return createServerSupabaseClient()
  } catch (error: any) {
    // Handle JWT template errors at this level too
    const isJwtTemplateError =
      (error instanceof Error && error.message.includes('No JWT template exists with name')) ||
      (error?.clerkError &&
        error?.errors?.[0]?.code === 'resource_not_found' &&
        error?.errors?.[0]?.longMessage?.includes('No JWT template exists with name'))

    if (isJwtTemplateError) {
      console.warn(
        'Clerk JWT template "supabase" not configured. Using service role key for authenticated operations.',
        'To enable full JWT authentication, create a JWT template named "supabase" in your Clerk Dashboard.',
        'See docs/jwt-implementation-guide.md for setup instructions.'
      )
    } else {
      console.error('Error creating authenticated Supabase client:', error)
    }

    return createServerSupabaseClient()
  }
}

/**
 * Validate Supabase configuration
 */
export function validateSupabaseConfig(): boolean {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']

  const missing = required.filter(key => !import.meta.env[key])

  if (missing.length > 0) {
    console.warn(`Missing Supabase environment variables: ${missing.join(', ')}`)
    return false
  }

  return true
}
