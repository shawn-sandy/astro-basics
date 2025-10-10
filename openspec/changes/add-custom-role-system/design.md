# Design: Custom Role System

## Context

The current RBAC system uses a hardcoded 3-tier role hierarchy (`member`, `admin`, `super_admin`) defined in PostgreSQL ENUMs and TypeScript types. This works well for app-level permissions but prevents organizations from defining custom roles that match their specific organizational structures and workflows.

**Stakeholders**:

- **Organization Administrators**: Need self-service role management without developer intervention
- **Developers**: Need stable core role system with clear extension points
- **End Users**: Need granular access control that reflects their actual job functions

**Constraints**:

- Must maintain backward compatibility with existing role-guard system
- Cannot break existing RLS policies or authentication flows
- Must preserve performance characteristics (<5ms overhead per role check)
- Must support multi-tenancy with org-scoped role isolation

**Current System Architecture**:

```
User Authentication (Clerk)
  ↓
Middleware (src/middleware.ts)
  ↓ Sets Astro.locals.userRole (org:admin | org:member)
  ↓
Role Resolution (src/utils/role-guard.ts)
  ↓ Checks Astro.locals → Supabase users.role
  ↓ Returns: member | admin | super_admin
  ↓
Hierarchical Comparison (ROLE_HIERARCHY)
  ↓ Compares role levels for access decision
  ↓
Access Granted/Denied
```

## Goals / Non-Goals

### Goals

1. **Organization-Specific Custom Roles**

   - Enable org admins to create custom roles (e.g., "Moderator", "Team Lead", "Billing Manager")
   - Store custom roles in database tables with org_id scoping
   - Provide UI for self-service role management

2. **Granular Permission System**

   - Define permissions as `resource:action` format (e.g., `posts:create`, `users:delete`)
   - Support permission assignment to custom roles
   - Provide permission checking utilities for fine-grained access control

3. **Backward Compatibility**

   - Preserve all existing role-guard functionality
   - No breaking changes to component APIs or utilities
   - Existing core roles continue working unchanged

4. **Performance**

   - Custom role resolution adds <5ms overhead
   - Caching strategy mirrors existing role cache
   - Batch permission loading for efficiency

5. **Security First**
   - Custom roles cannot escalate beyond core role mapping
   - Org-scoped isolation (RLS policies)
   - Audit logging for all role operations

### Non-Goals

1. **App-Level Custom Roles**: Custom roles only apply to organization context, NOT app-level RLS policies (core roles remain authoritative for database security)

2. **Cross-Organization Roles**: Custom roles are org-scoped only; no shared roles across organizations

3. **Dynamic Permission Discovery**: Permission list is predefined in code (not runtime-configurable); prevents permission explosion and security vulnerabilities

4. **Role Templates Marketplace**: No sharing or importing of role templates between organizations (future consideration)

5. **Fine-Grained Resource Scoping**: Permissions apply to resource types, not individual resources (e.g., `posts:delete` not `post:123:delete`)

## Decisions

### Decision 1: Hybrid Core + Custom Role Architecture

**What**: Maintain hardcoded core roles (`member`, `admin`, `super_admin`) alongside dynamic custom roles.

**Why**:

- **Stability**: Core roles provide stable foundation for RLS policies and app-level security
- **Flexibility**: Custom roles enable org-specific permission models without schema changes
- **Security**: Clear separation between system-level (core) and organization-level (custom) permissions
- **Migration Path**: Additive approach - no disruption to existing functionality

**Alternatives Considered**:

| Alternative                               | Pros                | Cons                                                  | Decision        |
| ----------------------------------------- | ------------------- | ----------------------------------------------------- | --------------- |
| **Fully Dynamic Roles** (all roles in DB) | Maximum flexibility | Breaks RLS policies, complex migration, security risk | ❌ Rejected     |
| **Config-File Roles** (YAML/JSON)         | Version controlled  | Requires deployment for changes, no self-service      | ❌ Rejected     |
| **Hybrid Approach** ✅                    | Best of both worlds | More complex resolution logic                         | ✅ **Selected** |

