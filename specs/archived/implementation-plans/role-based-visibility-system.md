# Role-Based Component Visibility System

> **⚠️ ARCHIVED**: This implementation plan has been superseded by the implemented role guard system.
>
> **Current Implementation**: See [src/utils/role-guard.ts](../../src/utils/role-guard.ts)
>
> **Documentation**: See [specs/guides/role-guard-usage-guide.md](../guides/role-guard-usage-guide.md) and [specs/guides/configurable-roles.md](../guides/configurable-roles.md)
>
> **Archived Date**: 2025-10-10
>
> **Reason**: System has been fully implemented with hierarchical role checking support

**Original Status**: 🟡 Planning Phase
**Created**: 2025-10-07
**Estimated Effort**: 5-7 hours
**Implementation Approach**: Hybrid (Option 2 + Option 1)

---

## Executive Summary

This document outlines the implementation of a **Hybrid Role-Based Visibility System** that enables developers to control component and content visibility based on user roles. The system supports both **Supabase user roles** (app-level permissions) and **Clerk organization roles** (org-level permissions) through a flexible API that provides both utility functions and declarative wrapper components.

### Business Value

- **Security**: Enforce role-based access control at the UI component level
- **Developer Experience**: Simple, type-safe API matching existing project patterns
- **Flexibility**: Support both imperative (utility functions) and declarative (wrapper components) approaches
- **Maintainability**: Centralized permission logic reduces code duplication

### Key Design Principles

1. **Dual Role System Support**: Handle both Supabase and Clerk roles seamlessly
2. **Pattern Consistency**: Match existing utilities like `clerk-roles.ts`
3. **Type Safety**: Full TypeScript support with exported types
4. **Performance**: Server-side rendering with minimal overhead
5. **Developer Ergonomics**: Simple API for common cases, powerful for complex scenarios

---

## Current State Analysis

### Existing Role Systems

#### 1. Supabase User Roles (App-Level)

**Location**: `scripts/migrations/001_core_schema.sql:21-30`

```sql
CREATE TYPE user_role AS ENUM (
    'member',       -- Default role for all users
    'admin',        -- Organization administrators
    'super_admin'   -- System administrators
);
```

**Storage**: `users` table in Supabase
**Sync Source**: Clerk webhook → Supabase database
**Current Usage**: `UserInfo.astro:15-88`, `RoleBadge.tsx:15`

#### 2. Clerk Organization Roles (Org-Level)

**Location**: `src/utils/clerk-roles.ts:20-25`

```typescript
export const ClerkRole = {
  ADMIN: 'org:admin', // Full organization management
  MEMBER: 'org:member', // Limited read-only access
} as const
```

**Storage**: Clerk session claims (`Astro.locals.userRole`)
**Current Usage**: `middleware.ts:275`, organization pages
**Permissions**: Defined in `clerk-roles.ts:62-81`

### Gap Analysis

**What's Missing**:

1. ❌ No unified API for checking role permissions in components
2. ❌ Developers must manually query Supabase for user roles
3. ❌ No convenient wrapper components for conditional rendering
4. ❌ Role checking logic scattered across codebase
5. ❌ No built-in fallback UI for unauthorized users

**Current Workarounds**:

```astro
---
const supabase = getSupabaseServiceRole()
const { data } = await supabase.from('users').select('role').eq('clerk_id', userId).single()

const isAdmin = data?.role === 'admin' || data?.role === 'super_admin'
---

<!-- Developers currently do this manually -->{isAdmin && <AdminPanel />}
```

**Problems with Current Approach**:

- Verbose and error-prone
- No type safety
- Duplicated queries
- No caching strategy
- Inconsistent patterns across components

---

