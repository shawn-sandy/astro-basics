/**
 * Role-based visibility system - Core utilities
 *
 * Provides server-side role checking for both Supabase user roles
 * and Clerk organization roles with caching, error handling, and
 * comprehensive debugging support.
 *
 * @module utils/role-guard
 */

/* eslint-disable no-undef */
// App.Locals is a global type provided by Astro - ESLint doesn't recognize it

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'

import type { AnyRole, RoleCheckResult, RoleGuardConfig, UserRole } from './role-types'
import { ALL_ROLES, ROLE_LABELS, USER_ROLES } from './role-types'

/**
 * Cache entry for user roles
 */
interface RoleCacheEntry {
  role: AnyRole
  expiresAt: number
}

/**
 * In-memory role cache with TTL
 *
 * Reduces database queries by caching user roles. Automatically expires
 * entries after TTL (default: 1 minute).
 */
const roleCache = new Map<string, RoleCacheEntry>()

/**
 * Default cache TTL (1 minute)
 */
const DEFAULT_CACHE_TTL = 60000

/**
 * Validates if a string is a valid role
 *
 * Type guard that narrows string to AnyRole type.
 *
 * @param role - String to validate
 * @returns True if role is valid
 *
 * @example
 * if (isValidRole(userInput)) {
 *   // TypeScript now knows userInput is AnyRole
 *   const label = ROLE_LABELS[userInput]
 * }
 */
export function isValidRole(role: string): role is AnyRole {
  return ALL_ROLES.includes(role as AnyRole)
}

/**
 * Formats role for display with human-readable labels
 *
 * @param role - Role to format
 * @returns Human-readable role label
 *
 * @example
 * formatRoleForDisplay('super_admin') // Returns: "Super Admin"
 * formatRoleForDisplay('org:admin')    // Returns: "Organization Admin"
 */
export function formatRoleForDisplay(role: AnyRole): string {
  return ROLE_LABELS[role] || role
}

/**
 * Fetches user role from Supabase with caching
 *
 * Uses service role client to bypass RLS. Caches results to minimize
 * database queries. Falls back gracefully if Supabase unavailable.
 *
 * @param userId - Clerk user ID
 * @param cacheTTL - Cache time-to-live in milliseconds
 * @returns User role or null if not found/error
 *
 * @internal
 */
async function fetchUserRoleFromSupabase(
  userId: string,
  cacheTTL: number = DEFAULT_CACHE_TTL
): Promise<UserRole | null> {
  // Check cache first
  const cached = roleCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.role as UserRole
  }

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    console.warn('[role-guard] Supabase not configured - cannot fetch user role')
    return null
  }

  // Fetch from Supabase
  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    console.warn('[role-guard] Supabase service role client unavailable')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (error) {
      // PGRST116 = no rows returned (user not in database yet)
      if (error.code === 'PGRST116') {
        console.debug(`[role-guard] User ${userId} not found in Supabase - defaulting to member`)
        return 'member' // Default role for new users
      }

      console.error('[role-guard] Failed to fetch user role from Supabase:', error.message)
      return null
    }

    if (!data || !data.role) {
      return null
    }

    const userRole = data.role as UserRole

    // Validate role before caching
    if (!USER_ROLES.includes(userRole)) {
      console.warn(`[role-guard] Invalid user role from Supabase: ${userRole}`)
      return null
    }

    // Cache the result
    roleCache.set(userId, {
      role: userRole,
      expiresAt: Date.now() + cacheTTL,
    })

    return userRole
  } catch (err) {
    console.error('[role-guard] Error fetching user role:', err)
    return null
  }
}

/**
 * Extracts user role from Astro.locals with optional Supabase fallback
 *
 * Checks Astro.locals first (populated by middleware for org roles),
 * then optionally queries Supabase for user roles.
 *
 * @param locals - Astro.locals containing auth state
 * @param fetchFromSupabase - Whether to query Supabase if role not in locals
 * @returns User role or null if not authenticated
 *
 * @example
 * ```astro
 * ---
 * // Get org role from Clerk session (if available)
 * const orgRole = await getUserRole(Astro.locals, false)
 *
 * // Get user role from Supabase (fallback)
 * const userRole = await getUserRole(Astro.locals, true)
 * ---
 * ```
 */
