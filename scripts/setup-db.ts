#!/usr/bin/env tsx

import { parseArgs } from 'util'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import getTursoClient from '../src/libs/turso.js'
import { setupDatabaseSchema, checkSchemaExists, resetSchema } from '../src/libs/schema-setup.js'

// Color utilities for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg: string) => console.error(`${colors.red}✗${colors.reset}  ${msg}`),
  debug: (msg: string) => console.log(`${colors.cyan}🔍${colors.reset} ${msg}`),
}

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    reset: { type: 'boolean', short: 'r', default: false },
    check: { type: 'boolean', short: 'c', default: false },
    verbose: { type: 'boolean', short: 'v', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    'show-config': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
  strict: false,
  allowPositionals: true,
})

// Show help
if (args.help) {
  console.log(`
${colors.bright}Database Setup Script${colors.reset}

${colors.cyan}Usage:${colors.reset} npx tsx scripts/setup-db.ts [options]

${colors.cyan}Options:${colors.reset}
  -r, --reset         Drop and recreate the schema
  -c, --check         Check if schema exists without modifying
  -v, --verbose       Show detailed output
  --show-config       Display current database configuration
  --dry-run           Show what would be done without executing
  -h, --help          Show this help message

${colors.cyan}NPM Scripts:${colors.reset}
  npm run db:setup    Setup database schema
  npm run db:reset    Reset database schema  
  npm run db:check    Check if schema exists

${colors.cyan}Examples:${colors.reset}
  npx tsx scripts/setup-db.ts          # Setup database
  npx tsx scripts/setup-db.ts -r       # Reset database
  npx tsx scripts/setup-db.ts -c -v    # Check with verbose output
  npx tsx scripts/setup-db.ts --dry-run # Preview changes
`)
  process.exit(0)
}

// Show configuration
if (args['show-config']) {
  log.info('Database Configuration:')
  console.log(`  URL: ${process.env.TURSO_DATABASE_URL ? '✓ Set' : '✗ Not set'}`)
  console.log(`  Auth Token: ${process.env.TURSO_AUTH_TOKEN ? '✓ Set' : '✗ Not set'}`)

  if (args.verbose && process.env.TURSO_DATABASE_URL) {
    const url = new globalThis.URL(process.env.TURSO_DATABASE_URL)
    console.log(`  Host: ${url.hostname}`)
    console.log(`  Protocol: ${url.protocol}`)
  }

  process.exit(0)
}

// Validate environment
function validateEnvironment(): void {
  const missing: string[] = []

  if (!process.env.TURSO_DATABASE_URL) missing.push('TURSO_DATABASE_URL')
  if (!process.env.TURSO_AUTH_TOKEN) missing.push('TURSO_AUTH_TOKEN')

  if (missing.length > 0) {
    log.error('Missing required environment variables:')
    missing.forEach(v => console.error(`    • ${v}`))
    console.log('')
    log.info('Add these to your .env file or set them as environment variables')
    log.info('Example .env file:')
    console.log(`
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
`)
    process.exit(1)
  }
}

// Load schema from file (currently unused but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function loadSchemaFromFile(): string {
  const schemaPath = join(process.cwd(), 'db', 'schema.sql')

  if (!existsSync(schemaPath)) {
    log.warning(`Schema file not found at: ${schemaPath}`)
    log.info('Using embedded schema from schema-setup.ts')
    return ''
  }

  const schema = readFileSync(schemaPath, 'utf-8').trim()

  if (args.verbose) {
    log.debug('Loaded schema from file:')
    console.log(schema)
  }

  return schema
}

