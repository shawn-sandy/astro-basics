/**
 * Clerk Organization Roles Utility
 *
 * Provides type-safe role checking for Clerk organization members.
 * Works with Clerk's default roles (org:admin, org:member) and custom roles.
 *
 * @module clerk-roles
 * @see {@link https://clerk.com/docs/organizations/roles-permissions}
 */

/**
 * Standard Clerk organization role identifiers
 *
 * Clerk provides two default roles:
 * - org:admin: Full organization management permissions
 * - org:member: Limited read-only access to organization resources
 *
 * @enum {string}
 */
export const ClerkRole = {
  /** Organization administrator with full permissions */
  ADMIN: 'org:admin',
  /** Organization member with limited read-only access */
  MEMBER: 'org:member',
} as const

export type ClerkRoleType = (typeof ClerkRole)[keyof typeof ClerkRole]

/**
 * Permission capabilities mapped to Clerk default roles
 *
 * Defines what actions each role can perform in the organization context.
 * These align with Clerk's default permission sets.
 *
 * @interface RolePermissions
 */
export interface RolePermissions {
  /** Can manage organization settings and configuration */
  canManageSettings: boolean
  /** Can invite new members to the organization */
  canInviteMembers: boolean
  /** Can remove members from the organization */
  canRemoveMembers: boolean
  /** Can assign or modify member roles */
  canManageRoles: boolean
  /** Can access and modify billing information */
  canManageBilling: boolean
  /** Can view member list (read-only access) */
  canViewMembers: boolean
  /** Can view billing information (read-only access) */
  canViewBilling: boolean
}

/**
 * Role permission matrix for Clerk default roles
 *
 * Maps each standard role to its permission set.
 * Custom roles default to member-level permissions for security.
 *
 * @constant
 */
const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  [ClerkRole.ADMIN]: {
    canManageSettings: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canManageRoles: true,
    canManageBilling: true,
    canViewMembers: true,
    canViewBilling: true,
  },
  [ClerkRole.MEMBER]: {
    canManageSettings: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageRoles: false,
    canManageBilling: false,
    canViewMembers: true, // Clerk default: members can read member list
    canViewBilling: true, // Clerk default: members can read billing info
  },
}

/**
 * Checks if a user has organization administrator privileges
 *
 * Used for UI conditional rendering and server-side authorization.
 * Returns false for null/undefined roles (unauthenticated users).
 *
 * @param {string | null | undefined} role - User's role from session claims or locals
 * @returns {boolean} True if user is an organization admin
 *
 * @example
 * ```typescript
 * // In Astro component
 * const isAdmin = isOrgAdmin(Astro.locals.userRole)
 *
 * // In API endpoint
 * if (!isOrgAdmin(locals.userRole)) {
 *   return new Response('Forbidden', { status: 403 })
 * }
 * ```
 */
export function isOrgAdmin(role: string | null | undefined): boolean {
  return role === ClerkRole.ADMIN
}

/**
 * Checks if a user is a regular organization member (non-admin)
 *
 * Useful for displaying member-specific UI or enforcing member-level restrictions.
 * Returns false for admins and unauthenticated users.
 *
 * @param {string | null | undefined} role - User's role from session claims or locals
 * @returns {boolean} True if user is an organization member (not admin)
 *
 * @example
 * ```typescript
 * const showLimitedView = isOrgMember(Astro.locals.userRole)
 * ```
 */
export function isOrgMember(role: string | null | undefined): boolean {
  return role === ClerkRole.MEMBER
}

/**
 * Checks if a user has any organization membership (admin or member)
 *
 * Determines if user belongs to an organization regardless of role level.
 * More permissive than specific role checks.
 *
 * @param {string | null | undefined} role - User's role from session claims or locals
 * @returns {boolean} True if user has any organization role
 *
 * @example
 * ```typescript
 * // Show organization content only to members
 * {hasOrgRole(Astro.locals.userRole) && <OrgContent />}
 * ```
 */
export function hasOrgRole(role: string | null | undefined): boolean {
  return role === ClerkRole.ADMIN || role === ClerkRole.MEMBER
}

/**
 * Retrieves permission set for a given role
 *
 * Returns the full permission object for granular access control.
 * Unknown/custom roles default to member-level permissions (principle of least privilege).
 *
 * @param {string | null | undefined} role - User's role from session claims or locals
 * @returns {RolePermissions} Permission object with boolean capability flags
 *
 * @example
 * ```typescript
 * const permissions = getRolePermissions(Astro.locals.userRole)
 * if (permissions.canManageBilling) {
 *   // Show billing management UI
 * }
 * ```
 */
export function getRolePermissions(role: string | null | undefined): RolePermissions {
  if (!role) {
    // Unauthenticated: no permissions
    return ROLE_PERMISSIONS[ClerkRole.MEMBER] as RolePermissions
  }

  // Return known role permissions, default to member permissions for custom roles
  return (ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS[ClerkRole.MEMBER]) as RolePermissions
}

/**
 * Checks if a user has a specific permission capability
 *
 * Granular permission check for individual actions.
 * Provides type-safe access to permission properties.
 *
 * @param {string | null | undefined} role - User's role from session claims or locals
 * @param {keyof RolePermissions} permission - Specific permission to check
 * @returns {boolean} True if user has the requested permission
 *
 * @example
 * ```typescript
 * // Check single permission
 * const canInvite = hasPermission(Astro.locals.userRole, 'canInviteMembers')
 *
 * // Conditional rendering
 * {hasPermission(locals.userRole, 'canManageSettings') && (
 *   <SettingsButton />
 * )}
 * ```
 */
export function hasPermission(
  role: string | null | undefined,
  permission: keyof RolePermissions
): boolean {
  const permissions = getRolePermissions(role)
  return permissions[permission]
}

/**
 * Formats role identifier for display in UI
 *
 * Converts technical role identifiers to human-readable labels.
 * Handles both Clerk default roles and custom organization roles.
 *
 * @param {string | null | undefined} role - Role identifier to format
 * @returns {string} Human-readable role label
 *
 * @example
 * ```typescript
 * formatRoleLabel('org:admin') // Returns: "Administrator"
 * formatRoleLabel('org:member') // Returns: "Member"
 * formatRoleLabel('org:custom_role') // Returns: "Custom Role"
 * formatRoleLabel(null) // Returns: "Guest"
 * ```
 */
export function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Guest'

  const roleLabels: Record<string, string> = {
    [ClerkRole.ADMIN]: 'Administrator',
    [ClerkRole.MEMBER]: 'Member',
  }

  if (roleLabels[role]) {
    return roleLabels[role]
  }

  // Format custom roles: "org:custom_role" -> "Custom Role"
  return role
    .replace(/^org:/, '') // Remove org: prefix
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, char => char.toUpperCase()) // Capitalize words
}
