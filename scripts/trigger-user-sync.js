#!/usr/bin/env node

/**
 * Trigger User Sync from Clerk to Supabase
 *
 * Manually syncs all users from Clerk to Supabase using the backend API.
 * This bypasses webhooks and directly syncs current Clerk data.
 *
 * Usage:
 *   node scripts/trigger-user-sync.js
 */

import { createClerkClient } from '@clerk/backend'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

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

async function syncUsers() {
  log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  log(colors.bright + colors.cyan + 'Sync Users: Clerk → Supabase' + colors.reset)
  log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

  // Check environment variables
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    log('❌ Missing required environment variables', colors.red)
    log('\nRequired:', colors.yellow)
    log('  - CLERK_SECRET_KEY', colors.yellow)
    log('  - SUPABASE_URL', colors.yellow)
    log('  - SUPABASE_SERVICE_ROLE_KEY\n', colors.yellow)
    process.exit(1)
  }

  log('✓ Environment variables found', colors.green)

  // Initialize clients
  const clerkClient = createClerkClient({ secretKey: clerkSecretKey })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  log('✓ Clients initialized', colors.green)

  try {
    // Fetch all users from Clerk
    log('\n▶ Fetching users from Clerk...', colors.blue)
    const { data: users } = await clerkClient.users.getUserList()

    log(`✓ Found ${users.length} user(s) in Clerk`, colors.green)

    if (users.length === 0) {
      log('\nℹ No users to sync\n', colors.blue)
      return
    }

    log('\n' + colors.cyan + 'Syncing users...' + colors.reset + '\n')

    let syncedCount = 0
    let errorCount = 0

    for (const user of users) {
      const email = user.emailAddresses?.[0]?.emailAddress || 'No email'
      const primaryEmail =
        user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || email

      log(`\n📧 ${email}`, colors.cyan)
      log(`   Clerk ID: ${user.id}`, colors.blue)

      // Extract role from publicMetadata
      const role = user.publicMetadata?.role || 'member'
      log(`   Role: ${colors.yellow}${role}${colors.reset}`)

      // Build user data
      const userData = {
        clerk_id: user.id,
        email: primaryEmail,
        username: user.username,
        full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        avatar_url: user.imageUrl,
        role,
        metadata: user.publicMetadata || {},
        last_sign_in_at: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
      }

      log(`   ▶ Syncing to Supabase...`, colors.yellow)

      // Upsert to Supabase
      const { error } = await supabase.from('users').upsert(userData, {
        onConflict: 'clerk_id',
        ignoreDuplicates: false,
      })

      if (error) {
        log(`   ❌ Sync failed: ${error.message}`, colors.red)
        errorCount++
      } else {
        log(`   ✅ Synced successfully`, colors.green)
        syncedCount++
      }
    }

    // Summary
    log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
    log(colors.bright + 'Sync Summary' + colors.reset)
    log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

    log(`Total users: ${users.length}`, colors.bright)
    log(`✓ Synced: ${syncedCount}`, colors.green)
    if (errorCount > 0) {
      log(`✗ Failed: ${errorCount}`, colors.red)
    }

    log('', colors.reset)
  } catch (err) {
    log('\n❌ Sync failed', colors.red)
    log(`Error: ${err.message}`, colors.red)
    log('', colors.reset)
    process.exit(1)
  }
}

syncUsers()
