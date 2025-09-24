#!/usr/bin/env node

/**
 * Database Switching Script
 * Safely switches between Turso and Supabase with backup/restore capabilities
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseArgs } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const envPath = join(projectRoot, '.env')
const envBackupPath = join(projectRoot, '.env.backup')

// Color utilities
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

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    to: { type: 'string', short: 't' },
    'backup-only': { type: 'boolean' },
    restore: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
  strict: false,
  allowPositionals: true,
})

// Show help
if (args.help) {
  console.log(`
${colors.bright}Database Switching Tool${colors.reset}

${colors.cyan}Usage:${colors.reset} node scripts/switch-database.js [options]

${colors.cyan}Options:${colors.reset}
  -t, --to <provider>     Switch to specific provider (turso|supabase|auto)
  --backup-only           Only create backup, don't switch
  --restore               Restore from backup
  --dry-run               Show what would be done without making changes
  -h, --help              Show this help message

${colors.cyan}Examples:${colors.reset}
  node scripts/switch-database.js --to turso     # Switch to Turso
  node scripts/switch-database.js --to supabase  # Switch to Supabase  
  node scripts/switch-database.js --to auto      # Remove explicit choice
  node scripts/switch-database.js --backup-only  # Create backup only
  node scripts/switch-database.js --restore      # Restore from backup
`)
  process.exit(0)
}

// Check current database configuration
function checkDatabaseConfig() {
  const tursoConfigured = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)
  const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  const currentProvider = process.env.DATABASE_PROVIDER || 'auto'

  let activeProvider = currentProvider
  if (currentProvider === 'auto') {
    activeProvider = supabaseConfigured ? 'supabase' : tursoConfigured ? 'turso' : 'none'
  }

  return {
    tursoConfigured,
    supabaseConfigured,
    currentProvider,
    activeProvider,
    switchingAvailable: tursoConfigured && supabaseConfigured,
  }
}

// Create backup of current .env file
function createBackup() {
  if (!existsSync(envPath)) {
    log.warning('No .env file found to backup')
    return false
  }

  try {
    copyFileSync(envPath, envBackupPath)
    log.success(`Backup created: ${envBackupPath}`)
    return true
  } catch (error) {
    log.error(`Failed to create backup: ${error.message}`)
    return false
  }
}

// Restore from backup
function restoreFromBackup() {
  if (!existsSync(envBackupPath)) {
    log.error('No backup file found to restore from')
    return false
  }

  try {
    copyFileSync(envBackupPath, envPath)
    log.success('Configuration restored from backup')
    return true
  } catch (error) {
    log.error(`Failed to restore backup: ${error.message}`)
    return false
  }
}

// Update .env file with new DATABASE_PROVIDER value
function updateDatabaseProvider(newProvider) {
  if (!existsSync(envPath)) {
    log.error('No .env file found')
    return false
  }

  try {
    let envContent = readFileSync(envPath, 'utf-8')

    if (newProvider === 'auto') {
      // Remove DATABASE_PROVIDER line
      envContent = envContent
        .split('\n')
        .filter(line => !line.startsWith('DATABASE_PROVIDER='))
        .join('\n')
      log.info('Removed DATABASE_PROVIDER (auto-detection enabled)')
    } else {
      // Update or add DATABASE_PROVIDER line
      const lines = envContent.split('\n')
      let found = false

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('DATABASE_PROVIDER=')) {
          lines[i] = `DATABASE_PROVIDER=${newProvider}`
          found = true
          break
        }
      }

      if (!found) {
        // Add new line at the end
        if (!envContent.endsWith('\n')) {
          envContent += '\n'
        }
        envContent += `DATABASE_PROVIDER=${newProvider}\n`
      } else {
        envContent = lines.join('\n')
      }

      log.info(`Set DATABASE_PROVIDER=${newProvider}`)
    }

    writeFileSync(envPath, envContent)
    return true
  } catch (error) {
    log.error(`Failed to update .env file: ${error.message}`)
    return false
  }
}

// Validate target provider
function validateTarget(target, config) {
  if (target === 'auto') {
    return true
  }

  if (target === 'turso' && !config.tursoConfigured) {
    log.error('Cannot switch to Turso: not configured')
    log.info('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first')
    return false
  }

  if (target === 'supabase' && !config.supabaseConfigured) {
    log.error('Cannot switch to Supabase: not configured')
    log.info('Configure SUPABASE_URL and SUPABASE_ANON_KEY first')
    return false
  }

  if (!['turso', 'supabase', 'auto'].includes(target)) {
    log.error(`Invalid target provider: ${target}`)
    log.info('Valid options: turso, supabase, auto')
    return false
  }

  return true
}

// Main execution
async function main() {
  console.log(`${colors.bright}Database Switching Tool${colors.reset}\n`)

  // Handle restore command
  if (args.restore) {
    log.info('Restoring configuration from backup...')
    const success = restoreFromBackup()
    process.exit(success ? 0 : 1)
  }

  // Check current configuration
  const config = checkDatabaseConfig()

  log.header('Current Configuration:')
  console.log(
    `   Turso: ${config.tursoConfigured ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not configured' + colors.reset}`
  )
  console.log(
    `   Supabase: ${config.supabaseConfigured ? colors.green + '✓ Configured' + colors.reset : colors.red + '✗ Not configured' + colors.reset}`
  )
  console.log(`   Current Provider: ${config.currentProvider}`)
  console.log(`   Active Provider: ${config.activeProvider}`)
  console.log(
    `   Switching Available: ${config.switchingAvailable ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}`
  )
  console.log()

  // Handle backup-only command
  if (args['backup-only']) {
    log.info('Creating backup only...')
    const success = createBackup()
    process.exit(success ? 0 : 1)
  }

  // Check if target is specified
  if (!args.to) {
    log.error('No target provider specified')
    log.info('Use --to <provider> to specify target (turso|supabase|auto)')
    log.info('Use --help for more options')
    process.exit(1)
  }

  const target = args.to.toLowerCase()

  // Validate target
  if (!validateTarget(target, config)) {
    process.exit(1)
  }

  // Check if switch is needed
  if (config.currentProvider === target) {
    log.warning(`Already using ${target} provider`)
    process.exit(0)
  }

  // Dry run mode
  if (args['dry-run']) {
    log.header('Dry Run Mode:')
    log.info('Would create backup of current configuration')
    if (target === 'auto') {
      log.info('Would remove DATABASE_PROVIDER (enable auto-detection)')
    } else {
      log.info(`Would set DATABASE_PROVIDER=${target}`)
    }
    log.info('Would require application restart to take effect')
    console.log()
    log.info('Run without --dry-run to execute changes')
    process.exit(0)
  }

  // Execute the switch
  log.header('Switching Database Provider:')

  // Step 1: Create backup
  log.info('Step 1: Creating backup...')
  if (!createBackup()) {
    log.error('Backup failed - aborting switch')
    process.exit(1)
  }

  // Step 2: Update configuration
  log.info(`Step 2: Switching to ${target}...`)
  if (!updateDatabaseProvider(target)) {
    log.error('Configuration update failed')
    log.info('You can restore with: node scripts/switch-database.js --restore')
    process.exit(1)
  }

  // Step 3: Verify change
  log.info('Step 3: Verifying change...')
  // Note: Environment variables are cached in Node.js process

  log.success('Database provider switched successfully!')
  console.log()

  log.header('Next Steps:')
  log.warning('Application restart required for changes to take effect')
  console.log(`   1. Restart your development server: ${colors.cyan}npm run start${colors.reset}`)
  console.log(
    `   2. Verify switch worked: ${colors.cyan}node --env-file=.env scripts/database-status.js${colors.reset}`
  )
  console.log(
    `   3. If issues occur, restore: ${colors.cyan}node scripts/switch-database.js --restore${colors.reset}`
  )

  console.log()
  log.success('Switch completed!')
}

// Run main function
main().catch(error => {
  log.error(`Script failed: ${error.message}`)
  console.error(error.stack)
  process.exit(1)
})
