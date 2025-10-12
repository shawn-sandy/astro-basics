import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getEnvironmentConfig } from '#utils/env-config'

import type { Database } from './database.types'

// Use environment configuration abstraction
const envConfig = getEnvironmentConfig()
const supabaseUrl = envConfig.getSupabaseUrl()
const supabaseAnonKey = envConfig.getSupabaseAnonKey()
const supabaseServiceKey = envConfig.getSupabaseServiceRoleKey()

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return envConfig.isSupabaseConfigured()
}

// Lazy-initialized service role client
let _serviceRoleClient: SupabaseClient<Database> | null = null

// Service role client getter (for webhooks and server operations)
export function getSupabaseServiceRole(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase service role not configured - missing environment variables')
    return null
  }

  if (!_serviceRoleClient) {
    _serviceRoleClient = createClient<Database>(supabaseUrl, supabaseServiceKey)
  }

  return _serviceRoleClient
}

// For backward compatibility
export const supabaseServiceRole = getSupabaseServiceRole()

// Client factory with Clerk session token
export function createAuthenticatedSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase not configured - missing environment variables')
    return null
  }

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
export function createServerSupabaseClient(token: string | null): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase not configured - missing environment variables')
    return null
  }

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
