# Role-Based Component Visibility System (v2 - Revised)

**Status**: 🟢 Ready for Implementation
**Created**: 2025-10-07
**Revised**: 2025-10-07
**Estimated Effort**: 6-8 hours
**Implementation Approach**: Integrated Hybrid (extends existing clerk-roles.ts)

---

## Revision Summary

This v2 plan addresses critical issues found in the original implementation plan:

### Key Changes from v1

1. ✅ **Type System Clarity**: Separate Clerk and Supabase roles explicitly
2. ✅ **Integration**: Extends existing `clerk-roles.ts` utility instead of duplicating
3. ✅ **Security**: Server-side-only role determination in React components
4. ✅ **Caching**: Complete LRU cache strategy with invalidation
5. ✅ **Type Safety**: Updated `App.Locals` interface with both role types
6. ✅ **Database**: Proper integration with unified database abstraction

### Review Issues Addressed

- 🔴 Type system confusion (Clerk vs Supabase roles)
- 🔴 Missing integration with existing utilities
- 🔴 Incorrect `getUserRole()` implementation
- 🔴 Missing Supabase client integration
- 🔴 Security flaw in client-side role determination
- 🔴 Incomplete caching strategy

---

## Executive Summary

This document outlines the implementation of a **Role-Based Visibility System** that enables developers to control component and content visibility based on user roles. The system integrates seamlessly with the existing `clerk-roles.ts` utility and properly distinguishes between two separate role systems:

- **Clerk Organization Roles**: Organization-level permissions (`org:admin`, `org:member`)
- **Supabase User Roles**: Application-level permissions (`member`, `admin`, `super_admin`)

### Business Value

- **Security**: Enforce role-based access control at the UI component level
- **Developer Experience**: Extends familiar patterns from existing codebase
- **Flexibility**: Support both Clerk org permissions and app-level permissions
- **Maintainability**: Centralized permission logic without code duplication

### Key Design Principles

1. **Clear Role Separation**: Distinguish Clerk org roles from Supabase user roles
2. **Pattern Consistency**: Extend existing utilities, don't duplicate
3. **Type Safety**: Full TypeScript support with strict type checking
4. **Security First**: Server-side role determination only
5. **Performance**: LRU caching with smart invalidation

---

## Architecture Design

### Dual Role System Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     Role Guard System (v2)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Clerk Organization Roles                     │  │
│  │  Purpose: Organization-level permissions                  │  │
│  │  Source: Clerk session claims (Astro.locals.clerkOrgRole)│  │
│  │  Values: 'org:admin' | 'org:member'                      │  │
│  │  Utility: clerk-roles.ts (existing)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Supabase User Roles                          │  │
│  │  Purpose: Application-level permissions                   │  │
│  │  Source: Supabase users table                             │  │
│  │  Values: 'member' | 'admin' | 'super_admin'              │  │
│  │  Utility: role-guard.ts (new, with LRU cache)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Unified Access Checks                        │  │
│  │  • hasRoleAccess() - Checks both role systems             │  │
│  │  • RoleGuard components - Server-side pre-computed        │  │
│  │  • Integration with database abstraction layer            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── utils/
│   ├── clerk-roles.ts              # Existing - Clerk org role utilities
│   ├── role-guard.ts               # NEW - Supabase role utilities
│   └── role-types.ts               # NEW - Unified type definitions
├── components/
│   ├── astro/
│   │   └── RoleGuard.astro         # NEW - Astro wrapper component
│   └── react/
│       └── RoleGuard.tsx           # NEW - React wrapper component
├── env.d.ts                        # UPDATED - Add supabaseUserRole to locals
└── libs/
    └── database.ts                 # EXISTING - Unified database abstraction

docs/
└── implementation-plans/
    ├── role-based-visibility-system.md      # Original plan (v1)
    └── role-based-visibility-system-v2.md   # This document (v2)
```

---

## Type System Design

### Core Type Definitions (`src/utils/role-types.ts`)

```typescript
/**
 * Role Type Definitions for Role-Based Visibility System
 *
 * This module provides clear separation between two role systems:
 * 1. Clerk Organization Roles - Organization-level permissions
 * 2. Supabase User Roles - Application-level permissions
 *
 * @module role-types
 */

/**
 * Supabase user roles for application-level permissions
 * Stored in users.role column in Supabase database
 */
export type SupabaseUserRole = 'member' | 'admin' | 'super_admin'

/**
 * Clerk organization roles for org-level permissions
 * Stored in Clerk session claims
 */
export type ClerkOrgRole = 'org:admin' | 'org:member'

/**
 * Combined type for any role check
 * Used when a component needs to check either role system
 */
export type AnyRole = SupabaseUserRole | ClerkOrgRole

/**
 * Role context specifies which role system to check
 */
export interface SupabaseRoleContext {
  type: 'supabase'
  role: SupabaseUserRole | null
}

export interface ClerkRoleContext {
  type: 'clerk'
  role: ClerkOrgRole | null
}

export type RoleContext = SupabaseRoleContext | ClerkRoleContext

