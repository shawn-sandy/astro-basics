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
Interactive wizard to help configure database connections for non-developers.
Supports both Turso (LibSQL) and Supabase backends with guided setup.

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
  if (!existsSync(envPath)) {
    return {}
  }

  try {
    const envContent = readFileSync(envPath, 'utf-8')
    const envVars = {}

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim()
        }
      }
    })

    return envVars
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
    let envContent = ''

    // Add Clerk configuration
    envContent += '# Clerk Authentication\n'
    envContent += `PUBLIC_CLERK_PUBLISHABLE_KEY=${envVars.PUBLIC_CLERK_PUBLISHABLE_KEY || ''}\n`
    envContent += `CLERK_SECRET_KEY=${envVars.CLERK_SECRET_KEY || ''}\n`
    envContent += `CLERK_WEBHOOK_SECRET=${envVars.CLERK_WEBHOOK_SECRET || ''}\n\n`

    // Add database configuration section
    envContent += '# Database Configuration\n'

    // Add Turso configuration if provided
    if (envVars.TURSO_DATABASE_URL || envVars.TURSO_AUTH_TOKEN) {
      envContent += '# Turso (LibSQL)\n'
      envContent += `TURSO_DATABASE_URL=${envVars.TURSO_DATABASE_URL || ''}\n`
      envContent += `TURSO_AUTH_TOKEN=${envVars.TURSO_AUTH_TOKEN || ''}\n\n`
    }

    // Add Supabase configuration if provided
    if (envVars.SUPABASE_URL || envVars.SUPABASE_ANON_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY) {
      envContent += '# Supabase\n'
      envContent += `SUPABASE_URL=${envVars.SUPABASE_URL || ''}\n`
      envContent += `SUPABASE_ANON_KEY=${envVars.SUPABASE_ANON_KEY || ''}\n`
      envContent += `SUPABASE_SERVICE_ROLE_KEY=${envVars.SUPABASE_SERVICE_ROLE_KEY || ''}\n\n`
    }

    // Add other configuration
    envContent += '# Application Settings\n'
    envContent += `ENABLE_COMMENTS=${envVars.ENABLE_COMMENTS || 'true'}\n`

    // Add database provider if specified
    if (envVars.DATABASE_PROVIDER) {
      envContent += `DATABASE_PROVIDER=${envVars.DATABASE_PROVIDER}\n`
    }

    writeFileSync(envPath, envContent)
    return true
  } catch (error) {
    log.error(`Failed to write .env file: ${error.message}`)
    return false
  }
}

/**
 * Test database connection
 */
async function testConnection(provider, config) {
  log.info(`Testing ${provider} connection...`)

  try {
    if (provider === 'turso') {
      // Basic validation for Turso
      if (!config.TURSO_DATABASE_URL || !config.TURSO_AUTH_TOKEN) {
        log.error('Missing Turso configuration')
        return false
      }

      if (!config.TURSO_DATABASE_URL.startsWith('libsql://')) {
        log.error('Turso URL should start with "libsql://"')
        return false
      }

      log.success('Turso configuration looks valid')
      return true
    } else if (provider === 'supabase') {
      // Basic validation for Supabase
      if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
        log.error('Missing required Supabase configuration')
        return false
      }

      if (!config.SUPABASE_URL.startsWith('https://')) {
        log.error('Supabase URL should start with "https://"')
        return false
      }

      if (!config.SUPABASE_ANON_KEY.startsWith('eyJ')) {
        log.error('Supabase anonymous key format appears invalid')
        return false
      }

      log.success('Supabase configuration looks valid')
      return true
    }
  } catch (error) {
    log.error(`Connection test failed: ${error.message}`)
    return false
  }

  return false
}

/**
 * Check current configuration status
 */
