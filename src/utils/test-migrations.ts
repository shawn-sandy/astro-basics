/**
 * Migration Testing Utility
 *
 * This utility tests database migrations and schema validation for both
 * Supabase and Turso providers. It ensures that the comment system tables
 * and constraints are properly created and functional.
 */

import { getCommentProvider, getDatabaseProvider } from './database-config'

/**
 * Test results for migration validation
 */
interface MigrationTestResult {
  testName: string
  passed: boolean
  error?: string
  details?: unknown
}

/**
 * Schema validation test suite
 */
interface SchemaTestSuite {
  provider: string
  tests: MigrationTestResult[]
  overallSuccess: boolean
  summary: {
    total: number
    passed: number
    failed: number
  }
}

/**
 * Test database schema and table structure
 */
export async function testDatabaseSchema(): Promise<SchemaTestSuite> {
  const provider = getCommentProvider()
  const providerName = getDatabaseProvider()
  const tests: MigrationTestResult[] = []

  if (!provider) {
    return {
      provider: providerName,
      tests: [
        {
          testName: 'Provider Availability',
          passed: false,
          error: 'No database provider configured or available',
        },
      ],
      overallSuccess: false,
      summary: { total: 1, passed: 0, failed: 1 },
    }
  }

  // Test 1: Provider Connection
  try {
    const isAvailable = await provider.checkAvailability()
    tests.push({
      testName: 'Provider Connection',
      passed: isAvailable,
      error: !isAvailable ? 'Provider reports as unavailable' : undefined,
    })
  } catch (error) {
    tests.push({
      testName: 'Provider Connection',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
    })
  }

  // Test 2: User Table Structure (via getUserByClerkId)
  try {
    // This will fail if users table doesn't exist or has wrong structure
    await provider.getUserByClerkId('test-user-id-' + Date.now())
    tests.push({
      testName: 'Users Table Query',
      passed: true,
      details: 'Users table query executed successfully (returned null as expected)',
    })
  } catch (error) {
    tests.push({
      testName: 'Users Table Query',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error querying users table',
    })
  }

  // Test 3: Create Test User
  let testUserId: string | null = null
  try {
    const testUser = await provider.createUser({
      clerk_id: 'test-migration-user-' + Date.now(),
      full_name: 'Test Migration User',
      email: 'test@migration.test',
      avatar_url: null,
    })

    testUserId = testUser.id
    tests.push({
      testName: 'User Creation',
      passed: true,
      details: `Created test user with ID: ${testUser.id}`,
    })
  } catch (error) {
    tests.push({
      testName: 'User Creation',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error creating test user',
    })
  }

  // Test 4: Comments Table Structure (via getComments)
  try {
    const comments = await provider.getComments({
      type: 'post',
      id: 'test-post-' + Date.now(),
      limit: 1,
      offset: 0,
    })

    tests.push({
      testName: 'Comments Table Query',
      passed: true,
      details: `Comments table query executed successfully, returned ${comments.comments.length} comments`,
    })
  } catch (error) {
    tests.push({
      testName: 'Comments Table Query',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error querying comments table',
    })
  }

  // Test 5: Comment Creation (if we have a test user)
  let testCommentId: string | null = null
  if (testUserId) {
    try {
      const comment = await provider.createComment({
        content: 'This is a test migration comment',
        author_id: testUserId,
        commentable_type: 'post',
        commentable_id: 'test-post-' + Date.now(),
        parent_comment_id: null,
        status: 'active',
        is_internal: false,
        organization_id: 'test-org',
      })

      testCommentId = comment.id
      tests.push({
        testName: 'Comment Creation',
        passed: true,
        details: `Created test comment with ID: ${comment.id}`,
      })
    } catch (error) {
      tests.push({
        testName: 'Comment Creation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error creating test comment',
      })
    }
  } else {
    tests.push({
      testName: 'Comment Creation',
      passed: false,
      error: 'Skipped - no test user available',
    })
  }

  // Test 6: Comment Update (if we have a test comment)
  if (testCommentId && testUserId) {
    try {
      const updatedComment = await provider.updateComment({
        id: testCommentId,
        author_id: testUserId,
        content: 'Updated test migration comment',
        status: 'active',
      })

      tests.push({
        testName: 'Comment Update',
        passed: true,
        details: `Updated comment content: ${updatedComment.content}`,
      })
    } catch (error) {
      tests.push({
        testName: 'Comment Update',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error updating test comment',
      })
    }
  } else {
    tests.push({
      testName: 'Comment Update',
      passed: false,
      error: 'Skipped - no test comment or user available',
    })
  }

  // Test 7: Comment Deletion (cleanup)
  if (testCommentId && testUserId) {
    try {
      await provider.deleteComment({
        id: testCommentId,
        author_id: testUserId,
      })

      tests.push({
        testName: 'Comment Deletion',
        passed: true,
        details: 'Test comment soft-deleted successfully',
      })
    } catch (error) {
      tests.push({
        testName: 'Comment Deletion',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting test comment',
      })
    }
  } else {
    tests.push({
      testName: 'Comment Deletion',
      passed: false,
      error: 'Skipped - no test comment or user available',
    })
  }

  // Calculate summary
  const passed = tests.filter(test => test.passed).length
  const failed = tests.filter(test => !test.passed).length
  const overallSuccess = failed === 0

  return {
    provider: providerName,
    tests,
    overallSuccess,
    summary: {
      total: tests.length,
      passed,
      failed,
    },
  }
}

