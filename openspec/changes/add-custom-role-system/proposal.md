# Proposal: Custom Role System (Hybrid RBAC)

## Why

Organizations need the ability to define custom roles with configurable permissions tailored to their specific workflows and hierarchies, while maintaining the stability and security of core system roles.

**Problem**: The current 3-tier role system (`member`, `admin`, `super_admin`) is hardcoded in PostgreSQL ENUMs and TypeScript types, making it impossible to add organization-specific roles without database migrations and application deployments. This creates several issues:

1. **Inflexibility**: Different organizations have different role needs (moderators, coordinators, team leads, etc.) that don't fit the generic 3-tier model
2. **Scalability**: Every new role type requires schema changes, code updates, and redeployment across all environments
3. **Multi-tenancy Limitations**: All organizations share the same role definitions, preventing per-organization customization
4. **Developer Bottleneck**: Non-technical org admins cannot self-serve role creation; they must request developer intervention

**Example Scenario**:

An organization wants to create a "Moderator" role with permissions between `member` and `admin` - they can manage content but not access billing. With the current system, this requires:

- Database migration to add ENUM value
- TypeScript type updates
- Code changes to role-guard logic
- Full application redeployment

With custom roles, org admins can create this role via UI in minutes.

## What Changes

Implement a hybrid role-based access control system that combines stable core roles with dynamic custom roles:

**Core Roles** (Unchanged):

- `member`, `admin`, `super_admin` - Remain hardcoded for system-level stability
- Stored in existing `user_role` ENUM
- Used for app-level permissions and RLS policies
- Cannot be deleted or modified

**Custom Roles** (New):

- Organization-specific roles stored in database tables
- Created and managed by org admins via UI
- Map to core role equivalents for permission inheritance
- Scoped to organization boundaries (multi-tenant safe)
- Support configurable permissions per role

**Changes**:

1. **Database Schema** (3 new tables):

   - `custom_roles` - Role definitions with org_id, name, core_role_mapping
   - `role_permissions` - Granular permissions (resource:action format)
   - `user_custom_roles` - Assignment of custom roles to org members

2. **TypeScript Utilities**:

   - `CustomRole` type extending `AnyRole`
   - `resolveUserRole()` function with custom role resolution
   - `hasPermission()` helper for granular permission checks
   - Extended `role-guard.ts` to support custom role resolution

3. **Admin UI** (`/dashboard/roles/`):

   - Custom role CRUD interface
   - Permission assignment UI with permission templates
   - Role assignment to organization members
   - Role hierarchy visualization

4. **API Endpoints** (`/api/roles/`):
   - `POST /api/roles/custom` - Create custom role
   - `GET /api/roles/custom?org_id={id}` - List org roles
   - `PATCH /api/roles/custom/:id` - Update role
   - `DELETE /api/roles/custom/:id` - Delete role (soft delete)
   - `POST /api/roles/assign` - Assign role to user

**Backward Compatibility**:

All existing code continues working unchanged. Custom roles are additive:

- Existing role guards work with both core and custom roles
- Core role system remains unchanged
- No breaking changes to API or components
- Opt-in for organizations wanting custom roles

**Security Model**:

- Custom roles scoped to `organization_memberships` only (org-level, not app-level)
- Core role permissions cannot be reduced via custom roles
- Org admins can only create/manage roles in their own organization
- Custom role permissions validated against permission registry
- Audit logging for all role creation, modification, and assignment

## Impact

### Affected Specifications

- **MODIFIED**: `role-guard` - Extend to support custom role resolution
- **ADDED**: `custom-roles` - New capability for organization-specific role management
- **ADDED**: `database-schema` - New tables for custom role storage

### Affected Code

**Database**:

- `scripts/migrations/` - New migration for 3 custom role tables
- `src/libs/database-types.ts` - Add CustomRole types

**Role System**:

- `src/utils/role-guard.ts` - Add custom role resolution logic
- `src/utils/role-types.ts` - Extend type definitions for custom roles
- `src/utils/permissions.ts` - NEW: Permission checking utilities

**Components**:

- `src/components/astro/RoleGuard.astro` - Support custom role resolution
- `src/components/react/RoleGuard.tsx` - Support custom role resolution

**Admin UI** (New):