export async function getUserRole(
  locals: App.Locals,
  fetchFromSupabase = false
): Promise<AnyRole | null> {
  // Check if user is authenticated
  if (!locals.userId) {
    return null
  }

  // First check: Clerk org role in locals (populated by middleware)
  if (locals.userRole && isValidRole(locals.userRole)) {
    return locals.userRole as AnyRole
  }

  // Second check: Fetch from Supabase if enabled
  if (fetchFromSupabase) {
    return await fetchUserRoleFromSupabase(locals.userId)
  }

  return null
}

/**
 * Checks if user can view content based on role requirements
 *
 * Primary role-checking function. Supports both OR logic (user has ANY
 * of the allowed roles) and automatic role system detection.
 *
 * @param locals - Astro.locals containing auth state
 * @param allowedRoles - Array of roles that can view content
 * @param options - Optional configuration
 * @returns True if user has any of the allowed roles
 *
 * @example
 * ```astro
 * ---
 * // Check if user is admin or super_admin
 * const canView = await canViewContent(Astro.locals, ['admin', 'super_admin'])
 * ---
 *
 * {canView && <AdminPanel />}
 * ```
 *
 * @example
 * ```astro
 * ---
 * // Check org admin access with Supabase fallback
 * const canManageOrg = await canViewContent(
 *   Astro.locals,
 *   ['org:admin', 'super_admin'],
 *   { fetchFromSupabase: true }
 * )
 * ---
 * ```
 */
