#!/usr/bin/env node

/**
 * Database Setup Wizard
 * Interactive setup for non-developers to configure database connections
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseArgs } from 'util'
import { createInterface } from 'readline'
import { readEnvFile, updateEnvFile } from './lib/env-file.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const envPath = join(projectRoot, '.env')
const _envExamplePath = join(projectRoot, '.env.example')

// Color utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

const log = {
  info: msg => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: msg => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: msg => console.error(`${colors.red}✗${colors.reset}  ${msg}`),
  header: msg => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  step: msg => console.log(`${colors.magenta}▶${colors.reset}  ${msg}`),
}

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Promisify readline question
const question = prompt =>
  new Promise(resolve => {
    rl.question(prompt, resolve)
  })

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    'check-only': { type: 'boolean' },
    reset: { type: 'boolean' },
  },
  strict: false,
  allowPositionals: true,
})

// Show help
if (args.help) {
  console.log(`
${colors.bright}Database Setup Wizard${colors.reset}

${colors.cyan}Usage:${colors.reset} node scripts/setup-wizard.js [options]

${colors.cyan}Options:${colors.reset}
  --check-only            Only check current configuration, don't modify
  --reset                 Reset configuration and start fresh setup
  -h, --help              Show this help message

${colors.cyan}Description:${colors.reset}
Interactive wizard to help configure the Supabase database connection for
non-developers.

${colors.cyan}Examples:${colors.reset}
  node scripts/setup-wizard.js           # Run interactive setup
  node scripts/setup-wizard.js --check-only  # Check current config
  node scripts/setup-wizard.js --reset   # Reset and reconfigure
`)
  process.exit(0)
}

/**
 * Read current .env file and parse variables
 */
function readCurrentEnv() {
  try {
    return readEnvFile(envPath)
  } catch (error) {
    log.error(`Failed to read .env file: ${error.message}`)
    return {}
  }
}

/**
 * Write environment variables to .env file
 */
function writeEnvFile(envVars) {
  try {
    updateEnvFile(envPath, envVars)
    return true
  } catch (error) {
    log.error(`Failed to write .env file: ${error.message}`)
    return false
  }
}

/**
 * Anon key formats Supabase issues: legacy JWTs (`eyJ...`) and the newer publishable keys.
 */
const isAnonKeyFormat = key => key.startsWith('eyJ') || key.startsWith('sb_publishable_')

/**
 * Test database connection
 */
async function testConnection(config) {
  log.info('Testing supabase connection...')

  try {
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      log.error('Missing required Supabase configuration')
      return false
    }

    if (!config.SUPABASE_URL.startsWith('https://')) {
      log.error('Supabase URL should start with "https://"')
      return false
    }

    if (!isAnonKeyFormat(config.SUPABASE_ANON_KEY)) {
      log.error('Supabase anonymous key format appears invalid')
      return false
    }

    log.success('Supabase configuration looks valid')
    return true
  } catch (error) {
    log.error(`Connection test failed: ${error.message}`)
    return false
  }
}

/**
 * Check current configuration status
 */
