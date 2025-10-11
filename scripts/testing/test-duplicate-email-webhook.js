#!/usr/bin/env node --env-file=.env

/**
 * Test Duplicate Email Webhook Handler
 *
 * This script simulates Clerk webhook events to test the duplicate email
 * error handling in src/pages/api/webhooks/clerk.ts
 *
 * Test scenarios:
 * 1. Create a user with a unique email (should succeed)
 * 2. Attempt to create another user with the same email (should return 409)
 * 3. Verify logs contain duplicate email error
 * 4. Clean up test data
 *
 * Prerequisites:
 * - Dev server running on http://localhost:4321
 * - CLERK_WEBHOOK_SECRET set in .env
 * - Supabase configured and migration 004 applied
 *
 * Usage:
 *   npm run dev (in one terminal)
 *   node scripts/test-duplicate-email-webhook.js (in another terminal)
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Configuration
const WEBHOOK_ENDPOINT = 'http://localhost:4321/api/webhooks/clerk'
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Test data
const TEST_EMAIL = `duplicate-test-${Date.now()}@example.com`
const TEST_USER_ID_1 = `test_user_1_${Date.now()}`
const TEST_USER_ID_2 = `test_user_2_${Date.now()}`

/**
 * Color console output helpers
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const log = {
  info: msg => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: msg => console.log(`${colors.blue}🧪 ${msg}${colors.reset}`),
}

/**
 * Validate environment configuration
 */
function validateEnvironment() {
  log.info('Validating environment configuration...\n')

  const checks = {
    'Webhook Secret': WEBHOOK_SECRET,
    'Supabase URL': SUPABASE_URL,
    'Supabase Service Key': SUPABASE_SERVICE_KEY,
  }

  let allValid = true
  for (const [name, value] of Object.entries(checks)) {
    if (value) {
      log.success(`${name}: Configured`)
    } else {
      log.error(`${name}: Missing`)
      allValid = false
    }
  }

  if (!allValid) {
    log.error('\nMissing required environment variables')
    log.info('Please ensure .env file contains:')
    log.info('  - CLERK_WEBHOOK_SECRET')
    log.info('  - SUPABASE_URL')
    log.info('  - SUPABASE_SERVICE_ROLE_KEY\n')
    process.exit(1)
  }

  log.success('Environment validation passed\n')
}

/**
 * Create a mock Clerk webhook event
 */
function createWebhookEvent(eventType, userId, email) {
  return {
    type: eventType,
    data: {
      id: userId,
      email_addresses: [
        {
          id: `email_${Date.now()}`,
          email_address: email,
        },
      ],
      primary_email_address_id: `email_${Date.now()}`,
      username: `testuser_${userId}`,
      first_name: 'Test',
      last_name: 'User',
      image_url: 'https://example.com/avatar.png',
      public_metadata: {
        role: 'member',
      },
      created_at: Date.now(),
      last_sign_in_at: Date.now(),
    },
  }
}

/**
 * Sign webhook payload with Svix (using HMAC SHA256)
 * Svix signature format: v1,<base64_signature>
 */
function signWebhookPayload(payload) {
  const payloadString = JSON.stringify(payload)

  // Generate Svix message ID and timestamp
  const msgId = `msg_${Date.now()}`
  const timestamp = Math.floor(Date.now() / 1000)

  // Create the string to sign (Svix format)
  const toSign = `${msgId}.${timestamp}.${payloadString}`

  // Compute HMAC SHA256 signature
  const secret = Buffer.from(WEBHOOK_SECRET.split('_')[1] || WEBHOOK_SECRET, 'base64')
  const signature = crypto.createHmac('sha256', secret).update(toSign).digest('base64')

  return {
    payload: payloadString,
    headers: {
      'svix-id': msgId,
      'svix-timestamp': timestamp.toString(),
      'svix-signature': `v1,${signature}`,
      'Content-Type': 'application/json',
    },
  }
}

/**
 * Send webhook request to local dev server
 */
async function sendWebhook(eventType, userId, email) {
  const event = createWebhookEvent(eventType, userId, email)
  const { payload, headers } = signWebhookPayload(event)

  try {
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers,
      body: payload,
    })

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    }
  } catch (error) {
    throw new Error(`Failed to send webhook: ${error.message}`)
  }
}

/**
 * Check if dev server is running
 */
async function checkDevServer() {
  log.info('Checking if dev server is running...')

  try {
    const response = await fetch('http://localhost:4321', {
      method: 'HEAD',
    })

    if (response.ok || response.status === 404) {
      log.success('Dev server is running on http://localhost:4321\n')
      return true
    }
  } catch {
    log.error('Dev server is not running')
    log.info('Please start the dev server with: npm run dev\n')
    return false
  }

  return false
}

/**
 * Clean up test data from database
 */
async function cleanupTestData() {
  log.info('Cleaning up test data...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // Delete test users by Clerk ID
    const { error } = await supabase
      .from('users')
      .delete()
      .in('clerk_id', [TEST_USER_ID_1, TEST_USER_ID_2])

    if (error) {
      log.warn(`Cleanup warning: ${error.message}`)
    } else {
      log.success('Test data cleaned up\n')
    }
  } catch (error) {
    log.warn(`Cleanup error: ${error.message}\n`)
  }
}

