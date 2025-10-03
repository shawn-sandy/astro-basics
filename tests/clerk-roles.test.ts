import { describe, it, expect } from 'vitest'
import {
  ClerkRole,
  isOrgAdmin,
  isOrgMember,
  hasOrgRole,
  getRolePermissions,
  hasPermission,
  formatRoleLabel,
} from '../src/utils/clerk-roles'

describe('Clerk Roles Utility', () => {
  describe('isOrgAdmin', () => {
    it('returns true for org:admin role', () => {
      expect(isOrgAdmin('org:admin')).toBe(true)
    })

    it('returns false for org:member role', () => {
      expect(isOrgAdmin('org:member')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isOrgAdmin(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isOrgAdmin(undefined)).toBe(false)
    })

    it('returns false for custom roles', () => {
      expect(isOrgAdmin('org:custom_role')).toBe(false)
    })
  })

  describe('isOrgMember', () => {
    it('returns true for org:member role', () => {
      expect(isOrgMember('org:member')).toBe(true)
    })

    it('returns false for org:admin role', () => {
      expect(isOrgMember('org:admin')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isOrgMember(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isOrgMember(undefined)).toBe(false)
    })
  })

  describe('hasOrgRole', () => {
    it('returns true for org:admin', () => {
      expect(hasOrgRole('org:admin')).toBe(true)
    })

    it('returns true for org:member', () => {
      expect(hasOrgRole('org:member')).toBe(true)
    })

    it('returns false for null', () => {
      expect(hasOrgRole(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(hasOrgRole(undefined)).toBe(false)
    })

    it('returns false for custom roles', () => {
      expect(hasOrgRole('org:custom_role')).toBe(false)
    })
  })

  describe('getRolePermissions', () => {
    it('returns full permissions for org:admin', () => {
      const permissions = getRolePermissions('org:admin')

      expect(permissions.canManageSettings).toBe(true)
      expect(permissions.canInviteMembers).toBe(true)
      expect(permissions.canRemoveMembers).toBe(true)
      expect(permissions.canManageRoles).toBe(true)
      expect(permissions.canManageBilling).toBe(true)
      expect(permissions.canViewMembers).toBe(true)
      expect(permissions.canViewBilling).toBe(true)
    })

    it('returns limited permissions for org:member', () => {
      const permissions = getRolePermissions('org:member')

      expect(permissions.canManageSettings).toBe(false)
      expect(permissions.canInviteMembers).toBe(false)
      expect(permissions.canRemoveMembers).toBe(false)
      expect(permissions.canManageRoles).toBe(false)
      expect(permissions.canManageBilling).toBe(false)
      expect(permissions.canViewMembers).toBe(true) // Members can view
      expect(permissions.canViewBilling).toBe(true) // Members can view
    })

    it('defaults to member permissions for null', () => {
      const permissions = getRolePermissions(null)

      expect(permissions.canManageSettings).toBe(false)
      expect(permissions.canViewMembers).toBe(true)
    })

    it('defaults to member permissions for undefined', () => {
      const permissions = getRolePermissions(undefined)

      expect(permissions.canManageSettings).toBe(false)
      expect(permissions.canViewMembers).toBe(true)
    })

    it('defaults to member permissions for custom roles', () => {
      const permissions = getRolePermissions('org:custom_role')

      expect(permissions.canManageSettings).toBe(false)
      expect(permissions.canViewMembers).toBe(true)
      expect(permissions.canViewBilling).toBe(true)
    })
  })

  describe('hasPermission', () => {
    it('returns true when admin has manage permission', () => {
      expect(hasPermission('org:admin', 'canManageSettings')).toBe(true)
    })

    it('returns false when member lacks manage permission', () => {
      expect(hasPermission('org:member', 'canManageSettings')).toBe(false)
    })

    it('returns true when member has view permission', () => {
      expect(hasPermission('org:member', 'canViewMembers')).toBe(true)
    })

    it('returns false for null role with manage permission', () => {
      expect(hasPermission(null, 'canManageSettings')).toBe(false)
    })

    it('returns true for null role with view permission (defaults to member)', () => {
      expect(hasPermission(null, 'canViewMembers')).toBe(true)
    })
  })

  describe('formatRoleLabel', () => {
    it('formats org:admin as Administrator', () => {
      expect(formatRoleLabel('org:admin')).toBe('Administrator')
    })

    it('formats org:member as Member', () => {
      expect(formatRoleLabel('org:member')).toBe('Member')
    })

    it('formats null as Guest', () => {
      expect(formatRoleLabel(null)).toBe('Guest')
    })

    it('formats undefined as Guest', () => {
      expect(formatRoleLabel(undefined)).toBe('Guest')
    })

    it('formats custom role with org: prefix removed', () => {
      expect(formatRoleLabel('org:custom_role')).toBe('Custom Role')
    })

    it('capitalizes multiple words in custom roles', () => {
      expect(formatRoleLabel('org:content_editor')).toBe('Content Editor')
    })

    it('handles roles without org: prefix', () => {
      expect(formatRoleLabel('moderator')).toBe('Moderator')
    })
  })

  describe('ClerkRole constants', () => {
    it('defines ADMIN constant', () => {
      expect(ClerkRole.ADMIN).toBe('org:admin')
    })

    it('defines MEMBER constant', () => {
      expect(ClerkRole.MEMBER).toBe('org:member')
    })
  })

  describe('Permission-based UI scenarios', () => {
    it('admin sees all 4 action cards', () => {
      const role = 'org:admin'

      const showMembers =
        hasPermission(role, 'canManageRoles') || hasPermission(role, 'canViewMembers')
      const showSettings = hasPermission(role, 'canManageSettings')
      const showBilling =
        hasPermission(role, 'canManageBilling') || hasPermission(role, 'canViewBilling')
      const showIntegrations = hasPermission(role, 'canManageSettings')

      expect(showMembers).toBe(true)
      expect(showSettings).toBe(true)
      expect(showBilling).toBe(true)
      expect(showIntegrations).toBe(true)
    })

    it('member sees only 2 action cards (Members and Billing view-only)', () => {
      const role = 'org:member'

      const showMembers =
        hasPermission(role, 'canManageRoles') || hasPermission(role, 'canViewMembers')
      const showSettings = hasPermission(role, 'canManageSettings')
      const showBilling =
        hasPermission(role, 'canManageBilling') || hasPermission(role, 'canViewBilling')
      const showIntegrations = hasPermission(role, 'canManageSettings')

      expect(showMembers).toBe(true) // Can view
      expect(showSettings).toBe(false) // Cannot manage
      expect(showBilling).toBe(true) // Can view
      expect(showIntegrations).toBe(false) // Cannot manage
    })

    it('member sees different card descriptions than admin', () => {
      const adminRole = 'org:admin'
      const memberRole = 'org:member'

      const adminBillingDesc = hasPermission(adminRole, 'canManageBilling')
        ? 'Manage billing and subscriptions'
        : 'View billing information'

      const memberBillingDesc = hasPermission(memberRole, 'canManageBilling')
        ? 'Manage billing and subscriptions'
        : 'View billing information'

      expect(adminBillingDesc).toBe('Manage billing and subscriptions')
      expect(memberBillingDesc).toBe('View billing information')
    })
  })
})