## Architecture Design

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Role Guard System                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Utility Layer   │      │  Component Layer │        │
│  │  (Option 2)      │      │  (Option 1)      │        │
│  ├──────────────────┤      ├──────────────────┤        │
│  │ canViewContent() │◄─────│ <RoleGuard />    │        │
│  │ requireRole()    │      │   (Astro)        │        │
│  │ getUserRole()    │      │                  │        │
│  │ hasAnyRole()     │      │ <RoleGuard />    │        │
│  │ hasAllRoles()    │      │   (React)        │        │
│  └──────────────────┘      └──────────────────┘        │
│           │                          │                   │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
    ┌──────────────────────────────────────────┐
    │         Role Data Sources                 │
    ├──────────────────────────────────────────┤
    │                                            │
    │  ┌─────────────────┐  ┌─────────────────┐│
    │  │ Supabase Roles  │  │  Clerk Roles    ││
    │  ├─────────────────┤  ├─────────────────┤│
    │  │ • member        │  │ • org:admin     ││
    │  │ • admin         │  │ • org:member    ││
    │  │ • super_admin   │  │                 ││
    │  └─────────────────┘  └─────────────────┘│
    │         │                      │          │
    │         ▼                      ▼          │
    │   users table            Astro.locals    │
    │   (Supabase)            (session claims) │
    └──────────────────────────────────────────┘
```

### File Structure

```
src/
├── utils/
│   ├── role-guard.ts              # Core utility functions
│   └── role-types.ts              # TypeScript types & constants
├── components/
│   ├── astro/
│   │   └── RoleGuard.astro        # Astro wrapper component
│   └── react/
│       └── RoleGuard.tsx          # React wrapper component
└── types/
    └── role-guard.d.ts            # Global type definitions

docs/
├── implementation-plans/
│   └── role-based-visibility-system.md  # This document
└── guides/
    └── role-guard-usage-guide.md        # Developer guide
```

---

## Implementation Phases

### Phase 1: Core Utility Functions (2-3 hours)

**Goal**: Create type-safe utility functions for role checking

#### 1.1 Create Role Types (`src/utils/role-types.ts`)

```typescript
/**
 * Unified role type supporting both Supabase and Clerk roles
 */
export type UserRole = 'member' | 'admin' | 'super_admin'
export type OrgRole = 'org:admin' | 'org:member'
export type AnyRole = UserRole | OrgRole

/**
 * Role context indicates which role system to check
 */
export type RoleContext = 'user' | 'org' | 'auto'

/**
 * Role check result with metadata
 */
export interface RoleCheckResult {
  allowed: boolean
  userRole: AnyRole | null
  reason?: string
}

/**
 * Configuration for role guards
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
```

#### 1.2 Create Utility Functions (`src/utils/role-guard.ts`)

**Core Functions**:

````typescript
/**
 * Checks if user can view content based on role requirements
 *
 * @param locals - Astro.locals containing auth state
 * @param allowedRoles - Array of roles that can view content
 * @param options - Optional configuration
 * @returns True if user has any of the allowed roles
 *
 * @example
 * ```astro
 * const canView = await canViewContent(Astro.locals, ['admin', 'super_admin'])
 * ```
 */
