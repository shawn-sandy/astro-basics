/**
 * Role Validator Tests
 *
 * Tests for role configuration validation logic.
 *
 * @module tests/scripts/role-validator.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateRoleConfig, validateRoleConfigOrThrow } from '../../scripts/lib/role-validator'
import type { RoleConfig } from '../../config/roles.config'

describe('Role Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validateRoleConfig', () => {
    it('should accept valid default configuration', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('should accept valid custom configuration with additional roles', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'moderator', level: 2, label: 'Moderator' },
          { name: 'admin', level: 3, label: 'Administrator' },
          { name: 'super_admin', level: 4, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should reject role name with uppercase letters', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'Member', level: 1, label: 'Member' }, // Invalid: uppercase
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('lowercase')
    })

    it('should reject role name with special characters', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin-user', level: 2, label: 'Administrator' }, // Invalid: hyphen
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should reject role name starting with number', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: '2ndadmin', level: 2, label: 'Administrator' }, // Invalid: starts with number
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should reject role name that is SQL keyword', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'select', level: 2, label: 'Select' }, // Invalid: SQL keyword
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('SQL keyword')
    })

    it('should reject role name that is TypeScript keyword', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'interface', level: 2, label: 'Interface' }, // Invalid: TS keyword
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('TypeScript keyword')
    })

    it('should reject hierarchy level out of range (too low)', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 0, label: 'Member' }, // Invalid: < 1
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('at least 1')
    })

    it('should reject hierarchy level out of range (too high)', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 11, label: 'Administrator' }, // Invalid: > 10
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('at most 10')
    })

    it('should reject duplicate role names', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'admin', level: 3, label: 'Super Administrator' }, // Duplicate name
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('unique')
    })

    it('should reject duplicate hierarchy levels', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 2, label: 'Super Administrator' }, // Duplicate level
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('unique')
    })

    it('should reject configuration missing member role', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'basic_user', level: 1, label: 'User' }, // Missing 'member'
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.some(e => e.includes('member'))).toBe(true)
    })

    it('should reject configuration missing admin role', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'moderator', level: 2, label: 'Moderator' }, // Missing 'admin'
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('admin')
    })

    it('should reject configuration missing super_admin role', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'owner', level: 3, label: 'Owner' }, // Missing 'super_admin'
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('super_admin')
    })

    it('should reject configuration with fewer than 3 roles', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should reject empty label', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: '' }, // Invalid: empty label
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should reject role name that is too short', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'a', level: 1, label: 'A' }, // Invalid: too short
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      const result = validateRoleConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('at least 2')
    })
  })

  describe('validateRoleConfigOrThrow', () => {
    it('should return validated config for valid input', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'member', level: 1, label: 'Member' },
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      expect(() => validateRoleConfigOrThrow(config)).not.toThrow()
      const validated = validateRoleConfigOrThrow(config)
      expect(validated).toBeDefined()
      expect(validated.roles).toHaveLength(3)
    })

    it('should throw error for invalid input', () => {
      const config: RoleConfig = {
        roles: [
          { name: 'Member', level: 1, label: 'Member' }, // Invalid: uppercase
          { name: 'admin', level: 2, label: 'Administrator' },
          { name: 'super_admin', level: 3, label: 'Super Administrator' },
        ],
        coreRoles: ['member', 'admin', 'super_admin'],
      }

      expect(() => validateRoleConfigOrThrow(config)).toThrow()
      expect(() => validateRoleConfigOrThrow(config)).toThrow(/validation failed/)
    })
  })
})