/**
 * Role check result with detailed information
 */
export interface RoleCheckResult {
  /** Whether user has required access */
  hasAccess: boolean
  /** User's Clerk org role (if in org context) */
  clerkOrgRole: ClerkOrgRole | null
  /** User's Supabase app role */
  supabaseUserRole: SupabaseUserRole | null
  /** Reason for denial (if hasAccess is false) */
  denialReason?: 'not_authenticated' | 'insufficient_role' | 'fetch_failed'
}

/**
 * Configuration for role guards
 */
export interface RoleGuardConfig {
  /** Roles allowed to view content */
  allowedRoles: AnyRole[]
  /** Cache TTL in milliseconds (default: 60000 = 1 minute) */
  cacheTTL?: number
  /** Whether to log access denials for debugging */
  logDenials?: boolean
}

/**
 * Type guard to check if role is a Clerk org role
 */
export function isClerkOrgRole(role: string): role is ClerkOrgRole {
  return role === 'org:admin' || role === 'org:member'
}

/**
 * Type guard to check if role is a Supabase user role
 */
export function isSupabaseUserRole(role: string): role is SupabaseUserRole {
  return role === 'member' || role === 'admin' || role === 'super_admin'
}

/**
 * Formats role for display
 * Delegates to clerk-roles.ts for Clerk roles
 */
export function formatRoleLabel(role: AnyRole): string {
  if (isClerkOrgRole(role)) {
    // Delegate to existing utility
    return formatRoleLabel(role)
  }

  const labels: Record<SupabaseUserRole, string> = {
    member: 'Member',
    admin: 'Administrator',
    super_admin: 'Super Administrator',
  }

  return labels[role]
}
```

### Updated App.Locals Type (`src/env.d.ts`)

```typescript
declare namespace App {
  interface Locals {
    // Authentication
    userId?: string | null
    clerkToken?: string | null

    // Clerk Organization Context
    clerkOrgRole?: ClerkOrgRole | null // Renamed from userRole for clarity
    orgId?: string | null

    // Supabase User Role (app-level)
    supabaseUserRole?: SupabaseUserRole | null

