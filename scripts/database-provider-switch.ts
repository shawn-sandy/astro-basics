#!/usr/bin/env tsx

/**
 * Database Provider Switching Utility
 *
 * This script demonstrates how to use the robust environment parser
 * to safely switch between database providers (Supabase/Turso) while
 * handling all the edge cases around the DATABASE_PROVIDER variable.
 */

import { parseArgs } from 'util'
import { getDatabaseProvider, updateDatabaseProvider } from '../src/utils/env-parser.js'

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    provider: { type: 'string', short: 'p' },
    comment: { type: 'string', short: 'c' },
    help: { type: 'boolean', short: 'h', default: false },
    status: { type: 'boolean', short: 's', default: false },
  },
  strict: false,
  allowPositionals: true,
})

if (args.help) {
  console.log(`
🔄 Database Provider Switching Utility

Usage: npx tsx scripts/database-provider-switch.ts [options]

Options:
  -p, --provider <value>    Set DATABASE_PROVIDER (supabase|turso|auto)
  -c, --comment <text>      Add comment when updating provider
  -s, --status              Show current provider status
  -h, --help               Show this help message

Examples:
  npx tsx scripts/database-provider-switch.ts --status
  npx tsx scripts/database-provider-switch.ts -p turso -c "Switched to Turso for better performance"
  npx tsx scripts/database-provider-switch.ts -p supabase -c "Reverted to Supabase"
  npx tsx scripts/database-provider-switch.ts -p auto -c "Auto-detect based on available credentials"
`)
  process.exit(0)
}

console.log('🔄 Database Provider Switching Utility')
console.log('=====================================\n')

// Show current status
if (args.status || !args.provider) {
  console.log('📊 Current Status:')

  const currentResult = getDatabaseProvider()
  if (currentResult.ok) {
    if (currentResult.value) {
      console.log(`✅ DATABASE_PROVIDER: ${currentResult.value}`)
    } else {
      console.log('ℹ️  DATABASE_PROVIDER: not set (will use auto-detection)')
    }
  } else {
    console.log(`❌ Error reading DATABASE_PROVIDER: ${currentResult.error.message}`)
    process.exit(1)
  }

  if (!args.provider) {
    process.exit(0)
  }
  console.log()
}

// Validate provider value
const validProviders = ['supabase', 'turso', 'auto']
if (!validProviders.includes(args.provider!)) {
  console.error(`❌ Invalid provider: ${args.provider}`)
  console.error(`   Valid options: ${validProviders.join(', ')}`)
  process.exit(1)
}

// Update the provider
console.log(`🔄 Switching DATABASE_PROVIDER to: ${args.provider}`)
if (args.comment) {
  console.log(`💬 Comment: ${args.comment}`)
}

const updateResult = updateDatabaseProvider(args.provider!, args.comment)
if (updateResult.ok) {
  console.log('✅ Successfully updated DATABASE_PROVIDER')

  // Verify the update
  const verifyResult = getDatabaseProvider()
  if (verifyResult.ok) {
    console.log(`✅ Verified new value: ${verifyResult.value}`)

    // Provide next steps based on the provider
    console.log('\n📋 Next Steps:')
    switch (args.provider) {
      case 'supabase':
        console.log('• Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
        console.log('• Run: npm run db:migrate (if using Supabase migrations)')
        break
      case 'turso':
        console.log('• Ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set')
        console.log('• Run: npm run db:setup (to create Turso schema)')
        console.log('• Run: npm run db:migrate (to apply migrations)')
        break
      case 'auto':
        console.log('• System will auto-detect based on available environment variables')
        console.log('• Supabase takes precedence if both providers are configured')
        break
    }
  } else {
    console.log(`⚠️  Could not verify update: ${verifyResult.error.message}`)
  }
} else {
  console.error(`❌ Failed to update DATABASE_PROVIDER: ${updateResult.error.message}`)
  process.exit(1)
}

console.log('\n🎉 Provider switch completed successfully!')
console.log('\n💡 Tip: Restart your development server to apply the changes')
