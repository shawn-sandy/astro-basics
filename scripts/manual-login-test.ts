/**
 * Manual Login Logging Test
 *
 * This script simulates a complete login flow by directly calling the logger
 * to verify end-to-end authentication logging works as expected.
 *
 * Usage:
 *   tsx scripts/manual-login-test.ts
 *
 * @since 1.0.0
 */

import { logger } from '../src/utils/logger.js'

async function testManualLogin() {
  console.log('\n🧪 Manual Login Test Starting...\n')

  const testUserId = 'test_user_manual_' + Date.now()
  const correlationId = logger.createCorrelationId()

  console.log(`👤 Test User ID: ${testUserId}`)
  console.log(`🔗 Correlation ID: ${correlationId}\n`)

  try {
    // Step 1: Simulate Clerk webhook session.created
    console.log('1️⃣ Simulating Clerk webhook login event...')
    await logger.info('User login successful', {
      userId: testUserId,
      loginTimestamp: new Date().toISOString(),
      correlationId,
      source: 'clerk-webhook',
      eventType: 'session.created',
    })
    console.log('   ✅ Login event logged\n')

    // Wait a moment to simulate time between webhook and route access
    await new Promise(resolve => setTimeout(resolve, 500))

    // Step 2: Simulate middleware protected route access
    console.log('2️⃣ Simulating protected route access...')
    await logger.info('User accessing protected route', {
      userId: testUserId,
      role: 'member',
      orgId: null,
      endpoint: '/dashboard',
      method: 'GET',
      correlationId,
      routeType: 'protected',
    })
    console.log('   ✅ Route access logged\n')

    // Step 3: Simulate database sync
    console.log('3️⃣ Simulating database sync...')
    await logger.debug('Last sign in updated for user', {
      userId: testUserId,
      dbOperation: 'update_last_sign_in',
      requestDuration: 45,
    })
    console.log('   ✅ Database sync logged\n')

    // Step 4: Flush logs to Axiom
    console.log('4️⃣ Flushing logs to Axiom...')
    await logger.flush()
    console.log('   ✅ Logs flushed\n')

    console.log('═'.repeat(80))
    console.log('✅ MANUAL LOGIN TEST COMPLETE')
    console.log('═'.repeat(80))
    console.log(`\n📊 View logs in Axiom dashboard:`)
    console.log(`   https://app.axiom.co/\n`)
    console.log(`🔍 Query to see your test logs:`)
    console.log(`   ['astro-basics']`)
    console.log(`   | where correlationId == "${correlationId}"`)
    console.log(`   | order by _time desc\n`)
    console.log(`👤 Or search by user ID:`)
    console.log(`   ['astro-basics']`)
    console.log(`   | where userId == "${testUserId}"`)
    console.log(`   | order by _time desc\n`)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testManualLogin().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
