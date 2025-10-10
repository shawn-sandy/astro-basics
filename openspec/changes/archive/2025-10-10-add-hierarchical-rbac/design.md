# Design Document: Hierarchical Role-Based Access Control

## Context

The astro-basics project currently implements a 3-tier user role system (`member`, `admin`, `super_admin`) stored in Supabase and synced from Clerk. The `ROLE_HIERARCHY` constant exists in `src/utils/role-types.ts` but is not used by the role guard functions. Access control currently uses flat equality checking, treating all roles as independent rather than hierarchical.

**Background**:

- Role hierarchy levels: member (1), admin (2), super_admin (3)
- Separate org role system from Clerk: org:admin, org:member (no hierarchy)
- Role guards used throughout the application for conditional rendering
- Existing infrastructure for role checking in `src/utils/role-guard.ts`

**Stakeholders**:

- Application developers needing intuitive role-based access control
- Security team requiring controlled privilege escalation
- End users expecting admins to have broader access than members

**Constraints**:

- Must maintain backward compatibility with existing code
- Cannot break database RLS policies (separate concern)
- Performance must remain O(1) for role comparisons
- TypeScript strict mode compliance required

## Goals / Non-Goals

### Goals

1. Enable hierarchical privilege escalation for user roles (member → admin → super_admin)
2. Maintain backward compatibility with all existing code
3. Provide explicit configuration for opt-out scenarios
4. Preserve flat matching for org roles (no hierarchy)
5. Minimal performance impact (O(1) hierarchy lookups)
6. Clear debugging information for access decisions

### Non-Goals

1. Modifying database RLS policies (remains user-scoped only)
2. Implementing hierarchy for Clerk org roles (out of scope)
3. Adding new role types or levels
4. Changing existing role storage mechanisms
5. Modifying authentication middleware
6. Creating role management UI

## Decisions

### Decision 1: Opt-in by Default with Backward Compatibility

**Choice**: Hierarchical checking is enabled by default (`useHierarchy: true`) with explicit opt-out available.

**Rationale**:

- Hierarchical access is the intuitive default behavior for role systems
- Admins should naturally have access to member-level content
- Backward compatible: existing code gets improved behavior without changes
- Teams needing exact role matching can explicitly set `useHierarchy: false`

**Alternatives Considered**:

- **Opt-in (hierarchy disabled by default)**: Rejected because it would require updating all role guards to enable the new behavior, creating technical debt and delaying adoption
- **Always hierarchical (no opt-out)**: Rejected because some applications may legitimately need exact role matching for specific features

**Implementation**:

```typescript
export interface RoleGuardConfig {
  allowedRoles: AnyRole[]
  useHierarchy?: boolean // Default: true
  // ... other options
}
```

### Decision 2: Separate User and Org Role Hierarchy Behavior

**Choice**: User roles use hierarchy, org roles always use flat matching.

**Rationale**:

- User roles (`member`, `admin`, `super_admin`) have an explicit hierarchy defined in the application
- Org roles (`org:admin`, `org:member`) are managed by Clerk with organization-specific permissions
- Mixing hierarchies between systems creates confusion and security risks
- Clerk org roles may have different privilege models per organization

**Alternatives Considered**:

- **Unified hierarchy for all roles**: Rejected because org:admin and super_admin serve different purposes (organization vs application scope)
- **Configurable org role hierarchy**: Rejected due to complexity and unclear use cases

**Implementation**:

```typescript
function hasRoleOrHigher(userRole: AnyRole, requiredRole: AnyRole): boolean {
  // Org roles always use flat matching (no hierarchy)
  if (isOrgRole(userRole) || isOrgRole(requiredRole)) {
    return userRole === requiredRole
  }

  // User roles use hierarchy comparison
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole as UserRole] ?? 0
  return userLevel >= requiredLevel
}
```

### Decision 3: Hierarchy Lookup via Constant, Not Database

**Choice**: Use the `ROLE_HIERARCHY` constant from `role-types.ts` for level comparisons.

**Rationale**:

- O(1) lookup performance (object property access)
- No additional database queries required
- Type-safe with TypeScript
- Centralized definition of hierarchy levels
- Consistent with existing architecture patterns

**Alternatives Considered**:

- **Database-stored hierarchy**: Rejected due to performance overhead and added complexity
- **Hardcoded hierarchy in functions**: Rejected due to maintainability concerns

**Risk Mitigation**:

- Role hierarchy is application logic, not user data
- Changes to hierarchy levels are deliberate code changes requiring review
- TypeScript enforces valid role values at compile time

### Decision 4: Enhanced Debug Mode for Hierarchy Evaluation

**Choice**: Extend debug mode to show hierarchy evaluation details.

**Rationale**:

- Developers need visibility into why access was granted/denied
- Hierarchy evaluation may be non-obvious in complex scenarios
- Debugging is critical for security-related features

**Implementation**:

```typescript
// In canViewContentDetailed()
return {
  allowed: true,
  userRole,
  evaluationMethod: config.useHierarchy ? 'hierarchy' : 'exact',
  hierarchyLevel: config.useHierarchy ? ROLE_HIERARCHY[userRole] : undefined,
}
```

## Risks / Trade-offs

### Risk 1: Unintended Privilege Escalation

**Risk**: Admins gain access to content that was previously member-only by design.

**Mitigation**:

- Opt-out mechanism available via `useHierarchy={false}`
- Security review of all role guard usages during implementation
- Clear documentation of hierarchy behavior changes
- Debug mode helps identify unexpected access grants

**Likelihood**: Low
**Impact**: Medium
**Severity**: Low

### Risk 2: Confusion Between User and Org Roles

**Risk**: Developers may expect org roles to have hierarchy when they don't.

**Mitigation**:

- Clear JSDoc documentation explaining org role behavior
- Type system distinguishes `UserRole` from `OrgRole`
- Debug mode shows evaluation method used
- Examples in documentation cover both role types

**Likelihood**: Medium
**Impact**: Low
**Severity**: Low

### Risk 3: Performance Regression

**Risk**: Additional hierarchy checking adds latency to role guards.

**Mitigation**:

- Hierarchy lookup is O(1) via object property access
- No additional database queries
- Caching already exists for role fetching
- Benchmark testing before/after implementation

**Likelihood**: Very Low
**Impact**: Very Low
**Severity**: Negligible

### Trade-off: Increased Cognitive Complexity

**Trade-off**: Hierarchy logic adds mental overhead when reasoning about access control.

**Benefit**: More intuitive default behavior aligns with user expectations
**Cost**: Developers must understand hierarchy evaluation rules

**Justification**: The cognitive load of understanding hierarchy is lower than the cognitive load of manually granting admins access to every member permission.

## Migration Plan

### Phase 1: Implementation (No User Impact)

1. Add `hasRoleOrHigher()` helper function
2. Add `useHierarchy` configuration option (default: true)
3. Update `canViewContent()` and related functions
4. Write comprehensive unit tests
5. Update component props and documentation

**Duration**: 2-3 hours
**Risk**: Low (all changes are additive)

### Phase 2: Validation (Pre-Deployment)

1. Run full test suite including new hierarchical tests
2. Manual testing with debug mode enabled
3. Security review of privilege escalation logic
4. Code review focusing on edge cases
5. Performance benchmarking (before/after comparison)

**Duration**: 1-2 hours
**Risk**: Low (caught issues don't reach production)

### Phase 3: Deployment (Gradual Rollout)

1. Deploy to development environment first
2. Monitor logs for unexpected access grants/denials
3. Collect developer feedback on hierarchy behavior
4. Deploy to staging for broader testing
5. Production deployment after validation period

**Duration**: 1-2 days (including soak time)
**Risk**: Low (backward compatible, no breaking changes)

### Rollback Plan

**If issues arise**:

1. **Immediate**: Set default `useHierarchy: false` in config (1 line change)
2. **Short-term**: Add feature flag to disable hierarchy globally
3. **Long-term**: Revert commit if fundamental design flaw discovered

**Rollback Complexity**: Very Low
**Rollback Time**: <5 minutes for config change, <1 hour for full revert

### Migration Guide for Exact Role Matching

**For teams that need exact role matching** (member-only, no admins):

```astro
<!-- Before (implicit exact matching) -->
<RoleGuard allowedRoles={['member']}>
  <MemberOnlyContent />
</RoleGuard>

<!-- After (explicit exact matching) -->
<RoleGuard allowedRoles={['member']} useHierarchy={false}>
  <MemberOnlyContent />
</RoleGuard>
```

**When to use exact matching**:

- Beta features available only to test users (members)
- Role-specific dashboards (member dashboard vs admin dashboard)
- Permission testing or role simulation scenarios

## Open Questions

### Q1: Should we add a "minimum role" syntax for clarity?

**Question**: Would `minimumRole="member"` be clearer than `allowedRoles={['member']}`?

**Decision**: Deferred to future enhancement. Current API remains unchanged for backward compatibility.

**Reasoning**: Can be added later without breaking changes if user feedback suggests it's needed.

### Q2: How should hierarchy interact with custom roles (if added later)?

**Question**: If custom roles are introduced, how do they fit into the hierarchy?

**Decision**: Out of scope for this change. Custom roles would require separate design document.

**Notes**: Current implementation handles unknown roles by assigning hierarchy level 0 (no access).

### Q3: Should database RLS policies also implement hierarchy?

**Question**: Should Supabase RLS policies use hierarchical role checking?

**Decision**: No - database policies remain user-scoped. Application-level hierarchy is sufficient.

**Reasoning**:

- Database policies provide defense in depth with strict user isolation
- Application-level hierarchy offers flexibility without database migration
- Separation of concerns: database enforces ownership, application enforces roles
