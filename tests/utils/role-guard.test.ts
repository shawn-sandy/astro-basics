/**
 * Role Guard Utility Tests
 *
 * Comprehensive test suite for role-based visibility system utilities.
 * Tests cover both Supabase user roles and Clerk org roles, caching,
 * error handling, and edge cases.
 */

/* eslint-disable no-undef */
// App.Locals is a global type provided by Astro - ESLint doesn't recognize it

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  canViewContent,
  canViewContentDetailed,
  requireRole,
  getUserRole,
  hasAnyRole,
  hasAllRoles,
  isValidRole,
  formatRoleForDisplay,
  clearRoleCache,
  getRoleCacheStats,
  hasRoleOrHigher,
} from '#utils/role-guard'
import type { AnyRole } from '#utils/role-types'

// Mock Supabase
vi.mock('#libs/supabase-native', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseServiceRole: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { role: 'admin' },
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

describe('Role Guard Utilities', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearRoleCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('isValidRole', () => {
    it('should validate Supabase user roles', () => {
      expect(isValidRole('member')).toBe(true)
      expect(isValidRole('admin')).toBe(true)
      expect(isValidRole('super_admin')).toBe(true)
    })

    it('should validate Clerk org roles', () => {
      expect(isValidRole('org:admin')).toBe(true)
      expect(isValidRole('org:member')).toBe(true)
    })

    it('should reject invalid roles', () => {
      expect(isValidRole('invalid_role')).toBe(false)
      expect(isValidRole('moderator')).toBe(false)
      expect(isValidRole('org:moderator')).toBe(false)
      expect(isValidRole('')).toBe(false)
    })
  })

  describe('formatRoleForDisplay', () => {
    it('should format user roles correctly', () => {
      expect(formatRoleForDisplay('member')).toBe('Member')
      expect(formatRoleForDisplay('admin')).toBe('Admin')
      expect(formatRoleForDisplay('super_admin')).toBe('Super Admin')
    })

    it('should format org roles correctly', () => {
      expect(formatRoleForDisplay('org:admin')).toBe('Organization Admin')
      expect(formatRoleForDisplay('org:member')).toBe('Organization Member')
    })
  })

  describe('getUserRole', () => {
    it('should return null for unauthenticated user', async () => {
      const locals = { userId: null } as unknown as App.Locals
      const role = await getUserRole(locals, false)
      expect(role).toBeNull()
    })

    it('should return role from locals if available', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'org:admin',
      } as unknown as App.Locals

      const role = await getUserRole(locals, false)
      expect(role).toBe('org:admin')
    })

    it('should fetch from Supabase when not in locals and fetchFromSupabase is true', async () => {
      const locals = {
        userId: 'user_123',
        userRole: null,
      } as unknown as App.Locals

      const role = await getUserRole(locals, true)
      // Based on our mock, this should return 'admin'
      expect(role).toBe('admin')
    })

    it('should not fetch from Supabase when fetchFromSupabase is false', async () => {
      const locals = {
        userId: 'user_123',
        userRole: null,
      } as unknown as App.Locals

      const role = await getUserRole(locals, false)
      expect(role).toBeNull()
    })
  })

  describe('canViewContent', () => {
    it('should return true when user has allowed role', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      const canView = await canViewContent(locals, ['admin', 'super_admin'])
      expect(canView).toBe(true)
    })

    it('should return false when user lacks allowed role', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'member',
      } as unknown as App.Locals

      const canView = await canViewContent(locals, ['admin', 'super_admin'])
      expect(canView).toBe(false)
    })

    it('should return false for unauthenticated user', async () => {
      const locals = { userId: null } as unknown as App.Locals

      const canView = await canViewContent(locals, ['admin'])
      expect(canView).toBe(false)
    })

    it('should support org roles', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'org:admin',
      } as unknown as App.Locals

      const canView = await canViewContent(locals, ['org:admin', 'org:member'])
      expect(canView).toBe(true)
    })

    it('should support mixed role types', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'super_admin',
      } as unknown as App.Locals

      const canView = await canViewContent(locals, [
        'org:admin',
        'admin',
        'super_admin',
      ] as AnyRole[])
      expect(canView).toBe(true)
    })
  })

  describe('canViewContentDetailed', () => {
    it('should return detailed result when access is granted', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      const result = await canViewContentDetailed(locals, ['admin', 'super_admin'])
      expect(result.allowed).toBe(true)
      expect(result.userRole).toBe('admin')
      expect(result.reason).toBeUndefined()
    })

    it('should return detailed result when access is denied', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'member',
      } as unknown as App.Locals

      const result = await canViewContentDetailed(locals, ['admin'])
      expect(result.allowed).toBe(false)
      expect(result.userRole).toBe('member')
      expect(result.reason).toContain('hierarchy requirements')
    })

    it('should return detailed result for unauthenticated user', async () => {
      const locals = { userId: null } as unknown as App.Locals

      const result = await canViewContentDetailed(locals, ['admin'])
      expect(result.allowed).toBe(false)
      expect(result.userRole).toBeNull()
      expect(result.reason).toBe('User not authenticated')
    })
  })

  describe('requireRole', () => {
    it('should not throw when user has required role', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      await expect(requireRole(locals, ['admin'])).resolves.toBeUndefined()
    })

    it('should throw 403 when user lacks required role', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'member',
      } as unknown as App.Locals

      await expect(requireRole(locals, ['admin'])).rejects.toThrow('403 Forbidden')
    })

    it('should throw 403 for unauthenticated user', async () => {
      const locals = { userId: null } as unknown as App.Locals

      await expect(requireRole(locals, ['admin'])).rejects.toThrow('403 Forbidden')
    })
  })

  describe('hasAnyRole', () => {
    it('should return true when user has any of the roles', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      const hasRole = await hasAnyRole(locals, ['admin', 'super_admin'])
      expect(hasRole).toBe(true)
    })

    it('should return false when user has none of the roles', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'member',
      } as unknown as App.Locals

      const hasRole = await hasAnyRole(locals, ['admin', 'super_admin'])
      expect(hasRole).toBe(false)
    })
  })

  describe('hasAllRoles', () => {
    it('should return true for single role match', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      const hasRole = await hasAllRoles(locals, ['admin'])
      expect(hasRole).toBe(true)
    })

    it('should return false for single role mismatch', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'member',
      } as unknown as App.Locals

      const hasRole = await hasAllRoles(locals, ['admin'])
      expect(hasRole).toBe(false)
    })

    // Note: Multi-role AND logic is not fully implemented yet
    // This test documents current behavior
    it('should warn about multi-role checks (not fully implemented)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      await hasAllRoles(locals, ['admin', 'super_admin'])

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('hasAllRoles with multiple roles not fully implemented')
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Role Caching', () => {
    it('should cache role queries', async () => {
      const { getSupabaseServiceRole } = await import('#libs/supabase-native')
      const mockSupabase = getSupabaseServiceRole as ReturnType<typeof vi.fn>

      const locals = {
        userId: 'user_cache_test',
        userRole: null,
      } as unknown as App.Locals

      // First call - should hit Supabase
      await getUserRole(locals, true)
      const firstCallCount = mockSupabase.mock.calls.length

      // Second call - should use cache
      await getUserRole(locals, true)
      const secondCallCount = mockSupabase.mock.calls.length

      // Should not have made additional Supabase calls
      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should allow manual cache clearing', async () => {
      const stats1 = getRoleCacheStats()

      const locals = {
        userId: 'user_clear_test',
        userRole: null,
      } as unknown as App.Locals

      // Populate cache
      await getUserRole(locals, true)

      const stats2 = getRoleCacheStats()
      expect(stats2.size).toBeGreaterThan(stats1.size)

      // Clear cache
      clearRoleCache('user_clear_test')

      const stats3 = getRoleCacheStats()
      expect(stats3.size).toBe(stats2.size - 1)
    })

    it('should clear entire cache when no userId specified', () => {
      clearRoleCache()
      const stats = getRoleCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('Hierarchical Role Checking', () => {
    describe('hasRoleOrHigher', () => {
      it('should allow admin to access member content', () => {
        expect(hasRoleOrHigher('admin', 'member')).toBe(true)
      })

      it('should allow super_admin to access member content', () => {
        expect(hasRoleOrHigher('super_admin', 'member')).toBe(true)
      })

      it('should allow super_admin to access admin content', () => {
        expect(hasRoleOrHigher('super_admin', 'admin')).toBe(true)
      })

      it('should deny member accessing admin content', () => {
        expect(hasRoleOrHigher('member', 'admin')).toBe(false)
      })

      it('should deny member accessing super_admin content', () => {
        expect(hasRoleOrHigher('member', 'super_admin')).toBe(false)
      })

      it('should allow same-level access', () => {
        expect(hasRoleOrHigher('member', 'member')).toBe(true)
        expect(hasRoleOrHigher('admin', 'admin')).toBe(true)
        expect(hasRoleOrHigher('super_admin', 'super_admin')).toBe(true)
      })

      it('should use flat matching for org roles', () => {
        expect(hasRoleOrHigher('org:admin', 'org:admin')).toBe(true)
        expect(hasRoleOrHigher('org:admin', 'org:member')).toBe(false)
        expect(hasRoleOrHigher('org:member', 'org:admin')).toBe(false)
      })

      it('should handle mixed role types with flat matching', () => {
        expect(hasRoleOrHigher('super_admin', 'org:admin')).toBe(false)
        expect(hasRoleOrHigher('org:admin', 'admin')).toBe(false)
      })

      it('should handle null/undefined roles', () => {
        expect(hasRoleOrHigher('admin', null as unknown as AnyRole)).toBe(true)
        expect(hasRoleOrHigher(null as unknown as AnyRole, 'admin')).toBe(false)
      })
    })

    describe('canViewContent with hierarchy (default)', () => {
      it('should allow admin to view member-only content', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['member'])
        expect(canView).toBe(true)
      })

      it('should allow super_admin to view member-only content', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'super_admin',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['member'])
        expect(canView).toBe(true)
      })

      it('should allow super_admin to view admin-only content', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'super_admin',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['admin'])
        expect(canView).toBe(true)
      })

      it('should deny member accessing admin-only content', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'member',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['admin'])
        expect(canView).toBe(false)
      })

      it('should allow member to view member content', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'member',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['member'])
        expect(canView).toBe(true)
      })

      it('should support multiple allowed roles with hierarchy', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        // Admin should match member OR super_admin requirement (via hierarchy on member)
        const canView = await canViewContent(locals, ['member', 'super_admin'])
        expect(canView).toBe(true)
      })
    })

    describe('canViewContent with hierarchy disabled', () => {
      it('should deny admin viewing member-only content when hierarchy disabled', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['member'], { useHierarchy: false })
        expect(canView).toBe(false)
      })

      it('should only allow exact role match when hierarchy disabled', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['admin'], { useHierarchy: false })
        expect(canView).toBe(true)
      })

      it('should deny super_admin viewing member content when hierarchy disabled', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'super_admin',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['member'], { useHierarchy: false })
        expect(canView).toBe(false)
      })
    })

    describe('canViewContentDetailed with hierarchy', () => {
      it('should include hierarchy metadata in detailed results', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const result = await canViewContentDetailed(locals, ['member'])
        expect(result.allowed).toBe(true)
        expect(result.evaluationMethod).toBe('hierarchy')
        expect(result.hierarchyLevel).toBe(2) // admin level
      })

      it('should include hierarchy metadata when access denied', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'member',
        } as unknown as App.Locals

        const result = await canViewContentDetailed(locals, ['admin'])
        expect(result.allowed).toBe(false)
        expect(result.evaluationMethod).toBe('hierarchy')
        expect(result.hierarchyLevel).toBe(1) // member level
        expect(result.reason).toContain('hierarchy requirements')
      })

      it('should show exact evaluation method when hierarchy disabled', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const result = await canViewContentDetailed(locals, ['member'], { useHierarchy: false })
        expect(result.allowed).toBe(false)
        expect(result.evaluationMethod).toBe('exact')
      })

      it('should not include hierarchy level for org roles', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'org:admin',
        } as unknown as App.Locals

        const result = await canViewContentDetailed(locals, ['org:admin'])
        expect(result.allowed).toBe(true)
        expect(result.evaluationMethod).toBe('hierarchy')
        expect(result.hierarchyLevel).toBeUndefined()
      })
    })

    describe('hasAnyRole with hierarchy', () => {
      it('should respect hierarchy by default', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const hasRole = await hasAnyRole(locals, ['member'])
        expect(hasRole).toBe(true)
      })

      it('should allow disabling hierarchy', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const hasRole = await hasAnyRole(locals, ['member'], { useHierarchy: false })
        expect(hasRole).toBe(false)
      })
    })

    describe('hasAllRoles with hierarchy', () => {
      it('should respect hierarchy for single role checks', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const hasRole = await hasAllRoles(locals, ['member'])
        expect(hasRole).toBe(true)
      })

      it('should allow disabling hierarchy', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'admin',
        } as unknown as App.Locals

        const hasRole = await hasAllRoles(locals, ['member'], { useHierarchy: false })
        expect(hasRole).toBe(false)
      })
    })

    describe('Backward Compatibility', () => {
      it('should maintain existing behavior for org roles (no hierarchy)', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'org:admin',
        } as unknown as App.Locals

        const canViewMember = await canViewContent(locals, ['org:member'])
        expect(canViewMember).toBe(false)
      })

      it('should work with mixed role arrays', async () => {
        const locals = {
          userId: 'user_123',
          userRole: 'super_admin',
        } as unknown as App.Locals

        const canView = await canViewContent(locals, ['member', 'org:admin'] as AnyRole[])
        expect(canView).toBe(true) // super_admin >= member
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined userRole in locals', async () => {
      const locals = {
        userId: 'user_123',
        userRole: undefined,
      } as unknown as App.Locals

      const role = await getUserRole(locals, false)
      expect(role).toBeNull()
    })

    it('should handle empty allowed roles array', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      const canView = await canViewContent(locals, [])
      expect(canView).toBe(false)
    })

    it('should be case-sensitive for role matching', async () => {
      const locals = {
        userId: 'user_123',
        userRole: 'admin',
      } as unknown as App.Locals

      // 'Admin' (capital A) should not match 'admin', even with hierarchy
      // (because 'Admin' is not a valid role)
      const canView = await canViewContent(locals, ['Admin' as AnyRole], { useHierarchy: false })
      expect(canView).toBe(false)
    })
  })
})