**Implementation**:

```typescript
// Core roles remain in ENUM
type CoreUserRole = 'member' | 'admin' | 'super_admin'

// Custom roles stored in database
type CustomRole = {
  id: string
  organization_id: string
  name: string
  description: string
  core_role_mapping: CoreUserRole // Inherits permissions from this core role
  permissions: string[] // Additional granular permissions
}

// Unified role type
type AnyRole = CoreUserRole | OrgRole | CustomRole
```

### Decision 2: Custom Roles Map to Core Role Equivalents

**What**: Each custom role must map to a core role equivalent (`member`, `admin`, or `super_admin`).

**Why**:

- **Security Boundary**: Custom roles inherit permissions of mapped core role but cannot exceed them
- **Predictable Hierarchy**: Custom role cannot grant super_admin privileges to a member-level user
- **RLS Compatibility**: Database-level security uses core role mapping for policy enforcement
- **Simplified Resolution**: Clear permission ceiling for each custom role

**Example**:

```typescript
// Custom role: "Moderator" maps to "admin"
const moderatorRole: CustomRole = {
  id: 'mod_123',
  organization_id: 'org_abc',
  name: 'Moderator',
  core_role_mapping: 'admin', // Inherits all admin privileges
  permissions: [
    'posts:delete',
    'comments:moderate',
    // CANNOT include 'billing:manage' if admin doesn't have it
  ],
}

// Resolution logic:
// 1. User has custom role "Moderator"
// 2. Check core_role_mapping: "admin" (level 2)
// 3. Apply hierarchical comparison using "admin" level
// 4. Grant access if admin level >= required level
```

**Alternatives Considered**:

| Alternative                               | Pros                    | Cons                                   | Decision        |
| ----------------------------------------- | ----------------------- | -------------------------------------- | --------------- |
| **Independent Custom Roles** (no mapping) | More flexible           | Security risk, unpredictable hierarchy | ❌ Rejected     |
| **Permission-Only Model** (no hierarchy)  | Granular control        | Complex checks, performance impact     | ❌ Rejected     |
| **Map to Core Roles** ✅                  | Clear security boundary | Slight inflexibility                   | ✅ **Selected** |

### Decision 3: Permission Format - `resource:action`

**What**: Permissions stored as string format: `resource:action` (e.g., `posts:create`, `users:delete`).

**Why**:

- **Simple and Intuitive**: Easy to understand and communicate
- **Extensible**: New resources/actions added without schema changes
- **Wildcard Support**: Future support for `posts:*` or `*:delete` patterns
- **Standard Pattern**: Matches industry conventions (AWS IAM, Clerk, etc.)

**Permission Registry** (Predefined in code):

```typescript
// src/utils/permissions.ts
export const PERMISSION_REGISTRY = {
  // Content Management
  'posts:create': { resource: 'posts', action: 'create', coreRoleRequired: 'member' },
  'posts:edit': { resource: 'posts', action: 'edit', coreRoleRequired: 'member' },
  'posts:delete': { resource: 'posts', action: 'delete', coreRoleRequired: 'admin' },
  'posts:publish': { resource: 'posts', action: 'publish', coreRoleRequired: 'admin' },

  // User Management
  'users:view': { resource: 'users', action: 'view', coreRoleRequired: 'member' },
  'users:edit': { resource: 'users', action: 'edit', coreRoleRequired: 'admin' },
  'users:delete': { resource: 'users', action: 'delete', coreRoleRequired: 'super_admin' },

  // Organization
  'org:settings': { resource: 'org', action: 'settings', coreRoleRequired: 'admin' },
  'org:billing': { resource: 'org', action: 'billing', coreRoleRequired: 'admin' },
  'org:delete': { resource: 'org', action: 'delete', coreRoleRequired: 'super_admin' },
} as const
```

**Validation**:

