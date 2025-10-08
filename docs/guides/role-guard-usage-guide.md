# Role Guard Usage Guide

**Complete guide to using the role-based visibility system in astro-basics**

**Version**: 1.0
**Last Updated**: 2025-10-07
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Utility Functions](#utility-functions)
4. [Wrapper Components](#wrapper-components)
5. [Common Patterns](#common-patterns)
6. [Performance Tips](#performance-tips)
7. [Troubleshooting](#troubleshooting)
8. [Migration Guide](#migration-guide)

---

## Quick Start

### 30-Second Example

```astro
---
// src/pages/admin.astro
import RoleGuard from '#components/astro/RoleGuard.astro'
---

<RoleGuard allowedRoles={['admin', 'super_admin']}>
  <h1>Admin Dashboard</h1>
  <p>Only admins can see this content</p>
</RoleGuard>
```

That's it! The component handles everything:

- ✅ Fetches user role from Astro.locals or Supabase
- ✅ Checks if user has any allowed role
- ✅ Hides content if unauthorized
- ✅ Caches role queries (1-minute TTL)

---

## Core Concepts

### Two Role Systems

The astro-basics project uses **two independent role systems**:

#### 1. Supabase User Roles (App-Level)

**Storage**: Supabase `users` table
**Sync Source**: Clerk webhook → Supabase
**Roles**: `member`, `admin`, `super_admin`

```typescript
// Determines app-wide privileges
type UserRole = 'member' | 'admin' | 'super_admin'
```

**Use Cases**:

- Global admin features
- User management
- System configuration
- Cross-organization permissions

#### 2. Clerk Organization Roles (Org-Level)

**Storage**: Clerk session claims (`Astro.locals.userRole`)
**Roles**: `org:admin`, `org:member`

```typescript
// Determines organization-specific privileges
type OrgRole = 'org:admin' | 'org:member'
```

**Use Cases**:

- Organization settings
- Team management
- Org-specific features
- Multi-tenant access control

### Unified API

The role guard system works with **both role systems** through a unified API:

```typescript
type AnyRole = UserRole | OrgRole
// Can be: 'member' | 'admin' | 'super_admin' | 'org:admin' | 'org:member'
```

---

## Utility Functions

### `canViewContent()`

**Primary role-checking function** - Returns boolean indicating if user can view content.

```typescript
canViewContent(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<boolean>
```

#### Basic Usage

```astro
---
import { canViewContent } from '#utils/role-guard'

const canViewAdmin = await canViewContent(Astro.locals, ['admin', 'super_admin'])
---

{canViewAdmin && <AdminPanel />}
```

#### With Options

```astro
---
const canViewAdmin = await canViewContent(Astro.locals, ['admin', 'super_admin'], {
  fetchFromSupabase: true, // Fetch role from DB if not in locals
  cacheTTL: 120000, // Cache for 2 minutes (default: 1 min)
})
---
```

#### Return Value

- `true` - User has at least ONE of the allowed roles
- `false` - User lacks all allowed roles OR not authenticated

---

### `canViewContentDetailed()`

**Enhanced version** - Returns detailed authorization result with debugging info.

```typescript
canViewContentDetailed(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<RoleCheckResult>
```

#### Usage

```astro
---
import { canViewContentDetailed } from '#utils/role-guard'

const result = await canViewContentDetailed(Astro.locals, ['admin'])

if (!result.allowed) {
  console.log('Access denied:', result.reason)
  console.log('User role:', result.userRole)
}
---
```

#### Return Type

```typescript
interface RoleCheckResult {
  allowed: boolean // Whether access is granted
  userRole: AnyRole | null // User's current role
  reason?: string // Reason for denial (if denied)
}
```

**Example Results**:

```typescript
// Access granted
{ allowed: true, userRole: 'admin' }

// Access denied - wrong role
{
  allowed: false,
  userRole: 'member',
  reason: 'User role "member" not in allowed roles: admin, super_admin'
}

// Access denied - not authenticated
{
  allowed: false,
  userRole: null,
  reason: 'User not authenticated'
}
```

---

### `requireRole()`

**Page-level protection** - Throws 403 error if user lacks required role.

```typescript
requireRole(
  locals: App.Locals,
  allowedRoles: AnyRole[],
  options?: Partial<RoleGuardConfig>
): Promise<void>
```

#### Usage

```astro
---
// src/pages/super-admin/index.astro
import { requireRole } from '#utils/role-guard'

// Protect entire page - throws if unauthorized
await requireRole(Astro.locals, ['super_admin'])
---

<html>
  <body>
    <h1>Super Admin Dashboard</h1>
    <!-- All content protected - only renders if check passes -->
  </body>
</html>
```

**Behavior**:

- ✅ User has role → Page renders normally
- ❌ User lacks role → Throws `Error: 403 Forbidden: ...`

**Error Handling**:

Astro automatically converts thrown errors to error pages. Create `src/pages/403.astro` for custom forbidden pages.

---

### `getUserRole()`

**Extracts user role** from Astro.locals with optional Supabase fallback.

```typescript
getUserRole(
  locals: App.Locals,
  fetchFromSupabase?: boolean
): Promise<AnyRole | null>
```

#### Usage

```astro
---
import { getUserRole } from '#utils/role-guard'

// Get org role from Clerk session (if available)
const orgRole = await getUserRole(Astro.locals, false)

// Get user role from Supabase (with fallback)
const userRole = await getUserRole(Astro.locals, true)

console.log('Org role:', orgRole) // e.g., 'org:admin' or null
console.log('User role:', userRole) // e.g., 'admin' or 'member'
---
```

**Fetch Priority**:

1. **Astro.locals.userRole** (Clerk org role from middleware)
2. **Supabase query** (if `fetchFromSupabase === true`)
3. **null** (if not authenticated)

---

### `hasAnyRole()` & `hasAllRoles()`

**Semantic aliases** for role checking with explicit OR/AND logic.

```typescript
hasAnyRole(locals: App.Locals, roles: AnyRole[]): Promise<boolean>
hasAllRoles(locals: App.Locals, roles: AnyRole[]): Promise<boolean>
```

#### `hasAnyRole()` - OR Logic

```astro
---
import { hasAnyRole } from '#utils/role-guard'

// User needs to be admin OR super_admin
const isStaff = await hasAnyRole(Astro.locals, ['admin', 'super_admin'])
---

{isStaff && <StaffTools />}
```

#### `hasAllRoles()` - AND Logic

**Note**: Currently only works for single-role checks. Multi-role AND logic across different role systems (Supabase + Clerk) is planned for future enhancement.

```astro
---
import { hasAllRoles } from '#utils/role-guard'

// User must be admin (single role check)
const isAdmin = await hasAllRoles(Astro.locals, ['admin'])
---
```

---

### Helper Functions

#### `isValidRole()`

**Type guard** - Validates if string is a valid role.

```typescript
isValidRole(role: string): role is AnyRole
```

```typescript
const userInput = 'admin'

if (isValidRole(userInput)) {
  // TypeScript now knows userInput is AnyRole
  const label = ROLE_LABELS[userInput]
}
```

#### `formatRoleForDisplay()`

**Human-readable labels** - Converts role identifiers to display names.

```typescript
formatRoleForDisplay(role: AnyRole): string
```

```typescript
formatRoleForDisplay('super_admin') // Returns: "Super Admin"
formatRoleForDisplay('org:admin') // Returns: "Organization Admin"
formatRoleForDisplay('member') // Returns: "Member"
```

---

## Wrapper Components

### Astro RoleGuard

**Server-side component** for Astro pages - performs authorization server-side (zero client JavaScript).

#### Props

```typescript
interface Props {
  allowedRoles: AnyRole[] // Required - roles that can view content
  fallback?: string // Optional - message when access denied
  debug?: boolean // Optional - show debug info (dev only)
  fetchFromSupabase?: boolean // Optional - query Supabase (default: true)
}
```

#### Basic Usage

```astro
---
import RoleGuard from '#components/astro/RoleGuard.astro'
---

<RoleGuard allowedRoles={['admin', 'super_admin']}>
  <div class="admin-panel">
    <h2>Admin Controls</h2>
    <button>Delete All Users</button>
  </div>
</RoleGuard>
```

#### With Fallback Message

```astro
<RoleGuard
  allowedRoles={['super_admin']}
  fallback="You need super admin permissions to view this content."
>
  <DangerZone />
</RoleGuard>
```

#### Debug Mode (Development Only)

```astro
<RoleGuard allowedRoles={['admin']} debug={true}>
  <AdminPanel />
</RoleGuard>

<!-- Renders in development:
🔍 RoleGuard Debug
User Role: member
Allowed Roles: admin, super_admin
Access: ❌ Denied
-->
```

---

### React RoleGuard

**Client-side component** for React - requires server-fetched role data as props.

#### Props

```typescript
interface RoleGuardProps {
  userRole: AnyRole | null // Required - pre-fetched server-side
  allowedRoles: AnyRole[] // Required - roles that can view content
  children: ReactNode // Required - content to protect
  fallback?: ReactNode // Optional - shown when access denied
  loading?: boolean // Optional - show loading state
  className?: string // Optional - custom CSS class
  'data-testid'?: string // Optional - for testing
}
```

#### Server-Side Role Fetching

**IMPORTANT**: React components cannot access `Astro.locals` directly. Always fetch roles server-side.

```astro
---
// src/pages/dashboard.astro
import Dashboard from '#components/react/Dashboard'
import { getUserRole } from '#utils/role-guard'

// Fetch role server-side
const userRole = await getUserRole(Astro.locals, true)
---

<Dashboard userRole={userRole} client:load />
```

#### React Component Usage

```tsx
// src/components/react/Dashboard.tsx
import { RoleGuard } from '#components/react/RoleGuard'
import type { AnyRole } from '#utils/role-types'

interface Props {
  userRole: AnyRole | null
}

export function Dashboard({ userRole }: Props) {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Admin-only content */}
      <RoleGuard
        userRole={userRole}
        allowedRoles={['admin', 'super_admin']}
        fallback={<p>Admin access required</p>}
      >
        <AdminSettings />
      </RoleGuard>

      {/* All authenticated users */}
      <RoleGuard userRole={userRole} allowedRoles={['member', 'admin', 'super_admin']}>
        <UserContent />
      </RoleGuard>
    </div>
  )
}
```

#### With Custom Fallback Component

```tsx
<RoleGuard
  userRole={userRole}
  allowedRoles={['super_admin']}
  fallback={
    <div className="access-denied">
      <h2>Access Denied</h2>
      <p>Contact your administrator for super admin access.</p>
      <a href="/support">Request Access</a>
    </div>
  }
>
  <SuperAdminPanel />
</RoleGuard>
```

---

## Common Patterns

### 1. Tiered Content Access

Show different content based on role hierarchy.

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
      <p>All authenticated users can see this</p>
    </section>
  )
}

{
  canViewPremium && (
    <section>
      <h2>Premium Content</h2>
      <p>Only admins and super admins can see this</p>
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

### 2. Mixed Role Types

Support both Supabase and Clerk roles in same page.

```astro
<RoleGuard
  allowedRoles={[
    'super_admin', // Supabase user role
    'org:admin', // Clerk org role
  ]}
>
  <AdvancedSettings />
</RoleGuard>
```

### 3. Nested Protection

Combine page-level and component-level guards.

```astro
---
import { requireRole } from '#utils/role-guard'
import RoleGuard from '#components/astro/RoleGuard.astro'

// Page-level: Only admins can access page at all
await requireRole(Astro.locals, ['admin', 'super_admin'])
---

<html>
  <body>
    <h1>Admin Dashboard</h1>

    <!-- Component-level: Only super_admins see danger zone -->
    <RoleGuard allowedRoles={['super_admin']}>
      <DangerZone />
    </RoleGuard>
  </body>
</html>
```

### 4. Conditional Navigation

Show/hide navigation items based on role.

```astro
---
import { canViewContent } from '#utils/role-guard'

const canViewAdmin = await canViewContent(Astro.locals, ['admin', 'super_admin'])
const canViewOrg = await canViewContent(Astro.locals, ['org:admin'])
---

<nav>
  <a href="/">Home</a>
  <a href="/dashboard">Dashboard</a>

  {canViewOrg && <a href="/organization">Organization</a>}
  {canViewAdmin && <a href="/admin">Admin</a>}
</nav>
```

### 5. Form Field Protection

Hide sensitive form fields based on role.

```tsx
function UserForm({ userRole }: Props) {
  return (
    <form>
      <input name="username" placeholder="Username" />
      <input name="email" type="email" placeholder="Email" />

      {/* Only admins can change roles */}
      <RoleGuard userRole={userRole} allowedRoles={['admin', 'super_admin']}>
        <select name="role">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </RoleGuard>
    </form>
  )
}
```

---

## Performance Tips

### 1. Cache Configuration

Default cache TTL is **1 minute**. Adjust based on your needs:

```astro
---
// Short TTL (30 seconds) for frequently changing roles
const canView = await canViewContent(Astro.locals, ['admin'], { cacheTTL: 30000 })

// Long TTL (5 minutes) for stable roles
const canView = await canViewContent(Astro.locals, ['admin'], { cacheTTL: 300000 })
---
```

### 2. Minimize Supabase Queries

Clerk org roles are in `Astro.locals` (no DB query). Use them when possible:

```astro
---
// ✅ Fast - uses Astro.locals (org role)
const canManageOrg = await canViewContent(Astro.locals, ['org:admin'], { fetchFromSupabase: false })

// ⚠️ Slower - queries Supabase
const isAdmin = await canViewContent(Astro.locals, ['admin'], { fetchFromSupabase: true })
---
```

### 3. Pre-fetch in Middleware

For protected routes, pre-fetch Supabase roles in middleware:

```typescript
// src/middleware.ts (enhancement)
if (isProtectedRoute(context.request)) {
  locals.supabaseRole = await fetchSupabaseRole(locals.userId)
}
```

Then role guards skip the DB query entirely.

### 4. Batch Role Checks

When rendering lists, fetch role once and reuse:

```astro
---
import { getUserRole } from '#utils/role-guard'

const userRole = await getUserRole(Astro.locals, true)

const features = [
  { name: 'Basic Feature', allowedRoles: ['member', 'admin', 'super_admin'] },
  { name: 'Admin Feature', allowedRoles: ['admin', 'super_admin'] },
  { name: 'Super Feature', allowedRoles: ['super_admin'] },
]
---

{
  features.map(
    feature =>
      userRole && feature.allowedRoles.includes(userRole) && <FeatureCard name={feature.name} />
  )
}
```

---

## Troubleshooting

### Issue: Role Not Detected

**Symptoms**: Content hidden even though user has correct role

**Causes**:

1. Supabase role not synced from Clerk
2. Typo in role name
3. Cache showing stale data

**Solutions**:

```astro
---
// Enable debug mode to see what's happening
---

<RoleGuard allowedRoles={['admin']} debug={true}>
  <Content />
</RoleGuard>

<!-- Check output:
User Role: member (expected: admin)
Allowed Roles: admin
Access: Denied
-->
```

```typescript
// Clear cache and try again
import { clearRoleCache } from '#utils/role-guard'
clearRoleCache(userId)
```

```astro
---
// Force fresh Supabase query
const result = await canViewContentDetailed(Astro.locals, ['admin'], {
  fetchFromSupabase: true,
  cacheTTL: 0,
})

console.log('Role check result:', result)
---
```

### Issue: "User not found in Supabase"

**Symptoms**: `PGRST116` error or null role returned

**Cause**: Clerk user not yet synced to Supabase database

**Solution**: User creation happens automatically via webhook. For manual sync:

```astro
---
// UserInfo.astro already handles this with upsert
// See: src/components/astro/UserInfo.astro:55-64
---
```

### Issue: React Component Not Rendering

**Symptoms**: RoleGuard in React shows nothing

**Cause**: `userRole` prop not passed from server

**Solution**:

```astro
---
// WRONG - userRole not fetched
;<Dashboard client:load />

// RIGHT - fetch server-side and pass as prop
import { getUserRole } from '#utils/role-guard'
const userRole = await getUserRole(Astro.locals, true)
---

<Dashboard userRole={userRole} client:load />
```

### Issue: Performance Degradation

**Symptoms**: Page loads slowly with many role checks

**Solutions**:

1. **Reduce cache TTL** (if roles change frequently)
2. **Increase cache TTL** (if roles are stable)
3. **Pre-fetch roles** in middleware for protected routes
4. **Use Clerk org roles** instead of Supabase roles when possible

```typescript
// Monitor cache performance
import { getRoleCacheStats } from '#utils/role-guard'
const stats = getRoleCacheStats()
console.log('Cache entries:', stats.entries, 'Size:', stats.size)
```

---

## Migration Guide

### Replacing Manual Role Checks

**Before** (manual Supabase query):

```astro
---
const supabase = getSupabaseServiceRole()
const { data } = await supabase.from('users').select('role').eq('clerk_id', userId).single()

const isAdmin = data?.role === 'admin' || data?.role === 'super_admin'
---

{isAdmin && <AdminPanel />}
```

**After** (role guard):

```astro
---
import { canViewContent } from '#utils/role-guard'

const isAdmin = await canViewContent(Astro.locals, ['admin', 'super_admin'])
---

{isAdmin && <AdminPanel />}
```

**Benefits**:

- ✅ 80% less code
- ✅ Type-safe
- ✅ Automatic caching
- ✅ Better error handling
- ✅ Consistent with project patterns

---

## Best Practices

### Security

1. **Never trust client-side** - Always fetch roles server-side
2. **Defense in depth** - Combine role guards with RLS policies and middleware
3. **Audit logging** - Use `canViewContentDetailed()` for security audits
4. **Principle of least privilege** - Grant minimum necessary permissions

### Code Organization

1. **Component-level guards** for granular UI control
2. **Page-level guards** (`requireRole`) for route protection
3. **Middleware guards** for API endpoint protection
4. **Consistent role naming** - Use constants from `#utils/role-types`

### Testing

1. **Mock Astro.locals** in tests
2. **Test both authorized and unauthorized cases**
3. **Verify fallback content renders**
4. **Check accessibility attributes** (role, aria-\*)

---

## Summary

The role-based visibility system provides:

✅ **Unified API** for Supabase and Clerk roles
✅ **Server-side security** with zero client JavaScript
✅ **Automatic caching** with configurable TTL
✅ **Type safety** with full TypeScript support
✅ **Flexible usage** - utilities and components
✅ **Developer-friendly** - matches existing project patterns
✅ **Well-tested** - 54+ unit and component tests

**Quick Reference**:

- **Simple checks**: `canViewContent()`
- **Page protection**: `requireRole()`
- **Debugging**: `canViewContentDetailed()`
- **Astro components**: `<RoleGuard>`
- **React components**: `<RoleGuard userRole={...}>`

For implementation details, see [role-based-visibility-system.md](../implementation-plans/role-based-visibility-system.md)

---

**Questions or Issues?**
File an issue with the `role-guard` label on GitHub.