function checkCurrentStatus() {
  const envVars = readCurrentEnv()

  log.header('Current Database Configuration Status')
  console.log()

  // Check Supabase configuration
  const supabaseBasicConfigured = !!(envVars.SUPABASE_URL && envVars.SUPABASE_ANON_KEY)
  const supabaseFullyConfigured = !!(
    envVars.SUPABASE_URL &&
    envVars.SUPABASE_ANON_KEY &&
    envVars.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log(`${colors.cyan}Supabase:${colors.reset}`)
  console.log(
    `  Project URL: ${envVars.SUPABASE_URL ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
  )
  console.log(
    `  Anonymous Key: ${envVars.SUPABASE_ANON_KEY ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
  )
  console.log(
    `  Service Role Key: ${envVars.SUPABASE_SERVICE_ROLE_KEY ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not set (required)' + colors.reset}`
  )
  console.log(
    `  Status: ${supabaseFullyConfigured ? colors.green + '✓ Fully Ready' + colors.reset : supabaseBasicConfigured ? colors.yellow + 'Basic Setup' + colors.reset : colors.red + 'Not Configured' + colors.reset}`
  )
  console.log()

  const activeProvider = supabaseFullyConfigured ? 'supabase' : 'none'
  console.log(
    `${colors.cyan}Active Provider:${colors.reset} ${activeProvider !== 'none' ? colors.green + activeProvider + colors.reset : colors.red + 'None' + colors.reset}`
  )
  console.log()

  return {
    supabaseBasicConfigured,
    supabaseFullyConfigured,
    activeProvider,
  }
}

/**
 * Interactive database setup
 */
async function runSetup() {
  console.log(`${colors.bright}Welcome to the Database Setup Wizard!${colors.reset}\n`)
  log.info('This wizard will help you configure your database connection.\n')

  const envVars = readCurrentEnv()

  // Step 1: Configure Supabase
  log.step('Step 1: Configure Supabase')
  log.info('To get your Supabase credentials:')
  console.log('  1. Sign up at https://supabase.com')
  console.log('  2. Create a new project')
  console.log('  3. Go to Settings > API')
  console.log('  4. Copy your Project URL and API keys\n')

  const supabaseUrl = await question('Enter your Supabase project URL (starts with https://): ')
  if (!supabaseUrl.startsWith('https://')) {
    log.error('Invalid Supabase URL format. Should start with "https://"')
    return false
  }

  const supabaseAnonKey = await question('Enter your Supabase anonymous key: ')
  if (!isAnonKeyFormat(supabaseAnonKey)) {
    log.error('Invalid anonymous key format. Expected eyJ... or sb_publishable_...')
    return false
  }

  // Every database query runs through the service role client, so this key is required.
  const supabaseServiceKey = await question('Enter your Supabase service role key: ')
  if (!supabaseServiceKey.trim()) {
    log.error('The service role key is required: the app uses it for every database query')
    return false
  }

  envVars.SUPABASE_URL = supabaseUrl.trim()
  envVars.SUPABASE_ANON_KEY = supabaseAnonKey.trim()
  envVars.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceKey.trim()

  // Test connection
  const supabaseTestResult = await testConnection(envVars)
  if (!supabaseTestResult) {
    log.warning('Supabase connection test failed, but configuration saved.')
  }

  // Step 2: Preserve other settings
  if (!envVars.ENABLE_COMMENTS) {
    envVars.ENABLE_COMMENTS = 'true'
  }

  // Step 3: Write configuration
  log.step('Writing configuration to .env file...')
  const writeSuccess = writeEnvFile(envVars)
  if (!writeSuccess) {
    log.error('Failed to write configuration file')
    return false
  }

  log.success('Configuration saved successfully!')
  return true
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`${colors.bright}Database Setup Wizard${colors.reset}\n`)

    if (args['check-only']) {
      checkCurrentStatus()
      return
    }

    if (args.reset) {
      log.warning('Resetting database configuration...')
      if (existsSync(envPath)) {
        // Create backup before reset
        const backupPath = `${envPath}.backup.${Date.now()}`
        writeFileSync(backupPath, readFileSync(envPath))
        log.info(`Backup created: ${backupPath}`)
      }
    }

    // Check current status first
    const currentStatus = checkCurrentStatus()

    if (!args.reset && currentStatus.supabaseBasicConfigured) {
      const reconfigure = await question(
        `${colors.yellow}Database already configured. Reconfigure? (y/N):${colors.reset} `
      )
      if (reconfigure.toLowerCase() !== 'y' && reconfigure.toLowerCase() !== 'yes') {
        log.info('Setup cancelled. Current configuration preserved.')
        return
      }
    }

    // Run interactive setup
    const setupSuccess = await runSetup()

    if (setupSuccess) {
      console.log(`\n${colors.bright}${colors.green}Setup Complete!${colors.reset}\n`)
      log.success('Database configuration completed successfully')
      console.log(`\n${colors.cyan}Next steps:${colors.reset}`)
      console.log(`  1. Start your application: ${colors.green}npm run start${colors.reset}`)
      console.log(`  2. Check database status: ${colors.green}npm run db:status${colors.reset}`)

      // Show final status
      console.log('\n' + '─'.repeat(50))
      checkCurrentStatus()
    } else {
      log.error('Setup failed. Please try again.')
      process.exit(1)
    }
  } catch (error) {
    log.error(`Setup wizard failed: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Run the wizard
main()
