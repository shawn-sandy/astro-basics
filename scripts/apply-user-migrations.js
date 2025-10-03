/**
 * Apply User Table Migrations to Supabase
 *
 * This script applies the user table and RLS policies migrations to your Supabase instance.
 * It reads the SQL files and executes them using the Supabase service role client.
 *
 * Usage: npm run db:setup-users
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Alternative: Use SQL Editor approach
 *
 * Since direct SQL execution may not work via API, provide instructions
 * for manual application via Supabase dashboard
 */
function provideManualInstructions() {
  console.log('\n' + '='.repeat(70))
  console.log('📋 MANUAL MIGRATION INSTRUCTIONS')
  console.log('='.repeat(70))
  console.log('')
  console.log('Since direct SQL execution via API requires special permissions,')
  console.log('please apply the migrations manually via Supabase Dashboard:')
  console.log('')
  console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new')
  console.log('   (Replace _ with your project ID)')
  console.log('')
  console.log('2. Copy and paste the contents of these files in order:')
  console.log('')
  console.log('   File 1: scripts/supabase-migrations/001_create_users_table.sql')
  console.log('   File 2: scripts/supabase-migrations/002_enable_rls_policies.sql')
  console.log('')
  console.log('3. Click "Run" after pasting each file')
  console.log('')
  console.log('4. After migrations are applied, run: npm run db:sync-user')
  console.log('')
  console.log('='.repeat(70))
  console.log('')
}

/**
 * Check if users table exists
 */
async function checkUsersTable() {
  try {
    const { error } = await supabase.from('users').select('count').limit(0).single()

    if (error && error.code === '42P01') {
      // Table doesn't exist
      return false
    }

    return !error
  } catch {
    return false
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Supabase User Table Migration Script')
  console.log('==========================================')
  console.log('')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log('')

  // Check if users table exists
  console.log('🔍 Checking if users table exists...')
  const tableExists = await checkUsersTable()

  if (tableExists) {
    console.log('   ℹ️  Users table already exists')
    console.log('')
    console.log('   If you need to re-apply migrations, you can:')
    console.log('   1. Drop the table manually via Supabase dashboard')
    console.log('   2. Or modify the migration files to use IF NOT EXISTS')
    console.log('')
    return
  }

  console.log('   ❌ Users table does not exist')
  console.log('')

  // Provide manual instructions since API execution is restricted
  provideManualInstructions()

  // Show file contents for easy copying
  console.log('📄 FILE CONTENTS')
  console.log('='.repeat(70))
  console.log('')

  const migration1 = join(__dirname, 'supabase-migrations', '001_create_users_table.sql')
  const migration2 = join(__dirname, 'supabase-migrations', '002_enable_rls_policies.sql')

  console.log('FILE 1: 001_create_users_table.sql')
  console.log('-'.repeat(70))
  console.log(readFileSync(migration1, 'utf8'))
  console.log('')

  console.log('FILE 2: 002_enable_rls_policies.sql')
  console.log('-'.repeat(70))
  console.log(readFileSync(migration2, 'utf8'))
  console.log('')
  console.log('='.repeat(70))
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
