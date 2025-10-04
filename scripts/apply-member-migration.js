#!/usr/bin/env node

/**
 * Apply Migration 006: Complete Member Migration
 *
 * This script applies the comprehensive migration that:
 * 1. Adds 'member' and 'admin' to ENUM
 * 2. Updates users from 'volunteer' to 'member'
 * 3. Removes 'volunteer' from ENUM
 * 4. Sets DEFAULT to 'member'
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset)
console.log(colors.cyan + colors.bold + 'Migration 006: Complete Member Migration' + colors.reset)
console.log(colors.cyan + '='.repeat(70) + colors.reset + '\n')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log(
    colors.red + '❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set' + colors.reset
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Read migration file
const migrationPath = join(__dirname, 'migrations', '006_complete_member_migration.sql')
let migrationSQL

try {
  migrationSQL = readFileSync(migrationPath, 'utf-8')
  console.log(colors.green + '✓ Loaded migration file' + colors.reset)
  console.log(colors.cyan + `  File: ${migrationPath}` + colors.reset + '\n')
} catch (err) {
  console.log(colors.red + '❌ Failed to read migration file: ' + err.message + colors.reset)
  process.exit(1)
}

// Show what the migration will do
console.log(colors.yellow + 'This migration will:' + colors.reset)
console.log('  1. Add "member" and "admin" to user_role ENUM')
console.log('  2. Update all users from "volunteer" to "member"')
console.log('  3. Remove "volunteer" from user_role ENUM')
console.log('  4. Set DEFAULT to "member"::user_role')
console.log('')

// Pre-migration verification
console.log(colors.cyan + '📋 Pre-Migration Verification...' + colors.reset + '\n')

try {
  // Check current users
  const { data: users, error: usersError } = await supabase.from('users').select('role')

  if (usersError) throw usersError

  const roleDistribution = users.reduce((acc, user) => {
    const role = user.role || 'NULL'
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})

  console.log(colors.yellow + 'Current role distribution:' + colors.reset)
  Object.entries(roleDistribution).forEach(([role, count]) => {
    console.log(`  ${role}: ${count} user(s)`)
  })
  console.log('')

  const hasVolunteer = roleDistribution['volunteer'] > 0
  const hasNull = roleDistribution['NULL'] > 0

  if (hasVolunteer) {
    console.log(
      colors.yellow +
        `⚠ Found ${roleDistribution['volunteer']} user(s) with 'volunteer' role` +
        colors.reset
    )
  }
  if (hasNull) {
    console.log(
      colors.yellow + `⚠ Found ${roleDistribution['NULL']} user(s) with NULL role` + colors.reset
    )
  }
  console.log('')
} catch (err) {
  console.log(colors.red + '❌ Pre-migration check failed: ' + err.message + colors.reset)
  console.log(colors.yellow + '   Continuing anyway...\n' + colors.reset)
}

// Apply migration
console.log(colors.cyan + '🚀 Applying Migration...' + colors.reset + '\n')

try {
  // Note: Supabase client doesn't support multi-statement SQL execution directly
  // We need to use the RPC function or execute via REST API
  // For now, we'll provide instructions for manual execution

  console.log(
    colors.yellow +
      '⚠ Note: This migration must be applied manually in Supabase SQL Editor' +
      colors.reset
  )
  console.log(
    colors.yellow +
      '  The Supabase JS client does not support multi-statement SQL execution\n' +
      colors.reset
  )

  console.log(colors.cyan + 'Instructions:' + colors.reset)
  console.log('  1. Go to Supabase Dashboard → SQL Editor')
  console.log('  2. Create a new query')
  console.log('  3. Copy the SQL below and paste into the editor')
  console.log('  4. Execute the migration')
  console.log('  5. Review the output messages\n')

  console.log(colors.cyan + '='.repeat(70) + colors.reset)
  console.log(colors.bold + 'SQL MIGRATION TO COPY:' + colors.reset)
  console.log(colors.cyan + '='.repeat(70) + colors.reset + '\n')

  console.log(migrationSQL)

  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset)
  console.log(colors.bold + 'END OF SQL' + colors.reset)
  console.log(colors.cyan + '='.repeat(70) + colors.reset + '\n')

  console.log(colors.green + '✓ Migration SQL displayed above' + colors.reset)
  console.log(colors.yellow + '  Copy and execute in Supabase SQL Editor' + colors.reset + '\n')

  console.log(colors.cyan + 'After applying the migration:' + colors.reset)
  console.log('  1. Run verification: node scripts/verify-role-schema.js')
  console.log('  2. Check that DEFAULT is "member"')
  console.log('  3. Verify ENUM excludes "volunteer"')
  console.log('  4. Test user creation\n')
} catch (err) {
  console.log(colors.red + '\n❌ Error: ' + err.message + colors.reset + '\n')
  process.exit(1)
}

console.log(colors.green + '📄 Migration file saved at:' + colors.reset)
console.log(colors.cyan + `   ${migrationPath}\n` + colors.reset)