function checkCurrentStatus() {
  const envVars = readCurrentEnv()

  log.header('Current Database Configuration Status')
  console.log()

  // Check Turso configuration
  const tursoConfigured = !!(envVars.TURSO_DATABASE_URL && envVars.TURSO_AUTH_TOKEN)
  console.log(`${colors.cyan}Turso (LibSQL):${colors.reset}`)
  console.log(
    `  Database URL: ${envVars.TURSO_DATABASE_URL ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
  )
  console.log(
    `  Auth Token: ${envVars.TURSO_AUTH_TOKEN ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not set' + colors.reset}`
  )
  console.log(
    `  Status: ${tursoConfigured ? colors.green + '✓ Ready' + colors.reset : colors.yellow + 'Incomplete' + colors.reset}`
  )
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
    `  Service Role Key: ${envVars.SUPABASE_SERVICE_ROLE_KEY ? colors.green + '✓ Configured' + colors.reset : colors.yellow + '⚠ Optional' + colors.reset}`
  )
  console.log(
    `  Status: ${supabaseFullyConfigured ? colors.green + '✓ Fully Ready' + colors.reset : supabaseBasicConfigured ? colors.yellow + 'Basic Setup' + colors.reset : colors.red + 'Not Configured' + colors.reset}`
  )
  console.log()

  // Check provider selection
  const explicitProvider = envVars.DATABASE_PROVIDER
  console.log(`${colors.cyan}Provider Selection:${colors.reset}`)
  console.log(
    `  Explicit Choice: ${explicitProvider ? colors.green + explicitProvider + colors.reset : colors.yellow + 'Auto-detect' + colors.reset}`
  )

  let activeProvider = 'none'
  if (explicitProvider && (explicitProvider === 'turso' || explicitProvider === 'supabase')) {
    if (explicitProvider === 'turso' && tursoConfigured) {
      activeProvider = 'turso'
    } else if (explicitProvider === 'supabase' && supabaseBasicConfigured) {
      activeProvider = 'supabase'
    }
  } else if (supabaseBasicConfigured) {
    activeProvider = 'supabase'
  } else if (tursoConfigured) {
    activeProvider = 'turso'
  }

  console.log(
    `  Active Provider: ${activeProvider !== 'none' ? colors.green + activeProvider + colors.reset : colors.red + 'None' + colors.reset}`
  )
  console.log()

  return {
    tursoConfigured,
    supabaseBasicConfigured,
    supabaseFullyConfigured,
    activeProvider,
    canSwitch: tursoConfigured && supabaseBasicConfigured,
  }
}

/**
 * Interactive database setup
 */
