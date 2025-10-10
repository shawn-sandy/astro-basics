/**
 * Migration Generator
 *
 * Generates database migrations for role ENUM creation based on
 * role configuration. Supports both PostgreSQL (Supabase) and
 * SQLite (Turso) database providers.
 *
 * @module scripts/lib/migration-generator
 */

import fs from 'fs'
import path from 'path'
import type { RoleConfig } from '../../config/roles.config'

/**
 * Migration generation result
 */
export interface MigrationResult {
  /**
   * Whether generation succeeded
   */
  success: boolean

  /**
   * Path to forward migration file
   */
  migrationPath?: string

  /**
   * Path to rollback migration file
   */
  rollbackPath?: string

  /**
   * Migration number assigned
   */
  migrationNumber?: string

  /**
   * Error message (only present if success = false)
   */
  error?: string
}

/**
 * Gets the next available migration number
 *
 * Scans the migrations directory for existing migrations and returns
 * the next sequential number with zero-padding.
 *
 * @param migrationsDir - Path to migrations directory
 * @returns Next migration number as zero-padded string (e.g., "003")
 *
 * @example
 * ```typescript
 * const number = getNextMigrationNumber('./scripts/migrations')
 * // Returns "003" if migrations 001 and 002 exist
 * ```
 */
export function getNextMigrationNumber(migrationsDir: string): string {
  try {
    // Ensure directory exists
    if (!fs.existsSync(migrationsDir)) {
      return '001'
    }

    // Get all migration files
    const files = fs.readdirSync(migrationsDir)

    // Extract migration numbers (files starting with digits)
    const numbers = files
      .filter(f => /^\d{3}_/.test(f))
      .map(f => parseInt(f.substring(0, 3), 10))
      .filter(n => !isNaN(n))

    // Find max number and increment
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
    const nextNum = maxNum + 1

    // Return zero-padded string
    return String(nextNum).padStart(3, '0')
  } catch {
    // Default to 001 if error
    return '001'
  }
}

/**
 * Generates PostgreSQL ENUM migration SQL
 *
 * Creates idempotent SQL migration for Supabase (PostgreSQL).
 *
 * @param config - The validated role configuration
 * @param migrationNumber - The migration number
 * @returns SQL migration code
 */
export function generatePostgresMigration(config: RoleConfig, migrationNumber: string): string {
  const timestamp = new Date().toISOString()
  const roleNames = config.roles.map(r => r.name)

  // Generate ENUM values with comments
  const enumValues = config.roles
    .map(r => `  '${r.name}'  -- Level ${r.level}: ${r.label}`)
    .join(',\n')

  return `-- Migration ${migrationNumber}: User Roles ENUM
-- Generated: ${timestamp}
-- Source: config/roles.config.ts
-- Database: PostgreSQL (Supabase)

BEGIN;

-- Create user_role ENUM type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
${enumValues}
  );
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists, check if we need to add values
    NULL;
END $$;

-- Add any new role values to existing ENUM (if type already exists)
-- Note: PostgreSQL ENUMs can only be extended, not modified
${roleNames
  .map(
    name => `DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = '${name}'
  ) THEN
    ALTER TYPE user_role ADD VALUE '${name}';
  END IF;
END $$;`
  )
  .join('\n\n')}

-- Verify the user_role type exists and has the correct values
DO $$
DECLARE
  enum_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO enum_count
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role';

  IF enum_count < ${roleNames.length} THEN
    RAISE EXCEPTION 'user_role ENUM does not have all expected values';
  END IF;

  RAISE NOTICE 'user_role ENUM successfully created/updated with % values', enum_count;
END $$;

COMMIT;
`
}

/**
 * Generates PostgreSQL rollback migration SQL
 *
 * Creates SQL to drop the user_role ENUM type.
 *
 * @param migrationNumber - The migration number
 * @returns SQL rollback code
 */
export function generatePostgresRollback(migrationNumber: string): string {
  const timestamp = new Date().toISOString()

  return `-- Rollback Migration ${migrationNumber}: User Roles ENUM
-- Generated: ${timestamp}
-- Database: PostgreSQL (Supabase)
--
-- WARNING: This will drop the user_role ENUM type!
-- Make sure to migrate any data that depends on this type before running this rollback.

BEGIN;

-- Drop user_role ENUM type if it exists
DROP TYPE IF EXISTS user_role CASCADE;

COMMIT;
`
}

