/**
 * Role-based visibility system - Type definitions
 *
 * Provides unified type system for both Supabase user roles (app-level)
 * and Clerk organization roles (org-level) with full TypeScript support.
 *
 * @module utils/role-types
 */

/**
 * Supabase user roles (app-level permissions)
 *
 * Stored in Supabase `users` table, synced from Clerk webhooks.
 * Defines global user privileges across the entire application.
 */
export type UserRole = 'member' | 'admin' | 'super_admin'

/**
 * Clerk organization roles (org-level permissions)
 *
 * Stored in Clerk session claims (Astro.locals.userRole).
 * Defines privileges within a specific organization context.
 */
export type OrgRole = 'org:admin' | 'org:member'

/**
 * Unified role type supporting both systems
 *
 * Use this when building APIs that should work with either role type.
 */
export type AnyRole = UserRole | OrgRole

/**
 * Role context indicates which role system to check
 *
 * - 'user': Check Supabase user roles only
 * - 'org': Check Clerk organization roles only
 * - 'auto': Automatically detect based on role format (default)
 */
export type RoleContext = 'user' | 'org' | 'auto'

/**
 * Role check result with metadata
 *
 * Provides detailed information about authorization decisions,
 * useful for debugging and audit logging.
 */
export interface RoleCheckResult {
  /** Whether the user is authorized */
  allowed: boolean
  /** The user's current role (null if not authenticated) */
  userRole: AnyRole | null
  /** Human-readable reason for denial (undefined if allowed) */
  reason?: string
}

/**
 * Configuration for role guards
 *
 * Controls how role checking behaves, including caching,
 * fallback strategies, and role system selection.
 */
export interface RoleGuardConfig {
  /** Roles allowed to view content */
  allowedRoles: AnyRole[]
  /** Which role system to check ('auto' detects from role format) */
  context?: RoleContext
  /** Whether to fetch user role from Supabase if not in locals */
  fetchFromSupabase?: boolean
  /** Cache TTL in milliseconds (default: 60000 = 1 minute) */
  cacheTTL?: number
}

/**
 * Valid Supabase user roles constant
 *
 * Use for runtime validation and type guards.
 */
export const USER_ROLES: UserRole[] = ['member', 'admin', 'super_admin']

/**
 * Valid Clerk organization roles constant
 *
 * Use for runtime validation and type guards.
 */
export const ORG_ROLES: OrgRole[] = ['org:admin', 'org:member']

/**
 * All valid roles constant
 *
 * Combined list of all supported roles for validation.
 */
export const ALL_ROLES: AnyRole[] = [...USER_ROLES, ...ORG_ROLES]

/**
 * Human-readable role labels
 *
 * Maps role identifiers to display-friendly names for UI rendering.
 */
export const ROLE_LABELS: Record<AnyRole, string> = {
  member: 'Member',
  admin: 'Admin',
  super_admin: 'Super Admin',
  'org:admin': 'Organization Admin',
  'org:member': 'Organization Member',
}

/**
 * Role hierarchy levels
 *
 * Higher numbers = more privileges.
 * Useful for implementing "at least X role" checks.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  admin: 2,
  super_admin: 3,
}
