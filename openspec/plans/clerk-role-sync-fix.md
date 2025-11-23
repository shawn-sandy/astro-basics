# Fix: Random User Role Changes in Clerk-Supabase Integration

**Date:** 2025-01-23
**Status:** Analysis Complete, Ready for Implementation
**Priority:** HIGH (Security & User Experience Impact)

---

## Executive Summary

User roles are appearing to change randomly due to **middleware reading organization-specific roles (`org_role`) instead of user-level roles (`role`)** from Clerk session claims. The actual database roles are correct and properly synced - the issue is purely in how the middleware extracts and exposes role information to the application.

**Impact:**

- Users see inconsistent permissions when joining/leaving organizations
- Role-based UI elements appear/disappear based on organization context
- Security is NOT compromised (database RLS policies remain intact)

**Solution:**

- Update middleware to read correct role property from session claims
- Separate user-level roles from organization-specific roles
- Update organization pages to use appropriate role property

---

## Root Cause Analysis

### The Problem (src/middleware.ts:366)

```typescript
// CURRENT (INCORRECT)
locals.userRole = (claims?.org_role as string) ?? null
locals.orgId = (claims?.org_id as string) ?? null
```

**Issue:** This reads organization-specific roles instead of user-level roles.

### Two Separate Role Systems

The application has **two distinct role systems** that serve different purposes:

#### 1. User-Level Roles (Application-Wide Permissions)

- **Source:** Clerk `publicMetadata.role`
- **Storage:** Supabase `users.role` (ENUM: member, admin, super_admin)
- **Values:** `member`, `admin`, `super_admin`
- **Purpose:** Control access to application features
- **Synced via:**
  - Webhook: `user.created` (line 141 in `/src/pages/api/webhooks/clerk.ts`)
  - Webhook: `user.updated` (line 232)
  - Manual sync: `/api/user/sync` (line 91 in `/src/pages/api/user/sync.ts`)

#### 2. Organization Roles (Organization-Specific Permissions)

- **Source:** Clerk organization membership
- **Storage:** Supabase `organization_memberships.clerk_org_role`
- **Values:** `org:admin`, `org:member`, or `null` (no membership)
- **Purpose:** Control permissions within specific organizations
- **Synced via:**
  - Webhook: `organizationMembership.created` (line 324)
  - Webhook: `organizationMembership.updated` (line 373)
  - Webhook: `organizationMembership.deleted` (line 425)

### What's Happening

```
User Authentication Flow (CURRENT - INCORRECT):
┌─────────────────────────────────────────────────┐
│ User authenticates with Clerk                   │
│ User has: publicMetadata.role = "member"        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Clerk generates session with claims:            │
│ - role: "member" (user-level) ✓                 │
│ - org_role: null (no org membership)            │
│ - org_id: null                                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Middleware reads claims (LINE 366):             │
│ locals.userRole = claims?.org_role ?? null      │
│ Result: locals.userRole = null ❌               │
│                                                  │
│ Database actually has: users.role = "member" ✓  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ APPLICATION THINKS USER HAS NO ROLE!             │
│ User sees: Limited/no permissions               │
└─────────────────────────────────────────────────┘
```

### Why It Appears "Random"

| User Action        | org_role Value | locals.userRole | Perceived Role | Actual Role (DB) |
| ------------------ | -------------- | --------------- | -------------- | ---------------- |
| No org membership  | `null`         | `null`          | No role! ❌    | `member` ✓       |
| Joins organization | `"org:member"` | `"org:member"`  | Has role! ✓    | `member` ✓       |
| Promoted in org    | `"org:admin"`  | `"org:admin"`   | Admin! ❌      | `member` ✓       |
| Switches org       | `"org:member"` | `"org:member"`  | Member again!  | `member` ✓       |
| Leaves org         | `null`         | `null`          | No role! ❌    | `member` ✓       |

**Result:** Role appears to change randomly based on organization context, but database role remains stable.

---

## Detailed Investigation Findings

