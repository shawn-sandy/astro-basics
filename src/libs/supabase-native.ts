import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

const supabaseUrl = import.meta.env.SUPABASE_URL!
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client (for webhooks and server operations)
export const supabaseServiceRole = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Client factory with Clerk session token
export function createAuthenticatedSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    accessToken: getToken,
  })
}

// Server-side client factory
export function createServerSupabaseClient(token: string | null): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
