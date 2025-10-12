/**
 * Axiom Configuration Diagnostic Script
 *
 * This script checks your Axiom setup and helps diagnose why logs
 * might not be visible in the dashboard.
 *
 * Usage: npm run diagnose:axiom
 */

import * as dotenv from 'dotenv'

dotenv.config()

async function diagnoseAxiomSetup() {
  console.log('\n🔍 Axiom Configuration Diagnostics\n')
  console.log('='.repeat(80))

  // Check 1: Environment Variables
  console.log('\n1️⃣ Checking Environment Variables...\n')

  const token = process.env.AXIOM_TOKEN
  const dataset = process.env.AXIOM_DATASET
  const orgId = process.env.AXIOM_ORG_ID

  if (!token) {
    console.error('❌ AXIOM_TOKEN is not set')
    console.log('   Add to .env: AXIOM_TOKEN=xaat-your-token-here\n')
    process.exit(1)
  } else {
    console.log(`✅ AXIOM_TOKEN found: ${token.slice(0, 15)}...${token.slice(-4)}`)
  }

  if (!dataset) {
    console.error('❌ AXIOM_DATASET is not set')
    console.log('   Add to .env: AXIOM_DATASET=astro-basics\n')
    process.exit(1)
  } else {
    console.log(`✅ AXIOM_DATASET: ${dataset}`)
  }

  if (orgId) {
    console.log(`✅ AXIOM_ORG_ID: ${orgId}`)
  } else {
    console.log('ℹ️  AXIOM_ORG_ID not set (optional for some accounts)')
  }

  // Check 2: Axiom SDK
  console.log('\n2️⃣ Checking Axiom SDK...\n')

  try {
    const { Axiom } = await import('@axiomhq/js')
    console.log('✅ @axiomhq/js package is installed')

    const axiom = new Axiom({ token, orgId })
    console.log('✅ Axiom client initialized')

    // Check 3: List Datasets
    console.log('\n3️⃣ Checking Dataset Access...\n')

    try {
      const response = await fetch('https://api.axiom.co/v1/datasets', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`❌ Failed to list datasets: ${response.status} ${response.statusText}`)
        console.log('   This might indicate an invalid token or network issue\n')
        process.exit(1)
      }

      const datasets = (await response.json()) as Array<{ name: string; description?: string }>
      console.log(`✅ Successfully connected to Axiom API`)
      console.log(`\n📊 Available Datasets (${datasets.length}):\n`)

      if (datasets.length === 0) {
        console.log('   ⚠️  No datasets found in your Axiom account')
        console.log(`   ⚠️  You need to create the "${dataset}" dataset first\n`)
        console.log('   Steps to create dataset:')
        console.log('   1. Go to https://app.axiom.co/')
        console.log('   2. Click "Settings" → "Datasets"')
        console.log('   3. Click "Create Dataset"')
        console.log(`   4. Name it "${dataset}"\n`)
      } else {
        datasets.forEach(ds => {
          const isCurrent = ds.name === dataset
          const icon = isCurrent ? '✅' : '  '
          console.log(`   ${icon} ${ds.name}${isCurrent ? ' (current)' : ''}`)
        })

        const datasetExists = datasets.some(ds => ds.name === dataset)
        if (!datasetExists) {
          console.log(`\n   ⚠️  Dataset "${dataset}" not found!`)
          console.log('   Either:')
          console.log(`   - Create a dataset named "${dataset}" in Axiom`)
          console.log('   - Update AXIOM_DATASET in .env to match an existing dataset\n')
        } else {
          console.log(`\n   ✅ Dataset "${dataset}" exists and is accessible`)
        }
      }
    } catch (error) {
      console.error('❌ Failed to check datasets:', error)
      console.log('   Check your network connection and token permissions\n')
    }

    // Check 4: Test Ingestion
    console.log('\n4️⃣ Testing Log Ingestion...\n')

    const testEvent = {
      _time: new Date().toISOString(),
      level: 'info',
      message: 'Diagnostic test event',
      testId: 'diagnostic_' + Date.now(),
      timestamp: new Date().toISOString(),
    }

    console.log(`   Sending test event to "${dataset}"...`)

    try {
      await axiom.ingest(dataset, [testEvent])
      await axiom.flush()
      console.log('   ✅ Test event sent successfully')
      console.log(`\n   🔍 Query to find this test event:\n`)
      console.log(`   ['${dataset}']`)
      console.log(`   | where testId == "${testEvent.testId}"`)
      console.log(`   | order by _time desc\n`)
      console.log('   ⏳ Wait 10-30 seconds then run this query in Axiom dashboard')
      console.log('   📍 Dashboard: https://app.axiom.co/\n')
    } catch (error) {
      console.error('   ❌ Failed to send test event:', error)
      console.log('   This might indicate:')
      console.log('   - Token lacks ingest permission')
      console.log('   - Dataset does not exist')
      console.log('   - Network connectivity issues\n')
    }

    // Check 5: Token Permissions
    console.log('\n5️⃣ Token Permission Analysis...\n')

    console.log('   Your token has:')
    console.log('   ✅ Ingest permission (can send logs)')
    console.log('   ❓ Query permission (check if queries work in dashboard)\n')

    console.log('   Common token types:')
    console.log('   - xaat-* : API token (full permissions)')
    console.log('   - Personal token: From user settings (full permissions)')
    console.log('   - Ingest token: Write-only (recommended for apps)\n')
  } catch (error) {
    console.error('❌ Failed to load Axiom SDK:', error)
    console.log('\n   Install it with: npm install @axiomhq/js\n')
    process.exit(1)
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📋 DIAGNOSTIC SUMMARY')
  console.log('='.repeat(80))
  console.log('\n✅ Configuration looks correct')
  console.log('\n📝 Next steps:')
  console.log('   1. Wait 30-60 seconds for ingestion to complete')
  console.log('   2. Go to https://app.axiom.co/')
  console.log(`   3. Select dataset: ${dataset}`)
  console.log('   4. Run the query shown above')
  console.log('   5. Check time range in dashboard (set to "Last 1 hour")\n')
  console.log('⚠️  Common issues:')
  console.log('   - Time range too narrow (use "Last 1 hour" or "Last 24 hours")')
  console.log('   - Wrong dataset selected')
  console.log('   - Ingestion delay (wait 30-60 seconds)')
  console.log('   - Browser cache (hard refresh: Cmd+Shift+R)\n')
}

diagnoseAxiomSetup().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
