#!/usr/bin/env node --env-file=.env

/**
 * Supabase Migration Runner
 *
 * Executes SQL migration files against Supabase PostgreSQL database.
 * Supports multi-statement migrations by splitting on semicolons and executing sequentially.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { parseArgs } from 'util'

// Parse command line arguments
const { positionals } = parseArgs({
  allowPositionals: true,
})

if (positionals.length === 0) {
  console.error('❌ Usage: node scripts/run-supabase-migration.js <migration-file.sql>')
  console.error(
    '   Example: node scripts/run-supabase-migration.js scripts/migrations/004_clerk_email_verification.sql'
  )
  process.exit(1)
}

const migrationFile = positionals[0]

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  if (!SUPABASE_URL) console.error('   • SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error('   • SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigration() {
  try {
    console.log(`📄 Reading migration file: ${migrationFile}`)

    // Read the SQL file
    const sql = readFileSync(migrationFile, 'utf-8')

    console.log('🔄 Executing migration on Supabase...')
    console.log('   (This may take a moment for complex migrations)\n')

    // Execute the entire SQL file as a single query
    // PostgreSQL will handle the transaction boundaries (BEGIN/COMMIT) in the file
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql function doesn't exist, try direct query
      if (error.code === '42883' || error.message.includes('function')) {
        console.log('⚠️  Custom RPC function not available, using direct query method...\n')

        // Use the SQL Editor API endpoint directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query: sql }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const result = await response.json()
        console.log('✅ Migration completed successfully!')
        if (result.rows) {
          console.log(`   Rows affected: ${result.rows.length}`)
        }
      } else {
        throw error
      }
    } else {
      console.log('✅ Migration completed successfully!')
      if (data) {
        console.log('   Result:', data)
      }
    }

    console.log('\n📊 Next steps:')
    console.log('   • Verify the changes in your Supabase dashboard')
    console.log('   • Test the email uniqueness constraint')
    console.log('   • Update your webhook handler to catch error code 23505')
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)

    if (error.code) {
      console.error(`   PostgreSQL error code: ${error.code}`)
    }

    if (error.hint) {
      console.error(`   Hint: ${error.hint}`)
    }

    if (error.details) {
      console.error(`   Details: ${error.details}`)
    }

    process.exit(1)
  }
}

runMigration()
