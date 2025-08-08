import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '#utils/env-config'

const config = getSupabaseConfig()

export const supabase = createClient(config.url, config.anonKey)

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Database = {}