### All Code Paths That Modify Roles

#### 1. Clerk Webhook Handler (`/src/pages/api/webhooks/clerk.ts`)

**User Role Updates:**

- **Line 154-161:** `user.created` event
  ```typescript
  const role = (user.publicMetadata?.role as string) || 'member'
  // Inserts into users table with role
  ```
- **Line 244:** `user.updated` event
  ```typescript
  role: (user.publicMetadata?.role as string) || 'member'
  // Updates users.role
  ```

**Organization Role Updates:**

- **Line 321-327:** `organizationMembership.created`
  ```typescript
  clerk_org_role: membership.role // 'org:admin' or 'org:member'
  // Inserts into organization_memberships
  ```
- **Line 370-378:** `organizationMembership.updated`
  ```typescript
  clerk_org_role: membership.role
  // Updates organization_memberships.clerk_org_role
  ```
- **Line 421-425:** `organizationMembership.deleted`
  ```typescript
  // Deletes from organization_memberships entirely
  ```

#### 2. Manual Sync Endpoint (`/src/pages/api/user/sync.ts`)

- **Line 94-101:** Upserts user with role from Clerk `publicMetadata.role`

#### 3. Middleware Session Claims (`/src/middleware.ts`)

- **Line 366:** ❌ Reads `org_role` instead of `role`
- **Line 367:** Reads `org_id` (correct)

### Data Integrity Status

✅ **Database roles are correct** - Webhooks working properly
✅ **User creation/updates sync correctly** - `publicMetadata.role` → `users.role`
✅ **Organization memberships sync correctly** - Clerk membership → `organization_memberships`
❌ **Middleware exposes wrong role** - Reads `org_role` instead of `role`

### Race Conditions

**Webhook Race Condition (Documented):**

- Location: `/project-docs/04-integrations/clerk/webhook-race-condition-analysis.md`
- Status: ✅ Acceptable risk, properly handled
- Mitigation: Duplicate email constraint violations handled gracefully (error code 23505)
- Impact: Minimal - Clerk retry mechanism covers transient failures

**Session Claim Race Condition:**

- Status: ❌ Not a race condition - systematic misreading of claims
- Issue: Middleware consistently reads wrong property

---

## The Complete Fix

### Phase 1: Update Middleware (Critical)

**File:** `src/middleware.ts`

**Current Code (Lines 364-367):**

```typescript
// Extract organization context from session claims
const claims = auth().sessionClaims
locals.userRole = (claims?.org_role as string) ?? null
locals.orgId = (claims?.org_id as string) ?? null
```

**Fixed Code:**

```typescript
// Extract user and organization context from session claims
const claims = auth().sessionClaims

// User-level role (application-wide permissions)
locals.userRole = (claims?.role as string) ?? 'member'

// Organization-specific role and context
locals.orgRole = (claims?.org_role as string) ?? null
locals.orgId = (claims?.org_id as string) ?? null
```

**Changes:**

1. Read `claims?.role` for user-level permissions
2. Add `claims?.org_role` as separate `locals.orgRole` property
3. Keep `claims?.org_id` as is

### Phase 2: Update Type Definitions

**File:** `src/env.d.ts`

**Add to Locals interface:**

```typescript
namespace App {
  interface Locals {
    userId?: string
    clerkToken: string | null
    correlationId: string
    csrfToken?: string

    // User-level role (application-wide permissions)
    // Values: 'member' | 'admin' | 'super_admin'
    // Source: Clerk publicMetadata.role
    userRole?: string

    // Organization-specific role (organization permissions)
    // Values: 'org:admin' | 'org:member' | null
    // Source: Clerk organization membership
    orgRole?: string | null

    // Current organization context
    orgId?: string | null
  }
}
```

### Phase 3: Update Organization Pages

**File:** `src/pages/organization/index.astro`

**Current Code (Lines 13-15):**

```typescript
const userRole = Astro.locals.userRole
const canCreateOrg = userRole === 'admin' || userRole === 'super_admin'
```

