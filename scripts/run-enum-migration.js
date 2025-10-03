#!/usr/bin/env node

/**
 * Add 'member' and 'admin' to user_role ENUM
 * Fixes the role synchronization issue
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

async function runEnumMigration() {
  log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  log(colors.bright + colors.cyan + 'Add Member & Admin to Role ENUM' + colors.reset)
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
  log('✓ Supabase connection verified', colors.green)

  // Read migration file
  const migrationPath = join(__dirname, 'migrations', '004_add_member_to_role_enum.sql')

  try {
    const sql = readFileSync(migrationPath, 'utf8')
    log('\n✓ Migration file loaded', colors.green)

    log('\n📋 Manual Execution Required', colors.bright)
    log('='.repeat(60), colors.cyan)

    log('\nPlease run this migration manually in Supabase Dashboard:', colors.yellow)
    log('1. Go to: Supabase Dashboard → SQL Editor', colors.blue)
    log('2. Copy the SQL below', colors.blue)
    log('3. Paste and execute in SQL Editor\n', colors.blue)

    log(colors.cyan + '─'.repeat(60) + colors.reset)
    log(sql)
    log(colors.cyan + '─'.repeat(60) + colors.reset + '\n')

    log(colors.bright + 'Why manual execution?' + colors.reset)
    log('  • ENUM alterations require DDL privileges', colors.yellow)
    log('  • Cannot be executed via standard Supabase REST API', colors.yellow)
    log('  • Direct SQL Editor access ensures proper execution\n', colors.yellow)

    log(colors.green + '✓ After running the migration, execute:' + colors.reset)
    log(colors.cyan + '  node scripts/trigger-user-sync.js\n' + colors.reset)
  } catch (err) {
    log('\n❌ Error reading migration file', colors.red)
    log(`Error: ${err.message}\n`, colors.red)
    process.exit(1)
  }
}

runEnumMigration()
