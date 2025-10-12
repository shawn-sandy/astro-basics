/**
 * Axiom Login Logging Test Script
 *
 * This script tests the user login logging implementation to verify that
 * authentication events are properly sent to Axiom. It simulates various
 * login scenarios and checks both local logging output and Axiom ingestion.
 *
 * Usage:
 *   npm run test:axiom-login
 *
 * Requirements:
 *   - AXIOM_TOKEN environment variable must be set
 *   - AXIOM_DATASET environment variable must be set
 *   - @axiomhq/js package must be installed
 *
 * @since 1.0.0
 */

import { randomUUID } from 'node:crypto'

// Type definitions for test context
interface TestResult {
  testName: string
  passed: boolean
  message: string
  duration?: number
  logsSent?: number
}

interface AxiomClient {
  ingest: (dataset: string, events: Array<Record<string, unknown>>) => Promise<void>
  flush: () => Promise<void>
  query: (apl: string) => Promise<{ matches?: Array<Record<string, unknown>> }>
}

/**
 * Test configuration and results tracking
 */
const testResults: TestResult[] = []
const testDataset = process.env.AXIOM_DATASET || 'astro-basics'
const correlationId = randomUUID()

/**
 * Simulates a user login event being logged to Axiom
 *
 * This replicates the exact logging pattern used in the Clerk webhook
 * session.created handler to verify the logging infrastructure works.
 *
 * @param {AxiomClient} axiom - Axiom client instance
 * @returns {Promise<TestResult>} Test result with pass/fail status
 */
