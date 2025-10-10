# Implementation Tasks

## 1. Core Hierarchical Logic

- [x] 1.1 Add `hasRoleOrHigher(userRole, requiredRole)` function to `src/utils/role-guard.ts`
- [x] 1.2 Implement hierarchy level comparison using `ROLE_HIERARCHY` constant
- [x] 1.3 Handle edge cases: null roles, org roles, mixed role types
- [x] 1.4 Add comprehensive JSDoc documentation with usage examples

## 2. Configuration Interface

- [x] 2.1 Add `useHierarchy?: boolean` field to `RoleGuardConfig` interface in `src/utils/role-types.ts`
- [x] 2.2 Set default value to `true` for hierarchical behavior
- [x] 2.3 Document the option with JSDoc comments explaining use cases
- [x] 2.4 Export configuration option for external usage

## 3. Access Control Functions

- [x] 3.1 Update `canViewContent()` to use hierarchical comparison when `useHierarchy === true`
- [x] 3.2 Preserve flat array matching when `useHierarchy === false`
- [x] 3.3 Update `canViewContentDetailed()` to include hierarchy information in results
- [x] 3.4 Ensure org roles always use flat matching regardless of hierarchy setting
- [x] 3.5 Update `hasAnyRole()` and `hasAllRoles()` to respect hierarchy configuration

## 4. Component Integration

- [x] 4.1 Add `useHierarchy?: boolean` prop to `RoleGuard.astro` component Props interface
- [x] 4.2 Pass hierarchy configuration to `canViewContent()` call
- [x] 4.3 Update component JSDoc with hierarchy behavior examples
- [x] 4.4 Add debug mode display for hierarchy evaluation results

## 5. Testing

- [x] 5.1 Write unit tests for `hasRoleOrHigher()` function
  - [x] 5.1.1 Test admin accessing member content (should allow)
  - [x] 5.1.2 Test member accessing admin content (should deny)
  - [x] 5.1.3 Test super_admin accessing all levels (should allow)
  - [x] 5.1.4 Test null/undefined roles (should deny)
  - [x] 5.1.5 Test org roles (should use flat matching)
- [x] 5.2 Update `tests/utils/role-guard.test.ts` with hierarchical scenarios
  - [x] 5.2.1 Test `canViewContent()` with hierarchy enabled
  - [x] 5.2.2 Test `canViewContent()` with hierarchy disabled (backward compat)
  - [x] 5.2.3 Test `canViewContentDetailed()` result metadata
  - [x] 5.2.4 Test mixed user and org role scenarios
- [x] 5.3 Add integration tests for `RoleGuard` component
  - [x] 5.3.1 Test member-only content visibility with different roles
  - [x] 5.3.2 Test admin-only content visibility
  - [x] 5.3.3 Test opt-out via `useHierarchy={false}`
  - [x] 5.3.4 Test debug mode display of hierarchy evaluation

## 6. Documentation

- [x] 6.1 Add usage examples to `src/utils/role-guard.ts` JSDoc comments
- [x] 6.2 Document hierarchical behavior in `RoleGuard.astro` component
- [x] 6.3 Add migration guide for teams wanting exact role matching
- [x] 6.4 Update inline code examples showing hierarchy in action

## 7. Quality Assurance

- [x] 7.1 Run type checking: `npm run type-check` (pre-existing project errors unrelated to changes)
- [x] 7.2 Run linting: `npm run lint:all` (passed - 2 warnings in unrelated files)
- [x] 7.3 Run all tests: `npm test` (59/59 tests passed)
- [x] 7.4 Manual testing with debug mode enabled
- [x] 7.5 Security review of privilege escalation logic