- Only permissions in `PERMISSION_REGISTRY` can be assigned
- Each permission specifies minimum `coreRoleRequired`
- Custom role cannot assign permission requiring higher core role than its mapping

**Alternatives Considered**:

| Alternative          | Pros               | Cons                     | Decision        |
| -------------------- | ------------------ | ------------------------ | --------------- |
| **Bitwise Flags**    | Fast checks        | Inflexible, hard to read | ❌ Rejected     |
| **Nested Objects**   | Rich metadata      | Complex queries          | ❌ Rejected     |
| **String Format** ✅ | Simple, extensible | Requires validation      | ✅ **Selected** |

### Decision 4: Database Schema - 3 Tables

**What**: Create 3 new tables for custom role management.

**Schema**:

```sql
-- 1. Custom role definitions
CREATE TABLE custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  name text NOT NULL,
  description text,
  core_role_mapping user_role NOT NULL, -- 'member' | 'admin' | 'super_admin'
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, name)
);

-- 2. Role permissions (many-to-many)
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id uuid REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission text NOT NULL, -- 'posts:create', 'users:delete', etc.
  created_at timestamptz DEFAULT now(),

  UNIQUE(custom_role_id, permission)
);

-- 3. User custom role assignments
CREATE TABLE user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  custom_role_id uuid REFERENCES custom_roles(id) ON DELETE CASCADE,
  organization_id text NOT NULL,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now(),

  UNIQUE(user_id, custom_role_id, organization_id)
);
```

**Indexes**:

```sql
CREATE INDEX idx_custom_roles_org ON custom_roles(organization_id);
CREATE INDEX idx_user_custom_roles_user ON user_custom_roles(user_id);
CREATE INDEX idx_user_custom_roles_org ON user_custom_roles(organization_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(custom_role_id);
```

**Why This Schema**:

- ✅ Normalized design prevents data duplication
- ✅ Supports many-to-many relationships (users can have multiple custom roles)
- ✅ Org-scoped isolation via `organization_id` column
- ✅ Soft delete support via `is_active` flag
- ✅ Audit trail with `created_by`, `assigned_by` fields

**Alternatives Considered**:

| Alternative                         | Pros                   | Cons                             | Decision        |
| ----------------------------------- | ---------------------- | -------------------------------- | --------------- |
| **Single Table** (JSON permissions) | Simpler schema         | Hard to query, no FK constraints | ❌ Rejected     |
| **5+ Tables** (full RBAC)           | Maximum flexibility    | Over-engineered for use case     | ❌ Rejected     |
| **3 Tables** ✅                     | Balanced normalization | Slight query complexity          | ✅ **Selected** |

### Decision 5: Custom Role Resolution Algorithm

**What**: Multi-step resolution process that checks custom roles before falling back to core roles.

**Resolution Flow**:

```typescript
async function resolveUserRole(
  locals: App.Locals,
  organizationId?: string
): Promise<AnyRole | null> {
  // 1. Check if user is authenticated
  if (!locals.userId) return null

  // 2. If in org context, check for custom role assignment
  if (organizationId) {
    const customRole = await getCustomRoleForUser(locals.userId, organizationId)
    if (customRole) {
      return customRole // Custom role takes precedence
    }
  }

  // 3. Fall back to Clerk org role (org:admin | org:member)
  if (locals.userRole && isOrgRole(locals.userRole)) {
    return locals.userRole
  }

  // 4. Fall back to Supabase core role (member | admin | super_admin)
  const coreRole = await fetchUserRoleFromSupabase(locals.userId)
  return coreRole
}

// Hierarchical comparison with custom roles
function hasRoleOrHigher(userRole: AnyRole, requiredRole: AnyRole): boolean {
  // If user has custom role, use its core_role_mapping for hierarchy
  if (isCustomRole(userRole)) {
    const effectiveCoreRole = userRole.core_role_mapping
    return ROLE_HIERARCHY[effectiveCoreRole] >= ROLE_HIERARCHY[requiredRole]
  }

  // Standard hierarchy comparison
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}
```