export async function canViewContent(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<boolean>

/**
 * Throws error if user doesn't have required role (for page-level protection)
 *
 * @param locals - Astro.locals containing auth state
 * @param allowedRoles - Array of roles required to access page
 * @throws {Error} 403 Forbidden if user lacks permission
 *
 * @example
 * ```astro
 * ---
 * await requireRole(Astro.locals, ['super_admin'])
 * // Page content only renders if user is super_admin
 * ---
 * ```
 */
export async function requireRole(locals: App.Locals, allowedRoles: AnyRole[]): Promise<void>

/**
 * Extracts user role from Astro.locals with optional Supabase fallback
 *
 * @param locals - Astro.locals containing auth state
 * @param fetchFromSupabase - Whether to query Supabase if role not in locals
 * @returns User role or null if not authenticated
 */
export async function getUserRole(
  locals: App.Locals,
  fetchFromSupabase?: boolean
): Promise<AnyRole | null>

/**
 * Checks if user has ANY of the specified roles (OR logic)
 */
export async function hasAnyRole(locals: App.Locals, roles: AnyRole[]): Promise<boolean>

/**
 * Checks if user has ALL of the specified roles (AND logic)
 * Useful for multi-tenant scenarios
 */
export async function hasAllRoles(locals: App.Locals, roles: AnyRole[]): Promise<boolean>

/**
 * Gets human-readable label for role
 *
 * @example
 * formatRoleForDisplay('super_admin') // Returns: "Super Admin"
 * formatRoleForDisplay('org:admin')    // Returns: "Organization Admin"
 */
export function formatRoleForDisplay(role: AnyRole): string

/**
 * Validates if role string is a valid role
 */
export function isValidRole(role: string): role is AnyRole
````

**Implementation Details**:

1. **Role Detection Logic**:

   ```typescript
   function detectRoleContext(role: string): RoleContext {
     if (role.startsWith('org:')) return 'org'
     return 'user'
   }
   ```

2. **Caching Strategy**:
   - Use in-memory cache with TTL for Supabase role queries
   - Cache key: `role:${userId}`
   - Invalidate on role changes (webhook)

3. **Error Handling**:
   - Graceful fallback if Supabase unavailable
   - Log warnings for debugging
   - Never block rendering on role fetch failures

#### 1.3 Testing (`tests/utils/role-guard.test.ts`)

```typescript
describe('role-guard utilities', () => {
  test('canViewContent returns true for allowed role', async () => {
    const locals = { userId: 'user_123', userRole: 'admin' }
    expect(await canViewContent(locals, ['admin', 'super_admin'])).toBe(true)
  })

  test('canViewContent returns false for disallowed role', async () => {
    const locals = { userId: 'user_123', userRole: 'member' }
    expect(await canViewContent(locals, ['admin'])).toBe(false)
  })

  test('requireRole throws for unauthorized user', async () => {
    const locals = { userId: 'user_123', userRole: 'member' }
    await expect(requireRole(locals, ['admin'])).rejects.toThrow('403')
  })

  test('getUserRole fetches from Supabase when not in locals', async () => {
    // Test Supabase fallback
  })

  test('supports both Supabase and Clerk roles', async () => {
    // Test role context detection
  })
})
```

---

### Phase 2: Wrapper Components (1-2 hours)

#### 2.1 Astro RoleGuard Component (`src/components/astro/RoleGuard.astro`)

```astro
---
import type { AnyRole } from '#utils/role-types'
import { canViewContent } from '#utils/role-guard'

export interface Props {
  /** Roles allowed to view content */
  allowedRoles: AnyRole[]
  /** Fallback content when user lacks permission */
  fallback?: string
  /** Show role debug info in development */
  debug?: boolean
}

const { allowedRoles, fallback, debug = false } = Astro.props

// Check if user can view content
const canView = await canViewContent(Astro.locals, allowedRoles)

// Debug mode (only in development)
const isDev = import.meta.env.DEV
const userRole = await getUserRole(Astro.locals)
---

{
  debug && isDev && (
    <div class="role-guard-debug">
      <p>User Role: {userRole || 'Not authenticated'}</p>
      <p>Allowed Roles: {allowedRoles.join(', ')}</p>
      <p>Access: {canView ? 'Granted' : 'Denied'}</p>
    </div>
  )
}

{
  canView ? (
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
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .role-guard-fallback {
    padding: 1rem;
    background: #f8f9fa;
    border-left: 4px solid #6c757d;
    color: #6c757d;
  }
</style>
```

**Usage Examples**:

```astro
<!-- Simple usage -->
<RoleGuard allowedRoles={['admin', 'super_admin']}>
  <AdminPanel />
</RoleGuard>

<!-- With fallback -->
<RoleGuard
  allowedRoles={['super_admin']}
  fallback="You need super admin permissions to view this content."
>
  <DangerZone />
</RoleGuard>

<!-- Debug mode (development only) -->
<RoleGuard allowedRoles={['admin']} debug={true}>
  <DebugPanel />
</RoleGuard>

<!-- Works with Clerk org roles too -->
<RoleGuard allowedRoles={['org:admin']}>
  <OrgSettings />
</RoleGuard>
```

#### 2.2 React RoleGuard Component (`src/components/react/RoleGuard.tsx`)

````typescript
/**
 * RoleGuard - React component for role-based content visibility
 *
 * Client-side version that receives role data as props (pre-fetched server-side)
 *
 * @module components/react/RoleGuard
 */

import type { ReactNode } from 'react'
import type { AnyRole } from '#utils/role-types'

export interface Props {
  /** Current user's role (passed from server) */
  userRole: AnyRole | null
  /** Roles allowed to view content */
  allowedRoles: AnyRole[]
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
 * Note: userRole must be passed from server-side code as React components
 * cannot access Astro.locals directly
 *
 * @example
 * ```tsx
 * <RoleGuard
 *   userRole={userRole}
 *   allowedRoles={['admin', 'super_admin']}
 *   fallback={<AccessDenied />}
 * >
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  userRole,
  allowedRoles,
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

  // Check if user has any allowed role
  const hasAccess = userRole && allowedRoles.includes(userRole)

  if (!hasAccess) {
    return fallback ? (
      <div className={`role-guard-fallback ${className || ''}`.trim()}>
        {fallback}
      </div>
    ) : null
  }

  return <div className={className}>{children}</div>
}

export default RoleGuard
````

**Usage Examples**:

```tsx
// In React component (userRole passed from Astro)
import RoleGuard from '#components/react/RoleGuard'

function Dashboard({ userRole }: { userRole: AnyRole | null }) {
  return (
    <div>
      <h1>Dashboard</h1>

      <RoleGuard
        userRole={userRole}
        allowedRoles={['admin', 'super_admin']}
        fallback={<p>Admin access required</p>}
      >
        <AdminSettings />
      </RoleGuard>

      <RoleGuard userRole={userRole} allowedRoles={['member', 'admin', 'super_admin']}>
        <UserContent />
      </RoleGuard>
    </div>
  )
}
```

**Astro Integration**:

```astro
---
import Dashboard from '#components/react/Dashboard'
import { getUserRole } from '#utils/role-guard'

const userRole = await getUserRole(Astro.locals, true)
---

<Dashboard userRole={userRole} client:load />
```

---

### Phase 3: Documentation (1 hour)

#### 3.1 Usage Guide (`docs/guides/role-guard-usage-guide.md`)

**Contents**:

1. **Quick Start** - Copy-paste examples for common use cases
2. **Utility Functions** - Complete API reference with examples
3. **Wrapper Components** - Component props and usage patterns
4. **Role Systems** - When to use Supabase vs Clerk roles
5. **Performance Tips** - Caching strategies and optimization
6. **Common Patterns** - Multi-role checks, nested guards, page protection
7. **Troubleshooting** - Common issues and solutions
8. **Migration Guide** - Replacing manual role checks with role guards

#### 3.2 Implementation Plan (This Document)

- Maintain as living document
- Update with learnings during implementation
- Include post-implementation review section

---

### Phase 4: Testing Strategy (1 hour)

#### 4.1 Unit Tests

**Coverage Areas**:

- ✅ Utility function logic
- ✅ Role detection (Supabase vs Clerk)
- ✅ Permission checking (OR/AND logic)
- ✅ Caching behavior
- ✅ Error handling

**Test Files**:

- `tests/utils/role-guard.test.ts`
- `tests/utils/role-types.test.ts`

#### 4.2 Component Tests

**Coverage Areas**:

- ✅ Component rendering (authorized/unauthorized)
- ✅ Fallback content display
- ✅ Loading states
- ✅ Debug mode functionality

**Test Files**:

- `tests/components/RoleGuard.astro.test.ts`
- `tests/components/RoleGuard.react.test.tsx`

#### 4.3 Integration Tests

**Scenarios**:

1. User with `member` role views admin-only content → Denied
2. User with `admin` role views admin content → Granted
3. User with `super_admin` role views any content → Granted
4. Unauthenticated user views protected content → Denied
5. User with `org:admin` role views org content → Granted

**Test Location**: `e2e/role-guard.spec.ts`

#### 4.4 Success Metrics

- ✅ 80%+ code coverage
- ✅ All edge cases tested
- ✅ Performance benchmarks met (<50ms per check)
- ✅ No regressions in existing auth flow

---

## Integration with Existing Code

### Middleware Integration

**Current** (`src/middleware.ts:274-276`):

```typescript
const claims = auth().sessionClaims
locals.userRole = (claims?.org_role as string) ?? null
locals.orgId = (claims?.org_id as string) ?? null
```

**Enhanced** (after implementation):

```typescript
const claims = auth().sessionClaims
locals.userRole = (claims?.org_role as string) ?? null
locals.orgId = (claims?.org_id as string) ?? null

// Optionally pre-fetch Supabase role for performance
if (isProtectedRoute(context.request)) {
  locals.supabaseRole = await fetchSupabaseRole(locals.userId)
}
```

### UserInfo Component Enhancement

**Current** (`src/components/astro/UserInfo.astro:28-88`):

Manually queries Supabase for role

**After**:

```astro
---
import { getUserRole } from '#utils/role-guard'
import RoleBadge from '#components/react/RoleBadge.tsx'

const userRole = await getUserRole(Astro.locals, true)
---

<div class="user-info__row">
  <span class="user-info__label">Role:</span>
  <span class="user-info__value">
    {
      userRole ? (
        <RoleBadge role={userRole} client:only="react" />
      ) : (
        <span class="user-info__badge">Member</span>
      )
    }
  </span>
</div>
```

### Protected Pages Pattern

**Before**:

```astro
---
// Manual protection in every page
const auth = Astro.locals.auth()
if (!auth.userId) {
  return Astro.redirect('/sign-in')
}

const supabase = getSupabaseServiceRole()
const { data } = await supabase.from('users').select('role').eq('clerk_id', auth.userId).single()

if (data?.role !== 'admin' && data?.role !== 'super_admin') {
  return new Response('Forbidden', { status: 403 })
}
---
```

**After**:

```astro
---
import { requireRole } from '#utils/role-guard'

// Single line protection
await requireRole(Astro.locals, ['admin', 'super_admin'])
---
```

---

## Performance Considerations

### Caching Strategy

**Problem**: Fetching roles from Supabase on every component render creates N+1 queries

**Solution**: Implement in-memory caching with TTL

```typescript
// Simple cache implementation
const roleCache = new Map<string, { role: AnyRole; expiresAt: number }>()

async function getCachedRole(userId: string): Promise<AnyRole | null> {
  const cached = roleCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.role
  }

  // Fetch from Supabase
  const role = await fetchRoleFromSupabase(userId)

  // Cache for 1 minute
  roleCache.set(userId, {
    role,
    expiresAt: Date.now() + 60000,
  })

  return role
}
```

**Cache Invalidation**:

- Webhook triggers cache clear on role changes
- TTL ensures stale data doesn't persist
- Manual cache.clear() for testing

### Optimization Tips

1. **Pre-fetch roles in middleware** for protected routes
2. **Use component-level guards** instead of page-level when possible
3. **Batch role checks** when rendering lists
4. **Leverage Astro.locals** to avoid re-fetching within request

---

## Security Considerations

### Authorization vs Authentication

**Important**: This system handles **authorization** (what user can do), not **authentication** (who user is)

**Authentication** is handled by:

- Clerk middleware (`src/middleware.ts`)
- Protected routes (`isProtectedRoute`)

**Authorization** is handled by:

- Role guards (this system)
- RLS policies (Supabase)

### Security Best Practices

1. **Never trust client-side role data** - Always fetch from server
2. **Server-side validation** - Roles fetched server-side, passed to React
3. **Defense in depth** - Role guards + RLS policies + middleware
4. **Audit logging** - Log unauthorized access attempts
5. **Principle of least privilege** - Default to most restrictive role

### Attack Vectors

**1. Role Spoofing**

- ❌ Risk: User modifies props passed to React component
- ✅ Mitigation: Server-side role fetching only, no client-side role determination

**2. Cache Poisoning**

- ❌ Risk: Attacker manipulates cache to elevate privileges
- ✅ Mitigation: Cache keys include userId, cache isolated per request

**3. Race Conditions**

- ❌ Risk: Role changes mid-request
- ✅ Mitigation: Use transaction-level role checks, short TTL

---

## Risk Assessment

### High Risk ⚠️

**Risk**: Incorrect role checks grant unauthorized access

**Probability**: Low (comprehensive testing)
**Impact**: Critical (security breach)

**Mitigation**:

- Extensive unit and integration tests
- Manual security review before deployment
- Staged rollout (staging → production)
- Monitor audit logs for unauthorized access attempts

### Medium Risk ⚠️

**Risk**: Performance degradation from excessive Supabase queries

**Probability**: Medium
**Impact**: Medium (slow page loads)

**Mitigation**:

- Implement caching with TTL
- Pre-fetch roles in middleware
- Monitor query performance
- Set query timeouts

### Low Risk ⚠️

**Risk**: Breaking changes to existing auth flow

**Probability**: Low
**Impact**: High (auth failures)

**Mitigation**:

- Non-breaking additions only
- Maintain backward compatibility
- Comprehensive testing before merge

---

## Rollback Plan

### Quick Rollback (< 5 minutes)

If critical issues arise:

```bash
# Revert to previous commit
git revert HEAD

# Or checkout previous working version
git checkout <previous-commit-hash>

# Deploy immediately
npm run build && npm run preview
```

### Partial Rollback

Remove only role guard components while keeping utilities:

1. Remove `<RoleGuard>` components from pages
2. Replace with manual checks temporarily
3. Keep utility functions (non-breaking)
4. Debug and fix issues
5. Gradually re-introduce components

### Data Recovery

**No data changes** - This system only reads roles, never modifies them

---

## Success Criteria

### Functional Requirements

- ✅ Works with both Supabase and Clerk roles
- ✅ Supports OR logic (any role) and AND logic (all roles)
- ✅ Provides both utility functions and wrapper components
- ✅ Graceful error handling (doesn't break pages on failure)
- ✅ Loading states for async role fetching
- ✅ Fallback content for unauthorized users

### Non-Functional Requirements

- ✅ Type-safe API with full TypeScript support
- ✅ <50ms average role check latency
- ✅ 80%+ test coverage
- ✅ Comprehensive JSDoc documentation
- ✅ Zero breaking changes to existing code
- ✅ Developer-friendly API matching existing patterns

### Documentation Requirements

- ✅ Implementation plan (this document)
- ✅ Usage guide with examples
- ✅ API reference with JSDoc
- ✅ Migration guide for existing code
- ✅ Troubleshooting section

---

## Post-Implementation Tasks

### 1. Migration of Existing Code (2-3 hours)

**High-Priority Pages to Migrate**:

- `src/pages/dashboard/index.astro` - Dashboard landing
- `src/pages/organization/index.astro` - Organization pages
- `src/components/astro/UserInfo.astro` - User info display

**Migration Process**:

1. Identify manual role checks in codebase
2. Replace with role guard utilities/components
3. Test each page individually
4. Remove old role-checking code
5. Update imports and types

### 2. Performance Monitoring

**Metrics to Track**:

- Average role check duration
- Cache hit/miss ratio
- Supabase query count
- Page load time impact

**Tools**:

- Lighthouse performance audits
- Supabase dashboard (query analytics)
- Custom logging in role-guard utilities

### 3. Documentation Updates

**Files to Update**:

- `CLAUDE.md` - Add role guard usage guidelines
- `docs/AUTHENTICATION_DEVELOPER_GUIDE.md` - Add authorization section
- `docs/SECURITY.md` - Document role-based access control

### 4. Team Training

**Training Topics**:

1. When to use utility functions vs wrapper components
2. Supabase vs Clerk roles (when to use each)
3. Performance best practices (caching, pre-fetching)
4. Security considerations (server-side validation)
5. Debugging role issues (debug mode)

---

## Timeline and Effort Estimate

### Development Phase (5-7 hours)

| Phase | Task                             | Estimated Time | Priority |
| ----- | -------------------------------- | -------------- | -------- |
| 1     | Create role types and constants  | 30 min         | High     |
| 1     | Implement core utility functions | 1.5 hours      | High     |
| 1     | Add caching layer                | 30 min         | Medium   |
| 1     | Write utility unit tests         | 1 hour         | High     |
| 2     | Create Astro RoleGuard component | 30 min         | High     |
| 2     | Create React RoleGuard component | 30 min         | High     |
| 2     | Write component tests            | 30 min         | Medium   |
| 3     | Write usage guide                | 45 min         | High     |
| 3     | Update existing documentation    | 15 min         | Medium   |
| 4     | Integration testing              | 45 min         | High     |
| 4     | E2E test scenarios               | 15 min         | Medium   |

**Total: 5-7 hours** (depends on testing depth)

### Post-Implementation Phase (2-3 hours)

- Code migration: 2-3 hours
- Performance monitoring: 30 min
- Documentation updates: 30 min
- Team training: 1 hour (async)

### Total Project Time: 7-10 hours

---

## Example Usage Scenarios

### Scenario 1: Admin-Only Component

```astro
---
import RoleGuard from '#components/astro/RoleGuard.astro'
---

<RoleGuard allowedRoles={['admin', 'super_admin']}>
  <div class="admin-panel">
    <h2>Admin Controls</h2>
    <button>Delete All Users</button>
    <button>Reset Database</button>
  </div>
</RoleGuard>
```

### Scenario 2: Tiered Content Access

```astro
---
import { canViewContent } from '#utils/role-guard'

const canViewBasic = await canViewContent(Astro.locals, ['member', 'admin', 'super_admin'])
const canViewPremium = await canViewContent(Astro.locals, ['admin', 'super_admin'])
const canViewAdmin = await canViewContent(Astro.locals, ['super_admin'])
---

{
  canViewBasic && (
    <section>
      <h2>Basic Content</h2>
      <p>All members can see this</p>
    </section>
  )
}

{
  canViewPremium && (
    <section>
      <h2>Premium Content</h2>
      <p>Only admins can see this</p>
    </section>
  )
}

{
  canViewAdmin && (
    <section>
      <h2>Super Admin Content</h2>
      <p>Highest privilege only</p>
    </section>
  )
}
```

### Scenario 3: Organization Context

```astro
---
import RoleGuard from '#components/astro/RoleGuard.astro'
---

<div class="organization-dashboard">
  <h1>Organization Dashboard</h1>

  <!-- All org members can view -->
  <RoleGuard allowedRoles={['org:admin', 'org:member']}>
    <MemberList />
  </RoleGuard>

  <!-- Only org admins can manage -->
  <RoleGuard
    allowedRoles={['org:admin']}
    fallback="Contact your organization admin to modify settings"
  >
    <OrganizationSettings />
  </RoleGuard>
</div>
```

### Scenario 4: Page-Level Protection

```astro
---
import { requireRole } from '#utils/role-guard'

// Protect entire page - throws 403 if unauthorized
await requireRole(Astro.locals, ['super_admin'])
---

<html>
  <body>
    <h1>Super Admin Dashboard</h1>
    <p>This page is only accessible to super admins</p>
    <!-- All content protected by page-level guard -->
  </body>
</html>
```

### Scenario 5: React Component with Server Props

```astro
---
// server-side.astro
import Dashboard from '#components/react/Dashboard'
import { getUserRole } from '#utils/role-guard'

const userRole = await getUserRole(Astro.locals, true)
---

<Dashboard userRole={userRole} client:load />
```

```tsx
// Dashboard.tsx
import RoleGuard from '#components/react/RoleGuard'

export function Dashboard({ userRole }: Props) {
  return (
    <div>
      <RoleGuard
        userRole={userRole}
        allowedRoles={['admin', 'super_admin']}
        fallback={<AccessDenied />}
      >
        <AdminPanel />
      </RoleGuard>
    </div>
  )
}
```

---

## Comparison with Alternatives

### Alternative 1: Middleware-Only Protection

**Approach**: Protect entire routes in middleware

**Pros**:

- Centralized security
- No per-component checks

**Cons**:

- No granular UI control
- Can't mix public/protected content on same page
- Less flexible

### Alternative 2: Manual Checks Everywhere

**Current approach** - query Supabase in each component

**Pros**:

- Full control
- No abstraction

**Cons**:

- Verbose and repetitive
- Error-prone
- No consistency
- Hard to maintain

### Alternative 3: Higher-Order Component Pattern

**Approach**: Wrap entire components with HOC

**Pros**:

- TypeScript-friendly
- Compile-time errors

**Cons**:

- Complex setup
- Harder to debug
- Overkill for simple cases

### Why Hybrid Approach Wins

✅ **Flexibility**: Utilities for complex logic, components for simple cases
✅ **Consistency**: Matches existing patterns (`clerk-roles.ts`)
✅ **Simplicity**: Easy to learn and use
✅ **Scalability**: Can add HOC pattern later if needed
✅ **Type Safety**: Full TypeScript support
✅ **Performance**: Server-side rendering, minimal overhead

---

## Maintenance and Long-Term Support

### Version Compatibility

- **Astro**: Tested on v4.x, should work on v5.x
- **React**: Compatible with React 18+
- **TypeScript**: Requires TS 5.0+ for `satisfies` operator

### Deprecation Policy

If changes are needed:

1. Mark old APIs as deprecated (JSDoc `@deprecated`)
2. Provide 2-3 month transition period
3. Create migration guide
4. Remove in next major version

### Future Enhancements

**Phase 2 Features** (future):

1. **Permission Policies**: Beyond roles (e.g., resource ownership)
2. **Audit Logging**: Track all authorization decisions
3. **Dynamic Roles**: Load roles from external systems
4. **React Context**: Avoid prop drilling in React components
5. **GraphQL Integration**: Role-based field resolution

---

## Conclusion

The **Hybrid Role-Based Visibility System** provides a robust, flexible, and developer-friendly solution for controlling component visibility based on user roles. By combining utility functions (Option 2) with wrapper components (Option 1), we achieve the perfect balance of flexibility and convenience.

### Key Benefits

1. ✅ **Security**: Centralized, tested authorization logic
2. ✅ **Developer Experience**: Simple API, matches existing patterns
3. ✅ **Performance**: Server-side checks with caching
4. ✅ **Flexibility**: Works for simple and complex scenarios
5. ✅ **Maintainability**: Single source of truth for role logic

### Next Steps

1. **Review and approve** this implementation plan
2. **Set up development branch** (`feat/role-based-visibility`)
3. **Implement Phase 1** (utilities)
4. **Implement Phase 2** (components)
5. **Write documentation** (guides)
6. **Test thoroughly** (unit + integration + E2E)
7. **Deploy to staging** for validation
8. **Deploy to production** with monitoring

---

**Document Version**: 1.0
**Last Updated**: 2025-10-07
**Status**: ✅ Ready for Implementation
**Estimated Effort**: 5-7 hours development + 2-3 hours migration
**Owner**: Development Team