    // CSRF Protection
    csrfToken?: string
  }
}
```

---

## Implementation Phases

### Phase 1: Core Utility Functions (2-3 hours)

#### 1.1 Update Middleware (`src/middleware.ts`)

```typescript
// Enhanced middleware to set both role types in locals
const authMiddleware = clerkMiddleware(async (auth, context, next) => {
  const { locals } = context

  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }

  if (auth().userId) {
    locals.userId = auth().userId

    // Clerk organization role
    const claims = auth().sessionClaims
    locals.clerkOrgRole = (claims?.org_role as ClerkOrgRole) ?? null
    locals.orgId = (claims?.org_id as string) ?? null

    // Get Clerk session token
    try {
      const token = await auth().getToken()
      locals.clerkToken = token

      logger.debug('Auth middleware - User authenticated', {
        userId: locals.userId ?? undefined,
        clerkOrgRole: locals.clerkOrgRole,
        orgId: locals.orgId,
      })

      // Update last sign in and fetch Supabase role
      if (isProtectedRoute(context.request)) {
        try {
          // Fetch Supabase role with caching
          locals.supabaseUserRole = await getCachedSupabaseRole(locals.userId)
        } catch (error) {
          logger.warn('Failed to fetch Supabase role in middleware', { error })
          // Don't block request if role fetch fails
        }

        // Update last sign in (async, don't block)
        updateLastSignIn(locals.userId).catch(error => {
          logger.error('Failed to update last sign in', { error })
        })
      }
    } catch (error) {
      logger.error('Failed to get Clerk token', { error })
    }
  }

  return next()
})
```

#### 1.2 Create Role Guard Utility (`src/utils/role-guard.ts`)

````typescript
/**
 * Role Guard Utilities for Supabase User Roles
 *
 * Provides caching and access control for application-level user roles.
 * For Clerk organization roles, use clerk-roles.ts instead.
 *
 * @module role-guard
 */

import { LRUCache } from 'lru-cache'
import { db } from '#libs/database'
import { logger } from '#utils/logger'
import { isClerkOrgRole, isSupabaseUserRole } from '#utils/role-types'
import { isOrgAdmin, hasRequiredRole as hasClerkRole, type ClerkRoleType } from '#utils/clerk-roles'
import type {
  AnyRole,
  ClerkOrgRole,
  SupabaseUserRole,
  RoleCheckResult,
  RoleGuardConfig,
} from '#utils/role-types'

/**
 * LRU cache for Supabase user roles
 * - Max 1000 entries (prevents memory bloat)
 * - 60 second TTL (balances freshness vs performance)
 * - Updates age on access (frequently accessed entries stay cached)
 */
const roleCache = new LRUCache<string, SupabaseUserRole>({
  max: 1000,
  ttl: 60000, // 1 minute
  updateAgeOnGet: true,
})

/**
 * Fetches user role from Supabase with LRU caching
 *
 * Uses project's unified database abstraction layer to support
 * both Turso and Supabase backends transparently.
 *
 * @param userId - Clerk user ID
 * @returns User's Supabase role or null if not found/error
 *
 * @example
 * ```typescript
 * const role = await getCachedSupabaseRole('user_123')
 * ```
 */
export async function getCachedSupabaseRole(
  userId: string | null | undefined
): Promise<SupabaseUserRole | null> {
  if (!userId) return null

  const cacheKey = `role:${userId}`

  // Check cache first
  const cached = roleCache.get(cacheKey)
  if (cached) {
    logger.debug('Cache hit for user role', { userId })
    return cached
  }

  try {
    // Fetch from database using unified abstraction
    const result = await db.execute({
      sql: 'SELECT role FROM users WHERE clerk_id = ? LIMIT 1',
      args: [userId],
    })

    const role = result.rows[0]?.role as SupabaseUserRole | undefined

    if (role && isSupabaseUserRole(role)) {
      // Cache the result
      roleCache.set(cacheKey, role)
      logger.debug('Fetched and cached user role', { userId, role })
      return role
    }

    logger.warn('User role not found in database', { userId })
    return null
  } catch (error) {
    logger.error('Failed to fetch user role from database', { userId, error })
    return null
  }
}

/**
 * Invalidates cached role for a user
 * Call this when user role changes (e.g., via webhook)
 *
 * @param userId - Clerk user ID
 *
 * @example
 * ```typescript
 * // In webhook handler
 * await invalidateUserRoleCache(event.data.id)
 * ```
 */
export function invalidateUserRoleCache(userId: string): void {
  const cacheKey = `role:${userId}`
  const existed = roleCache.delete(cacheKey)

  logger.info('Invalidated user role cache', {
    userId,
    existed,
  })
}

/**
 * Clears entire role cache
 * Useful for testing or emergency cache flush
 */
export function clearRoleCache(): void {
  roleCache.clear()
  logger.info('Cleared entire role cache')
}

/**
 * Gets cache statistics for monitoring
 */
export function getRoleCacheStats() {
  return {
    size: roleCache.size,
    max: roleCache.max,
    calculatedSize: roleCache.calculatedSize,
  }
}

/**
 * Retrieves all user roles (both Clerk and Supabase)
 *
 * This is the primary function for role determination.
 * Returns structured data distinguishing between role types.
 *
 * @param locals - Astro.locals containing auth state
 * @returns Object with both role types or null values
 *
 * @example
 * ```typescript
 * const { clerkOrgRole, supabaseUserRole } = await getUserRoles(Astro.locals)
 *
 * if (supabaseUserRole === 'super_admin') {
 *   // User is app super admin
 * }
 *
 * if (clerkOrgRole === 'org:admin') {
 *   // User is org admin in current organization
 * }
 * ```
 */
export async function getUserRoles(locals: App.Locals): Promise<{
  clerkOrgRole: ClerkOrgRole | null
  supabaseUserRole: SupabaseUserRole | null
}> {
  // Clerk org role is already in locals (from middleware)
  const clerkOrgRole = (locals.clerkOrgRole as ClerkOrgRole) ?? null

  // Supabase role might be in locals (pre-fetched) or need fetching
  let supabaseUserRole = (locals.supabaseUserRole as SupabaseUserRole) ?? null

  if (!supabaseUserRole && locals.userId) {
    // Not pre-fetched, fetch now with caching
    supabaseUserRole = await getCachedSupabaseRole(locals.userId)
  }

  return {
    clerkOrgRole,
    supabaseUserRole,
  }
}

/**
 * Checks if user has access based on role requirements
 *
 * Automatically detects role type (Clerk vs Supabase) and delegates
 * to appropriate checking logic. Supports mixed role checks.
 *
 * @param locals - Astro.locals containing auth state
 * @param allowedRoles - Array of roles that grant access (OR logic)
 * @param config - Optional configuration
 * @returns Detailed result object with access decision and role info
 *
 * @security Server-side only - never expose this logic to client
 *
 * @example
 * ```typescript
 * // Check for Supabase admin
 * const result = await hasRoleAccess(Astro.locals, ['admin', 'super_admin'])
 *
 * // Check for Clerk org admin
 * const result = await hasRoleAccess(Astro.locals, ['org:admin'])
 *
 * // Check for either (user is org admin OR app super admin)
 * const result = await hasRoleAccess(Astro.locals, ['org:admin', 'super_admin'])
 * ```
 */
export async function hasRoleAccess(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  config?: Partial<RoleGuardConfig>
): Promise<RoleCheckResult> {
  const { clerkOrgRole, supabaseUserRole } = await getUserRoles(locals)

  // User must be authenticated
  if (!locals.userId) {
    if (config?.logDenials) {
      logger.debug('Access denied - not authenticated')
    }

    return {
      hasAccess: false,
      clerkOrgRole: null,
      supabaseUserRole: null,
      denialReason: 'not_authenticated',
    }
  }

  // Separate allowed roles by type
  const allowedClerkRoles = allowedRoles.filter(isClerkOrgRole)
  const allowedSupabaseRoles = allowedRoles.filter(isSupabaseUserRole)

  // Check Clerk roles (if any specified)
  let clerkRoleMatch = false
  if (allowedClerkRoles.length > 0 && clerkOrgRole) {
    clerkRoleMatch = allowedClerkRoles.some(requiredRole =>
      hasClerkRole(clerkOrgRole, requiredRole as ClerkRoleType)
    )
  }

  // Check Supabase roles (if any specified)
  let supabaseRoleMatch = false
  if (allowedSupabaseRoles.length > 0 && supabaseUserRole) {
    supabaseRoleMatch = allowedSupabaseRoles.includes(supabaseUserRole)
  }

  // Grant access if ANY role matches (OR logic)
  const hasAccess = clerkRoleMatch || supabaseRoleMatch

  if (!hasAccess && config?.logDenials) {
    logger.debug('Access denied - insufficient role', {
      userId: locals.userId,
      clerkOrgRole,
      supabaseUserRole,
      allowedRoles,
    })
  }

  return {
    hasAccess,
    clerkOrgRole,
    supabaseUserRole,
    denialReason: hasAccess ? undefined : 'insufficient_role',
  }
}

/**
 * Requires user to have one of the specified roles
 * Throws error if user lacks permission (for page-level protection)
 *
 * @param locals - Astro.locals containing auth state
 * @param allowedRoles - Array of roles required to access page
 * @throws {Error} 403 Forbidden if user lacks permission
 *
 * @example
 * ```astro
 * ---
 * import { requireRole } from '#utils/role-guard'
 *
 * // Protect entire page - throws 403 if unauthorized
 * await requireRole(Astro.locals, ['admin', 'super_admin'])
 * ---
 * ```
 */
export async function requireRole(locals: App.Locals, allowedRoles: AnyRole[]): Promise<void> {
  const result = await hasRoleAccess(locals, allowedRoles, { logDenials: true })

  if (!result.hasAccess) {
    const error = new Error('Forbidden: Insufficient permissions')
    ;(error as Error & { status: number }).status = 403
    throw error
  }
}

/**
 * Checks if user is a Supabase admin (admin or super_admin)
 * Convenience function for common check
 *
 * @param locals - Astro.locals containing auth state
 * @returns True if user is admin or super_admin
 *
 * @example
 * ```typescript
 * if (await isSupabaseAdmin(Astro.locals)) {
 *   // Show admin controls
 * }
 * ```
 */
export async function isSupabaseAdmin(locals: App.Locals): Promise<boolean> {
  const { supabaseUserRole } = await getUserRoles(locals)
  return supabaseUserRole === 'admin' || supabaseUserRole === 'super_admin'
}

/**
 * Checks if user is a super admin
 * Convenience function for highest privilege check
 *
 * @param locals - Astro.locals containing auth state
 * @returns True if user is super_admin
 *
 * @example
 * ```typescript
 * if (await isSuperAdmin(Astro.locals)) {
 *   // Show danger zone
 * }
 * ```
 */
export async function isSuperAdmin(locals: App.Locals): Promise<boolean> {
  const { supabaseUserRole } = await getUserRoles(locals)
  return supabaseUserRole === 'super_admin'
}
````

#### 1.3 Testing (`tests/utils/role-guard.test.ts`)

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  getCachedSupabaseRole,
  invalidateUserRoleCache,
  clearRoleCache,
  getUserRoles,
  hasRoleAccess,
  requireRole,
  isSupabaseAdmin,
  isSuperAdmin,
} from '#utils/role-guard'

// Mock database
vi.mock('#libs/database', () => ({
  db: {
    execute: vi.fn(),
  },
}))

// Mock logger
vi.mock('#utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('role-guard utilities', () => {
  beforeEach(() => {
    clearRoleCache()
    vi.clearAllMocks()
  })

  describe('getCachedSupabaseRole', () => {
    test('fetches role from database on cache miss', async () => {
      const mockDb = await import('#libs/database')
      ;(mockDb.db.execute as any).mockResolvedValue({
        rows: [{ role: 'admin' }],
      })

      const role = await getCachedSupabaseRole('user_123')
      expect(role).toBe('admin')
      expect(mockDb.db.execute).toHaveBeenCalledOnce()
    })

    test('returns cached role on cache hit', async () => {
      const mockDb = await import('#libs/database')
      ;(mockDb.db.execute as any).mockResolvedValue({
        rows: [{ role: 'admin' }],
      })

      // First call - cache miss
      await getCachedSupabaseRole('user_123')

      // Second call - cache hit
      const role = await getCachedSupabaseRole('user_123')

      expect(role).toBe('admin')
      expect(mockDb.db.execute).toHaveBeenCalledOnce() // Only called once
    })

    test('returns null for non-existent user', async () => {
      const mockDb = await import('#libs/database')
      ;(mockDb.db.execute as any).mockResolvedValue({
        rows: [],
      })

      const role = await getCachedSupabaseRole('nonexistent')
      expect(role).toBeNull()
    })

    test('returns null on database error', async () => {
      const mockDb = await import('#libs/database')
      ;(mockDb.db.execute as any).mockRejectedValue(new Error('DB error'))

      const role = await getCachedSupabaseRole('user_123')
      expect(role).toBeNull()
    })
  })

  describe('hasRoleAccess', () => {
    test('grants access for matching Supabase role', async () => {
      const mockDb = await import('#libs/database')
      ;(mockDb.db.execute as any).mockResolvedValue({
        rows: [{ role: 'admin' }],
      })

      const locals = {
        userId: 'user_123',
        clerkOrgRole: null,
        supabaseUserRole: null,
      } as App.Locals

      const result = await hasRoleAccess(locals, ['admin', 'super_admin'])

      expect(result.hasAccess).toBe(true)
      expect(result.supabaseUserRole).toBe('admin')
    })

    test('grants access for matching Clerk role', async () => {
      const locals = {
        userId: 'user_123',
        clerkOrgRole: 'org:admin',
        supabaseUserRole: 'member',
      } as App.Locals

      const result = await hasRoleAccess(locals, ['org:admin'])

      expect(result.hasAccess).toBe(true)
      expect(result.clerkOrgRole).toBe('org:admin')
    })

    test('denies access for insufficient role', async () => {
      const locals = {
        userId: 'user_123',
        clerkOrgRole: null,
        supabaseUserRole: 'member',
      } as App.Locals

      const result = await hasRoleAccess(locals, ['admin'])

      expect(result.hasAccess).toBe(false)
      expect(result.denialReason).toBe('insufficient_role')
    })

    test('denies access for unauthenticated user', async () => {
      const locals = {
        userId: null,
      } as App.Locals

      const result = await hasRoleAccess(locals, ['admin'])

      expect(result.hasAccess).toBe(false)
      expect(result.denialReason).toBe('not_authenticated')
    })
  })

  describe('requireRole', () => {
    test('does not throw for authorized user', async () => {
      const locals = {
        userId: 'user_123',
        supabaseUserRole: 'admin',
      } as App.Locals

      await expect(requireRole(locals, ['admin'])).resolves.not.toThrow()
    })

    test('throws 403 for unauthorized user', async () => {
      const locals = {
        userId: 'user_123',
        supabaseUserRole: 'member',
      } as App.Locals

      await expect(requireRole(locals, ['admin'])).rejects.toThrow('Forbidden')
    })
  })

  describe('convenience functions', () => {
    test('isSupabaseAdmin returns true for admin', async () => {
      const locals = {
        userId: 'user_123',
        supabaseUserRole: 'admin',
      } as App.Locals

      expect(await isSupabaseAdmin(locals)).toBe(true)
    })

    test('isSupabaseAdmin returns true for super_admin', async () => {
      const locals = {
        userId: 'user_123',
        supabaseUserRole: 'super_admin',
      } as App.Locals

      expect(await isSupabaseAdmin(locals)).toBe(true)
    })

    test('isSupabaseAdmin returns false for member', async () => {
      const locals = {
        userId: 'user_123',
        supabaseUserRole: 'member',
      } as App.Locals

      expect(await isSupabaseAdmin(locals)).toBe(false)
    })

    test('isSuperAdmin returns true only for super_admin', async () => {
      const superAdminLocals = {
        userId: 'user_123',
        supabaseUserRole: 'super_admin',
      } as App.Locals

      const adminLocals = {
        userId: 'user_456',
        supabaseUserRole: 'admin',
      } as App.Locals

      expect(await isSuperAdmin(superAdminLocals)).toBe(true)
      expect(await isSuperAdmin(adminLocals)).toBe(false)
    })
  })

  describe('cache invalidation', () => {
    test('invalidateUserRoleCache removes user from cache', async () => {
      const mockDb = await import('#libs/database')
      ;(mockDb.db.execute as any).mockResolvedValue({
        rows: [{ role: 'admin' }],
      })

      // Cache the role
      await getCachedSupabaseRole('user_123')

      // Invalidate cache
      invalidateUserRoleCache('user_123')

      // Next fetch should hit database
      ;(mockDb.db.execute as any).mockResolvedValue({
        rows: [{ role: 'super_admin' }],
      })

      const role = await getCachedSupabaseRole('user_123')
      expect(role).toBe('super_admin')
      expect(mockDb.db.execute).toHaveBeenCalledTimes(2)
    })
  })
})
```

