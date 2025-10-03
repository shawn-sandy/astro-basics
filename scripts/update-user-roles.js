#!/usr/bin/env node

/**
 * Update User Roles in Clerk
 *
 * Changes user roles from "volunteer" to "member" in Clerk's publicMetadata.
 * This will automatically sync to Supabase via webhook or manual sync.
 *
 * Usage:
 *   node scripts/update-user-roles.js
 *
 * Environment variables required:
 *   - CLERK_SECRET_KEY
 */

import { createClerkClient } from '@clerk/backend'
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

async function updateUserRoles() {
  log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  log(colors.bright + colors.cyan + 'Update User Roles in Clerk' + colors.reset)
  log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

  const clerkSecretKey = process.env.CLERK_SECRET_KEY

  if (!clerkSecretKey) {
    log('❌ Missing CLERK_SECRET_KEY environment variable', colors.red)
    log('Make sure it is set in your .env file\n', colors.yellow)
    process.exit(1)
  }

  log('✓ Clerk credentials found', colors.green)

  // Initialize Clerk client
  const clerkClient = createClerkClient({ secretKey: clerkSecretKey })

  try {
    // Get all users
    log('\n▶ Fetching users from Clerk...', colors.blue)

    const { data: users } = await clerkClient.users.getUserList()

    log(`✓ Found ${users.length} user(s)`, colors.green)

    if (users.length === 0) {
      log('\nℹ No users to update', colors.blue)
      return
    }

    let updatedCount = 0
    let skippedCount = 0

    log('\n' + colors.cyan + 'Processing users...' + colors.reset + '\n')

    for (const user of users) {
      const email = user.emailAddresses?.[0]?.emailAddress || 'No email'
      const currentRole = user.publicMetadata?.role

      log(`\n📧 ${email}`, colors.cyan)
      log(`   Clerk ID: ${user.id}`, colors.blue)
      log(`   Current role: ${colors.yellow}${currentRole || 'not set'}${colors.reset}`)

      // Check if role needs updating
      if (currentRole === 'member') {
        log(`   ✓ Already set to "member" - skipping`, colors.green)
        skippedCount++
        continue
      }

      // Update to member role
      log(`   ▶ Updating to "member"...`, colors.yellow)

      await clerkClient.users.updateUser(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          role: 'member',
        },
      })

      log(`   ✅ Updated to "member"`, colors.green)
      updatedCount++
    }

    // Summary
    log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
    log(colors.bright + 'Summary' + colors.reset)
    log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

    log(`Total users processed: ${users.length}`, colors.bright)
    log(`✓ Updated: ${updatedCount}`, colors.green)
    log(`⊘ Skipped: ${skippedCount}`, colors.yellow)

    if (updatedCount > 0) {
      log('\n' + colors.bright + 'Next Steps:' + colors.reset)
      log('1. Wait for Clerk webhooks to sync changes (automatic)', colors.blue)
      log('   OR', colors.yellow)
      log('2. Manually trigger sync: POST /api/user/sync', colors.blue)
      log('3. Verify in Supabase that roles are updated\n', colors.blue)
    } else {
      log('\nℹ No changes needed - all users already have correct roles\n', colors.blue)
    }
  } catch (err) {
    log('\n❌ Error updating user roles', colors.red)
    log(`Error: ${err.message}`, colors.red)

    if (err.errors) {
      log('\nDetails:', colors.yellow)
      err.errors.forEach(e => {
        log(`  • ${e.message}`, colors.yellow)
      })
    }

    log('', colors.reset)
    process.exit(1)
  }
}

updateUserRoles()
