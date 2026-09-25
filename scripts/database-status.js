#!/usr/bin/env node

/**
 * Database Status Checker
 * Shows the current Supabase database configuration
 */

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { envValue } from './lib/env-file.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Color utilities for better output
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

console.log(`${colors.bright}Database Status Report${colors.reset}\n`)

// Check abstraction layer files
log.header('1. Abstraction Layer Status')
const srcDir = join(__dirname, '..', 'src', 'libs')
const requiredFiles = ['database-types.ts', 'database.ts', 'supabase.ts', 'supabase-native.ts']

let allFilesExist = true
for (const file of requiredFiles) {
  const filePath = join(srcDir, file)
  const exists = existsSync(filePath)
  if (exists) {
    log.success(`${file} exists`)
  } else {
    log.error(`${file} missing`)
    allFilesExist = false
  }
}

if (allFilesExist) {
  log.success('All abstraction layer files are present')
} else {
  log.error('Some abstraction layer files are missing')
}

console.log()

// Check environment variables
log.header('2. Database Configuration Status')

// Supabase configuration
const supabaseUrl = envValue('SUPABASE_URL')
const supabaseAnonKey = envValue('SUPABASE_ANON_KEY')
const supabaseServiceKey = envValue('SUPABASE_SERVICE_ROLE_KEY')
const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)
const supabaseFullyConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceKey)

console.log(`   ${colors.cyan}Supabase Configuration:${colors.reset}`)
console.log(
  `     SUPABASE_URL: ${supabaseUrl ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `     SUPABASE_ANON_KEY: ${supabaseAnonKey ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `     SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `     Status: ${supabaseFullyConfigured ? colors.green + '✓ Fully configured' + colors.reset : supabaseConfigured ? colors.yellow + '⚠ Partially configured' + colors.reset : colors.red + '✗ Not configured' + colors.reset}`
)

console.log()

// Provider selection
log.header('3. Database Provider')

// Every database query uses the service role client, so all three keys are needed
const selectedProvider = supabaseFullyConfigured ? 'supabase' : null

console.log(
  `   Selected Provider: ${selectedProvider ? colors.green + selectedProvider + colors.reset : colors.red + 'none' + colors.reset}`
)

console.log()

// Next steps
log.header('4. Next Steps')

if (!allFilesExist) {
  log.error('Fix missing abstraction layer files first')
} else if (!supabaseConfigured) {
  log.error('Configure Supabase (SUPABASE_URL and SUPABASE_ANON_KEY)')
  console.log(`   Run: ${colors.cyan}npm run db:wizard${colors.reset} or see .env.example`)
} else if (!supabaseFullyConfigured) {
  log.error('Set SUPABASE_SERVICE_ROLE_KEY: every database query uses it')
} else {
  log.success('Database is ready')
}

console.log()
console.log(`${colors.bright}Status check completed${colors.reset}`)
