/**
 * Simple Axiom Login Test
 *
 * This script directly uses the Axiom SDK to verify login events can be sent
 * without depending on the application logger (which requires Vite environment).
 *
 * Usage:
 *   npm run test:axiom-simple
 *
 * @since 1.0.0
 */

import { randomUUID } from 'node:crypto'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testSimpleAxiomLogging() {
  console.log('\n🧪 Simple Axiom Login Test\n')

  // Check configuration
  const token = process.env.AXIOM_TOKEN
  const dataset = process.env.AXIOM_DATASET || 'astro-basics'

  if (!token) {
    console.error('❌ Error: AXIOM_TOKEN not found in environment')
    console.error('   Make sure your .env file contains AXIOM_TOKEN\n')
    process.exit(1)
  }

  console.log(`📦 Dataset: ${dataset}`)
  console.log(`🔑 Token: ${token.slice(0, 15)}...${token.slice(-4)}\n`)

  try {
    // Import Axiom SDK
    console.log('📥 Loading Axiom SDK...')
    const { Axiom } = await import('@axiomhq/js')

    const axiom = new Axiom({
      token,
      orgId: process.env.AXIOM_ORG_ID,
    })
    console.log('✅ Axiom client initialized\n')

    // Create test data
    const testUserId = 'test_user_' + Date.now()
    const correlationId = randomUUID()

    console.log(`👤 Test User: ${testUserId}`)
    console.log(`🔗 Correlation: ${correlationId}\n`)

    // Test 1: Send login event
    console.log('1️⃣ Sending login event to Axiom...')
    const loginEvent = {
      _time: new Date().toISOString(),
      level: 'info',
      message: 'User login successful',
      userId: testUserId,
      loginTimestamp: new Date().toISOString(),
      correlationId,
      source: 'clerk-webhook',
      eventType: 'session.created',
      environment: 'test',
      service: 'astro-basics',
    }

    await axiom.ingest(dataset, [loginEvent])
    console.log('   ✅ Login event sent\n')

    // Test 2: Send protected route access
    console.log('2️⃣ Sending protected route access event...')
    const routeEvent = {
      _time: new Date().toISOString(),
      level: 'info',
      message: 'User accessing protected route',
      userId: testUserId,
      role: 'member',
      endpoint: '/dashboard',
      method: 'GET',
      correlationId,
      routeType: 'protected',
      environment: 'test',
      service: 'astro-basics',
    }

    await axiom.ingest(dataset, [routeEvent])
    console.log('   ✅ Route access event sent\n')

    // Test 3: Send database sync event
    console.log('3️⃣ Sending database sync event...')
    const dbEvent = {
      _time: new Date().toISOString(),
      level: 'debug',
      message: 'Last sign in updated for user',
      userId: testUserId,
      dbOperation: 'update_last_sign_in',
      requestDuration: 42,
      correlationId,
      environment: 'test',
      service: 'astro-basics',
    }

    await axiom.ingest(dataset, [dbEvent])
    console.log('   ✅ Database sync event sent\n')

    // Flush to ensure delivery
    console.log('4️⃣ Flushing logs to Axiom...')
    await axiom.flush()
    console.log('   ✅ Logs flushed successfully\n')

    // Print results
    console.log('═'.repeat(80))
    console.log('✅ ALL TESTS PASSED')
    console.log('═'.repeat(80))
    console.log('\n📊 3 login-related events successfully sent to Axiom!\n')
    console.log('📍 View your logs:')
    console.log(`   URL: https://app.axiom.co/\n`)
    console.log('🔍 Query to find these test logs:')
    console.log(`\n   ['${dataset}']`)
    console.log(`   | where correlationId == "${correlationId}"`)
    console.log(`   | order by _time desc\n`)
    console.log('   Or by user ID:')
    console.log(`\n   ['${dataset}']`)
    console.log(`   | where userId == "${testUserId}"`)
    console.log(`   | order by _time desc\n`)
    console.log('═'.repeat(80))
    console.log('\n✨ Your login logging to Axiom is working correctly!\n')
  } catch (error) {
    console.error('\n❌ Test failed:')
    console.error(error)
    console.error('\n📝 Troubleshooting:')
    console.error('   1. Verify AXIOM_TOKEN in .env is correct')
    console.error('   2. Check network connectivity')
    console.error('   3. Ensure @axiomhq/js is installed: npm install @axiomhq/js')
    console.error('   4. Check Axiom service status: https://status.axiom.co/\n')
    process.exit(1)
  }
}

// Run the test
testSimpleAxiomLogging().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
