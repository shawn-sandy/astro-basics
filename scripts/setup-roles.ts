#!/usr/bin/env tsx
/**
 * Role Setup Script
 *
 * Interactive CLI wizard for configuring application roles.
 * Generates TypeScript types and database migrations from configuration.
 *
 * Usage:
 *   npm run setup:roles
 *   npm run setup:roles -- --dry-run
 *
 * @module scripts/setup-roles
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import { roleConfig } from '../config/roles.config'
import { validateRoleConfig } from './lib/role-validator'
import { writeRoleTypes, validateGeneratedTypes } from './lib/role-generator'
import { writeMigrationFiles, detectDatabaseProvider } from './lib/migration-generator'

/**
 * CLI color codes for output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

/**
 * Prints colored message to console
 */
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * Prints section header
 */
function logSection(title: string) {
  console.log()
  log(`${'='.repeat(60)}`, 'cyan')
  log(`  ${title}`, 'bright')
  log(`${'='.repeat(60)}`, 'cyan')
  console.log()
}

/**
 * Prints success message with checkmark
 */
function logSuccess(message: string) {
  log(`✓ ${message}`, 'green')
}

/**
 * Prints error message with X
 */
function logError(message: string) {
  log(`✗ ${message}`, 'red')
}

/**
 * Prints warning message
 */
function logWarning(message: string) {
  log(`⚠ ${message}`, 'yellow')
}

/**
 * Prints info message
 */
function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue')
}

/**
 * Main setup function
 */
async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')

  // Print banner
  logSection('Astro Basics - Role Configuration Setup')

  if (isDryRun) {
    logWarning('DRY RUN MODE - No files will be written')
    console.log()
  }

  logInfo('This wizard will help you configure application roles.')
  logInfo('Generated files: TypeScript types + database migrations')
  console.log()

  // Check if configuration file exists
  const configPath = path.join(process.cwd(), 'config', 'roles.config.ts')
  const configExists = fs.existsSync(configPath)

  if (!configExists) {
    logError('Configuration file not found!')
    logError(`Expected: ${configPath}`)
    process.exit(1)
  }

  logSuccess(`Found configuration: ${configPath}`)

  // Step 1: Validate configuration
  logSection('Step 1: Validating Configuration')

  const validation = validateRoleConfig(roleConfig)

  if (!validation.success) {
    logError('Configuration validation failed!')
    console.log()
    validation.errors?.forEach(error => {
      logError(`  ${error}`)
    })
    console.log()
    logInfo('Please fix the errors in config/roles.config.ts and try again.')
    process.exit(1)
  }

  logSuccess('Configuration is valid!')
  console.log()

  // Display current configuration
  logInfo('Current role configuration:')
  console.log()
  roleConfig.roles.forEach(role => {
    const coreMarker = roleConfig.coreRoles.includes(role.name) ? ' (core)' : ''
    log(`  • ${role.label}${coreMarker}`, 'cyan')
    log(`    - Name: ${role.name}`)
    log(`    - Level: ${role.level}`)
  })
  console.log()

  // Ask for confirmation to proceed
  const { confirmProceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmProceed',
      message: 'Do you want to generate types and migrations from this configuration?',
      default: true,
    },
  ])

  if (!confirmProceed) {
    logInfo('Setup cancelled.')
    process.exit(0)
  }

  // Step 2: Generate TypeScript Types
  logSection('Step 2: Generating TypeScript Types')

  const typeResult = isDryRun
    ? { success: true, filePath: 'src/types/generated-roles.ts (dry-run)', code: '' }
    : writeRoleTypes(roleConfig)

  if (!typeResult.success) {
    logError('Type generation failed!')
    logError(`  ${typeResult.error}`)
    process.exit(1)
  }

  logSuccess(`Types generated: ${typeResult.filePath}`)

  // Validate generated types
  if (!isDryRun && typeResult.code) {
    const isValid = validateGeneratedTypes(typeResult.code)
    if (!isValid) {
      logWarning('Generated types may have syntax issues')
    } else {
      logSuccess('Generated types validated successfully')
    }
  }

  // Step 3: Generate Database Migrations
  logSection('Step 3: Generating Database Migrations')

  // Detect database provider
  const provider = detectDatabaseProvider()

  if (provider === 'unknown') {
    logWarning('Could not detect database provider from environment variables')
    logInfo('Defaulting to Supabase (PostgreSQL)')
    console.log()
  } else {
    logSuccess(`Detected database provider: ${provider}`)
  }

  const dbProvider = provider === 'turso' ? 'turso' : 'supabase'

  const migrationResult = isDryRun
    ? {
        success: true,
        migrationPath: 'scripts/migrations/XXX_user_roles.sql (dry-run)',
        rollbackPath: 'scripts/migrations/rollback_XXX_user_roles.sql (dry-run)',
        migrationNumber: 'XXX',
      }
    : writeMigrationFiles(roleConfig, dbProvider)

  if (!migrationResult.success) {
    logError('Migration generation failed!')
    logError(`  ${migrationResult.error}`)
    process.exit(1)
  }

  logSuccess(`Migration ${migrationResult.migrationNumber} created`)
  logSuccess(`  Forward: ${migrationResult.migrationPath}`)
  logSuccess(`  Rollback: ${migrationResult.rollbackPath}`)

  // Step 4: Summary and Next Steps
  logSection('Setup Complete!')

  if (isDryRun) {
    logWarning('Dry run completed - no files were written')
    logInfo('Run without --dry-run flag to generate files')
  } else {
    logSuccess('All files generated successfully!')
    console.log()
    log('Generated files:', 'bright')
    log(`  1. ${typeResult.filePath}`, 'cyan')
    log(`  2. ${migrationResult.migrationPath}`, 'cyan')
    log(`  3. ${migrationResult.rollbackPath}`, 'cyan')
  }

  console.log()
  log('Next steps:', 'bright')
  console.log()
  log('  1. Review the generated files', 'yellow')
  log('  2. Run type-check to verify: npm run type-check', 'yellow')
  if (dbProvider === 'supabase') {
    log(
      '  3. Apply migration: npm run db:migrate -- ' +
        migrationResult.migrationNumber +
        '_user_roles.sql',
      'yellow'
    )
  } else {
    log('  3. Adapt the Turso migration to your schema', 'yellow')
  }
  log('  4. Commit all files to Git', 'yellow')
  console.log()
  log('  git add config/ src/types/ scripts/migrations/', 'blue')
  log('  git commit -m "Configure custom roles"', 'blue')
  console.log()

  logSuccess('Role setup completed!')
}

// Run the script
main().catch(error => {
  console.error()
  logError('An unexpected error occurred:')
  console.error(error)
  process.exit(1)
})
