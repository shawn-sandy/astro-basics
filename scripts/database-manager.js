#!/usr/bin/env -S node --import tsx

/**
 * Database Management Script
 * Unified interface for common Supabase database operations
 *
 * The checks here query Supabase through `getDatabase()`, the same abstraction the app
 * uses, so a passing check means a real read succeeded. Run it through the `tsx` loader
 * (`npm run db:manage`), which lets this script import the TypeScript abstraction layer.
 */

import { parseArgs } from 'util'

import { getDatabase } from '#libs/database'

// Color utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

const log = {
  info: msg => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: msg => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: msg => console.error(`${colors.red}✗${colors.reset}  ${msg}`),
  header: msg => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  step: msg => console.log(`${colors.magenta}▶${colors.reset}  ${msg}`),
}

// Parse command line arguments
const { values: args, positionals } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    verbose: { type: 'boolean', short: 'v' },
    'dry-run': { type: 'boolean' },
  },
  strict: false,
  allowPositionals: true,
})

const command = positionals[0]

// Show help
if (args.help || !command) {
  console.log(`
${colors.bright}Database Management Tool${colors.reset}

${colors.cyan}Usage:${colors.reset} npm run db:manage -- <command> [options]
        node --import tsx --env-file=.env scripts/database-manager.js <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}status${colors.reset}           Show comprehensive database status (no query)
  ${colors.green}test${colors.reset}             Read one row from the messages table
  ${colors.green}schema${colors.reset}           Not implemented here; use npm run db:schema
  ${colors.green}tables${colors.reset}           Read sample rows from the messages table
  ${colors.green}health${colors.reset}           Time a one-row read and rate the response
  ${colors.green}cleanup${colors.reset}          Clean up old/unused data (with confirmation)
  ${colors.green}setup${colors.reset}            Run setup wizard

${colors.cyan}Options:${colors.reset}
  --dry-run              Show what would be done without executing
  -v, --verbose          Show detailed output
  -h, --help             Show this help message

${colors.cyan}Examples:${colors.reset}
  npm run db:manage -- status            # Show full status
  npm run db:manage -- test              # Read from Supabase and report failures
  npm run db:manage -- tables --verbose  # Sample rows with details
  npm run db:manage -- cleanup --dry-run # Preview cleanup operations
`)
  process.exit(0)
}

/**
 * Open the database through the abstraction layer, exiting when it is not configured.
 *
 * `getDatabase()` applies the app's own rule: the URL, the anon key and the service role
 * key must all be set, and the URL must be parseable.
 */