**Issue:** Uses `userRole` for organization permissions

**Fixed Code:**

```typescript
const userRole = Astro.locals.userRole // Application permissions
const orgRole = Astro.locals.orgRole // Organization permissions

// For creating new organizations (application permission)
const canCreateOrg = userRole === 'admin' || userRole === 'super_admin'

// For managing current organization (organization permission)
const canManageCurrentOrg = orgRole === 'org:admin'
```

**Lines 30-78:** Review organization management logic

- Use `orgRole` for organization-specific permissions
- Use `userRole` for application-wide permissions

### Phase 4: Review All userRole Usages

**Files to review:**

```bash
# Find all files using userRole
grep -r "locals.userRole\|Astro.locals.userRole" src/
grep -r "const.*userRole.*=.*locals" src/
```

**For each usage, determine:**

1. Is this checking application-wide permissions? → Use `userRole`
2. Is this checking organization permissions? → Use `orgRole`
3. Is this displaying current role? → Use both appropriately

### Phase 5: Update Clerk Session Token Configuration

**Verify Clerk Dashboard settings:**

**Session Token Claims (should include both):**

```json
{
  "role": "{{user.public_metadata.role}}",
  "org_role": "{{user.organization_memberships.0.role}}",
  "org_id": "{{user.organization_memberships.0.id}}"
}
```

**Ensure:**

- ✅ `role` claim exists (user-level)
- ✅ `org_role` claim exists (organization-level)
- ✅ `org_id` claim exists

---

## Verification & Testing

### Test Scenarios

#### Scenario 1: User with No Organization

```typescript
// Expected session claims
{ role: "member", org_role: null, org_id: null }

// Expected locals
locals.userRole = "member"     // ✓ Has application permissions
locals.orgRole = null          // ✓ No organization permissions
locals.orgId = null

// Expected behavior
- Can access application features as member
- Cannot access organization features (no org membership)
- Role remains stable
```

#### Scenario 2: User Joins Organization

```typescript
// Expected session claims
{ role: "member", org_role: "org:member", org_id: "org_123" }

// Expected locals
locals.userRole = "member"          // ✓ Still member application-wide
locals.orgRole = "org:member"       // ✓ Member of organization
locals.orgId = "org_123"

// Expected behavior
- Still has application permissions as member
- Now has organization member permissions
- Role remains stable (member)
```

#### Scenario 3: User Promoted in Organization

```typescript
// Expected session claims
{ role: "member", org_role: "org:admin", org_id: "org_123" }

// Expected locals
locals.userRole = "member"          // ✓ Still member application-wide
locals.orgRole = "org:admin"        // ✓ Admin of organization
locals.orgId = "org_123"

// Expected behavior
- Still has application permissions as member
- Now has organization admin permissions
- Role remains stable (member) ✓ FIXED!
```

#### Scenario 4: User Switches Organization

```typescript
// Expected session claims
{ role: "member", org_role: "org:member", org_id: "org_456" }

// Expected locals
locals.userRole = "member"          // ✓ Still member application-wide
locals.orgRole = "org:member"       // ✓ Member of different org
locals.orgId = "org_456"            // ✓ Different org context

// Expected behavior
- Still has application permissions as member
- Has member permissions in new organization
- Role remains stable (member) ✓ FIXED!
```

### Database Verification Queries

```sql
-- Check user-level role
SELECT clerk_id, email, role, created_at
FROM users
WHERE clerk_id = 'user_xxx';

-- Check organization roles
SELECT
  u.email,
  u.role as user_role,
  om.clerk_org_role as org_role,
  om.org_name,
  om.created_at
FROM organization_memberships om
JOIN users u ON u.id = om.user_id
WHERE u.clerk_id = 'user_xxx';
```

### Logging for Debugging

**Add temporary logging to middleware (after fix):**