/**
 * Generates Turso (SQLite) migration
 *
 * Creates TEXT column with CHECK constraint for Turso database.
 * SQLite doesn't support ENUMs, so we use CHECK constraints.
 *
 * @param config - The validated role configuration
 * @param migrationNumber - The migration number
 * @returns SQL migration code
 */
export function generateTursoMigration(config: RoleConfig, migrationNumber: string): string {
  const timestamp = new Date().toISOString()
  const roleNames = config.roles.map(r => r.name)
  const checkConstraint = roleNames.map(name => `'${name}'`).join(', ')

  return `-- Migration ${migrationNumber}: User Roles
-- Generated: ${timestamp}
-- Source: config/roles.config.ts
-- Database: SQLite (Turso)

-- Note: SQLite does not support ENUMs, so we use CHECK constraints

-- Roles configuration:
${config.roles.map(r => `-- ${r.name} (Level ${r.level}): ${r.label}`).join('\n')}

-- If you need to create a users table with role column:
-- CREATE TABLE IF NOT EXISTS users (
--   id TEXT PRIMARY KEY,
--   role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (${checkConstraint})),
--   created_at TEXT NOT NULL DEFAULT (datetime('now')),
--   updated_at TEXT NOT NULL DEFAULT (datetime('now'))
-- );

-- For existing tables, you would need to:
-- 1. Create new table with CHECK constraint
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- This migration is informational only for Turso
-- Please adapt to your specific schema requirements
`
}

/**
 * Writes migration files to disk
 *
 * Creates both forward and rollback migration files in the migrations directory.
 *
 * @param config - The validated role configuration
 * @param provider - Database provider ('supabase' or 'turso')
 * @param migrationsDir - Optional custom migrations directory
 * @returns Migration result with file paths
 *
 * @example
 * ```typescript
 * const result = writeMigrationFiles(config, 'supabase')
 * if (result.success) {
 *   console.log(`Migration: ${result.migrationPath}`)
 *   console.log(`Rollback: ${result.rollbackPath}`)
 * }
 * ```
 */
export function writeMigrationFiles(
  config: RoleConfig,
  provider: 'supabase' | 'turso' = 'supabase',
  migrationsDir?: string
): MigrationResult {
  try {
    // Determine migrations directory
    const dir = migrationsDir || path.join(process.cwd(), 'scripts', 'migrations')

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Get next migration number
    const migrationNumber = getNextMigrationNumber(dir)

    // Generate SQL based on provider
    let migrationSQL: string
    let rollbackSQL: string

    if (provider === 'supabase') {
      migrationSQL = generatePostgresMigration(config, migrationNumber)
      rollbackSQL = generatePostgresRollback(migrationNumber)
    } else {
      migrationSQL = generateTursoMigration(config, migrationNumber)
      rollbackSQL = '-- No rollback needed for Turso informational migration'
    }

    // Define file paths
    const migrationPath = path.join(dir, `${migrationNumber}_user_roles.sql`)
    const rollbackPath = path.join(dir, `rollback_${migrationNumber}_user_roles.sql`)

    // Write migration files
    fs.writeFileSync(migrationPath, migrationSQL, 'utf-8')
    fs.writeFileSync(rollbackPath, rollbackSQL, 'utf-8')

    return {
      success: true,
      migrationPath,
      rollbackPath,
      migrationNumber,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Detects database provider from environment
 *
 * Checks environment variables to determine which database is configured.
 *
 * @returns Database provider ('supabase', 'turso', or 'unknown')
 */
export function detectDatabaseProvider(): 'supabase' | 'turso' | 'unknown' {
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  const hasTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)

  // Prefer explicit provider setting
  if (process.env.DATABASE_PROVIDER === 'supabase' || process.env.DATABASE_PROVIDER === 'turso') {
    return process.env.DATABASE_PROVIDER
  }

  // Auto-detect based on available credentials
  if (hasSupabase) return 'supabase'
  if (hasTurso) return 'turso'

  return 'unknown'
}
