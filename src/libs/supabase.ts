import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getEnvironmentConfig } from '#utils/env-config'

// Use environment configuration abstraction
const envConfig = getEnvironmentConfig()
const supabaseUrl = envConfig.getSupabaseUrl()
const supabaseAnonKey = envConfig.getSupabaseAnonKey()

// Create a null-safe Supabase client
let _supabaseClient: SupabaseClient | null = null

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return envConfig.isSupabaseConfigured()
}

// Get Supabase client (lazy initialization)
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase not configured. Please check SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.'
    )
    return null
  }

  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return _supabaseClient
}

// Export for backward compatibility - will be null if not configured
export const supabase = getSupabase()

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Database = {}
