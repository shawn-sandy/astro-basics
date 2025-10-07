/**
 * Debug Script: User Role Query Diagnostic
 *
 * Helps diagnose why user role information is unavailable on the dashboard.
 * Checks for common issues:
 * 1. User record exists in Supabase
 * 2. Clerk ID matches between Clerk and Supabase
 * 3. Role column has valid value
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓ Set' : '✗ Not set')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function debugUserRole() {
  console.log('🔍 User Role Diagnostic Tool\n')

  // Get the Clerk user ID from command line argument
  const clerkUserId = process.argv[2]

  if (!clerkUserId) {
    console.log('📋 Usage: npm run debug:user-role <clerk_user_id>')
    console.log('   Example: npm run debug:user-role user_2abc123xyz\n')
    console.log('💡 You can find your Clerk user ID in:')
    console.log('   - Clerk Dashboard: Users section')
    console.log('   - Browser console: Clerk.user.id')
    console.log('   - Dashboard page source: Look for userId\n')
    console.log('📊 Showing all users in database instead:\n')

    // Show all users
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('clerk_id, email, username, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (allUsersError) {
      console.error('❌ Error fetching users:', allUsersError.message)
      process.exit(1)
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users found in Supabase users table')
      console.log('   This usually means:')
      console.log('   1. Clerk webhook not configured')
      console.log('   2. No users have signed up yet')
      console.log('   3. Webhook failed to sync user data\n')
      console.log('✅ Solution: Sign up a new user or trigger user.created webhook')
    } else {
      console.log(`Found ${allUsers.length} users:\n`)
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name || user.username || user.email}`)
        console.log(`   Clerk ID: ${user.clerk_id}`)
        console.log(`   Email: ${user.email || 'N/A'}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}\n`)
      })
    }
    process.exit(0)
  }

  console.log(`🔎 Looking for user with Clerk ID: ${clerkUserId}\n`)

  // Check if user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
    .single()

  if (userError) {
    if (userError.code === 'PGRST116') {
      console.log('❌ User NOT found in Supabase')
      console.log('   Clerk ID:', clerkUserId)
      console.log('\n🔧 Possible causes:')
      console.log('   1. User signed up before Clerk webhook was configured')
      console.log('   2. Webhook failed during user creation')
      console.log('   3. User was deleted from Supabase but not Clerk')
      console.log('\n✅ Solutions:')
      console.log('   1. Trigger user.created webhook manually in Clerk Dashboard')
      console.log('   2. Sign out and sign in again to trigger webhook')
      console.log('   3. Call the user sync API: POST /api/user/sync')
    } else {
      console.error('❌ Database error:', userError.message)
    }
    process.exit(1)
  }

  if (!user) {
    console.log('❌ User query returned null')
    process.exit(1)
  }

  // User found - show details
  console.log('✅ User found in Supabase!\n')
  console.log('📋 User Details:')
  console.log('   ID:', user.id)
  console.log('   Clerk ID:', user.clerk_id)
  console.log('   Email:', user.email || 'N/A')
  console.log('   Username:', user.username || 'N/A')
  console.log('   Full Name:', user.full_name || 'N/A')
  console.log('   Role:', user.role || 'NOT SET ⚠️')
  console.log('   Avatar URL:', user.avatar_url || 'N/A')
  console.log('   Last Sign In:', user.last_sign_in_at || 'Never')
  console.log('   Created:', user.created_at)
  console.log('   Updated:', user.updated_at)

  // Check role value
  console.log('\n🔍 Role Analysis:')
  if (!user.role) {
    console.log('   ❌ Role is NULL or empty')
    console.log('   This should not happen - role has DEFAULT "member"')
  } else if (!['member', 'admin', 'super_admin'].includes(user.role)) {
    console.log(`   ⚠️  Invalid role value: "${user.role}"`)
    console.log('   Valid values: member, admin, super_admin')
  } else {
    console.log(`   ✅ Role is valid: "${user.role}"`)
  }

  // Check app_metadata
  if (user.app_metadata && Object.keys(user.app_metadata).length > 0) {
    console.log('\n📦 App Metadata:')
    console.log(JSON.stringify(user.app_metadata, null, 2))
  }

  console.log('\n✅ Diagnosis complete!')
}

debugUserRole().catch(error => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})
