#!/usr/bin/env node --env-file=.env

import { createClient } from '@libsql/client'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { parseArgs } from 'util'

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    up: { type: 'boolean', default: false },
    down: { type: 'boolean', default: false },
    status: { type: 'boolean', short: 's', default: false },
    create: { type: 'string', short: 'c' },
    verbose: { type: 'boolean', short: 'v', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
  allowPositionals: true,
})

if (args.help) {
  console.log(`
📦 Database Migration Tool

Usage: node scripts/migrate.js [options] [migration-name]

Options:
  --up              Run pending migrations (default)
  --down            Rollback last migration
  --status, -s      Show migration status
  --create, -c      Create a new migration with given name
  --verbose, -v     Show detailed output
  --help, -h        Show this help message

Examples:
  npm run db:migrate                    # Run pending migrations
  npm run db:migrate:status             # Show migration status
  npm run db:migrate:create add-users   # Create new migration
  npm run db:migrate:rollback           # Rollback last migration
`)
  process.exit(0)
}

// Validate environment
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('❌ Missing required environment variables:')
  if (!TURSO_DATABASE_URL) console.error('   • TURSO_DATABASE_URL')
  if (!TURSO_AUTH_TOKEN) console.error('   • TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
})

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations')
const MIGRATIONS_TABLE = '_migrations'

// Ensure migrations directory exists
if (!existsSync(MIGRATIONS_DIR)) {
  console.log('📁 Creating migrations directory...')
  import('fs').then(fs => fs.mkdirSync(MIGRATIONS_DIR, { recursive: true }))
}

// Create migrations table if it doesn't exist
async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

// Get list of applied migrations
async function getAppliedMigrations() {
  const result = await client.execute(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`)
  return result.rows.map(row => row.name)
}

// Get list of migration files
function getMigrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) {
    return []
  }

  return readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.up.sql'))
    .map(file => file.replace('.up.sql', ''))
    .sort()
}

// Create a new migration
async function createMigration(name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const migrationName = `${timestamp}_${name.replace(/[^a-z0-9_-]/gi, '_')}`

  const upFile = join(MIGRATIONS_DIR, `${migrationName}.up.sql`)
  const downFile = join(MIGRATIONS_DIR, `${migrationName}.down.sql`)

  const upTemplate = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your UP migration SQL here
`

  const downTemplate = `-- Rollback: ${name}
-- Created: ${new Date().toISOString()}

-- Add your DOWN migration SQL here
`

  import('fs').then(fs => {
    fs.writeFileSync(upFile, upTemplate)
    fs.writeFileSync(downFile, downTemplate)
  })

  console.log('✅ Created migration files:')
  console.log(`   • ${upFile}`)
  console.log(`   • ${downFile}`)
}

// Run a migration
async function runMigration(name) {
  const upFile = join(MIGRATIONS_DIR, `${name}.up.sql`)

  if (!existsSync(upFile)) {
    throw new Error(`Migration file not found: ${upFile}`)
  }

  const sql = readFileSync(upFile, 'utf-8')

  if (args.verbose) {
    console.log(`📝 Executing migration: ${name}`)
    console.log(sql)
  }

  // Execute migration in a transaction
  await client.batch([
    sql,
    {
      sql: `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
      args: [name],
    },
  ])

  console.log(`✅ Applied migration: ${name}`)
}

// Rollback a migration
async function rollbackMigration(name) {
  const downFile = join(MIGRATIONS_DIR, `${name}.down.sql`)

  if (!existsSync(downFile)) {
    console.warn(`⚠️  No rollback file found: ${downFile}`)
    return
  }

  const sql = readFileSync(downFile, 'utf-8')

  if (args.verbose) {
    console.log(`📝 Rolling back migration: ${name}`)
    console.log(sql)
  }

  // Execute rollback in a transaction
  await client.batch([
    sql,
    {
      sql: `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?`,
      args: [name],
    },
  ])

  console.log(`✅ Rolled back migration: ${name}`)
}

// Show migration status
async function showStatus() {
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()

  console.log('\n📊 Migration Status:\n')

  if (files.length === 0) {
    console.log('   No migration files found')
    return
  }

  files.forEach(file => {
    const status = applied.includes(file) ? '✅' : '⏳'
    const label = applied.includes(file) ? 'Applied' : 'Pending'
    console.log(`   ${status} ${file} (${label})`)
  })

  const pending = files.filter(f => !applied.includes(f))
  console.log(`\n   Total: ${files.length} migrations`)
  console.log(`   Applied: ${applied.length}`)
  console.log(`   Pending: ${pending.length}`)
}

// Main execution
async function main() {
  try {
    await ensureMigrationsTable()

    // Create migration
    if (args.create) {
      await createMigration(args.create)
      process.exit(0)
    }

    // Show status
    if (args.status) {
      await showStatus()
      process.exit(0)
    }

    // Rollback migration
    if (args.down) {
      const applied = await getAppliedMigrations()

      if (applied.length === 0) {
        console.log('ℹ️  No migrations to rollback')
        process.exit(0)
      }

      const lastMigration = applied[applied.length - 1]
      await rollbackMigration(lastMigration)
      process.exit(0)
    }

    // Run pending migrations (default)
    const applied = await getAppliedMigrations()
    const files = getMigrationFiles()
    const pending = files.filter(f => !applied.includes(f))

    if (pending.length === 0) {
      console.log('✅ All migrations are up to date')
      process.exit(0)
    }

    console.log(`🔄 Running ${pending.length} pending migration(s)...`)

    for (const migration of pending) {
      await runMigration(migration)
    }

    console.log('✅ All migrations completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (args.verbose && error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  }
}

main()