---

### Phase 2: Wrapper Components (1.5-2 hours)

#### 2.1 Astro RoleGuard Component (`src/components/astro/RoleGuard.astro`)

````astro
---
/**
 * RoleGuard - Server-side role-based content visibility
 *
 * Checks user permissions on the server and conditionally renders content.
 * Supports both Clerk org roles and Supabase user roles.
 *
 * @component
 * @example
 * ```astro
 * <RoleGuard allowedRoles={['admin', 'super_admin']}>
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 */

import type { AnyRole } from '#utils/role-types'
import { hasRoleAccess } from '#utils/role-guard'

export interface Props {
  /** Roles allowed to view content (OR logic) */
  allowedRoles: AnyRole[]
  /** Fallback content when user lacks permission */
  fallback?: string
  /** Show role debug info in development */
  debug?: boolean
}

const { allowedRoles, fallback, debug = false } = Astro.props

// Server-side role check
const result = await hasRoleAccess(Astro.locals, allowedRoles)

// Debug mode (only in development)
const isDev = import.meta.env.DEV
---

{
  debug && isDev && (
    <div class="role-guard-debug">
      <p>
        <strong>RoleGuard Debug Info</strong>
      </p>
      <p>User ID: {Astro.locals.userId || 'Not authenticated'}</p>
      <p>Clerk Org Role: {result.clerkOrgRole || 'None'}</p>
      <p>Supabase User Role: {result.supabaseUserRole || 'None'}</p>
      <p>Allowed Roles: {allowedRoles.join(', ')}</p>
      <p>Access: {result.hasAccess ? '✅ Granted' : '❌ Denied'}</p>
      {result.denialReason && <p>Reason: {result.denialReason}</p>}
    </div>
  )
}

