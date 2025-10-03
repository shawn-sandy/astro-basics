/**
 * Sync Current Clerk User to Supabase
 *
 * This script helps sync your current Clerk user to Supabase database.
 * It's useful after database migrations or when webhooks aren't configured.
 *
 * Usage:
 *   npm run db:sync-user
 *
 * Or call the API endpoint:
 *   POST http://localhost:4321/api/user/sync (requires authentication)
 */

import { createClerkClient } from '@clerk/backend'
import { createClient } from '@supabase/supabase-js'

// Get environment variables
const clerkSecretKey = process.env.CLERK_SECRET_KEY
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Validates required environment variables
 *
 * @returns {boolean} True if all required variables are set
 */
function validateEnvironment() {
  const missing = []

  if (!clerkSecretKey || clerkSecretKey === 'YOUR_CLERK_SECRET_KEY') {
    missing.push('CLERK_SECRET_KEY')
  }
  if (!supabaseUrl) {
    missing.push('SUPABASE_URL')
  }
  if (!supabaseServiceKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(varName => console.error(`   - ${varName}`))
    console.error('\nPlease check your .env file')
    return false
  }

  return true
}

/**
 * Extract primary email from Clerk user object
 *
 * @param {object} user - Clerk user object
 * @returns {string|null} Primary email address
 */
function extractPrimaryEmail(user) {
  if (!user.emailAddresses || user.emailAddresses.length === 0) {
    return null
  }

  // Find primary email
  const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId)

  return primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || null
}

/**
 * Build user data object for Supabase
 *
 * @param {object} user - Clerk user object
 * @param {string} email - User's email address
 * @returns {object} User data for Supabase
 */
function buildUserData(user, email) {
  return {
    clerk_id: user.id,
    email,
    username: user.username || null,
    full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
    avatar_url: user.imageUrl || null,
    metadata: user.publicMetadata || {},
    last_sign_in_at: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
  }
}

/**
 * Sync a single user to Supabase
 *
 * @param {object} user - Clerk user object
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} Result object with success status
 */
async function syncUser(user, supabase) {
  const email = extractPrimaryEmail(user)

  if (!email) {
    return {
      success: false,
      userId: user.id,
      error: 'No valid email address found',
    }
  }

  const userData = buildUserData(user, email)

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'clerk_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        userId: user.id,
        error: error.message,
      }
    }

    return {
      success: true,
      userId: user.id,
      email,
      data,
    }
  } catch (error) {
    return {
      success: false,
      userId: user.id,
      error: error.message,
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔄 Clerk to Supabase User Sync')
  console.log('================================')
  console.log('')

  // Validate environment
  if (!validateEnvironment()) {
    process.exit(1)
  }

  console.log('✅ Environment validated')
  console.log('')

  // Initialize clients
  const clerk = createClerkClient({ secretKey: clerkSecretKey })
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('🔍 Fetching users from Clerk...')
  console.log('')

  try {
    // Get all Clerk users (with pagination support)
    const response = await clerk.users.getUserList({
      limit: 100,
    })

    const users = response.data

    if (users.length === 0) {
      console.log('ℹ️  No users found in Clerk')
      console.log('')
      console.log('   This is normal if you just set up authentication.')
      console.log('   Users will be synced automatically when they sign up.')
      console.log('')
      return
    }

    console.log(`📋 Found ${users.length} user(s) to sync`)
    console.log('')

    // Sync each user
    const results = []
    for (const user of users) {
      console.log(`   Syncing user: ${user.id}`)
      const result = await syncUser(user, supabase)
      results.push(result)

      if (result.success) {
        console.log(`   ✅ Synced: ${result.email}`)
      } else {
        console.log(`   ❌ Failed: ${result.error}`)
      }
    }

    console.log('')
    console.log('📊 Sync Summary')
    console.log('================')
    console.log(`   Total: ${results.length}`)
    console.log(`   Success: ${results.filter(r => r.success).length}`)
    console.log(`   Failed: ${results.filter(r => !r.success).length}`)
    console.log('')

    if (results.some(r => !r.success)) {
      console.log('⚠️  Some users failed to sync. Check the errors above.')
      process.exit(1)
    }

    console.log('✅ All users synced successfully!')
    console.log('')
    console.log('💡 Next Steps:')
    console.log('   1. Test by signing in to your application')
    console.log('   2. Check your Supabase users table')
    console.log('   3. Set up Clerk webhooks for automatic syncing:')
    console.log('      https://clerk.com/docs/integrations/webhooks/sync-data')
    console.log('')
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    console.error('')
    console.error('Troubleshooting:')
    console.error('  1. Check that your Clerk API keys are correct')
    console.error('  2. Verify Supabase credentials')
    console.error('  3. Ensure the users table exists (run: npm run db:setup-users)')
    console.error('')
    process.exit(1)
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