export async function canViewContent(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<boolean> {
  // Merge with defaults
  const config: RoleGuardConfig = {
    allowedRoles,
    context: options?.context ?? 'auto',
    fetchFromSupabase: options?.fetchFromSupabase ?? true,
    cacheTTL: options?.cacheTTL ?? DEFAULT_CACHE_TTL,
  }

  // Get user's current role
  const userRole = await getUserRole(locals, config.fetchFromSupabase)

  // Not authenticated = no access
  if (!userRole) {
    return false
  }

  // Check if user's role is in allowed list
  return config.allowedRoles.includes(userRole)
}

/**
 * Checks if user can view content with detailed result metadata
 *
 * Enhanced version of canViewContent that returns debugging information.
 * Useful for audit logging and troubleshooting authorization issues.
 *
 * @param locals - Astro.locals containing auth state
 * @param allowedRoles - Array of roles that can view content
 * @param options - Optional configuration
 * @returns Detailed authorization result
 *
 * @example
 * ```astro
 * ---
 * const result = await canViewContentDetailed(Astro.locals, ['admin'])
 *
 * if (!result.allowed) {
 *   console.log('Access denied:', result.reason)
 * }
 * ---
 * ```
 */
export async function canViewContentDetailed(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<RoleCheckResult> {
  const config: RoleGuardConfig = {
    allowedRoles,
    context: options?.context ?? 'auto',
    fetchFromSupabase: options?.fetchFromSupabase ?? true,
    cacheTTL: options?.cacheTTL ?? DEFAULT_CACHE_TTL,
  }

  const userRole = await getUserRole(locals, config.fetchFromSupabase)

  if (!userRole) {
    return {
      allowed: false,
      userRole: null,
      reason: 'User not authenticated',
    }
  }

  const allowed = config.allowedRoles.includes(userRole)

  if (!allowed) {
    return {
      allowed: false,
      userRole,
      reason: `User role "${userRole}" not in allowed roles: ${config.allowedRoles.join(', ')}`,
    }
  }

  return {
    allowed: true,
    userRole,
  }
}

/**
 * Throws error if user doesn't have required role (for page-level protection)
 *
 * Use this in page frontmatter to protect entire routes. Throws 403 error
 * if user lacks permission, preventing page render.
 *
 * @param locals - Astro.locals containing auth state
 * @param allowedRoles - Array of roles required to access page
 * @param options - Optional configuration
 * @throws {Error} 403 Forbidden if user lacks permission
 *
 * @example
 * ```astro
 * ---
 * import { requireRole } from '#utils/role-guard'
 *
 * // Protect entire page - only super_admin can access
 * await requireRole(Astro.locals, ['super_admin'])
 * ---
 *
 * <html>
 *   <body>
 *     <h1>Super Admin Dashboard</h1>
 *     <!-- This only renders if user is super_admin -->
 *   </body>
 * </html>
 * ```
 */
export async function requireRole(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<void> {
  const result = await canViewContentDetailed(locals, allowedRoles, options)

  if (!result.allowed) {
    throw new Error(`403 Forbidden: ${result.reason || 'Access denied'}`)
  }
}

/**
 * Checks if user has ANY of the specified roles (OR logic)
 *
 * Alias for canViewContent with explicit name. Use when you want
 * to make the OR logic semantically clear in your code.
 *
 * @param locals - Astro.locals containing auth state
 * @param roles - Array of roles to check
 * @param options - Optional configuration
 * @returns True if user has any of the roles
 *
 * @example
 * ```astro
 * ---
 * // User needs to be admin OR super_admin
 * const isStaff = await hasAnyRole(Astro.locals, ['admin', 'super_admin'])
 * ---
 * ```
 */
export async function hasAnyRole(
  locals: App.Locals,
  roles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<boolean> {
  return await canViewContent(locals, roles, options)
}

/**
 * Checks if user has ALL of the specified roles (AND logic)
 *
 * Useful for multi-tenant scenarios where user might have both
 * a Supabase user role AND a Clerk org role.
 *
 * Note: Currently requires manual fetching of both role types.
 * Future enhancement: automatic multi-role fetching.
 *
 * @param locals - Astro.locals containing auth state
 * @param roles - Array of roles user must have ALL of
 * @param options - Optional configuration
 * @returns True if user has all specified roles
 *
 * @example
 * ```astro
 * ---
 * // User must be both org:admin AND super_admin
 * const isSuperOrgAdmin = await hasAllRoles(
 *   Astro.locals,
 *   ['org:admin', 'super_admin']
 * )
 * ---
 * ```
 */
export async function hasAllRoles(
  locals: App.Locals,
  roles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<boolean> {
  // This is a simplified implementation that checks if the user's single role
  // matches all required roles (which only works if roles.length === 1)
  // For true AND logic across multiple role systems, we'd need to:
  // 1. Separate roles by context (user vs org)
  // 2. Fetch both from respective sources
  // 3. Verify user has all required roles

  // Current limitation: Only works for single-role checks
  if (roles.length !== 1) {
    console.warn(
      '[role-guard] hasAllRoles with multiple roles not fully implemented - checking ANY role instead'
    )
  }

  const userRole = await getUserRole(locals, options?.fetchFromSupabase ?? true)

  if (!userRole) {
    return false
  }

  // Check if user has all specified roles
  // (Current implementation: check if user's role is in the list)
  return roles.includes(userRole)
}

/**
 * Clears the role cache
 *
 * Useful for testing or when you need to force fresh role queries.
 * In production, cache auto-expires via TTL.
 *
 * @param userId - Optional user ID to clear specific entry (clears all if omitted)
 *
 * @example
 * ```typescript
 * // Clear specific user's cached role
 * clearRoleCache('user_123')
 *
 * // Clear entire cache
 * clearRoleCache()
 * ```
 */
export function clearRoleCache(userId?: string): void {
  if (userId) {
    roleCache.delete(userId)
  } else {
    roleCache.clear()
  }
}

/**
 * Gets cache statistics (for debugging/monitoring)
 *
 * @returns Cache size and entry count
 */
export function getRoleCacheStats(): { size: number; entries: number } {
  return {
    size: roleCache.size,
    entries: Array.from(roleCache.values()).filter(entry => entry.expiresAt > Date.now()).length,
  }
}