{
  result.hasAccess ? (
    <slot />
  ) : fallback ? (
    <div class="role-guard-fallback">
      <p>{fallback}</p>
    </div>
  ) : null
}

<style>
  .role-guard-debug {
    background: #fff3cd;
    border: 1px solid #ffc107;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: monospace;
  }

  .role-guard-debug p {
    margin: 0.25rem 0;
  }

  .role-guard-fallback {
    padding: 1rem;
    background: #f8f9fa;
    border-left: 4px solid #6c757d;
    color: #6c757d;
  }

  .role-guard-fallback p {
    margin: 0;
  }
</style>
````

#### 2.2 React RoleGuard Component (`src/components/react/RoleGuard.tsx`)

````typescript
/**
 * RoleGuard - Client-side role-based content visibility
 *
 * ⚠️ SECURITY: This component receives PRE-COMPUTED access decision from server.
 * Never pass raw role data to client - only boolean hasAccess result.
 *
 * @module components/react/RoleGuard
 */

import type { ReactNode } from 'react'

export interface Props {
  /**
   * Whether user has access (PRE-COMPUTED server-side)
   * ⚠️ SECURITY: Server must compute this, never trust client-side calculation
   */
  hasAccess: boolean

  /** Content to render when authorized */
  children: ReactNode