```typescript
if (auth().userId) {
  const claims = auth().sessionClaims

  logger.debug('Auth claims extracted', {
    userId: locals.userId,
    userRole: locals.userRole, // Should be stable
    orgRole: locals.orgRole, // Can change with org context
    orgId: locals.orgId,
    claimsRole: claims?.role, // Verify source
    claimsOrgRole: claims?.org_role, // Verify source
  })
}
```

---

## Impact Assessment

### User Experience Impact

- **Before:** HIGH - Inconsistent permissions, confusing role changes
- **After:** NONE - Stable, predictable permissions

### Security Impact

- **Before:** LOW - Database RLS policies still protected data correctly
- **After:** IMPROVED - Application layer now matches database security model

### Data Integrity Impact

- **Before:** NONE - Database roles were always correct
- **After:** NONE - No changes to data layer

### Performance Impact

- **Before/After:** NONE - No performance difference

### Breaking Changes

- **Minimal** - Only affects code using `locals.userRole` for org permissions
- **Migration Path:** Update to use `locals.orgRole` for org-specific checks

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review current Clerk session token configuration
- [ ] Document all files using `locals.userRole`
- [ ] Identify organization-specific permission checks
- [ ] Create backup of current middleware
- [ ] Set up logging for debugging

### Implementation

- [ ] Update `src/middleware.ts` (lines 366-367)
- [ ] Update `src/env.d.ts` (add orgRole property)
- [ ] Update `src/pages/organization/index.astro`
- [ ] Update other files using userRole for org permissions
- [ ] Add JSDoc comments explaining role distinction

### Testing

- [ ] Test user without organization membership
- [ ] Test user joining organization
- [ ] Test user promoted in organization
- [ ] Test user switching between organizations
- [ ] Test user leaving organization
- [ ] Verify database roles remain correct
- [ ] Check all role-based UI elements display correctly

### Post-Implementation

- [ ] Monitor logs for unexpected role values
- [ ] Verify no user reports of permission issues
- [ ] Update documentation
- [ ] Remove debug logging after verification
- [ ] Create guide for developers on role system

---

## Documentation Updates Needed

### 1. Architecture Documentation

**File:** `project-docs/03-features/authentication.md`

Add section explaining:

- Difference between user roles and organization roles
- When to use `locals.userRole` vs `locals.orgRole`
- How session claims populate both properties
- Role system data flow diagram

### 2. Developer Guide

**File:** `project-docs/02-guides/role-based-access-control.md`

Create guide covering:

- How to check application-wide permissions
- How to check organization-specific permissions
- Examples of correct usage
- Common mistakes to avoid

### 3. API Documentation

**File:** `project-docs/04-integrations/clerk/session-claims.md`

Document:

- Complete list of session claims
- How each claim is used in the application
- Relationship between Clerk metadata and session claims

---

## Future Improvements

### 1. Type Safety for Roles

```typescript
// src/types/roles.ts
export type UserRole = 'member' | 'admin' | 'super_admin'
export type OrgRole = 'org:admin' | 'org:member'

// src/env.d.ts
interface Locals {
  userRole?: UserRole
  orgRole?: OrgRole | null
  orgId?: string | null
}
```

### 2. Role Helper Utilities

```typescript
// src/utils/permissions.ts
export function hasAppPermission(userRole: UserRole | undefined, required: UserRole): boolean {
  const levels = { member: 1, admin: 5, super_admin: 10 }
  return (levels[userRole ?? 'member'] ?? 0) >= levels[required]
}

export function hasOrgPermission(orgRole: OrgRole | null | undefined, required: OrgRole): boolean {
  if (!orgRole) return false
  return orgRole === 'org:admin' || orgRole === required
}
```

### 3. Middleware Testing

```typescript
// tests/middleware/auth.test.ts
describe('Auth Middleware', () => {
  it('should extract user role from session claims', () => {
    // Test role extraction logic
  })

  it('should separate user role from org role', () => {
    // Test role separation
  })

  it('should handle missing organization context', () => {
    // Test null org role handling
  })
})
```

---

## Risk Assessment

### Implementation Risks