/**
 * Verify user exists in database
 */
async function verifyUserInDatabase(clerkId, email) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data, error } = await supabase
    .from('users')
    .select('id, clerk_id, email, role')
    .eq('clerk_id', clerkId)
    .single()

  if (error) {
    return { exists: false, error: error.message }
  }

  return {
    exists: true,
    matches: data.email === email,
    user: data,
  }
}

/**
 * Run test scenarios
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Duplicate Email Webhook Handler Test')
  console.log('═══════════════════════════════════════════════════════════\n')

  validateEnvironment()

  const serverRunning = await checkDevServer()
  if (!serverRunning) {
    process.exit(1)
  }

  let testsPassed = 0
  let testsFailed = 0

  try {
    // ========================================================================
    // Test 1: Create user with unique email (should succeed)
    // ========================================================================
    log.test('Test 1: Creating user with unique email...')
    console.log(`   User ID: ${TEST_USER_ID_1}`)
    console.log(`   Email: ${TEST_EMAIL}\n`)

    const response1 = await sendWebhook('user.created', TEST_USER_ID_1, TEST_EMAIL)

    if (response1.status === 200) {
      log.success('Test 1 PASSED: User created successfully')
      console.log(`   Status: ${response1.status} ${response1.statusText}`)
      console.log(`   Response: ${JSON.stringify(response1.data)}\n`)
      testsPassed++

      // Verify user in database
      const verification = await verifyUserInDatabase(TEST_USER_ID_1, TEST_EMAIL)
      if (verification.exists && verification.matches) {
        log.success('Database verification: User exists with correct email\n')
      } else {
        log.warn('Database verification: User not found or email mismatch\n')
      }
    } else {
      log.error('Test 1 FAILED: Unexpected status code')
      console.log(`   Expected: 200`)
      console.log(`   Received: ${response1.status} ${response1.statusText}`)
      console.log(`   Response: ${JSON.stringify(response1.data)}\n`)
      testsFailed++
    }

    // Wait a bit for database sync
    await new Promise(resolve => setTimeout(resolve, 1000))

    // ========================================================================
    // Test 2: Attempt to create another user with duplicate email (should fail with 409)
    // ========================================================================
    log.test('Test 2: Attempting to create user with duplicate email...')
    console.log(`   User ID: ${TEST_USER_ID_2} (different from first user)`)
    console.log(`   Email: ${TEST_EMAIL} (SAME as first user)\n`)

    const response2 = await sendWebhook('user.created', TEST_USER_ID_2, TEST_EMAIL)

    if (response2.status === 409) {
      log.success('Test 2 PASSED: Duplicate email rejected with 409 Conflict')
      console.log(`   Status: ${response2.status} ${response2.statusText}`)
      console.log(`   Response: ${JSON.stringify(response2.data, null, 2)}`)

      // Verify error message
      if (response2.data.error === 'Email already exists') {
        log.success('Error response format: Correct')
        testsPassed++
      } else {
        log.warn('Error response format: Unexpected')
        testsFailed++
      }

      // Verify user was NOT created
      const verification = await verifyUserInDatabase(TEST_USER_ID_2, TEST_EMAIL)
      if (!verification.exists) {
        log.success('Database verification: Duplicate user was NOT created\n')
      } else {
        log.error('Database verification: Duplicate user was created (SHOULD NOT HAPPEN)\n')
      }
    } else {
      log.error('Test 2 FAILED: Expected 409 Conflict')
      console.log(`   Expected: 409 Conflict`)
      console.log(`   Received: ${response2.status} ${response2.statusText}`)
      console.log(`   Response: ${JSON.stringify(response2.data)}\n`)
      testsFailed++
    }

    // ========================================================================
    // Test 3: Verify logger.flush() was called (check logs manually)
    // ========================================================================
    log.test('Test 3: Logger flush verification')
    log.info('Check your application logs for:')
    console.log('   - "Duplicate email detected during user creation"')
    console.log('   - userId, email, clerkId, errorCode fields')
    console.log('   - Log entry should appear BEFORE HTTP 409 response\n')
    log.warn('This test requires manual log inspection')
    log.info('If you see the log entry with all fields, the test PASSED\n')

    // ========================================================================
    // Cleanup
    // ========================================================================
    await cleanupTestData()

    // ========================================================================
    // Test Summary
    // ========================================================================
    console.log('═══════════════════════════════════════════════════════════')
    console.log('  Test Summary')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log(`${colors.green}✅ Tests Passed: ${testsPassed}${colors.reset}`)
    console.log(`${colors.red}❌ Tests Failed: ${testsFailed}${colors.reset}`)
    console.log(`${colors.yellow}⚠️  Manual Tests: 1 (logger flush verification)${colors.reset}\n`)

    if (testsFailed === 0) {
      log.success('All automated tests passed!')
      log.info('Remember to check logs for Test 3 verification\n')
      process.exit(0)
    } else {
      log.error('Some tests failed. Please review the output above.\n')
      process.exit(1)
    }
  } catch (error) {
    log.error(`Test execution failed: ${error.message}`)
    console.error(error)

    // Attempt cleanup even on error
    await cleanupTestData()
    process.exit(1)
  }
}

// Run tests
runTests()
