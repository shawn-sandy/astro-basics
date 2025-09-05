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

    // Get the Clerk JWT token with Supabase template
    const token = await auth.getToken({ template: 'supabase' })

    if (!token) {
      console.warn('Failed to get Supabase token from Clerk')
      return createServerSupabaseClient()
    }

    return createServerSupabaseClient(token)
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error)
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