**Caching Strategy**:

```typescript
// Extend existing roleCache to support custom roles
interface RoleCacheEntry {
  role: AnyRole
  customRole?: CustomRole // Include full custom role object
  expiresAt: number
}

// Cache key includes org context
const cacheKey = organizationId ? `${userId}:${organizationId}` : userId
```

**Why This Approach**:

- ✅ Custom roles override core roles in org context (expected behavior)
- ✅ Falls back gracefully if no custom role assigned
- ✅ Maintains performance via caching
- ✅ Clear precedence order prevents ambiguity

**Alternatives Considered**:

| Alternative             | Pros                | Cons                    | Decision        |
| ----------------------- | ------------------- | ----------------------- | --------------- |
| **Core Role Priority**  | Simpler logic       | Custom roles never used | ❌ Rejected     |
| **Custom Role Only**    | Maximum flexibility | Breaks backward compat  | ❌ Rejected     |
| **Precedence Order** ✅ | Clear, predictable  | Slight complexity       | ✅ **Selected** |

## Risks / Trade-offs

### Risk 1: Permission Explosion

**Risk**: Uncontrolled permission creation leads to 1000s of permissions, making management difficult.

**Likelihood**: Medium
**Impact**: High

**Mitigation**:

- ✅ Predefined permission registry in code (not user-defined)
- ✅ Permission templates for common role types
- ✅ UI limits permission selection to registry only
- ✅ Admin UI shows permission usage counts to identify unused permissions

### Risk 2: Custom Role Complexity

**Risk**: Complex custom role hierarchies become hard to understand and debug.

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:

- ✅ Limit custom roles to 1 level (no custom role inheritance chains)
- ✅ Debug mode shows full resolution path in role-guard components
- ✅ Admin UI visualizes role hierarchy and effective permissions
- ✅ Documentation with clear examples and best practices

### Risk 3: Performance Degradation

**Risk**: Custom role resolution adds latency to every access check.

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:

- ✅ Aggressive caching (same TTL as core role cache)
- ✅ Batch loading of custom roles for org members
- ✅ Lazy loading (only when org context active)
- ✅ Performance monitoring with <5ms overhead target

**Monitoring**:

```typescript
// Performance tracking in role resolution
performance.mark('role-resolution-start')
const role = await resolveUserRole(locals, orgId)
performance.mark('role-resolution-end')
performance.measure('role-resolution', 'role-resolution-start', 'role-resolution-end')

// Alert if resolution takes >5ms
```

### Risk 4: Cross-Organization Data Leakage

**Risk**: Custom role from one org grants access to another org's data.

**Likelihood**: Low
**Impact**: Critical

**Mitigation**:

- ✅ RLS policies enforce org_id boundaries at database level
- ✅ Custom role resolution requires matching org_id parameter
- ✅ All API endpoints validate org_id against session claims
- ✅ Test suite includes cross-org access attempt scenarios

**RLS Policy Example**:

```sql
-- Custom roles table
CREATE POLICY "Users can view custom roles in their org"
  ON custom_roles FOR SELECT
  USING (
    organization_id IN (
      SELECT clerk_org_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
    )
  );
```

## Migration Plan

### Phase 1: Schema Migration (Zero Downtime)

**Steps**:

1. Apply migration `003_add_custom_role_tables.sql`
2. Create 3 new tables with indexes
3. Add RLS policies for org-scoped access
4. Verify migration success with test data

**Rollback**:

- Run rollback migration `rollback_003_add_custom_role_tables.sql`
- Tables are isolated - no impact on existing data

**Duration**: ~2 minutes

### Phase 2: Code Deployment (Zero Downtime)

**Steps**:

1. Deploy extended `role-guard.ts` with custom role resolution
2. Deploy new utilities: `permissions.ts`, `custom-roles.ts`
3. Deploy API endpoints behind feature flag
4. Deploy admin UI behind feature flag

