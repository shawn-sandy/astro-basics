# Proposal: Hierarchical Role-Based Access Control

## Why

The current role guard system uses flat equality checking (`allowedRoles.includes(userRole)`), which prevents higher-privilege roles from accessing content restricted to lower-privilege roles. This creates a counterintuitive user experience where admins cannot view member-only content, and super admins must explicitly be granted access to every permission level.

**Problem**: When a component restricts content to `member` role only, administrators and super administrators are unexpectedly denied access, even though they should have all privileges that members have plus additional administrative capabilities.

**Example Scenario**:

```astro
<RoleGuard allowedRoles={['member']}>
  <UserDashboard />
</RoleGuard>
<!-- Current: Only 'member' can view -->
<!-- Expected: 'member', 'admin', AND 'super_admin' can view -->
```

This violates the principle of hierarchical privilege escalation where higher roles inherit all permissions of lower roles.

## What Changes

Implement hierarchical role-based access control that respects the existing role hierarchy defined in `src/utils/role-types.ts`:

- `member` (level 1) - Base user permissions
- `admin` (level 2) - All member permissions + administrative capabilities
- `super_admin` (level 3) - All admin permissions + system-wide control

**Changes**:

1. Add `hasRoleOrHigher()` helper function to `src/utils/role-guard.ts` that compares role hierarchy levels
2. Update `canViewContent()` to use hierarchical comparison instead of flat array inclusion
3. Add `useHierarchy?: boolean` option to `RoleGuardConfig` interface (default: `true`)
4. Update `canViewContentDetailed()` to provide hierarchy-aware results
5. Update `RoleGuard.astro` component to support hierarchy configuration
6. Preserve backward compatibility with opt-out mechanism for exact role matching

**Backward Compatibility**:

All existing code continues to work with improved behavior (admins gain appropriate access). Components requiring exact role matching can opt out via `useHierarchy={false}`.

**Org Roles**:

Clerk organization roles (`org:admin`, `org:member`) continue using flat matching since they don't have a defined hierarchy in the current system.

## Impact

### Affected Specifications

- **NEW**: `role-guard` - Creates first specification for role-based access control system

### Affected Code

- `src/utils/role-guard.ts` - Core role checking logic
- `src/utils/role-types.ts` - Type definitions and configuration interface
- `src/components/astro/RoleGuard.astro` - Component props and behavior
- `tests/utils/role-guard.test.ts` - Test suite additions

### Breaking Changes

**None** - This is a backward-compatible enhancement. Existing functionality is preserved with opt-out available.

### Security Considerations

- Privilege escalation is controlled and explicit via role hierarchy levels
- Org roles maintain flat matching to prevent unintended access grants
- Audit logging via `canViewContentDetailed()` tracks hierarchical decisions
- No changes to RLS policies (database-level security remains unchanged)

### User Experience Improvements

- Admins can naturally access member-level content without explicit grants
- Super admins have complete visibility as expected
- Developers have granular control via `useHierarchy` configuration
- Debug mode shows clear hierarchy evaluation results