  /** Fallback content when unauthorized */
  fallback?: ReactNode

  /** Show loading state */
  loading?: boolean

  /** Custom className for wrapper */
  className?: string
}

/**
 * Client-side role guard component
 *
 * SECURITY MODEL:
 * - Server computes hasAccess using hasRoleAccess()
 * - Server passes only boolean result to client
 * - Client renders based on boolean, no role logic
 * - Even if user tampers with props, server never sends protected data
 *
 * @example
 * ```tsx
 * // In React component
 * <RoleGuard
 *   hasAccess={hasAccess}
 *   fallback={<AccessDenied />}
 * >
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 *
 * @example
 * ```astro
 * ---
 * // In Astro page (server-side)
 * import { hasRoleAccess } from '#utils/role-guard'
 * import Dashboard from '#components/react/Dashboard'
 *
 * const result = await hasRoleAccess(Astro.locals, ['admin'])
 * ---
 *
 * <Dashboard hasAccess={result.hasAccess} client:load />
 * ```
 */
export function RoleGuard({
  hasAccess,
  children,
  fallback = null,
  loading = false,
  className,
}: Props) {
  // Loading state
  if (loading) {
    return (
      <div className={`role-guard-loading ${className || ''}`.trim()}>
        <p>Loading...</p>
      </div>
    )
  }

  // Access denied
  if (!hasAccess) {
    return fallback ? (
      <div className={`role-guard-fallback ${className || ''}`.trim()}>{fallback}</div>
    ) : null
  }

  // Access granted
  return <div className={className}>{children}</div>
}

export default RoleGuard
````

**Usage Pattern (Astro → React)**:

```astro
---
// server-side.astro
import Dashboard from '#components/react/Dashboard'
import { hasRoleAccess } from '#utils/role-guard'

// Server computes access
const adminAccess = await hasRoleAccess(Astro.locals, ['admin', 'super_admin'])
const memberAccess = await hasRoleAccess(Astro.locals, ['member', 'admin', 'super_admin'])
---

<Dashboard
  canViewAdmin={adminAccess.hasAccess}
  canViewMember={memberAccess.hasAccess}
  client:load
/>
```

```tsx
// Dashboard.tsx
import RoleGuard from '#components/react/RoleGuard'

interface Props {
  canViewAdmin: boolean
  canViewMember: boolean
}

export function Dashboard({ canViewAdmin, canViewMember }: Props) {
  return (
    <div>
      <h1>Dashboard</h1>

      <RoleGuard hasAccess={canViewAdmin} fallback={<p>Admin access required</p>}>
        <AdminPanel />
      </RoleGuard>

      <RoleGuard hasAccess={canViewMember}>
        <MemberContent />
      </RoleGuard>
    </div>
  )
}
```

