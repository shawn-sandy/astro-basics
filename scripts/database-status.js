#!/usr/bin/env node

/**
 * Database Status Checker
 * Shows current database configuration and switching status
 */

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
const requiredFiles = [
  'database-types.ts',
  'database.ts',
  'turso.ts',
  'supabase.ts',
  'supabase-native.ts',
]

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

// Turso configuration
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN
const tursoConfigured = !!(tursoUrl && tursoToken)

console.log(`   ${colors.cyan}Turso Configuration:${colors.reset}`)
console.log(
  `     DATABASE_URL: ${tursoUrl ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `     AUTH_TOKEN: ${tursoToken ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `     Status: ${tursoConfigured ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not configured' + colors.reset}`
)

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)
const supabaseFullyConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceKey)

console.log(`\n   ${colors.cyan}Supabase Configuration:${colors.reset}`)
console.log(
  `     SUPABASE_URL: ${supabaseUrl ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `     SUPABASE_ANON_KEY: ${supabaseAnonKey ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `     SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? colors.green + '✓ Set' + colors.reset : colors.yellow + '⚠ Not set' + colors.reset}`
)
console.log(
  `     Status: ${supabaseFullyConfigured ? colors.green + '✓ Fully configured' + colors.reset : supabaseConfigured ? colors.yellow + '⚠ Partially configured' + colors.reset : colors.red + '✗ Not configured' + colors.reset}`
)

console.log()

// Provider selection logic
log.header('3. Database Provider Selection')

const explicitProvider = process.env.DATABASE_PROVIDER
console.log(
  `   Explicit Provider (DATABASE_PROVIDER): ${explicitProvider ? colors.green + explicitProvider + colors.reset : colors.yellow + 'none (auto-detect)' + colors.reset}`
)

// Determine what would be used
let selectedProvider = null
let selectionReason = ''

if (explicitProvider && (explicitProvider === 'turso' || explicitProvider === 'supabase')) {
  if (explicitProvider === 'turso' && tursoConfigured) {
    selectedProvider = 'turso'
    selectionReason = 'explicit choice (configured)'
  } else if (explicitProvider === 'supabase' && supabaseConfigured) {
    selectedProvider = 'supabase'
    selectionReason = 'explicit choice (configured)'
  } else {
    selectedProvider = null
    selectionReason = `explicit choice (${explicitProvider}) but not configured`
  }
} else if (supabaseConfigured) {
  selectedProvider = 'supabase'
  selectionReason = 'auto-detected (priority)'
} else if (tursoConfigured) {
  selectedProvider = 'turso'
  selectionReason = 'auto-detected (fallback)'
} else {
  selectedProvider = null
  selectionReason = 'no databases configured'
}

console.log(
  `   Selected Provider: ${selectedProvider ? colors.green + selectedProvider + colors.reset : colors.red + 'none' + colors.reset}`
)
console.log(`   Selection Reason: ${selectionReason}`)

console.log()

// Switching recommendations
log.header('4. Switching Options')

if (tursoConfigured && supabaseConfigured) {
  log.success('Both databases configured - switching available')
  console.log(`   To use Turso: ${colors.cyan}DATABASE_PROVIDER=turso${colors.reset}`)
  console.log(`   To use Supabase: ${colors.cyan}DATABASE_PROVIDER=supabase${colors.reset}`)
  console.log(`   To auto-detect: ${colors.cyan}unset DATABASE_PROVIDER${colors.reset}`)
} else if (tursoConfigured) {
  log.warning('Only Turso configured')
  console.log(`   Configure Supabase to enable switching`)
} else if (supabaseConfigured) {
  log.warning('Only Supabase configured')
  console.log(`   Configure Turso to enable switching`)
} else {
  log.error('No databases configured')
  console.log(`   Configure at least one database to proceed`)
}

console.log()

// Next steps
log.header('5. Next Steps')

if (!allFilesExist) {
  log.error('Fix missing abstraction layer files first')
} else if (!selectedProvider) {
  log.error('Configure at least one database (Turso or Supabase)')
  console.log(`   See: .env.example for configuration template`)
} else if (selectedProvider && tursoConfigured && supabaseConfigured) {
  log.success('Ready for database switching!')
  console.log(`   Current: ${selectedProvider}`)
  console.log(`   Available: turso, supabase`)
  console.log(`   Run: ${colors.cyan}npm run db:switch${colors.reset} to switch databases`)
} else {
  log.info('Single database setup - switching not available')
  console.log(`   Configure additional database for switching capability`)
}

console.log()
console.log(`${colors.bright}Status check completed${colors.reset}`)
