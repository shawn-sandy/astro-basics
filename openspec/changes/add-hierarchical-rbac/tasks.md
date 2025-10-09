# Implementation Tasks

## 1. Core Hierarchical Logic

- [ ] 1.1 Add `hasRoleOrHigher(userRole, requiredRole)` function to `src/utils/role-guard.ts`
- [ ] 1.2 Implement hierarchy level comparison using `ROLE_HIERARCHY` constant
- [ ] 1.3 Handle edge cases: null roles, org roles, mixed role types
- [ ] 1.4 Add comprehensive JSDoc documentation with usage examples

## 2. Configuration Interface

- [ ] 2.1 Add `useHierarchy?: boolean` field to `RoleGuardConfig` interface in `src/utils/role-types.ts`
- [ ] 2.2 Set default value to `true` for hierarchical behavior
- [ ] 2.3 Document the option with JSDoc comments explaining use cases
- [ ] 2.4 Export configuration option for external usage

## 3. Access Control Functions

- [ ] 3.1 Update `canViewContent()` to use hierarchical comparison when `useHierarchy === true`
- [ ] 3.2 Preserve flat array matching when `useHierarchy === false`
- [ ] 3.3 Update `canViewContentDetailed()` to include hierarchy information in results
- [ ] 3.4 Ensure org roles always use flat matching regardless of hierarchy setting
- [ ] 3.5 Update `hasAnyRole()` and `hasAllRoles()` to respect hierarchy configuration

## 4. Component Integration

- [ ] 4.1 Add `useHierarchy?: boolean` prop to `RoleGuard.astro` component Props interface
- [ ] 4.2 Pass hierarchy configuration to `canViewContent()` call
- [ ] 4.3 Update component JSDoc with hierarchy behavior examples
- [ ] 4.4 Add debug mode display for hierarchy evaluation results

## 5. Testing

- [ ] 5.1 Write unit tests for `hasRoleOrHigher()` function
  - [ ] 5.1.1 Test admin accessing member content (should allow)
  - [ ] 5.1.2 Test member accessing admin content (should deny)
  - [ ] 5.1.3 Test super_admin accessing all levels (should allow)
  - [ ] 5.1.4 Test null/undefined roles (should deny)
  - [ ] 5.1.5 Test org roles (should use flat matching)
- [ ] 5.2 Update `tests/utils/role-guard.test.ts` with hierarchical scenarios
  - [ ] 5.2.1 Test `canViewContent()` with hierarchy enabled
  - [ ] 5.2.2 Test `canViewContent()` with hierarchy disabled (backward compat)
  - [ ] 5.2.3 Test `canViewContentDetailed()` result metadata
  - [ ] 5.2.4 Test mixed user and org role scenarios
- [ ] 5.3 Add integration tests for `RoleGuard` component
  - [ ] 5.3.1 Test member-only content visibility with different roles
  - [ ] 5.3.2 Test admin-only content visibility
  - [ ] 5.3.3 Test opt-out via `useHierarchy={false}`
  - [ ] 5.3.4 Test debug mode display of hierarchy evaluation

## 6. Documentation

- [ ] 6.1 Add usage examples to `src/utils/role-guard.ts` JSDoc comments
- [ ] 6.2 Document hierarchical behavior in `RoleGuard.astro` component
- [ ] 6.3 Add migration guide for teams wanting exact role matching
- [ ] 6.4 Update inline code examples showing hierarchy in action

## 7. Quality Assurance

- [ ] 7.1 Run type checking: `npm run type-check`
- [ ] 7.2 Run linting: `npm run lint:all`
- [ ] 7.3 Run all tests: `npm test`
- [ ] 7.4 Manual testing with debug mode enabled
- [ ] 7.5 Security review of privilege escalation logic
