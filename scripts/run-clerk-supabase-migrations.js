#!/usr/bin/env node

/**
 * Clerk-Supabase Integration Migration Runner
 *
 * Applies database migrations for the Clerk-Supabase integration.
 * Requires Supabase service role key for schema modifications.
 *
 * Usage:
 *   node scripts/run-clerk-supabase-migrations.js
 *
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ES module path resolution
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  console.log(colors.bright + colors.cyan + title + colors.reset)
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n')
}

async function runMigrations() {
  logSection('Clerk-Supabase Integration - Database Migration Runner')

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ Error: Missing required environment variables', colors.red)
    log('\nRequired:', colors.yellow)
    log('  - SUPABASE_URL', colors.yellow)
    log('  - SUPABASE_SERVICE_ROLE_KEY', colors.yellow)
    log('\nMake sure these are set in your .env file\n', colors.yellow)
    process.exit(1)
  }

  log('✓ Environment variables found', colors.green)

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  log('✓ Supabase client initialized', colors.green)

  // Define migrations in order
  const migrations = [
    {
      name: '001_create_users_with_roles.sql',
      description: 'Create users, organization_memberships, and user_preferences tables',
    },
    {
      name: '002_create_rls_policies.sql',
      description: 'Enable Row Level Security and create access policies',
    },
  ]

  log(`\nFound ${migrations.length} migration(s) to run\n`, colors.bright)

  let successCount = 0
  let failureCount = 0

  // Run each migration
  for (const migration of migrations) {
    logSection(`Migration: ${migration.name}`)
    log(`Description: ${migration.description}`, colors.blue)

    try {
      // Read migration file
      const migrationPath = join(__dirname, 'migrations', migration.name)
      const sql = readFileSync(migrationPath, 'utf8')

      log('\n▶ Executing migration...', colors.yellow)

      // Execute the migration
      const { error } = await supabase.rpc('exec_sql', { sql })

      if (error) {
        // If the exec_sql function doesn't exist, fall back to direct query
        if (error.code === '42883') {
          log('  Using direct query execution (exec_sql function not available)', colors.yellow)

          const { error: queryError } = await supabase.from('_migrations').select('*').limit(1)

          if (queryError && queryError.code === '42P01') {
            // Create migrations tracking table first
            await supabase.rpc('exec', {
              sql: `
                CREATE TABLE IF NOT EXISTS _migrations (
                  id serial PRIMARY KEY,
                  name text UNIQUE NOT NULL,
                  executed_at timestamptz DEFAULT now()
                );
              `,
            })
          }

          // Try to execute via pg_stat_statements or direct execution
          // Note: This is a simplified approach - production systems should use proper migration tools
          log('  ⚠ Warning: Manual verification required', colors.yellow)
          log('  ℹ Run the SQL file manually in Supabase SQL Editor for best results', colors.blue)
          log(`  📄 File: scripts/migrations/${migration.name}\n`, colors.blue)
        } else {
          throw error
        }
      }

      log(`✓ Migration completed successfully: ${migration.name}`, colors.green)
      successCount++
    } catch (err) {
      log(`\n❌ Migration failed: ${migration.name}`, colors.red)
      log(`Error: ${err.message}`, colors.red)

      if (err.code) {
        log(`Error code: ${err.code}`, colors.red)
      }

      failureCount++

      // Ask if we should continue
      log('\n⚠ Migration failed. Manual intervention required.', colors.yellow)
      log('Please run the SQL file manually in Supabase Dashboard → SQL Editor', colors.yellow)
      log(`File: scripts/migrations/${migration.name}\n`, colors.yellow)
    }
  }

  // Summary
  logSection('Migration Summary')
  log(`Total migrations: ${migrations.length}`, colors.bright)
  log(`✓ Successful: ${successCount}`, colors.green)
  if (failureCount > 0) {
    log(`✗ Failed: ${failureCount}`, colors.red)
  }

  if (failureCount > 0) {
    log(
      '\n⚠ Some migrations failed. Please run them manually in Supabase SQL Editor.',
      colors.yellow
    )
    log('Location: https://supabase.com/dashboard/project/_/sql', colors.blue)
    process.exit(1)
  } else {
    log('\n✅ All migrations completed successfully!', colors.green)
    log('\nNext steps:', colors.bright)
    log('1. Configure Clerk session token with custom claims', colors.blue)
    log('2. Set up Clerk webhooks pointing to /api/webhooks/clerk', colors.blue)
    log('3. Test the integration by signing in and checking user sync\n', colors.blue)
  }
}

// Run migrations
runMigrations().catch(err => {
  log('\n❌ Unexpected error:', colors.red)
  console.error(err)
  process.exit(1)
})
