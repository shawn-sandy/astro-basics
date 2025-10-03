#!/usr/bin/env node

/**
 * Update Database Users from 'member' to 'member'
 * Updates all users in Supabase who currently have 'member' role to 'member'
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

async function updateUsersToMember() {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  console.log(colors.cyan + 'Update Users: member → member' + colors.reset)
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log(colors.red + '❌ Missing environment variables' + colors.reset)
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Check current member users
    const { data: memberUsers, error: checkError } = await supabase
      .from('users')
      .select('clerk_id, email')
      .eq('role', 'member')

    if (checkError) {
      throw checkError
    }

    if (!memberUsers || memberUsers.length === 0) {
      console.log(colors.green + '✓ No member users found - nothing to update\n' + colors.reset)
      return
    }

    console.log(colors.yellow + `Found ${memberUsers.length} member user(s):\n` + colors.reset)
    memberUsers.forEach(user => {
      console.log(colors.cyan + '  • ' + colors.reset + user.email)
    })

    console.log(colors.yellow + '\n▶ Updating all to member...\n' + colors.reset)

    // Update all member users to member
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'member' })
      .eq('role', 'member')

    if (updateError) {
      throw updateError
    }

    console.log(
      colors.green +
        '✅ Successfully updated ' +
        memberUsers.length +
        ' user(s) to member role\n' +
        colors.reset
    )

    // Verify
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'member')

    console.log(
      colors.green +
        '✓ Verification: ' +
        (count || 0) +
        ' user(s) now have member role\n' +
        colors.reset
    )
  } catch (err) {
    console.log(colors.red + '\n❌ Error: ' + err.message + colors.reset + '\n')
    process.exit(1)
  }
}

updateUsersToMember()