function openDatabase() {
  try {
    return getDatabase()
  } catch (error) {
    log.error(error.message)
    log.info('Run: npm run db:wizard to configure Supabase')
    if (args.verbose) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

/**
 * Execute status command
 */
async function executeStatus() {
  log.header('Comprehensive Database Status')

  // Import and run existing status script functionality
  try {
    await import('./database-status.js')
    // The status script runs immediately when imported
  } catch (error) {
    log.error(`Failed to load status module: ${error.message}`)
  }
}

/**
 * Execute test command
 */
async function executeTest() {
  const db = openDatabase()
  const provider = db.getProviderName()
  log.header(`Testing ${provider.toUpperCase()} Connection`)

  try {
    log.step('Checking configuration...')
    if (!db.isConfigured()) {
      log.error(`${provider} is not properly configured`)
      process.exitCode = 1
      return
    }

    // A real bounded read against the messages table: it is the only way to tell a
    // working connection from credentials Supabase rejects or a missing table.
    log.step('Reading from the messages table...')
    const messages = await db.getMessages({ limit: 1 })
    log.success(`Read succeeded - the messages table returned ${messages.length} of up to 1 row`)

    log.success(`${provider.toUpperCase()} connection test passed`)
  } catch (error) {
    log.error(`Connection test failed: ${error.message}`)
    log.info('If the messages table does not exist, apply scripts/migrations/006_messages.sql')
    if (args.verbose) {
      console.error(error.stack)
    }
    process.exitCode = 1
  }
}

/**
 * Execute tables command
 */
async function executeTables() {
  const db = openDatabase()
  const provider = db.getProviderName()
  log.header(`Database Tables (${provider.toUpperCase()})`)

  // The abstraction layer only covers `messages`; the dashboard lists every table.
  log.info('Only the messages table is checked here')
  log.info('Use your Supabase dashboard for a full table list and row counts')

  try {
    const messages = await db.getMessages({ limit: 5 })
    log.success(`Messages table accessible - ${messages.length} sample records`)

    if (args.verbose && messages.length > 0) {
      console.log('\nSample messages:')
      messages.forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg.subject || msg.name || 'Untitled'} (ID: ${msg.id})`)
      })
    }
  } catch (error) {
    log.error(`Could not access messages table: ${error.message}`)
    log.info('If the messages table does not exist, apply scripts/migrations/006_messages.sql')
    if (args.verbose) {
      console.error(error.stack)
    }
    process.exitCode = 1
  }
}

/**
 * Execute health command
 */
async function executeHealth() {
  const db = openDatabase()
  const provider = db.getProviderName()
  log.header(`Database Health Check (${provider.toUpperCase()})`)

  log.step('Configuration check...')
  if (!db.isConfigured()) {
    log.error('Database not properly configured')
    process.exitCode = 1
    return
  }
  log.success('Configuration valid')

  log.step('Connection performance test...')
  const startTime = Date.now()

  try {
    await db.getMessages({ limit: 1 })
    const responseTime = Date.now() - startTime

    if (responseTime < 100) {
      log.success(`Excellent response time: ${responseTime}ms`)
    } else if (responseTime < 500) {
      log.success(`Good response time: ${responseTime}ms`)
    } else if (responseTime < 1000) {
      log.warning(`Slow response time: ${responseTime}ms`)
    } else {
      log.warning(`Very slow response time: ${responseTime}ms`)
    }
  } catch (error) {
    log.error(`Health check failed: ${error.message}`)
    log.info('If the messages table does not exist, apply scripts/migrations/006_messages.sql')
    if (args.verbose) {
      console.error(error.stack)
    }
    process.exitCode = 1
    return
  }

  log.step('Provider-specific health checks...')
  log.info('Supabase health: Check your dashboard at https://supabase.com')
}

/**
 * Execute cleanup command
 */
async function executeCleanup() {
  const provider = openDatabase().getProviderName()
  log.header(`Database Cleanup (${provider.toUpperCase()})`)

  if (args['dry-run']) {
    log.info('DRY RUN MODE - No changes will be made')
  }

  log.warning('Database cleanup operations would go here')
  log.info('This could include:')
  console.log('  • Remove archived messages older than 90 days')
  console.log('  • Clean up orphaned records')
  console.log('  • Optimize database indexes')
  console.log('  • Vacuum/analyze tables')

  if (!args['dry-run']) {
    log.info('Cleanup operations not yet implemented')
    log.info('Use --dry-run to preview potential cleanup operations')
  }
}

/**
 * Execute setup command
 */
async function executeSetup() {
  log.info('Launching database setup wizard...')

  try {
    const { execSync } = await import('child_process')
    execSync('node scripts/setup-wizard.js', { stdio: 'inherit' })
  } catch (error) {
    log.error(`Setup wizard failed: ${error.message}`)
  }
}

/**
 * Main function
 */
async function main() {
  try {
    switch (command.toLowerCase()) {
      case 'status':
        await executeStatus()
        break
      case 'test':
        await executeTest()
        break
      case 'schema':
        log.warning('Schema command not yet implemented')
        log.info('Use your database provider dashboard for schema information')
        break
      case 'tables':
        await executeTables()
        break
      case 'health':
        await executeHealth()
        break
      case 'cleanup':
        await executeCleanup()
        break
      case 'setup':
        await executeSetup()
        break
      default:
        log.error(`Unknown command: ${command}`)
        log.info('Use --help to see available commands')
        process.exit(1)
    }
  } catch (error) {
    log.error(`Command failed: ${error.message}`)
    if (args.verbose) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run the manager
main()