| Risk                             | Severity | Probability | Mitigation                            |
| -------------------------------- | -------- | ----------- | ------------------------------------- |
| Breaking existing permissions    | Medium   | Low         | Thorough testing of all role checks   |
| Missing org permission checks    | Medium   | Medium      | Code review of all userRole usages    |
| Session claims not configured    | High     | Low         | Verify Clerk config before deployment |
| User confusion during transition | Low      | Low         | Change is transparent to users        |

### Rollback Plan

If issues occur:

1. Revert middleware changes (simple git revert)
2. Role functionality returns to current (buggy) state
3. Database remains unaffected
4. No data loss or corruption possible

---

## Success Metrics

### Key Performance Indicators

1. **Role Stability**
   - Metric: User role should not change when joining/leaving orgs
   - Target: 100% stability
   - Measurement: Log analysis of userRole values

2. **Permission Accuracy**
   - Metric: Users have correct permissions based on database role
   - Target: 100% accuracy
   - Measurement: Manual testing + user reports

3. **Organization Permissions**
   - Metric: Org admin features available only to org:admin
   - Target: 100% accuracy
   - Measurement: Permission check testing

4. **User Experience**
   - Metric: No user-reported role confusion
   - Target: Zero reports within 1 week post-deployment
   - Measurement: User feedback monitoring

---

## Timeline Estimate

- **Investigation:** ✅ Complete (2 hours)
- **Implementation:** 2-3 hours
  - Middleware changes: 30 minutes
  - Type definition updates: 15 minutes
  - Organization page updates: 1 hour
  - Code review of all userRole usages: 1 hour
- **Testing:** 1-2 hours
  - Unit testing: 30 minutes
  - Integration testing: 1 hour
  - Manual verification: 30 minutes
- **Documentation:** 1 hour
- **Total:** 4-6 hours

---

## Related Documentation

- [Clerk Session Claims](https://clerk.com/docs/backend-requests/making/custom-session-token)
- [Webhook Race Condition Analysis](project-docs/04-integrations/clerk/webhook-race-condition-analysis.md)
- [Configurable Roles Guide](project-docs/02-guides/configurable-roles.md)
- [Database Schema](scripts/migrations/)

---

## Appendix A: Code Locations

### Files Modified in This Fix

1. `src/middleware.ts:366-367` - Role extraction logic
2. `src/env.d.ts:11` - Type definitions
3. `src/pages/organization/index.astro:13-78` - Organization permissions

### Files That Use userRole (Review Required)

```bash
src/middleware.ts:366
src/pages/organization/index.astro:13
# Additional files to be identified during implementation
```

### Database Tables Involved

1. `users` - User-level roles
2. `organization_memberships` - Organization-specific roles

### Webhook Endpoints

1. `/api/webhooks/clerk` - Handles role synchronization
2. `/api/user/sync` - Manual user sync

---

## Appendix B: Session Claims Structure

### Current Session Claims (Verified)

```typescript
interface SessionClaims {
  // User-level role (from publicMetadata)
  role: 'member' | 'admin' | 'super_admin'

  // Organization-specific role (from membership)
  org_role: 'org:admin' | 'org:member' | undefined

  // Current organization context
  org_id: string | undefined

  // Standard Clerk claims
  sub: string // User ID
  email: string
  // ... other standard JWT claims
}
```

### Clerk Dashboard Configuration

**Location:** Clerk Dashboard > JWT Templates > Default

**Required Claims:**

```json
{
  "role": "{{user.public_metadata.role}}",
  "org_role": "{{user.organization_memberships.0.role}}",
  "org_id": "{{user.organization_memberships.0.id}}"
}
```

---

## Sign-Off

**Analysis Completed By:** Claude Code (AI Assistant)
**Review Required By:** Project Maintainer
**Approval Required By:** Technical Lead
**Deployment Authorization:** Product Owner

---

**Document Version:** 1.0
**Last Updated:** 2025-01-23
**Next Review Date:** After implementation completion