`★ Insight ─────────────────────────────────────`
**Security Architecture**: The React component security model follows the "computed server-side, render client-side" pattern. The server performs all authorization logic and passes only the boolean decision to the client. Even if a malicious user modifies the `hasAccess` prop to `true` in their browser, they gain nothing - the server never sends protected data to unauthorized clients in the first place. This is defense-in-depth: UI guards + server-side data filtering + RLS policies.
`─────────────────────────────────────────────────`

---

### Phase 3: Documentation (1 hour)

#### 3.1 Developer Usage Guide (`docs/guides/role-guard-usage-guide.md`)

Create comprehensive guide covering:

1. **Quick Start** - Common patterns with copy-paste examples
2. **Role Systems Explained** - When to use Clerk vs Supabase roles
3. **API Reference** - Complete function signatures with examples
4. **Component Usage** - Astro and React component patterns
5. **Performance Tips** - Caching, pre-fetching in middleware
6. **Security Best Practices** - Server-side validation, defense-in-depth
7. **Troubleshooting** - Common issues and debugging
8. **Migration Guide** - Replacing manual role checks

---

### Phase 4: Integration & Testing (1.5-2 hours)

#### 4.1 Update Existing Components

**UserInfo.astro** - Replace manual Supabase query:

```astro
---
// Before
const supabase = getSupabaseServiceRole()
const { data } = await supabase.from('users').select('role').eq('clerk_id', userId).single()

// After
import { getUserRoles } from '#utils/role-guard'
const { supabaseUserRole } = await getUserRoles(Astro.locals)
---
```

#### 4.2 Integration Tests (`e2e/role-guard.spec.ts`)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Role Guard System', () => {
  test('member cannot view admin content', async ({ page }) => {
    // Sign in as member
    await page.goto('/dashboard')

    // Admin panel should not be visible
    await expect(page.locator('.admin-panel')).not.toBeVisible()

    // Fallback should be shown
    await expect(page.locator('.role-guard-fallback')).toContainText('Admin access required')
  })

  test('admin can view admin content', async ({ page }) => {
    // Sign in as admin (use test user with admin role)
    await page.goto('/dashboard')

    // Admin panel should be visible
    await expect(page.locator('.admin-panel')).toBeVisible()

    // No fallback shown
    await expect(page.locator('.role-guard-fallback')).not.toBeVisible()
  })

  test('org admin can manage organization', async ({ page }) => {
    // Sign in as org admin
    await page.goto('/organization')

    // Settings should be accessible
    await expect(page.locator('[data-testid="org-settings"]')).toBeVisible()
  })

  test('cache invalidation works on role change', async ({ page, context }) => {
    // TODO: Implement webhook simulation test
  })
})
```

---

## Performance Considerations

### Caching Strategy (LRU)

```typescript
/**
 * LRU Cache Configuration
 *
 * Why LRU (Least Recently Used)?
 * - Bounded memory usage (max 1000 entries)
 * - Automatic eviction of old entries
 * - Updates age on access (hot entries stay cached)
 * - Built-in TTL support
 *
 * Trade-offs:
 * - Memory: ~50KB for 1000 entries
 * - CPU: O(1) lookups and evictions
 * - Freshness: 60s TTL means up to 60s stale data
 */
const roleCache = new LRUCache<string, SupabaseUserRole>({
  max: 1000, // Max entries (prevents memory bloat)
  ttl: 60000, // 1 minute TTL (balances freshness vs load)
  updateAgeOnGet: true, // Keep hot entries cached longer
})
```

### Pre-fetching in Middleware

For protected routes, middleware pre-fetches Supabase role to avoid per-component queries:

```typescript
// In middleware.ts
if (isProtectedRoute(context.request)) {
  locals.supabaseUserRole = await getCachedSupabaseRole(locals.userId)
}
```

This means:

- ✅ Protected pages: 1 query per request (in middleware)
- ✅ Public pages: 0 queries (not pre-fetched)
- ✅ Components: 0 additional queries (use locals)

---

## Security Considerations

### Defense-in-Depth Model

```
Layer 1: Middleware (Authentication)
├─ Verifies Clerk session token
├─ Redirects unauthenticated users
└─ Sets locals.userId, locals.clerkOrgRole

Layer 2: Role Guards (Authorization - UI)
├─ Server-side role checks
├─ Conditional rendering
└─ Fallback content for denied access

Layer 3: Row-Level Security (Data Protection)
├─ Supabase RLS policies
├─ Enforce role checks at database level
└─ Prevent data leakage even if UI bypassed

Layer 4: API Validation (Server-side Enforcement)
├─ Re-validate roles in API routes
├─ Never trust client-sent data
└─ Log unauthorized attempts
```

### Attack Vector Mitigation

1. **Role Spoofing** (Client modifies hasAccess prop)

   - ✅ Mitigation: Server never sends protected data to unauthorized clients
   - ✅ Even with tampered props, no sensitive data exposed

2. **Cache Poisoning** (Attacker tries to elevate cached role)

   - ✅ Mitigation: Cache keys include userId (isolated per user)
   - ✅ Cache entries are immutable once set
   - ✅ Short TTL limits impact window

3. **Race Conditions** (Role changes mid-request)
   - ✅ Mitigation: 60s TTL means worst case 60s stale
   - ✅ Webhook invalidation clears cache immediately
   - ✅ Critical operations re-fetch without cache

---

## Migration Guide

### Step 1: Update Imports

```typescript
// Remove direct Supabase queries
- import { getSupabaseServiceRole } from '#libs/supabase'

