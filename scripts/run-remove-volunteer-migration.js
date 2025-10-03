#!/usr/bin/env node

/**
 * Remove 'member' from user_role ENUM
 * Displays migration SQL for manual execution
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

async function displayMigration() {
  log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  log(colors.bright + colors.cyan + 'Remove Volunteer Role Migration' + colors.reset)
  log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ Missing required environment variables', colors.red)
    log('\nRequired:', colors.yellow)
    log('  - SUPABASE_URL', colors.yellow)
    log('  - SUPABASE_SERVICE_ROLE_KEY\n', colors.yellow)
    process.exit(1)
  }

  log('✓ Environment variables found', colors.green)

  // Read migration file
  const migrationPath = join(__dirname, 'migrations', '005_replace_volunteer_with_member.sql')

  try {
    const sql = readFileSync(migrationPath, 'utf8')
    log('\n✓ Migration file loaded', colors.green)

    log('\n' + colors.bright + '📋 Manual Execution Required' + colors.reset)
    log('='.repeat(60), colors.cyan)

    log('\nThis migration will:', colors.bright)
    log('  1. Update all users with "member" role to "member"', colors.blue)
    log('  2. Remove "member" from the user_role ENUM', colors.blue)
    log('  3. Only allow: member, coordinator, admin, super_admin\n', colors.blue)

    log(colors.yellow + 'Please run this migration manually in Supabase Dashboard:' + colors.reset)
    log('1. Go to: Supabase Dashboard → SQL Editor', colors.blue)
    log('2. Copy the SQL below', colors.blue)
    log('3. Paste and execute in SQL Editor\n', colors.blue)

    log(colors.cyan + '─'.repeat(60) + colors.reset)
    log(sql)
    log(colors.cyan + '─'.repeat(60) + colors.reset + '\n')

    log(colors.bright + 'Why manual execution?' + colors.reset)
    log('  • ENUM alterations require DDL privileges', colors.yellow)
    log('  • PostgreSQL requires recreating ENUMs to remove values', colors.yellow)
    log('  • Direct SQL Editor access ensures proper execution\n', colors.yellow)

    log(colors.green + '✓ After running the migration:' + colors.reset)
    log(colors.cyan + '  node scripts/check-role-enum.js' + colors.reset)
    log(colors.blue + '  (Should show: member, coordinator, admin, super_admin)\n' + colors.reset)
  } catch (err) {
    log('\n❌ Error reading migration file', colors.red)
    log(`Error: ${err.message}\n`, colors.red)
    process.exit(1)
  }
}

displayMigration()
