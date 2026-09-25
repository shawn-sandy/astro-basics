#!/usr/bin/env -S node --import tsx

/**
 * Schema Validation Tool
 * Reads the Supabase `messages` table through the database abstraction layer and checks
 * it against the shape the application expects.
 *
 * Run it through the `tsx` loader (`npm run db:schema`), which lets this script import
 * the TypeScript abstraction layer.
 */

import { parseArgs } from 'util'

import { getDatabase } from '#libs/database'

import { envValue } from './lib/env-file.js'

// Color utilities
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
  info: msg => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: msg => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: msg => console.error(`${colors.red}✗${colors.reset}  ${msg}`),
  header: msg => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
}

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    'check-only': { type: 'boolean' },
    fix: { type: 'boolean' },
    verbose: { type: 'boolean', short: 'v' },
  },
  strict: false,
  allowPositionals: true,
})

// Show help
if (args.help) {
  console.log(`
${colors.bright}Database Schema Validator${colors.reset}

${colors.cyan}Usage:${colors.reset} npm run db:schema -- [options]
        node --import tsx --env-file=.env scripts/schema-validator.js [options]

${colors.cyan}Options:${colors.reset}
  --check-only            Only validate schemas, don't suggest fixes
  --fix                   Attempt to fix schema inconsistencies
  -v, --verbose           Show detailed schema information
  -h, --help              Show this help message

${colors.cyan}Description:${colors.reset}
Reads the messages table through the database abstraction layer and checks it against
the shape the application expects.

${colors.cyan}Validation Checks:${colors.reset}
  • Supabase credentials are set (URL, anon key, service role key)
  • The messages table exists and those credentials can read it
  • A returned row carries the NOT NULL columns the application reads

${colors.cyan}Not Checked:${colors.reset}
  • Column types, defaults, constraints and indexes
  • The nullable columns, which read as NULL whether or not they exist
  • Any table other than messages
  Compare those against scripts/migrations/006_messages.sql.

${colors.cyan}Examples:${colors.reset}
  npm run db:schema                # Check the messages table
  npm run db:schema -- --verbose    # Also print the expected schema
`)
  process.exit(0)
}

/**
 * Expected schema for the messages table, as created by
 * scripts/migrations/006_messages.sql. That file is the source of truth; this mirror is
 * what the check reports and what --verbose prints.
 */
const EXPECTED_SCHEMA = {
  messages: {
    columns: {
      id: { type: 'BIGINT', nullable: false, primaryKey: true },
      user_id: { type: 'UUID', nullable: true },
      clerk_user_id: { type: 'TEXT', nullable: true },
      name: { type: 'TEXT', nullable: false },
      email: { type: 'TEXT', nullable: false },
      subject: { type: 'TEXT', nullable: true },
      message: { type: 'TEXT', nullable: false },
      is_read: { type: 'BOOLEAN', nullable: false, default: false },
      is_archived: { type: 'BOOLEAN', nullable: false, default: false },
      ip_address: { type: 'TEXT', nullable: true },
      user_agent: { type: 'TEXT', nullable: true },
      created_at: { type: 'TIMESTAMPTZ', nullable: false },
      updated_at: { type: 'TIMESTAMPTZ', nullable: false },
    },
    indexes: [
      'idx_messages_created_at',
      'idx_messages_is_read',
      'idx_messages_is_archived',
      'idx_messages_user_id',
    ],
  },
}

/**
 * NOT NULL columns the application reads off every message. A column the table is missing
 * comes back undefined here, which is what makes the check below work.
 *
 * The nullable columns (subject, ip_address, user_agent) cannot be checked this way: the
 * abstraction layer maps a missing one and a NULL one to the same `null`. `user_id` and
 * `clerk_user_id` are not checked either, since it does not expose them at all.
 */
const REQUIRED_MESSAGE_COLUMNS = [
  'id',
  'name',
  'email',
  'message',
  'is_read',
  'is_archived',
  'created_at',
  'updated_at',
]

/**
 * Query the messages table through the abstraction layer and check the row it returns.
 *
 * A bounded read is the only check available from the client: it proves the table exists
 * and that the credentials can read it. Column types, defaults and indexes are not
 * inspected, which the output says.
 *
 * @returns {Promise<{ok: boolean, columnsChecked: boolean}>} whether the read succeeded,
 *   and whether a row was available to check the columns against
 */