// Add role guard utilities
+ import { hasRoleAccess, getUserRoles } from '#utils/role-guard'
+ import RoleGuard from '#components/astro/RoleGuard.astro'
```

### Step 2: Replace Manual Role Checks

```astro
---
// Before
const supabase = getSupabaseServiceRole()
const { data } = await supabase
  .from('users')
  .select('role')
  .eq('clerk_id', Astro.locals.userId)
  .single()

const isAdmin = data?.role === 'admin'
---

{isAdmin && <AdminPanel />}

// After import RoleGuard from '#components/astro/RoleGuard.astro' ---

<RoleGuard allowedRoles={['admin']}>
  <AdminPanel />
</RoleGuard>
```

### Step 3: Update Page-Level Protection

```astro
---
// Before
if (!Astro.locals.userId) {
  return Astro.redirect('/sign-in')
}

const supabase = getSupabaseServiceRole()
const { data } = await supabase
  .from('users')
  .select('role')
  .eq('clerk_id', Astro.locals.userId)
  .single()

if (data?.role !== 'admin') {
  return new Response('Forbidden', { status: 403 })
}

// After
import { requireRole } from '#utils/role-guard'

await requireRole(Astro.locals, ['admin'])
---
```

---

## Success Criteria

### Functional Requirements

- ✅ Separate Clerk org roles from Supabase user roles
- ✅ Server-side-only role determination (security)
- ✅ LRU caching with TTL and invalidation
- ✅ Integration with unified database abstraction
- ✅ Extends existing clerk-roles.ts utility
- ✅ React components receive pre-computed access decisions only

### Non-Functional Requirements

- ✅ <50ms role check latency (with cache)
- ✅ <5MB memory footprint for cache
- ✅ 80%+ test coverage
- ✅ Zero breaking changes to existing code
- ✅ Full TypeScript strict mode compliance

### Documentation Requirements

- ✅ Complete API reference with JSDoc
- ✅ Usage guide with examples
- ✅ Security architecture explanation
- ✅ Migration guide for existing code

---

## Timeline and Effort

| Phase | Task                                      | Estimated Time |
| ----- | ----------------------------------------- | -------------- |
| 1.1   | Update middleware for dual role support   | 30 min         |
| 1.2   | Create role-types.ts with type guards     | 30 min         |
| 1.3   | Implement role-guard.ts with LRU cache    | 1.5 hours      |
| 1.4   | Write utility unit tests                  | 1 hour         |
| 2.1   | Create Astro RoleGuard component          | 30 min         |
| 2.2   | Create React RoleGuard component (secure) | 30 min         |
| 2.3   | Write component tests                     | 30 min         |
| 3.1   | Write developer usage guide               | 1 hour         |
| 3.2   | Update CLAUDE.md and env.d.ts             | 15 min         |
| 4.1   | Migrate UserInfo.astro                    | 15 min         |
| 4.2   | Write integration tests                   | 45 min         |
| 4.3   | Security testing                          | 30 min         |

**Total: 6-8 hours**

---

## Post-Implementation Checklist

- [ ] All tests passing (unit + integration)
- [ ] TypeScript strict mode compliance verified
- [ ] Security review completed
- [ ] Documentation published
- [ ] Example usage added to CLAUDE.md
- [ ] Cache monitoring in place
- [ ] Webhook invalidation tested
- [ ] Migration guide validated with real code

---

## Appendix: Decision Log

### Why LRU Cache Instead of Simple Map?

**Problem**: Simple Map grows unbounded, risks memory leak

**Solution**: LRUCache with max size and TTL

**Trade-offs**:

- ✅ Bounded memory usage
- ✅ Automatic eviction
- ✅ Built-in TTL
- ❌ Slight overhead (acceptable)

### Why Separate clerkOrgRole and supabaseUserRole?

**Problem**: Original plan conflated two different concepts

**Solution**: Explicit separation in types and locals

**Benefits**:

- ✅ Type safety (can't mix role types)
- ✅ Clear intent (which role system to check)
- ✅ Easier debugging
- ✅ Future-proof (can extend independently)

### Why Server-Only Role Determination in React?

**Problem**: Original plan passed userRole prop to React (security risk)

**Solution**: Pass pre-computed hasAccess boolean only

**Security Benefits**:

- ✅ No role data exposed to client
- ✅ Tampering with props has no effect
- ✅ Server always controls authorization
- ✅ Defense-in-depth maintained

---

**Document Version**: 2.0 (Revised)
**Status**: 🟢 Ready for Implementation
**Approval**: Pending Team Review