// Show execution plan
async function showPlan(): Promise<void> {
  console.log(`\n${colors.bright}Execution Plan:${colors.reset}`)

  if (args.check) {
    console.log('  1. Connect to database')
    console.log('  2. Check if messages table exists')
    console.log('  3. Report status')
    return
  }

  const exists = await checkSchemaExists()

  if (args.reset) {
    console.log('  1. Connect to database')
    if (exists) {
      console.log('  2. Drop existing messages table')
      console.log('  3. Create new messages table')
    } else {
      console.log('  2. Create messages table (no existing table to drop)')
    }
    console.log('  4. Verify installation')
  } else {
    console.log('  1. Connect to database')
    if (exists) {
      console.log('  2. Skip creation (table already exists)')
    } else {
      console.log('  2. Create messages table')
      console.log('  3. Verify installation')
    }
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    validateEnvironment()

    // Test connection
    if (args.verbose) {
      log.debug('Testing database connection...')
    }

    // Check mode
    if (args.check) {
      log.info('Checking database schema...')
      const exists = await checkSchemaExists()

      if (exists) {
        log.success('Schema exists: messages table found')

        if (args.verbose) {
          const client = getTursoClient()
          const pragma = await client.execute('PRAGMA table_info(messages)')
          console.log('\nTable structure:')
          pragma.rows.forEach((row: unknown) => {
            const r = row as {
              name: string
              type: string
              notnull: number
              pk: number
              dflt_value: string | null
            }
            const nullable = r.notnull ? 'NOT NULL' : 'NULL'
            const pk = r.pk ? 'PRIMARY KEY' : ''
            const defaultVal = r.dflt_value ? `DEFAULT ${r.dflt_value}` : ''
            console.log(`  • ${r.name} ${r.type} ${nullable} ${pk} ${defaultVal}`.trim())
          })
        }
      } else {
        log.warning('Schema does not exist: messages table not found')
        process.exit(1)
      }

      process.exit(0)
    }

    // Dry run mode
    if (args['dry-run']) {
      await showPlan()
      console.log(`\n${colors.yellow}Dry run mode - no changes made${colors.reset}`)
      process.exit(0)
    }

    // Reset mode
    if (args.reset) {
      log.info('Resetting database schema...')

      if (args.verbose) {
        await showPlan()
      }

      const result = await resetSchema()

      if (result.success) {
        log.success(result.message)
      } else {
        log.error(result.message)
        if (result.error && args.verbose) {
          console.error('Error details:', result.error.message)
        }
        process.exit(1)
      }
    } else {
      // Normal setup mode
      log.info('Setting up database schema...')

      const exists = await checkSchemaExists()

      if (exists) {
        log.info('Schema already exists. Use --reset to recreate it.')
        process.exit(0)
      }

      if (args.verbose) {
        await showPlan()
      }

      const result = await setupDatabaseSchema()

      if (result.success) {
        log.success(result.message)
      } else {
        log.error(result.message)
        if (result.error && args.verbose) {
          console.error('Error details:', result.error.message)
        }
        process.exit(1)
      }
    }

    // Verify installation
    const verified = await checkSchemaExists()

    if (verified) {
      log.success('Verified: messages table exists')

      if (args.verbose) {
        const client = getTursoClient()

        // Show table structure
        const pragma = await client.execute('PRAGMA table_info(messages)')
        console.log('\nTable structure:')
        pragma.rows.forEach((row: unknown) => {
          const r = row as {
            name: string
            type: string
            notnull: number
            pk: number
            dflt_value: string | null
          }
          const nullable = r.notnull ? 'NOT NULL' : 'NULL'
          const pk = r.pk ? 'PRIMARY KEY' : ''
          const defaultVal = r.dflt_value ? `DEFAULT ${r.dflt_value}` : ''
          console.log(`  • ${r.name} ${r.type} ${nullable} ${pk} ${defaultVal}`.trim())
        })

        // Show indexes
        const indexes = await client.execute(
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages'"
        )

        if (indexes.rows.length > 0) {
          console.log('\nIndexes:')
          indexes.rows.forEach((row: unknown) => {
            const r = row as { name: string }
            console.log(`  • ${r.name}`)
          })
        }
      }
    } else {
      log.error('Verification failed: messages table not found')
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    log.error(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)

    if (args.verbose && error instanceof Error) {
      console.error('\nDebug information:')
      console.error('Stack:', error.stack)

      if ('cause' in error && error.cause) {
        console.error('Cause:', error.cause)
      }
    }

    console.log('\nTips:')
    console.log('  • Check your database connection settings')
    console.log('  • Ensure the database is accessible')
    console.log('  • Run with --verbose for more details')
    console.log('  • Try --show-config to verify environment')

    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main }
