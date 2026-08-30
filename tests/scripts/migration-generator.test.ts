/**
 * Migration Generator Tests
 *
 * Tests for database migration generation from role configuration.
 *
 * @module tests/scripts/migration-generator.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generatePostgresMigration,
  generatePostgresRollback,
  getNextMigrationNumber,
  detectDatabaseProvider,
} from '../../scripts/lib/migration-generator'
import type { RoleConfig } from '../../config/roles.config'

describe('Migration Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePostgresMigration', () => {
    it('should generate valid PostgreSQL migration', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '003')

      expect(sql).toContain('Migration 003')
      expect(sql).toContain('CREATE TYPE user_role AS ENUM')
      expect(sql).toContain("'member'")
      expect(sql).toContain("'admin'")
      expect(sql).toContain("'super_admin'")
    })

    it('should include role labels as SQL comments', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'moderator', level: 2, label: 'Moderator' },
          { name: 'admin', level: 3, label: 'Administrator' },
          { name: 'super_admin', level: 4, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '003')

      expect(sql).toContain('-- Level 1: Member')
      expect(sql).toContain('-- Level 2: Moderator')
      expect(sql).toContain('-- Level 3: Administrator')
      expect(sql).toContain('-- Level 4: Super Administrator')
    })

    it('should include idempotent ENUM creation', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '003')

      expect(sql).toContain('DO $$ BEGIN')
      expect(sql).toContain('CREATE TYPE user_role AS ENUM')
      expect(sql).toContain('EXCEPTION')
      expect(sql).toContain('WHEN duplicate_object THEN')
    })

    it('should include ALTER TYPE statements for extending ENUM', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '003')

      expect(sql).toContain('ALTER TYPE user_role ADD VALUE')
      expect(sql).toContain("ADD VALUE 'member'")
      expect(sql).toContain("ADD VALUE 'admin'")
      expect(sql).toContain("ADD VALUE 'super_admin'")
    })

    it('should include verification query', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '003')

      expect(sql).toContain('SELECT COUNT(*) INTO enum_count')
      expect(sql).toContain('FROM pg_enum')
      expect(sql).toContain('IF enum_count < 3 THEN')
      expect(sql).toContain('RAISE EXCEPTION')
    })

    it('should wrap migration in transaction', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '003')

      expect(sql).toContain('BEGIN;')
      expect(sql).toContain('COMMIT;')
      expect(sql.indexOf('BEGIN;')).toBeLessThan(sql.indexOf('COMMIT;'))
    })

    it('should include metadata in comments', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '003')

      expect(sql).toContain('Generated:')
      expect(sql).toContain('Source: config/roles.config.ts')
      expect(sql).toContain('Database: PostgreSQL (Supabase)')
      expect(sql).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO timestamp
    })

    it('should generate migration for custom roles', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'contributor', level: 2, label: 'Contributor' },
          { name: 'moderator', level: 3, label: 'Moderator' },
          { name: 'admin', level: 4, label: 'Administrator' },
          { name: 'super_admin', level: 5, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const sql = generatePostgresMigration(config, '004')

      expect(sql).toContain("'contributor'")
      expect(sql).toContain("'moderator'")
      expect(sql).toContain('Level 2: Contributor')
      expect(sql).toContain('Level 3: Moderator')
      expect(sql).toContain('IF enum_count < 5 THEN')
    })
  })

  describe('generatePostgresRollback', () => {
    it('should generate valid rollback migration', () => {
      const sql = generatePostgresRollback('003')

      expect(sql).toContain('Rollback Migration 003')
      expect(sql).toContain('DROP TYPE IF EXISTS user_role CASCADE')
    })

    it('should include warning in comments', () => {
      const sql = generatePostgresRollback('003')

      expect(sql).toContain('WARNING')
      expect(sql).toContain('drop the user_role ENUM type')
    })

    it('should wrap rollback in transaction', () => {
      const sql = generatePostgresRollback('003')

      expect(sql).toContain('BEGIN;')
      expect(sql).toContain('COMMIT;')
      expect(sql.indexOf('BEGIN;')).toBeLessThan(sql.indexOf('COMMIT;'))
    })

    it('should include metadata in comments', () => {
      const sql = generatePostgresRollback('003')

      expect(sql).toContain('Generated:')
      expect(sql).toContain('Database: PostgreSQL (Supabase)')
      expect(sql).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO timestamp
    })
  })

  describe('getNextMigrationNumber', () => {
    it('should return "001" for empty directory', () => {
      // Note: This test assumes the test directory doesn't have migrations
      const number = getNextMigrationNumber('/nonexistent/directory')

      expect(number).toBe('001')
    })

    it('should return zero-padded string', () => {
      const number = getNextMigrationNumber('/nonexistent/directory')

      expect(number).toHaveLength(3)
      expect(number).toMatch(/^\d{3}$/)
    })
  })

  describe('detectDatabaseProvider', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
      // Save original environment
      originalEnv = { ...process.env }
    })

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv
    })

    it('should detect Supabase when credentials are present', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
      delete process.env.DATABASE_PROVIDER

      const provider = detectDatabaseProvider()

      expect(provider).toBe('supabase')
    })

    it('should detect Turso when credentials are present', () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-token'
      delete process.env.DATABASE_PROVIDER

      const provider = detectDatabaseProvider()

      expect(provider).toBe('turso')
    })

    it('should respect explicit DATABASE_PROVIDER setting', () => {
      process.env.DATABASE_PROVIDER = 'turso'
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      const provider = detectDatabaseProvider()

      expect(provider).toBe('turso')
    })

    it('should return unknown when no credentials present', () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN
      delete process.env.DATABASE_PROVIDER

      const provider = detectDatabaseProvider()

      expect(provider).toBe('unknown')
    })

    it('should prefer Supabase over Turso when both are configured', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
      process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-token'
      delete process.env.DATABASE_PROVIDER

      const provider = detectDatabaseProvider()

      expect(provider).toBe('supabase')
    })
  })
})
