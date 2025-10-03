#!/usr/bin/env node

/**
 * Check Users Table Structure
 * Verifies if the role column exists in the users table
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

async function checkUsersTable() {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  console.log(colors.cyan + 'Checking Users Table Structure' + colors.reset)
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log(colors.red + '❌ Missing environment variables' + colors.reset)
    console.log(colors.yellow + 'Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY' + colors.reset)
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Try to query users table with role column
    console.log(colors.blue + '▶ Querying users table...' + colors.reset)

    const { data, error } = await supabase
      .from('users')
      .select('id, clerk_id, email, username, role, created_at')
      .limit(5)

    if (error) {
      if (error.message.includes('column') && error.message.includes('role')) {
        console.log(colors.yellow + '\n⚠ Role column does NOT exist' + colors.reset)
        console.log(colors.yellow + '  Error: ' + error.message + colors.reset)
        console.log(colors.blue + '\n✓ Migration 003 needs to be run' + colors.reset)
        console.log(colors.cyan + '  Run: node scripts/run-role-migration.js' + colors.reset)
        return
      }
      throw error
    }

    console.log(colors.green + '\n✅ Role column EXISTS!' + colors.reset)

    if (data && data.length > 0) {
      console.log(colors.blue + `\n📊 Found ${data.length} user(s):` + colors.reset)
      data.forEach(user => {
        console.log(
          colors.cyan +
            '  • ' +
            colors.reset +
            `${user.email || 'No email'} - Role: ${colors.yellow}${user.role || 'NULL'}${colors.reset}`
        )
      })

      // Check if any users have NULL role
      const { data: nullRoles, error: nullError } = await supabase
        .from('users')
        .select('clerk_id', { count: 'exact', head: true })
        .is('role', null)

      if (!nullError && nullRoles) {
        const count = nullRoles
        if (count > 0) {
          console.log(
            colors.yellow + `\n⚠ Warning: ${count} user(s) have NULL role` + colors.reset
          )
          console.log(
            colors.blue + '  Run migration 003 to backfill with default role' + colors.reset
          )
        }
      }
    } else {
      console.log(colors.blue + '\nℹ No users found in table' + colors.reset)
    }

    // Get total user count
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })

    console.log(colors.green + `\n✓ Total users in database: ${count || 0}` + colors.reset + '\n')
  } catch (err) {
    console.log(colors.red + '\n❌ Error: ' + err.message + colors.reset + '\n')
    process.exit(1)
  }
}

checkUsersTable()
