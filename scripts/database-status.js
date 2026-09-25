#!/usr/bin/env node

/**
 * Database Status Checker
 * Shows whether the Supabase connection is configured
 */

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

log.header('Supabase Configuration')

/**
 * Reads an env var, treating an unreplaced `YOUR_...` placeholder from .env.example
 * as not set, as src/utils/env-config.ts does. Format is not checked here.
 */
const envValue = key => (process.env[key]?.startsWith('YOUR_') ? undefined : process.env[key])

const supabaseUrl = envValue('SUPABASE_URL')
const supabaseAnonKey = envValue('SUPABASE_ANON_KEY')
const supabaseServiceKey = envValue('SUPABASE_SERVICE_ROLE_KEY')
const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)
const supabaseFullyConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceKey)

console.log(
  `   SUPABASE_URL: ${supabaseUrl ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `   SUPABASE_ANON_KEY: ${supabaseAnonKey ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
)
console.log(
  `   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? colors.green + '✓ Set' + colors.reset : colors.yellow + '⚠ Not set' + colors.reset}`
)
console.log(
  `   Status: ${supabaseFullyConfigured ? colors.green + '✓ Fully configured' + colors.reset : supabaseConfigured ? colors.yellow + '⚠ Partially configured' + colors.reset : colors.red + '✗ Not configured' + colors.reset}`
)

console.log()

// Next steps
log.header('Next Steps')

if (!supabaseConfigured) {
  log.error('Configure Supabase (SUPABASE_URL, SUPABASE_ANON_KEY)')
  console.log(`   Run: ${colors.cyan}npm run db:wizard${colors.reset}, or see .env.example`)
} else if (!supabaseServiceKey) {
  log.warning('Set SUPABASE_SERVICE_ROLE_KEY for server-side operations (webhooks, user sync)')
} else {
  log.success('Supabase is ready')
}

console.log()
console.log(`${colors.bright}Status check completed${colors.reset}`)
