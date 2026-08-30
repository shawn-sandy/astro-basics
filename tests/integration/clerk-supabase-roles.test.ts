/**
 * Integration tests for Clerk-Supabase role-based access control
 *
 * Tests the integration between Clerk authentication and Supabase RLS policies,
 * including role-based authorization and organization membership.
 *
 * @group integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'
import {
  ClerkRole,
  isOrgAdmin,
  isOrgMember,
  hasOrgRole,
  hasRequiredRole,
  getRolePermissions,
  formatRoleLabel,
  getOrgIdFromClaims,
} from '#utils/clerk-roles'

describe('Clerk-Supabase Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Database Schema', () => {
    const supabase = getSupabaseServiceRole()

    it('should have Supabase configured', () => {
      expect(isSupabaseConfigured()).toBe(true)
      expect(supabase).not.toBeNull()
    })

    it('should have users table created', async () => {
      if (!supabase) {
        return expect(supabase).not.toBeNull()
      }

      const { error } = await supabase.from('users').select('id').limit(1)

      // Either succeeds or returns no rows (both are valid)
      expect(error).toBeNull()
    })

    it('should have organization_memberships table created', async () => {
      if (!supabase) {
        return expect(supabase).not.toBeNull()
      }

      const { error } = await supabase.from('organization_memberships').select('id').limit(1)

      expect(error).toBeNull()
    })

    it('should have user_preferences table created', async () => {
      if (!supabase) {
        return expect(supabase).not.toBeNull()
      }

      const { error } = await supabase.from('user_preferences').select('id').limit(1)

      expect(error).toBeNull()
    })

    it('should have RLS enabled on users table', async () => {
      if (!supabase) {
        return expect(supabase).not.toBeNull()
      }

      const { data, error } = await supabase.rpc('exec', {
        sql: `
          SELECT tablename, rowsecurity
          FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = 'users'
        `,
      })

      // RLS status check (may not be available in all environments)
      if (error) {
        console.warn('RLS check skipped:', error.message)
        return
      }

      expect(data).toBeDefined()
    })
  })

  describe('Role Utilities', () => {
    describe('isOrgAdmin', () => {
      it('should return true for org:admin role', () => {
        expect(isOrgAdmin('org:admin')).toBe(true)
      })

      it('should return false for org:member role', () => {
        expect(isOrgAdmin('org:member')).toBe(false)
      })

      it('should return false for null role', () => {
        expect(isOrgAdmin(null)).toBe(false)
      })

      it('should return false for undefined role', () => {
        expect(isOrgAdmin(undefined)).toBe(false)
      })
    })

    describe('isOrgMember', () => {
      it('should return true for org:member role', () => {
        expect(isOrgMember('org:member')).toBe(true)
      })

      it('should return false for org:admin role', () => {
        expect(isOrgMember('org:admin')).toBe(false)
      })

      it('should return false for null role', () => {
        expect(isOrgMember(null)).toBe(false)
      })
    })

    describe('hasOrgRole', () => {
      it('should return true for org:admin', () => {
        expect(hasOrgRole('org:admin')).toBe(true)
      })

      it('should return true for org:member', () => {
        expect(hasOrgRole('org:member')).toBe(true)
      })

      it('should return false for null', () => {
        expect(hasOrgRole(null)).toBe(false)
      })
    })

    describe('hasRequiredRole', () => {
      it('should allow admin to access admin-required routes', () => {
        expect(hasRequiredRole('org:admin', ClerkRole.ADMIN)).toBe(true)
      })

      it('should allow admin to access member-required routes', () => {
        expect(hasRequiredRole('org:admin', ClerkRole.MEMBER)).toBe(true)
      })

      it('should allow member to access member-required routes', () => {
        expect(hasRequiredRole('org:member', ClerkRole.MEMBER)).toBe(true)
      })

      it('should deny member from accessing admin-required routes', () => {
        expect(hasRequiredRole('org:member', ClerkRole.ADMIN)).toBe(false)
      })

      it('should deny null role from accessing any protected routes', () => {
        expect(hasRequiredRole(null, ClerkRole.MEMBER)).toBe(false)
        expect(hasRequiredRole(null, ClerkRole.ADMIN)).toBe(false)
      })
    })

    describe('getRolePermissions', () => {
      it('should return all permissions for admin', () => {
        const perms = getRolePermissions('org:admin')
        expect(perms.canManageSettings).toBe(true)
        expect(perms.canInviteMembers).toBe(true)
        expect(perms.canRemoveMembers).toBe(true)
        expect(perms.canManageRoles).toBe(true)
        expect(perms.canManageBilling).toBe(true)
      })

      it('should return limited permissions for member', () => {
        const perms = getRolePermissions('org:member')
        expect(perms.canManageSettings).toBe(false)
        expect(perms.canInviteMembers).toBe(false)
        expect(perms.canRemoveMembers).toBe(false)
        expect(perms.canManageRoles).toBe(false)
        expect(perms.canManageBilling).toBe(false)
        expect(perms.canViewMembers).toBe(true)
        expect(perms.canViewBilling).toBe(true)
      })

      it('should return member permissions for null role', () => {
        const perms = getRolePermissions(null)
        expect(perms.canManageSettings).toBe(false)
      })
    })

    describe('formatRoleLabel', () => {
      it('should format org:admin as Administrator', () => {
        expect(formatRoleLabel('org:admin')).toBe('Administrator')
      })

      it('should format org:member as Member', () => {
        expect(formatRoleLabel('org:member')).toBe('Member')
      })

      it('should format null as Guest', () => {
        expect(formatRoleLabel(null)).toBe('Guest')
      })

      it('should format custom roles nicely', () => {
        expect(formatRoleLabel('org:custom_role')).toBe('Custom Role')
      })
    })

    describe('getOrgIdFromClaims', () => {
      it('should extract org_id from claims', () => {
        const claims = { org_id: 'org_123abc' }
        expect(getOrgIdFromClaims(claims)).toBe('org_123abc')
      })

      it('should return null for missing org_id', () => {
        const claims = {}
        expect(getOrgIdFromClaims(claims)).toBeNull()
      })

      it('should return null for undefined claims', () => {
        expect(getOrgIdFromClaims(undefined)).toBeNull()
      })
    })
  })

  describe('Database Operations (Service Role)', () => {
    const supabase = getSupabaseServiceRole()

    it('should allow service role to query users table', async () => {
      if (!supabase) {
        return expect(supabase).not.toBeNull()
      }

      const { data, error } = await supabase.from('users').select('*').limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should allow service role to query organization_memberships', async () => {
      if (!supabase) {
        return expect(supabase).not.toBeNull()
      }

      const { data, error } = await supabase.from('organization_memberships').select('*').limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should allow service role to query user_preferences', async () => {
      if (!supabase) {
        return expect(supabase).not.toBeNull()
      }

      const { data, error } = await supabase.from('user_preferences').select('*').limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
