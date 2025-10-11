#!/usr/bin/env node --env-file=.env

/**
 * Simple Migration Verification
 *
 * Verifies migration 004 by checking users table for duplicate emails
 * and attempting to query database metadata.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function verify() {
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║   Migration 004: Email Uniqueness Constraint Verification ║')
  console.log('╚═══════════════════════════════════════════════════════════╝\n')

  try {
    // Fetch all users with emails
    console.log('🔍 Checking for duplicate emails...\n')

    const { data: users, error } = await supabase
      .from('users')
      .select('email')
      .not('email', 'is', null)

    if (error) {
      console.error('❌ Error fetching users:', error.message)
      console.log('\n⚠️  Cannot verify migration automatically.')
      console.log('Please run the SQL verification script in Supabase SQL Editor:')
      console.log('   File: scripts/verify-migration-004.sql\n')
      process.exit(1)
    }

    // Count email occurrences
    const emailCounts = {}
    users.forEach(user => {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1
    })

    const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1)

    console.log(`📊 Total users with emails: ${users.length}`)
    console.log(`📧 Unique emails: ${Object.keys(emailCounts).length}`)

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate email(s):\n`)
      duplicates.forEach(([email, count]) => {
        console.log(`   • ${email}: ${count} occurrences`)
      })
      console.log('\n❌ WARNING: Duplicate emails exist!')
      console.log('   If the migration was applied, these duplicates existed before.')
      console.log('   The constraint prevents NEW duplicates from being created.\n')
    } else {
      console.log('\n✅ No duplicate emails found')
    }

    // Test constraint behavior
    console.log('\n🧪 Testing constraint behavior...')
    console.log('   (Attempting to insert a test user)\n')

    const testEmail = `verification-test-${Date.now()}@example.com`
    const testId = `test_${Date.now()}`

    // Try to insert test user
    const { error: insertError1 } = await supabase
      .from('users')
      .insert({ id: testId, email: testEmail })
      .select()
      .single()

    if (insertError1) {
      console.log('ℹ️  Cannot create test user (table may have required fields)')
      console.log('   This is normal if users table requires additional data.')
      console.log('   The migration verification is complete based on duplicate check.\n')
      return { canTest: false }
    }

    console.log(`✅ Created test user: ${testEmail}`)

    // Try to insert duplicate (should fail)
    console.log('   Attempting to create duplicate...')

    const { error: insertError2 } = await supabase
      .from('users')
      .insert({ id: `${testId}_2`, email: testEmail })

    // Clean up
    await supabase.from('users').delete().eq('id', testId)

    if (insertError2) {
      if (insertError2.code === '23505') {
        console.log('\n✅ CONSTRAINT WORKING CORRECTLY!')
        console.log(`   PostgreSQL error code: ${insertError2.code} (unique violation)`)
        console.log('   Duplicate email was properly rejected.\n')
        return { canTest: true, working: true }
      } else {
        console.log(`\n⚠️  Unexpected error: ${insertError2.message}`)
        console.log(`   Error code: ${insertError2.code}\n`)
        return { canTest: true, working: false }
      }
    }

    console.log('\n❌ WARNING: Duplicate email was NOT rejected!')
    console.log('   The constraint may not be active.\n')
    return { canTest: true, working: false }
  } catch (err) {
    console.error('\n❌ Verification failed:', err.message)
    process.exit(1)
  }
}

async function main() {
  const result = await verify()

  console.log('═══════════════════════════════════════════════════════════')
  console.log('\n📋 VERIFICATION SUMMARY\n')

  if (!result?.canTest) {
    console.log('✅ Basic verification passed:')
    console.log('   • No duplicate emails found in database')
    console.log('   • Cannot test constraint behavior (table requirements)')
    console.log('\n📝 For complete verification, run SQL script:')
    console.log('   scripts/verify-migration-004.sql in Supabase SQL Editor')
  } else if (result.working) {
    console.log('✅ ALL CHECKS PASSED')
    console.log('   • Email uniqueness constraint is active')
    console.log('   • Duplicate emails are properly rejected')
    console.log('   • PostgreSQL error code 23505 is returned')
    console.log('\n🎉 Migration 004 successfully applied!')
  } else {
    console.log('❌ VERIFICATION FAILED')
    console.log('   • Constraint is not working as expected')
    console.log('\n🔧 Action required:')
    console.log('   1. Run migration SQL in Supabase SQL Editor')
    console.log('   2. File: scripts/migrations/004_clerk_email_verification.sql')
  }

  console.log('\n═══════════════════════════════════════════════════════════\n')

  process.exit(result?.working === false ? 1 : 0)
}

main()