async function testLoginEventLogging(axiom: AxiomClient): Promise<TestResult> {
  const startTime = Date.now()
  const testName = 'Login Event Logging to Axiom'

  try {
    // Simulate the exact log entry from session.created webhook
    const loginEvent = {
      _time: new Date().toISOString(),
      level: 'info',
      message: 'User login successful',
      userId: 'test_user_' + randomUUID().slice(0, 8),
      loginTimestamp: new Date().toISOString(),
      correlationId,
      source: 'clerk-webhook',
      eventType: 'session.created',
      environment: 'test',
      service: 'astro-basics',
    }

    console.log('📤 Sending test login event to Axiom...')
    console.log('   Event data:', JSON.stringify(loginEvent, null, 2))

    await axiom.ingest(testDataset, [loginEvent])
    await axiom.flush()

    const duration = Date.now() - startTime

    return {
      testName,
      passed: true,
      message: `Login event successfully sent to Axiom dataset "${testDataset}"`,
      duration,
      logsSent: 1,
    }
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Failed to send login event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Simulates protected route access logging
 *
 * This replicates the middleware authentication logging pattern to verify
 * that user activity tracking works correctly.
 *
 * @param {AxiomClient} axiom - Axiom client instance
 * @returns {Promise<TestResult>} Test result with pass/fail status
 */
async function testProtectedRouteLogging(axiom: AxiomClient): Promise<TestResult> {
  const startTime = Date.now()
  const testName = 'Protected Route Access Logging'

  try {
    const routeAccessEvent = {
      _time: new Date().toISOString(),
      level: 'info',
      message: 'User accessing protected route',
      userId: 'test_user_' + randomUUID().slice(0, 8),
      role: 'admin',
      orgId: 'test_org_123',
      endpoint: '/dashboard',
      method: 'GET',
      correlationId,
      routeType: 'protected',
      environment: 'test',
      service: 'astro-basics',
    }

    console.log('📤 Sending test protected route access event...')
    await axiom.ingest(testDataset, [routeAccessEvent])
    await axiom.flush()

    const duration = Date.now() - startTime

    return {
      testName,
      passed: true,
      message: `Protected route access event successfully sent`,
      duration,
      logsSent: 1,
    }
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Simulates database sync logging with performance metrics
 *
 * @param {AxiomClient} axiom - Axiom client instance
 * @returns {Promise<TestResult>} Test result with pass/fail status
 */
async function testDatabaseSyncLogging(axiom: AxiomClient): Promise<TestResult> {
  const startTime = Date.now()
  const testName = 'Database Sync Performance Logging'

  try {
    const dbSyncEvent = {
      _time: new Date().toISOString(),
      level: 'debug',
      message: 'Last sign in updated for user',
      userId: 'test_user_' + randomUUID().slice(0, 8),
      dbOperation: 'update_last_sign_in',
      requestDuration: 45,
      environment: 'test',
      service: 'astro-basics',
      correlationId,
    }

    console.log('📤 Sending test database sync event...')
    await axiom.ingest(testDataset, [dbSyncEvent])
    await axiom.flush()

    const duration = Date.now() - startTime

    return {
      testName,
      passed: true,
      message: `Database sync event successfully sent`,
      duration,
      logsSent: 1,
    }
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Verifies that logs can be queried from Axiom
 *
 * Waits briefly for ingestion to complete, then queries for the test logs
 * using the unique correlation ID.
 *
 * @param {AxiomClient} axiom - Axiom client instance
 * @returns {Promise<TestResult>} Test result with query results
 */
async function testLogQueryRetrieval(axiom: AxiomClient): Promise<TestResult> {
  const startTime = Date.now()
  const testName = 'Query Test Logs from Axiom'

  try {
    console.log('⏳ Waiting 5 seconds for Axiom ingestion to complete...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('🔍 Querying Axiom for test logs...')
    const query = `['${testDataset}'] | where correlationId == "${correlationId}" | order by _time desc`

    const result = await axiom.query(query)

    const matchCount = result.matches?.length || 0
    const duration = Date.now() - startTime

    if (matchCount > 0) {
      console.log(`✅ Found ${matchCount} log entries in Axiom`)
      console.log('   Sample:', JSON.stringify(result.matches?.[0], null, 2))

      return {
        testName,
        passed: true,
        message: `Successfully retrieved ${matchCount} test logs from Axiom`,
        duration,
        logsSent: matchCount,
      }
    } else {
      return {
        testName,
        passed: false,
        message: `No logs found with correlation ID: ${correlationId}. This may indicate ingestion delay or configuration issues.`,
        duration,
      }
    }
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Prints formatted test results to console
 *
 * @param {TestResult[]} results - Array of test results
 */
function printTestResults(results: TestResult[]): void {
  console.log('\n' + '='.repeat(80))
  console.log('📊 AXIOM LOGIN LOGGING TEST RESULTS')
  console.log('='.repeat(80) + '\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalLogs = results.reduce((sum, r) => sum + (r.logsSent || 0), 0)

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.testName}`)
    console.log(`   ${result.message}`)
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`)
    }
    if (result.logsSent) {
      console.log(`   Logs: ${result.logsSent}`)
    }
    console.log('')
  })

  console.log('='.repeat(80))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total Logs Sent: ${totalLogs}`)
  console.log(`🔗 Correlation ID: ${correlationId}`)
  console.log('='.repeat(80) + '\n')

  if (failed > 0) {
    console.log('⚠️  TROUBLESHOOTING TIPS:')
    console.log('   1. Verify AXIOM_TOKEN is set correctly in .env')
    console.log('   2. Check AXIOM_DATASET matches your Axiom project')
    console.log('   3. Ensure @axiomhq/js package is installed: npm install @axiomhq/js')
    console.log('   4. Check network connectivity to Axiom API')
    console.log('   5. View logs in Axiom dashboard: https://app.axiom.co/')
    console.log('\n')
  }
}

/**
 * Main test execution function
 */
async function runTests(): Promise<void> {
  console.log('\n🧪 Starting Axiom Login Logging Tests...\n')
  console.log(`📦 Dataset: ${testDataset}`)
  console.log(`🔗 Correlation ID: ${correlationId}\n`)

  // Check environment configuration
  if (!process.env.AXIOM_TOKEN) {
    console.error('❌ Error: AXIOM_TOKEN environment variable is not set')
    console.error('   Please set it in your .env file\n')
    process.exit(1)
  }

  if (!process.env.AXIOM_DATASET) {
    console.error('❌ Error: AXIOM_DATASET environment variable is not set')
    console.error('   Please set it in your .env file\n')
    process.exit(1)
  }

  try {
    // Dynamic import to avoid bundling Axiom in environments that don't need it
    console.log('📥 Loading Axiom client...')
    const { Axiom } = await import('@axiomhq/js')

    const axiom: AxiomClient = new Axiom({
      token: process.env.AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG_ID,
    })

    console.log('✅ Axiom client initialized\n')

    // Run all tests sequentially
    testResults.push(await testLoginEventLogging(axiom))
    testResults.push(await testProtectedRouteLogging(axiom))
    testResults.push(await testDatabaseSyncLogging(axiom))
    testResults.push(await testLogQueryRetrieval(axiom))

    // Print results
    printTestResults(testResults)

    // Exit with appropriate code
    const hasFailures = testResults.some(r => !r.passed)
    process.exit(hasFailures ? 1 : 0)
  } catch (error) {
    console.error('❌ Fatal error during test execution:')
    console.error(error)
    console.error('\nPossible causes:')
    console.error('  - @axiomhq/js package not installed')
    console.error('  - Invalid Axiom credentials')
    console.error('  - Network connectivity issues\n')
    process.exit(1)
  }
}

// Execute tests
runTests().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