**Feature Flag**:

```typescript
// src/utils/feature-flags.ts
export const CUSTOM_ROLES_ENABLED =
  import.meta.env.FEATURE_CUSTOM_ROLES === 'true'

// Usage in components
{CUSTOM_ROLES_ENABLED && <CustomRoleManager />}
```

**Rollback**:

- Disable feature flag via environment variable
- UI and API become inaccessible
- Core role system continues functioning

**Duration**: ~10 minutes (standard deployment)

### Phase 3: Pilot Testing (Controlled)

**Steps**:

1. Enable feature flag for 3-5 pilot organizations
2. Monitor custom role creation and usage
3. Collect feedback on UI/UX
4. Validate performance metrics (<5ms overhead)
5. Fix any issues discovered

**Success Criteria**:

- ✅ Zero security incidents
- ✅ Performance within targets
- ✅ Positive user feedback
- ✅ No data corruption or cross-org leakage

**Duration**: 1-2 weeks

### Phase 4: Full Rollout

**Steps**:

1. Enable feature flag for all organizations
2. Announce feature in release notes
3. Provide documentation and training materials
4. Monitor usage and support requests

**Monitoring**:

- Custom role creation rate
- Permission assignment patterns
- Role resolution latency
- Error rates on custom role APIs

## Open Questions

### Q1: Should custom roles support inheritance?

**Question**: Should custom roles be able to inherit from other custom roles (e.g., "Senior Moderator" inherits from "Moderator")?

**Current Decision**: No custom role inheritance (keep it simple).

**Rationale**:

- Prevents complex inheritance chains
- Easier to understand and debug
- Sufficient for 90% of use cases

**Future Consideration**: If user research shows strong need, consider adding in v2.

### Q2: Should permissions support wildcards?

**Question**: Should we support wildcard permissions like `posts:*` or `*:delete`?

**Current Decision**: No wildcards in v1.

**Rationale**:

- Explicit permissions easier to audit
- Prevents accidental over-granting
- Simpler validation logic

**Future Consideration**: Add if permission management becomes too tedious.

### Q3: Should we support role expiration?

**Question**: Should custom role assignments have expiration dates (e.g., "Moderator for 3 months")?

**Current Decision**: No expiration in v1.

**Rationale**:

- Adds complexity to resolution logic
- Manual revocation sufficient for now
- Unclear if there's demand

**Future Consideration**: Add if org admins request time-limited roles.

### Q4: How do custom roles interact with Clerk org roles?

**Question**: If a user is `org:admin` in Clerk AND has custom role "Moderator" in our system, which takes precedence?

**Current Decision**: Custom role takes precedence in org context (resolution order: custom → clerk org → core).

**Rationale**:

- More specific (custom) should override more general (org:admin)
- Allows downgrading org:admin to specific role
- Falls back to org:admin if no custom role assigned

**Edge Case Handling**:

```typescript
// User is org:admin in Clerk BUT assigned "Limited Editor" custom role
// Result: User gets "Limited Editor" permissions (custom role precedence)

// User is org:admin in Clerk with NO custom role assigned
// Result: User gets org:admin permissions (fallback to Clerk role)
```

## Success Metrics

**Adoption Metrics**:

- Number of organizations using custom roles (target: 30% after 3 months)
- Average custom roles per organization (target: 3-5)
- Percentage of org members with custom roles (target: 20-40%)

**Performance Metrics**:

- Custom role resolution latency (target: <5ms p95)
- Role cache hit rate (target: >90%)
- API response time for role operations (target: <200ms p95)

**Quality Metrics**:

- Security incidents related to custom roles (target: 0)
- Cross-org access attempts blocked by RLS (monitor, no target)
- Custom role creation errors (target: <1% error rate)

**User Satisfaction**:

- Admin UI usability score (target: >4/5)
- Support tickets related to custom roles (target: <5% of total)
- Feature adoption rate (target: >50% of orgs try it after 6 months)
