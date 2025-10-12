/**
 * Check What's Actually in Axiom
 *
 * This script shows you exactly what logs are in your Axiom dataset,
 * helping you understand if logs are being received.
 *
 * Usage: npm run check:axiom
 */

import * as dotenv from 'dotenv'

dotenv.config()

async function checkAxiomLogs() {
  console.log('\n📊 Checking Axiom Dataset Contents\n')
  console.log('='.repeat(80))

  const token = process.env.AXIOM_TOKEN
  const dataset = process.env.AXIOM_DATASET || 'astro-basics'

  if (!token) {
    console.error('❌ AXIOM_TOKEN not set\n')
    process.exit(1)
  }

  console.log(`\n📦 Dataset: ${dataset}`)
  console.log(`🔑 Token: ${token.slice(0, 15)}...${token.slice(-4)}\n`)

  try {
    // Calculate time range (last 24 hours)
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)

    console.log(`⏰ Time Range: Last 24 hours`)
    console.log(`   From: ${startTime.toISOString()}`)
    console.log(`   To:   ${endTime.toISOString()}\n`)

    // Query Axiom API
    console.log('🔍 Querying Axiom API...\n')

    const apl = `['${dataset}'] | where _time > ago(24h) | order by _time desc | limit 100`

    const response = await fetch(`https://api.axiom.co/v1/datasets/${dataset}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apl,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error: ${response.status} ${response.statusText}`)
      console.error(`   Response: ${errorText}\n`)

      if (response.status === 403) {
        console.log('⚠️  Your token does not have query (read) permission')
        console.log('   This is normal for ingest-only tokens')
        console.log('   Solution: View logs in Axiom web dashboard instead\n')
        console.log('   Dashboard: https://app.axiom.co/\n')
      }

      process.exit(1)
    }

    const result = (await response.json()) as {
      matches?: Array<Record<string, unknown>>
      buckets?: {
        totals?: Array<{ aggregations?: Array<{ value: number }> }>
      }
    }

    const matches = result.matches || []

    console.log('='.repeat(80))
    console.log(`📊 RESULTS: Found ${matches.length} log entries in last 24 hours`)
    console.log('='.repeat(80) + '\n')

    if (matches.length === 0) {
      console.log('❌ No logs found in the last 24 hours\n')
      console.log('Possible reasons:')
      console.log('   1. This is a new dataset with no logs yet')
      console.log('   2. Logs were sent >24 hours ago')
      console.log('   3. Ingestion delay (wait 60 seconds and try again)\n')
      console.log('💡 Try sending a test log:')
      console.log('   npm run test:axiom-simple\n')
    } else {
      console.log(`✅ Found ${matches.length} logs! Your logging is working!\n`)

      // Show recent log types
      const messageCounts = new Map<string, number>()
      const levelCounts = new Map<string, number>()

      matches.forEach((log: Record<string, unknown>) => {
        const message = String(log.message || 'unknown')
        const level = String(log.level || 'unknown')

        messageCounts.set(message, (messageCounts.get(message) || 0) + 1)
        levelCounts.set(level, (levelCounts.get(level) || 0) + 1)
      })

      console.log('📈 Log Breakdown by Level:')
      Array.from(levelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([level, count]) => {
          console.log(`   ${level}: ${count}`)
        })

      console.log('\n📝 Log Breakdown by Message (top 10):')
      Array.from(messageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([message, count]) => {
          const truncated = message.length > 50 ? message.slice(0, 47) + '...' : message
          console.log(`   ${count}x - ${truncated}`)
        })

      console.log('\n📋 Most Recent 5 Logs:\n')
      matches.slice(0, 5).forEach((log, idx) => {
        console.log(`${idx + 1}. ${log._time || 'no timestamp'}`)
        console.log(`   Level: ${log.level || 'unknown'}`)
        console.log(`   Message: ${log.message || 'no message'}`)
        if (log.userId) console.log(`   User ID: ${log.userId}`)
        if (log.endpoint) console.log(`   Endpoint: ${log.endpoint}`)
        if (log.correlationId) console.log(`   Correlation: ${log.correlationId}`)
        console.log('')
      })

      // Check for login-related logs
      const loginLogs = matches.filter(log =>
        String(log.message || '')
          .toLowerCase()
          .includes('login')
      )

      if (loginLogs.length > 0) {
        console.log(`🎯 Found ${loginLogs.length} login-related logs!`)
        console.log('   Your user login logging is working correctly!\n')
      }
    }

    // Show query to use in dashboard
    console.log('='.repeat(80))
    console.log('🔍 QUERY TO USE IN AXIOM DASHBOARD')
    console.log('='.repeat(80))
    console.log(`\n['${dataset}']`)
    console.log('| where _time > ago(24h)')
    console.log('| order by _time desc')
    console.log('| limit 100\n')
    console.log('📍 Dashboard: https://app.axiom.co/\n')
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.log('\nTroubleshooting:')
    console.log('   1. Check network connection')
    console.log('   2. Verify AXIOM_TOKEN in .env')
    console.log('   3. Ensure dataset exists')
    console.log('   4. Check Axiom status: https://status.axiom.co/\n')
    process.exit(1)
  }
}

checkAxiomLogs().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
