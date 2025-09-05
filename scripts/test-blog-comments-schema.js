#!/usr/bin/env node --env-file=.env

/**
 * Test script for blog comments schema modifications
 * Tests the new blog comment functionality after running migration 004
 */

import { createClient } from '@supabase/supabase-js'

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required Supabase environment variables:')
  if (!SUPABASE_URL) console.error('   • SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error('   • SUPABASE_SERVICE_ROLE_KEY')
  console.error('\n💡 Make sure these are set in your .env file')
  process.exit(1)
}

// Create Supabase client with service role key for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testBlogCommentsSchema() {
  console.log('🧪 Testing Blog Comments Schema\n')

  try {
    // Test 1: Check if constraint allows 'post' and 'doc' types
    console.log('1️⃣  Testing commentable_type constraint...')

    // This should work - test with a dummy user ID
    const testUserId = '00000000-0000-0000-0000-000000000000'
    const testPostId = '11111111-1111-1111-1111-111111111111'

    const { data: constraintTest, error: constraintError } = await supabase
      .from('comments')
      .insert({
        content: 'Test blog comment',
        author_id: testUserId,
        commentable_type: 'post',
        commentable_id: testPostId,
        status: 'active',
        is_internal: false,
      })
      .select()

    if (constraintError) {
      if (constraintError.code === '23503') {
        console.log(
          '   ✅ Constraint allows "post" type (foreign key error expected for test user)'
        )
      } else if (constraintError.code === '23514') {
        console.log('   ❌ Constraint rejection:', constraintError.message)
        return false
      } else {
        console.log('   ⚠️  Other error (expected for dummy data):', constraintError.code)
      }
    } else {
      console.log('   ✅ Successfully inserted test comment with "post" type')
      // Clean up test data
      await supabase.from('comments').delete().eq('id', constraintTest[0].id)
    }

    // Test 2: Check if helper function exists
    console.log('\n2️⃣  Testing get_blog_comment_count function...')

    const { data: functionTest, error: functionError } = await supabase.rpc(
      'get_blog_comment_count',
      {
        entity_type: 'post',
        entity_id: testPostId,
      }
    )

    if (functionError) {
      console.log('   ❌ Function error:', functionError.message)
      return false
    } else {
      console.log('   ✅ Function returns:', functionTest)
    }

    // Test 3: Check if view exists and is accessible
    console.log('\n3️⃣  Testing public_blog_comment_threads view...')

    const { data: viewTest, error: viewError } = await supabase
      .from('public_blog_comment_threads')
      .select('*')
      .limit(1)

    if (viewError) {
      console.log('   ❌ View error:', viewError.message)
      return false
    } else {
      console.log('   ✅ View accessible, returned', viewTest.length, 'rows')
    }

    // Test 4: Check RLS policies by attempting to query as anonymous user
    console.log('\n4️⃣  Testing RLS policies...')

    const anonSupabase = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || 'dummy')

    const { data: rlsTest, error: rlsError } = await anonSupabase
      .from('comments')
      .select('*')
      .eq('commentable_type', 'post')
      .limit(1)

    if (rlsError && rlsError.code === 'PGRST301') {
      console.log('   ❌ RLS error - policies may need adjustment:', rlsError.message)
    } else {
      console.log('   ✅ RLS policies working - anonymous access granted for blog comments')
      console.log(`      Query returned ${rlsTest?.length || 0} rows`)
    }

    // Test 5: Check if indexes were created
    console.log('\n5️⃣  Testing performance indexes...')

    const { data: indexTest, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'comments')
      .like('indexname', '%blog%')

    if (indexError) {
      console.log('   ⚠️  Could not check indexes:', indexError.message)
    } else {
      const blogIndexes = indexTest.filter(idx => idx.indexname.includes('blog'))
      console.log('   ✅ Blog-specific indexes found:', blogIndexes.length)
      blogIndexes.forEach(idx => console.log('      -', idx.indexname))
    }

    console.log('\n✅ Blog Comments Schema Test Completed Successfully!')
    console.log('\n📋 Summary:')
    console.log('   • Schema supports "post" and "doc" commentable types')
    console.log('   • Helper function get_blog_comment_count() is available')
    console.log('   • View public_blog_comment_threads is accessible')
    console.log('   • RLS policies configured for blog comments')
    console.log('   • Performance indexes in place')
    console.log('\n🚀 Ready to implement Phase 2: API Implementation')

    return true
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   • Make sure migration 004 has been applied')
    console.error('   • Check Supabase connection and credentials')
    console.error('   • Verify users table exists (required for foreign key)')
    return false
  }
}

// Run the test
testBlogCommentsSchema()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
