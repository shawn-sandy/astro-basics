#!/usr/bin/env node --env-file=.env

import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { parseArgs } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    reset: { type: 'boolean', short: 'r', default: false },
    check: { type: 'boolean', short: 'c', default: false },
    verbose: { type: 'boolean', short: 'v', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
  allowPositionals: true,
})

if (args.help) {
  console.log(`
📚 Database Setup Script

Usage: node scripts/setup-db.js [options]

Options:
  -r, --reset    Drop and recreate the schema
  -c, --check    Check if schema exists without modifying
  -v, --verbose  Show detailed output
  -h, --help     Show this help message

Examples:
  npm run db:setup          # Setup database schema
  npm run db:setup -- -r    # Reset database schema
  npm run db:setup -- -c    # Check if schema exists
`)
  process.exit(0)
}

// Validate environment variables
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('\n❌ Missing required environment variables:\n')
  if (!TURSO_DATABASE_URL) console.error('   • TURSO_DATABASE_URL')
  if (!TURSO_AUTH_TOKEN) console.error('   • TURSO_AUTH_TOKEN')
  console.error('\n💡 Tip: Add these to your .env file or set them as environment variables\n')
  process.exit(1)
}

// Create database client with retry logic
function createClientWithRetry(retries = 3) {
  try {
    return createClient({
      url: TURSO_DATABASE_URL,
      authToken: TURSO_AUTH_TOKEN,
      intMode: 'number',
    })
  } catch (error) {
    if (retries > 0) {
      console.log(`⏳ Retrying connection... (${retries} attempts left)`)
      return createClientWithRetry(retries - 1)
    }
    throw error
  }
}

const client = createClientWithRetry()

// Load and validate schema SQL
function loadSchema() {
  const schemaPath = join(__dirname, '..', 'db', 'schema.sql')

  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`)
  }

  const schemaContent = readFileSync(schemaPath, 'utf-8')
  const schema = schemaContent.trim()

  if (!schema) {
    throw new Error('Schema file is empty')
  }

  return schema
}

// Check if schema exists
async function checkSchema() {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
  )
  return result.rows.length > 0
}

// Drop existing schema
async function dropSchema() {
  console.log('🗑️  Dropping existing schema...')
  await client.execute('DROP TABLE IF EXISTS messages')
  console.log('✅ Schema dropped successfully')
}

// Setup database schema
async function setupSchema() {
  const schema = loadSchema()

  if (args.verbose) {
    console.log('📝 Executing SQL:\n', schema)
  }

  const result = await client.execute(schema)

  if (args.verbose) {
    console.log('   Rows affected:', result.rowsAffected)
  }

  return result
}

// Main execution
async function main() {
  try {
    // Check mode
    if (args.check) {
      console.log('🔍 Checking database schema...')
      const exists = await checkSchema()

      if (exists) {
        console.log('✅ Schema exists: messages table found')
      } else {
        console.log('⚠️  Schema does not exist: messages table not found')
      }

      process.exit(exists ? 0 : 1)
    }

    // Reset mode
    if (args.reset) {
      console.log('🔄 Resetting database schema...')

      const exists = await checkSchema()
      if (exists) {
        await dropSchema()
      }
    } else {
      console.log('🔄 Setting up database schema...')
    }

    // Check if schema already exists
    const alreadyExists = await checkSchema()

    if (alreadyExists && !args.reset) {
      console.log('ℹ️  Schema already exists. Use --reset to recreate it.')
      process.exit(0)
    }

    // Setup schema
    await setupSchema()
    console.log('✅ Database schema installed successfully!')

    // Verify installation
    const verified = await checkSchema()

    if (verified) {
      console.log('✅ Verified: messages table exists')

      if (args.verbose) {
        // Show table structure
        const pragma = await client.execute('PRAGMA table_info(messages)')
        console.log('\n📊 Table structure:')
        pragma.rows.forEach(row => {
          console.log(
            `   • ${row.name} (${row.type})${row.notnull ? ' NOT NULL' : ''}${row.pk ? ' PRIMARY KEY' : ''}`
          )
        })
      }
    } else {
      console.error('⚠️  Warning: messages table not found after creation')
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Failed:', error.message)

    if (args.verbose && error.cause) {
      console.error('\n🔍 Debug info:')
      console.error('   Cause:', error.cause.message || error.cause)
      console.error('   Stack:', error.stack)
    }

    console.error('\n💡 Tips:')
    console.error('   • Check your database connection settings')
    console.error('   • Ensure the database is accessible')
    console.error('   • Run with --verbose for more details')

    process.exit(1)
  } finally {
    // Ensure client is closed
    if (client && typeof client.close === 'function') {
      await client.close().catch(() => {})
    }
  }
}

main()