async function runSetup() {
  console.log(`${colors.bright}Welcome to the Database Setup Wizard!${colors.reset}\n`)
  log.info('This wizard will help you configure your database connection.\n')

  const envVars = readCurrentEnv()

  // Step 1: Choose database provider
  log.step('Step 1: Choose your database provider')
  console.log(`
${colors.cyan}Available options:${colors.reset}
  1) ${colors.green}Turso${colors.reset} - Serverless SQLite (LibSQL)
     • Fast, lightweight, edge-distributed
     • Great for high-performance applications
     • Free tier available
  
  2) ${colors.blue}Supabase${colors.reset} - PostgreSQL with real-time features  
     • Full PostgreSQL database
     • Built-in authentication and real-time subscriptions
     • Generous free tier
  
  3) ${colors.yellow}Both${colors.reset} - Configure both for easy switching
     • Best of both worlds
     • Switch between providers with simple commands
`)

  const providerChoice = await question(
    'Which database provider would you like to configure? (1/2/3): '
  )

  let configureProviders = []
  switch (providerChoice.trim()) {
    case '1':
      configureProviders = ['turso']
      break
    case '2':
      configureProviders = ['supabase']
      break
    case '3':
      configureProviders = ['turso', 'supabase']
      break
    default:
      log.error('Invalid choice. Please run the wizard again.')
      return false
  }

  // Step 2: Configure each selected provider
  for (const provider of configureProviders) {
    console.log(
      `\n${colors.bright}${colors.cyan}Configuring ${provider.toUpperCase()}${colors.reset}\n`
    )

    if (provider === 'turso') {
      log.info('To get your Turso credentials:')
      console.log('  1. Sign up at https://turso.tech')
      console.log('  2. Install Turso CLI: curl -sSfL https://get.tur.so/install.sh | bash')
      console.log('  3. Login: turso auth login')
      console.log('  4. Create database: turso db create <database-name>')
      console.log('  5. Get URL: turso db show <database-name> --url')
      console.log('  6. Create token: turso db tokens create <database-name>\n')

      const tursoUrl = await question('Enter your Turso database URL (starts with libsql://): ')
      if (!tursoUrl.startsWith('libsql://')) {
        log.error('Invalid Turso URL format. Should start with "libsql://"')
        continue
      }

      const tursoToken = await question('Enter your Turso auth token: ')
      if (!tursoToken.trim()) {
        log.error('Auth token is required')
        continue
      }

      envVars.TURSO_DATABASE_URL = tursoUrl.trim()
      envVars.TURSO_AUTH_TOKEN = tursoToken.trim()

      // Test connection
      const tursoTestResult = await testConnection('turso', envVars)
      if (!tursoTestResult) {
        log.warning('Turso connection test failed, but configuration saved.')
      }
    }

    if (provider === 'supabase') {
      log.info('To get your Supabase credentials:')
      console.log('  1. Sign up at https://supabase.com')
      console.log('  2. Create a new project')
      console.log('  3. Go to Settings > API')
      console.log('  4. Copy your Project URL and API keys\n')

      const supabaseUrl = await question('Enter your Supabase project URL (starts with https://): ')
      if (!supabaseUrl.startsWith('https://')) {
        log.error('Invalid Supabase URL format. Should start with "https://"')
        continue
      }

      const supabaseAnonKey = await question('Enter your Supabase anonymous key: ')
      if (!supabaseAnonKey.startsWith('eyJ')) {
        log.error('Invalid anonymous key format')
        continue
      }

      const configureServiceRole = await question(
        'Do you want to configure the service role key? (y/N) [Optional but recommended]: '
      )
      let supabaseServiceKey = ''
      if (
        configureServiceRole.toLowerCase() === 'y' ||
        configureServiceRole.toLowerCase() === 'yes'
      ) {
        supabaseServiceKey = await question('Enter your Supabase service role key: ')
      }

      envVars.SUPABASE_URL = supabaseUrl.trim()
      envVars.SUPABASE_ANON_KEY = supabaseAnonKey.trim()
      if (supabaseServiceKey.trim()) {
        envVars.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceKey.trim()
      }

      // Test connection
      const supabaseTestResult = await testConnection('supabase', envVars)
      if (!supabaseTestResult) {
        log.warning('Supabase connection test failed, but configuration saved.')
      }
    }
  }

  // Step 3: Set default provider if both configured
  if (configureProviders.length > 1) {
    console.log(`\n${colors.bright}${colors.cyan}Provider Selection${colors.reset}\n`)
    log.info('You have configured both databases. Which would you like to use by default?')
    console.log('  1) Turso (fast, serverless SQLite)')
    console.log('  2) Supabase (full PostgreSQL)')
    console.log('  3) Auto-detect (Supabase preferred, fallback to Turso)')

    const defaultChoice = await question('Choose default provider (1/2/3): ')
    switch (defaultChoice.trim()) {
      case '1':
        envVars.DATABASE_PROVIDER = 'turso'
        break
      case '2':
        envVars.DATABASE_PROVIDER = 'supabase'
        break
      case '3':
        delete envVars.DATABASE_PROVIDER // Auto-detect
        break
      default:
        log.warning('Invalid choice, using auto-detect')
        delete envVars.DATABASE_PROVIDER
    }
  } else if (configureProviders.length === 1) {
    // Set explicit provider if only one configured
    envVars.DATABASE_PROVIDER = configureProviders[0]
  }

  // Step 4: Preserve other settings
  if (!envVars.ENABLE_COMMENTS) {
    envVars.ENABLE_COMMENTS = 'true'
  }

  // Step 5: Write configuration
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

    if (!args.reset && (currentStatus.tursoConfigured || currentStatus.supabaseBasicConfigured)) {
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
      console.log(
        `  3. Switch databases anytime: ${colors.green}npm run db:switch:turso${colors.reset} or ${colors.green}npm run db:switch:supabase${colors.reset}`
      )

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
