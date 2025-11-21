/**
 * Role-based visibility system - Type definitions
 *
 * Provides unified type system for both Supabase user roles (app-level)
 * and Clerk organization roles (org-level) with full TypeScript support.
 *
 * NOTE: User roles are now configurable via config/roles.config.ts
 * After running `npm run setup:roles`, generated types will be used automatically.
 *
 * @module utils/role-types
 */

import {
  type UserRole,
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_LABELS as GENERATED_ROLE_LABELS,
  ROLE_COLORS,
} from '#types/generated-roles'

/**
 * Supabase user roles (app-level permissions)
 *
 * Stored in Supabase `users` table, synced from Clerk webhooks.
 * Defines global user privileges across the entire application.
 *
 * Generated from config/roles.config.ts via `npm run setup:roles`.
 * Imported from #types/generated-roles
 */
export type { UserRole }

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
  /** Evaluation method used ('hierarchy' or 'exact') */
  evaluationMethod?: 'hierarchy' | 'exact'
  /** User's hierarchy level (only populated for hierarchical checks) */
  hierarchyLevel?: number
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
  /**
   * Whether to use hierarchical role checking (default: true)
   *
   * When enabled, higher-privilege roles can access content restricted to lower roles.
   * For example, if allowedRoles is ['member'], then 'admin' and 'super_admin' also gain access.
   *
   * Set to false for exact role matching (only the specified roles can access).
   *
   * @default true
   *
   * @example
   * // Hierarchical (default) - admin and super_admin can also view
   * { allowedRoles: ['member'], useHierarchy: true }
   *
   * @example
   * // Exact matching - only members can view
   * { allowedRoles: ['member'], useHierarchy: false }
   */
  useHierarchy?: boolean
}

/**
 * Valid Supabase user roles constant
 *
 * Use for runtime validation and type guards.
 * Imported from generated-roles.ts
 */
export { USER_ROLES }

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
 * Combines generated user role labels with Clerk org role labels.
 */
export const ROLE_LABELS: Record<AnyRole, string> = {
  ...GENERATED_ROLE_LABELS,
  'org:admin': 'Organization Admin',
  'org:member': 'Organization Member',
}

/**
 * Role hierarchy levels
 *
 * Higher numbers = more privileges.
 * Useful for implementing "at least X role" checks.
 * Imported from generated-roles.ts
 */
export { ROLE_HIERARCHY }

/**
 * Role color configuration for UI badges
 *
 * Auto-generated WCAG AA compliant colors based on role hierarchy.
 * Imported from generated-roles.ts
 */
export { ROLE_COLORS }
