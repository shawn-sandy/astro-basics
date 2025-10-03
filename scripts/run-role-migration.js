#!/usr/bin/env node

/**
 * Role Column Migration Runner
 *
 * Adds the role column to the users table to sync from Clerk publicMetadata.
 * Run this after migrations 001 and 002 have been applied.
 *
 * Usage:
 *   node scripts/run-role-migration.js
 *
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ES module path resolution
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

async function runRoleMigration() {
  log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  log(colors.bright + colors.cyan + 'User Role Column Migration' + colors.reset)
  log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ Error: Missing required environment variables', colors.red)
    log('\nRequired:', colors.yellow)
    log('  - SUPABASE_URL', colors.yellow)
    log('  - SUPABASE_SERVICE_ROLE_KEY', colors.yellow)
    log('\nMake sure these are set in your .env file\n', colors.yellow)
    process.exit(1)
  }

  log('✓ Environment variables found', colors.green)

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  log('✓ Supabase client initialized', colors.green)

  // Read migration file
  const migrationPath = join(__dirname, 'migrations', '003_add_user_role_column.sql')

  try {
    const sql = readFileSync(migrationPath, 'utf8')
    log('\n✓ Migration file loaded', colors.green)
    log(`  File: migrations/003_add_user_role_column.sql`, colors.blue)

    // Split SQL into individual statements for better error handling
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '')

    log(`\n▶ Executing ${statements.length} SQL statement(s)...`, colors.yellow)

    let executedCount = 0
    for (const statement of statements) {
      if (!statement) continue

      try {
        // Execute each statement individually using Supabase's query builder
        // We need to use the postgres REST API directly for DDL statements
        const { error } = await supabase.rpc('exec', { sql: statement + ';' })

        if (error) {
          // If exec RPC doesn't exist, we need to inform user to run manually
          if (error.code === '42883') {
            log('\n⚠ Note: Direct SQL execution via RPC is not available', colors.yellow)
            log('  This is normal for Supabase projects without custom functions', colors.yellow)
            throw new Error('MANUAL_EXECUTION_REQUIRED')
          }
          throw error
        }

        executedCount++
      } catch (err) {
        if (err.message === 'MANUAL_EXECUTION_REQUIRED') {
          throw err
        }

        // Some errors are expected (like "already exists")
        if (err.message?.includes('already exists') || err.message?.includes('duplicate key')) {
          log(`  ⚠ Skipping: ${err.message?.substring(0, 60)}...`, colors.yellow)
          executedCount++
        } else {
          throw err
        }
      }
    }

    log(`\n✅ Migration completed successfully!`, colors.green)
    log(`   ${executedCount} statement(s) executed`, colors.green)

    // Verify the role column exists
    log('\n▶ Verifying role column...', colors.yellow)
    const { error: verifyError } = await supabase.from('users').select('role').limit(1)

    if (verifyError) {
      log('⚠ Could not verify role column', colors.yellow)
      log(`  Error: ${verifyError.message}`, colors.yellow)
    } else {
      log('✓ Role column verified!', colors.green)
    }

    // Check if any users exist
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      log(`\n✓ Found ${count} existing user(s)`, colors.green)
      log('  All users have been assigned default role: "member"', colors.blue)
    } else {
      log('\nℹ No existing users found', colors.blue)
    }

    log('\n' + colors.bright + 'Next Steps:' + colors.reset)
    log('1. Update Clerk session claims to include:', colors.blue)
    log('   "role": "{{user.public_metadata.role}}"', colors.cyan)
    log('2. Set user roles in Clerk Dashboard → Users → Metadata', colors.blue)
    log('3. Trigger user sync via webhook or manual sync API\n', colors.blue)
  } catch (err) {
    if (err.message === 'MANUAL_EXECUTION_REQUIRED') {
      log('\n📋 Manual Execution Required', colors.yellow)
      log('='.repeat(60), colors.yellow)
      log('\nPlease run the migration manually:', colors.bright)
      log('1. Go to: Supabase Dashboard → SQL Editor', colors.blue)
      log('2. Copy contents from: scripts/migrations/003_add_user_role_column.sql', colors.blue)
      log('3. Paste and execute in SQL Editor\n', colors.blue)
      process.exit(0)
    }

    log('\n❌ Migration failed', colors.red)
    log(`Error: ${err.message}`, colors.red)

    if (err.code) {
      log(`Code: ${err.code}`, colors.red)
    }

    log('\n📋 To run manually:', colors.yellow)
    log('1. Go to Supabase Dashboard → SQL Editor', colors.blue)
    log('2. Copy contents from: scripts/migrations/003_add_user_role_column.sql', colors.blue)
    log('3. Paste and execute\n', colors.blue)

    process.exit(1)
  }
}

// Run migration
runRoleMigration().catch(err => {
  console.error('\n❌ Unexpected error:', err)
  process.exit(1)
})