/**
 * Log migration test results to console
 */
export async function logMigrationTestResults(): Promise<void> {
  console.log('🗄️ Testing Database Migrations & Schema...\n')

  const results = await testDatabaseSchema()

  console.log(`📊 Provider: ${results.provider}`)
  console.log(
    `📋 Tests: ${results.summary.total} total, ${results.summary.passed} passed, ${results.summary.failed} failed`
  )
  console.log('')

  console.log('🧪 Test Results:')
  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌'
    console.log(`   ${index + 1}. ${status} ${test.testName}`)

    if (test.error) {
      console.log(`      ❌ Error: ${test.error}`)
    }

    if (test.details) {
      console.log(`      ℹ️ Details: ${test.details}`)
    }
  })
  console.log('')

  const overallStatus = results.overallSuccess ? '✅ PASS' : '❌ FAIL'
  console.log(`🎯 Overall Migration Test: ${overallStatus}`)

  if (!results.overallSuccess) {
    console.log('⚠️  Some migration tests failed. Check your database schema and migrations.')
    console.log('💡 Ensure you have run: npm run db:migrate')
  }
}

/**
 * Validate specific schema constraints
 */
export async function validateSchemaConstraints(): Promise<MigrationTestResult[]> {
  const provider = getCommentProvider()
  const tests: MigrationTestResult[] = []

  if (!provider) {
    return [
      {
        testName: 'Schema Constraints Validation',
        passed: false,
        error: 'No provider available for constraint testing',
      },
    ]
  }

  // Test foreign key constraint (comments -> users)
  try {
    // Try to create a comment with invalid author_id
    await provider.createComment({
      content: 'Test constraint violation',
      author_id: 'invalid-user-id-' + Date.now(),
      commentable_type: 'post',
      commentable_id: 'test-post',
      parent_comment_id: null,
      status: 'active',
      is_internal: false,
      organization_id: 'test-org',
    })

    // If we get here, the constraint failed
    tests.push({
      testName: 'Foreign Key Constraint (users)',
      passed: false,
      error: 'Comment was created with invalid author_id - foreign key constraint not working',
    })
  } catch {
    // This should fail due to foreign key constraint
    tests.push({
      testName: 'Foreign Key Constraint (users)',
      passed: true,
      details: 'Foreign key constraint properly rejected invalid author_id',
    })
  }

  return tests
}
