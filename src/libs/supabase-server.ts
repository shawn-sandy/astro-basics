import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

/**
 * Creates a Supabase client for server-side operations
 */
export function createServerSupabaseClient(): SupabaseClient<Database> | null {
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables not configured')
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Get authenticated Supabase client from Astro context
 * Simplified version that uses service role key for all operations
 */
export async function getAuthenticatedSupabase(_context: {
  locals: {
    userId?: string | null
    clerkToken?: string | null
  }
}): Promise<SupabaseClient<Database> | null> {
  // For now, use service role key for all operations
  // This provides full access to the database without complex JWT setup
  return createServerSupabaseClient()
}

/**
 * Validate Supabase configuration
 */
export function validateSupabaseConfig(): boolean {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']

  const missing = required.filter(key => !import.meta.env[key])

  if (missing.length > 0) {
    console.warn(`Missing Supabase environment variables: ${missing.join(', ')}`)
    return false
  }

  return true
}