async function validateSupabaseSchema() {
  log.info('Validating SUPABASE schema...')

  let messages
  try {
    messages = await getDatabase().getMessages({ limit: 1 })
  } catch (error) {
    log.error(`Could not read the messages table: ${error.message}`)
    log.info('If the table does not exist, apply scripts/migrations/006_messages.sql')
    log.info('If the credentials were rejected, re-run: npm run db:wizard')
    if (args.verbose) {
      console.error(error.stack)
    }
    return { ok: false, columnsChecked: false }
  }

  log.success('messages table exists and is readable')

  const sample = messages[0]
  if (sample) {
    const missing = REQUIRED_MESSAGE_COLUMNS.filter(column => sample[column] === undefined)

    if (missing.length > 0) {
      log.error(`Row is missing expected columns: ${missing.join(', ')}`)
      log.info('Compare your table against scripts/migrations/006_messages.sql')
      return { ok: false, columnsChecked: true }
    }

    log.success(`Row carries all ${REQUIRED_MESSAGE_COLUMNS.length} NOT NULL columns the app reads`)
  } else {
    log.warning('Table is empty, so its columns were not checked')
    log.info('Run: npm run db:seed:messages to insert sample rows, then re-run this check')
  }

  if (args.verbose) {
    console.log('  Expected schema (scripts/migrations/006_messages.sql):')
    Object.keys(EXPECTED_SCHEMA).forEach(table => {
      console.log(`    ${table}`)
      Object.keys(EXPECTED_SCHEMA[table].columns).forEach(column => {
        const col = EXPECTED_SCHEMA[table].columns[column]
        console.log(`      - ${column}: ${col.type}${col.nullable ? '' : ' NOT NULL'}`)
      })
      console.log(`      indexes: ${EXPECTED_SCHEMA[table].indexes.join(', ')}`)
    })
  }

  log.info('Column types, defaults and indexes are not inspected by this check')
  return { ok: true, columnsChecked: !!sample }
}

/**
 * Generate migration scripts
 */
async function generateMigrations() {
  log.header('Migration Generation')

  if (args['check-only']) {
    log.info('Check-only mode - no migrations will be generated')
    return
  }

  log.info('Migration generation not yet implemented')
  log.info('This feature would:')
  console.log('  • Detect schema differences against the expected schema')
  console.log('  • Generate SQL migration scripts')
  console.log('  • Provide safe migration procedures')
  console.log('  • Create rollback scripts')

  if (args.fix) {
    log.warning('--fix option not yet implemented')
    log.info('Future implementation will apply necessary schema fixes')
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log(`${colors.bright}Database Schema Validator${colors.reset}\n`)

  // The same three keys getDatabase() requires: every query uses the service role client.
  const missingKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    key => !envValue(key)
  )
  const supabaseConfigured = missingKeys.length === 0

  log.header('Configuration Status')
  console.log(
    `  Supabase: ${supabaseConfigured ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not configured' + colors.reset}`
  )
  if (!supabaseConfigured) {
    console.log(`  Missing: ${missingKeys.join(', ')}`)
  }
  console.log()

  const result = supabaseConfigured
    ? await validateSupabaseSchema()
    : { ok: false, columnsChecked: false }

  console.log()

  // Generate migrations if needed
  await generateMigrations()

  // Summary
  log.header('Validation Summary')

  if (result.ok && result.columnsChecked) {
    log.success('The messages table matches what the application reads')
  } else if (result.ok) {
    log.success('The messages table is readable, but it is empty')
    console.log('  Its columns were not checked, so the schema is unconfirmed')
  } else if (!supabaseConfigured) {
    log.error('Supabase is not configured')
    console.log(`  Run: ${colors.green}npm run db:wizard${colors.reset} to configure Supabase`)
    process.exitCode = 1
  } else {
    log.warning('Some schema validations failed')
    console.log(`  Use ${colors.green}--verbose${colors.reset} for detailed information`)
    if (args.fix) {
      log.info('--fix option would attempt to resolve issues')
    }
    process.exitCode = 1
  }

  console.log()
}

// Run the validator
main().catch(error => {
  log.error(`Schema validation failed: ${error.message}`)
  console.error(error.stack)
  process.exit(1)
})