- `src/pages/dashboard/roles/index.astro` - Role management dashboard
- `src/pages/dashboard/roles/create.astro` - Create custom role form
- `src/pages/dashboard/roles/[id]/edit.astro` - Edit role page
- `src/components/dashboard/CustomRoleManager.tsx` - React management component

**API Endpoints** (New):

- `src/pages/api/roles/custom.ts` - CRUD operations
- `src/pages/api/roles/assign.ts` - Role assignment
- `src/pages/api/roles/permissions.ts` - Permission listing

**Tests**:

- `tests/utils/custom-roles.test.ts` - NEW: Custom role resolution tests
- `tests/utils/permissions.test.ts` - NEW: Permission checking tests
- `tests/utils/role-guard.test.ts` - UPDATE: Add custom role scenarios
- `tests/integration/custom-role-crud.test.ts` - NEW: API integration tests
- `e2e/role-management.spec.ts` - NEW: E2E tests for admin UI

### Breaking Changes

**None** - This is a backward-compatible enhancement. All existing functionality preserved.

### Migration Strategy

**Phase 1: Additive Schema** (Zero Downtime)

1. Apply migration to add 3 custom role tables
2. Tables are independent - no changes to existing `users` or `organization_memberships`
3. Existing app continues functioning normally

**Phase 2: Code Deployment** (Zero Downtime)

1. Deploy extended role-guard logic with custom role resolution
2. Resolution falls back to core roles if no custom roles exist
3. UI and API endpoints deployed but hidden behind feature flag

**Phase 3: Gradual Rollout** (Controlled)

1. Enable feature flag for pilot organizations
2. Monitor custom role creation and assignment
3. Collect feedback and iterate
4. Full rollout after validation

**Rollback Plan**:

- Feature flag can disable custom role UI/API instantly
- Database tables can remain without impact (isolation)
- Core role system continues working independently

### Security Considerations

**Positive Security Impacts**:

- ✅ Organizations can implement least-privilege custom roles
- ✅ Granular permissions reduce over-privileged accounts
- ✅ Audit trail for all role changes and assignments
- ✅ Custom roles cannot escalate beyond core role mappings

**Security Boundaries**:

- ⚠️ Custom roles ONLY affect organization-level permissions (not app-level RLS)
- ⚠️ Core role hierarchy enforced (custom role cannot grant super_admin access)
- ⚠️ Org admins can only manage roles in their own organization
- ⚠️ Permission validation prevents creation of invalid permissions

**Risks and Mitigations**:

| Risk                                  | Mitigation                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Privilege escalation via custom roles | Core role mapping enforced - custom roles inherit limits of mapped core role |
| Cross-org role assignment             | Org ID validation on all role operations - RLS policies enforce boundaries   |
| Permission explosion                  | Permission registry with validation - predefined list of valid permissions   |
| Performance degradation               | Caching layer for custom role resolution - <5ms overhead target              |

### User Experience Improvements

**For Organization Administrators**:

- ✅ Self-service role creation without developer support
- ✅ Visual role management interface
- ✅ Permission templates for common role types
- ✅ Real-time role assignment to members

**For Developers**:

- ✅ Same `RoleGuard` component API - no code changes needed
- ✅ Type-safe custom role definitions
- ✅ Clear permission checking utilities
- ✅ Debug mode shows custom role resolution path

**For End Users**:

- ✅ More granular access control matches organizational structure
- ✅ Clearer role names specific to organization context
- ✅ Reduced over-privileged access (better security)

### Performance Impact

**Expected Overhead**:

- Custom role resolution: +2-5ms per role check (with caching)
- Database queries: +1 query per custom role lookup (cacheable)
- Memory footprint: ~500KB per 100 custom roles in cache

**Optimization Strategy**:

- In-memory role cache with TTL (same as existing role cache)
- Batch permission loading for org members
- Lazy loading of custom roles (only when org context active)
- Index optimization on `custom_roles.organization_id`

### Documentation Impact

**New Documentation Required**:

- `/docs/guide/custom-roles.md` - User guide for creating and managing custom roles
- `/docs/guide/permissions.md` - Permission system documentation
- `/docs/database/custom-role-schema.md` - Database schema reference
- API documentation for custom role endpoints

**Updated Documentation**:

- `/CLAUDE.md` - Add custom role system to project overview
- `/docs/database/supabase-migration-refactor-plan.md` - Document new migration
- Role-guard component documentation - Add custom role examples
