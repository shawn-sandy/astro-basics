/**
 * Role Generator Tests
 *
 * Tests for TypeScript type generation from role configuration.
 *
 * @module tests/scripts/role-generator.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateRoleTypes, validateGeneratedTypes } from '../../scripts/lib/role-generator'
import type { RoleConfig } from '../../config/roles.config'

describe('Role Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateRoleTypes', () => {
    it('should generate valid TypeScript for default 3-tier config', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain("export type UserRole = 'member' | 'admin' | 'super_admin'")
      expect(code).toContain('export const USER_ROLES')
      expect(code).toContain('export const ROLE_HIERARCHY')
      expect(code).toContain('export const ROLE_LABELS')
    })

    it('should generate UserRole union type correctly', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'moderator', level: 2, label: 'Moderator' },
          { name: 'admin', level: 3, label: 'Administrator' },
          { name: 'super_admin', level: 4, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain(
        "export type UserRole = 'member' | 'moderator' | 'admin' | 'super_admin'"
      )
    })

    it('should generate USER_ROLES array correctly', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain(
        "export const USER_ROLES: UserRole[] = ['member', 'admin', 'super_admin'] as const"
      )
    })

    it('should generate ROLE_HIERARCHY with correct levels', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'moderator', level: 2, label: 'Moderator' },
          { name: 'admin', level: 3, label: 'Administrator' },
          { name: 'super_admin', level: 4, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain('member: 1')
      expect(code).toContain('moderator: 2')
      expect(code).toContain('admin: 3')
      expect(code).toContain('super_admin: 4')
    })

    it('should generate ROLE_LABELS with correct labels', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'moderator', level: 2, label: 'Moderator' },
          { name: 'admin', level: 3, label: 'Administrator' },
          { name: 'super_admin', level: 4, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain("member: 'Member'")
      expect(code).toContain("moderator: 'Moderator'")
      expect(code).toContain("admin: 'Administrator'")
      expect(code).toContain("super_admin: 'Super Administrator'")
    })

    it('should include auto-generated file warning', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain('AUTO-GENERATED FILE - DO NOT EDIT MANUALLY')
      expect(code).toContain('scripts/setup-roles.ts')
      expect(code).toContain('config/roles.config.ts')
    })

    it('should include generation timestamp', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain('Generated:')
      expect(code).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO timestamp format
    })

    it('should include "as const" assertions', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain('as const')
      expect(code.match(/as const/g)?.length).toBeGreaterThanOrEqual(3) // At least 3 occurrences
    })

    it('should include JSDoc comments for exports', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain('/**')
      expect(code).toContain('User role type')
      expect(code).toContain('Array of all valid user roles')
      expect(code).toContain('Role hierarchy levels')
      expect(code).toContain('Human-readable role labels')
    })

    it('should generate valid code for roles with underscores', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'content_creator', level: 2, label: 'Content Creator' },
          { name: 'admin', level: 3, label: 'Administrator' },
          { name: 'super_admin', level: 4, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const code = generateRoleTypes(config)

      expect(code).toContain("'content_creator'")
      expect(code).toContain('content_creator: 2')
      expect(code).toContain("content_creator: 'Content Creator'")
    })
  })

  describe('validateGeneratedTypes', () => {
    it('should validate correct generated code', () => {
      const code = `
export type UserRole = 'member' | 'admin' | 'super_admin'
export const USER_ROLES: UserRole[] = ['member', 'admin', 'super_admin'] as const
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  admin: 2,
  super_admin: 3,
} as const
export const ROLE_LABELS: Record<UserRole, string> = {
  member: 'Member',
  admin: 'Administrator',
  super_admin: 'Super Administrator',
} as const
      `

      expect(validateGeneratedTypes(code)).toBe(true)
    })

    it('should reject code missing UserRole type', () => {
      const code = `
export const USER_ROLES: UserRole[] = ['member'] as const
export const ROLE_HIERARCHY: Record<UserRole, number> = { member: 1 } as const
export const ROLE_LABELS: Record<UserRole, string> = { member: 'Member' } as const
      `

      expect(validateGeneratedTypes(code)).toBe(false)
    })

    it('should reject code missing USER_ROLES const', () => {
      const code = `
export type UserRole = 'member'
export const ROLE_HIERARCHY: Record<UserRole, number> = { member: 1 } as const
export const ROLE_LABELS: Record<UserRole, string> = { member: 'Member' } as const
      `

      expect(validateGeneratedTypes(code)).toBe(false)
    })

    it('should reject code missing ROLE_HIERARCHY const', () => {
      const code = `
export type UserRole = 'member'
export const USER_ROLES: UserRole[] = ['member'] as const
export const ROLE_LABELS: Record<UserRole, string> = { member: 'Member' } as const
      `

      expect(validateGeneratedTypes(code)).toBe(false)
    })

    it('should reject code missing ROLE_LABELS const', () => {
      const code = `
export type UserRole = 'member'
export const USER_ROLES: UserRole[] = ['member'] as const
export const ROLE_HIERARCHY: Record<UserRole, number> = { member: 1 } as const
      `

      expect(validateGeneratedTypes(code)).toBe(false)
    })
  })
})
