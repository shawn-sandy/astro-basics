#!/usr/bin/env node

/**
 * Phase 1 Verification: Check Database Role Schema
 *
 * This script verifies:
 * 1. DEFAULT constraint on users.role column
 * 2. Current ENUM values in user_role type
 * 3. Role distribution among existing users
 * 4. Presence of any NULL or 'volunteer' roles
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log('\n=== Phase 1: Database Role Schema Verification ===\n')

// Query 1: Check column default
console.log('📋 Query 1: Checking users.role column metadata...\n')

const { data: columnInfo, error: columnError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT
      column_name,
      column_default,
      data_type,
      udt_name,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role';
  `,
})

if (columnError) {
  // Try direct query instead
  const { data: altData, error: altError } = await supabase.rpc('get_column_info')

  if (altError) {
    console.log('⚠️  Cannot query column metadata via RPC, using direct approach...\n')
    // We'll use a simpler approach - just check if we can insert without role
  } else {
    console.table(altData)
  }
} else if (columnInfo) {
  console.table(columnInfo)
}

console.log('\n---\n')

// Query 2: Check ENUM values
console.log('📋 Query 2: Checking user_role ENUM values...\n')

const { data: enumData, error: enumError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT enumlabel as role_value, enumsortorder
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role'
    ORDER BY e.enumsortorder;
  `,
})

if (enumError) {
  console.log('⚠️  Using alternative method to check ENUM values...\n')

  // Try to get ENUM values by querying the users table
  const { data: users, error: usersError } = await supabase.from('users').select('role').limit(10)

  if (!usersError && users) {
    const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))]
    console.log('Current roles in use:', uniqueRoles)
  }
} else if (enumData) {
  console.log('Allowed ENUM values:')
  console.table(enumData)

  const hasVolunteer = enumData.some(row => row.role_value === 'volunteer')
  const hasMember = enumData.some(row => row.role_value === 'member')

  console.log('\n✓ Verification:')
  console.log(`  - Contains 'member': ${hasMember ? '✅ YES' : '❌ NO'}`)
  console.log(`  - Contains 'volunteer': ${hasVolunteer ? '❌ YES (SHOULD BE REMOVED)' : '✅ NO'}`)
}

console.log('\n---\n')

// Query 3: Check role distribution
console.log('📋 Query 3: Checking role distribution in users table...\n')

const { data: roleStats, error: statsError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT
      role,
      COUNT(*) as user_count
    FROM users
    GROUP BY role
    ORDER BY user_count DESC;
  `,
})

if (statsError) {
  // Alternative: Use Supabase client to get role distribution
  const { data: allUsers, error: allUsersError } = await supabase.from('users').select('role')

  if (!allUsersError && allUsers) {
    const distribution = allUsers.reduce((acc, user) => {
      const role = user.role || 'NULL'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})

    console.log('Role Distribution:')
    console.table(
      Object.entries(distribution).map(([role, count]) => ({
        role,
        user_count: count,
      }))
    )

    const hasNulls = distribution['NULL'] > 0
    const hasVolunteers = distribution['volunteer'] > 0

    console.log('\n✓ Verification:')
    console.log(
      `  - Users with NULL role: ${hasNulls ? `❌ ${distribution['NULL']} users` : '✅ NONE'}`
    )
    console.log(
      `  - Users with 'volunteer' role: ${hasVolunteers ? `❌ ${distribution['volunteer']} users` : '✅ NONE'}`
    )
  }
} else if (roleStats) {
  console.log('Role Distribution:')
  console.table(roleStats)

  const hasNulls = roleStats.some(row => row.role === null)
  const hasVolunteers = roleStats.some(row => row.role === 'volunteer')

  console.log('\n✓ Verification:')
  console.log(`  - Users with NULL role: ${hasNulls ? '❌ FOUND' : '✅ NONE'}`)
  console.log(`  - Users with 'volunteer' role: ${hasVolunteers ? '❌ FOUND' : '✅ NONE'}`)
}

console.log('\n---\n')

// Query 4: Test inserting without role (to check DEFAULT behavior)
console.log('📋 Query 4: Testing DEFAULT behavior (insert without role)...\n')

const testClerkId = `test_default_check_${Date.now()}`
const testEmail = `test_default_${Date.now()}@example.com`

const { data: insertTest, error: insertError } = await supabase
  .from('users')
  .insert({
    clerk_id: testClerkId,
    email: testEmail,
    username: 'test_default_user',
    full_name: 'Test Default User',
    // Intentionally omit 'role' to test DEFAULT
  })
  .select('role')
  .single()

if (insertError) {
  console.log('❌ Insert without role FAILED:')
  console.log(`   Error: ${insertError.message}`)
  console.log(`   Code: ${insertError.code}`)

  if (insertError.message.includes('violates check constraint')) {
    console.log('\n⚠️  Issue: Column likely has no DEFAULT or DEFAULT points to invalid value')
  }
} else if (insertTest) {
  console.log('✅ Insert without role SUCCEEDED')
  console.log(`   Assigned role: '${insertTest.role}'`)

  if (insertTest.role === 'member') {
    console.log('   ✅ DEFAULT is correctly set to "member"')
  } else if (insertTest.role === null) {
    console.log('   ⚠️  DEFAULT is NULL - should be "member"')
  } else {
    console.log(`   ⚠️  DEFAULT is "${insertTest.role}" - expected "member"`)
  }

  // Cleanup test record
  await supabase.from('users').delete().eq('clerk_id', testClerkId)
  console.log('   (Test record cleaned up)')
}

console.log('\n---\n')

// Summary
console.log('=== Phase 1 Verification Summary ===\n')
console.log('Next Steps:')
console.log('  1. Review the output above')
console.log('  2. Check if DEFAULT constraint needs to be set')
console.log('  3. Verify ENUM contains "member" and excludes "volunteer"')
console.log('  4. If issues found, proceed to Phase 2 (Schema Corrections)\n')

console.log('See implementation plan: docs/default-member-role-implementation-plan.md\n')
