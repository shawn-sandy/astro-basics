# Implementation Tasks: Custom Role System

## 1. Database Schema

- [ ] 1.1 Create migration `003_add_custom_role_tables.sql`
- [ ] 1.2 Add `custom_roles` table with columns (id, organization_id, name, description, core_role_mapping, is_active, created_by, created_at, updated_at)
- [ ] 1.3 Add `role_permissions` table with columns (id, custom_role_id, permission, created_at)
- [ ] 1.4 Add `user_custom_roles` table with columns (id, user_id, custom_role_id, organization_id, assigned_by, assigned_at)
- [ ] 1.5 Create indexes (idx_custom_roles_org, idx_user_custom_roles_user, idx_user_custom_roles_org, idx_role_permissions_role)
- [ ] 1.6 Add RLS policies for org-scoped access to all 3 tables
- [ ] 1.7 Create rollback migration `rollback_003_add_custom_role_tables.sql`
- [ ] 1.8 Test migration locally on both Supabase and Turso (if applicable)
- [ ] 1.9 Add migration to database scripts (`npm run db:migrate`)

## 2. TypeScript Types & Utilities

- [ ] 2.1 Extend `src/libs/database-types.ts` with CustomRole, RolePermission, UserCustomRole interfaces
- [ ] 2.2 Update `src/utils/role-types.ts` to include CustomRole type in AnyRole union
- [ ] 2.3 Create `src/utils/permissions.ts` with PERMISSION_REGISTRY constant
- [ ] 2.4 Add permission validation functions (isValidPermission, getPermissionMetadata)
- [ ] 2.5 Create `src/utils/custom-roles.ts` with custom role utilities
- [ ] 2.6 Add `resolveUserRole()` function for custom role resolution
- [ ] 2.7 Add `getCustomRoleForUser()` function to fetch custom role from database
- [ ] 2.8 Add `getCustomRolePermissions()` function to fetch role permissions
- [ ] 2.9 Add `hasPermission()` helper for granular permission checks

## 3. Core Role Guard Extensions

- [ ] 3.1 Update `src/utils/role-guard.ts` to import custom role utilities
- [ ] 3.2 Extend `getUserRole()` to support custom role resolution with org context
- [ ] 3.3 Update `hasRoleOrHigher()` to handle custom roles via core_role_mapping
- [ ] 3.4 Add `organizationId?: string` parameter to canViewContent() and related functions
- [ ] 3.5 Update `canViewContentDetailed()` to show custom role resolution path in debug mode
- [ ] 3.6 Extend RoleCheckResult interface with customRole and permissionChecks fields
- [ ] 3.7 Add cache key logic to include org context (`${userId}:${orgId}`)
- [ ] 3.8 Update `clearRoleCache()` to handle org-scoped cache entries

## 4. Database Client Integration

- [ ] 4.1 Add custom role CRUD operations to `src/libs/database.ts`
- [ ] 4.2 Implement `createCustomRole()` function
- [ ] 4.3 Implement `getCustomRoles(organizationId)` function
- [ ] 4.4 Implement `getCustomRoleById(id)` function
- [ ] 4.5 Implement `updateCustomRole(id, data)` function
- [ ] 4.6 Implement `deleteCustomRole(id)` function (soft delete via is_active)
- [ ] 4.7 Implement `assignCustomRole(userId, roleId, organizationId)` function
- [ ] 4.8 Implement `unassignCustomRole(userId, roleId, organizationId)` function
- [ ] 4.9 Implement `getUserCustomRoles(userId, organizationId)` function
- [ ] 4.10 Implement `addPermissionToRole(roleId, permission)` function
- [ ] 4.11 Implement `removePermissionFromRole(roleId, permission)` function
- [ ] 4.12 Add Supabase and Turso implementations for all CRUD operations

## 5. API Endpoints

- [ ] 5.1 Create `src/pages/api/roles/custom.ts` for CRUD operations
- [ ] 5.2 Implement POST handler for creating custom roles
- [ ] 5.3 Implement GET handler for listing organization custom roles
- [ ] 5.4 Implement PATCH handler for updating custom roles
- [ ] 5.5 Implement DELETE handler for soft-deleting custom roles
- [ ] 5.6 Add authentication checks (require org:admin or super_admin)
- [ ] 5.7 Add organization validation (user must be member of organization)
- [ ] 5.8 Add input validation using Zod schemas
- [ ] 5.9 Create `src/pages/api/roles/[id]/index.ts` for single role operations
- [ ] 5.10 Create `src/pages/api/roles/assign.ts` for role assignment
- [ ] 5.11 Implement POST handler for assigning roles to users
- [ ] 5.12 Implement DELETE handler for unassigning roles from users
- [ ] 5.13 Create `src/pages/api/roles/permissions.ts` for permission listing
- [ ] 5.14 Implement GET handler returning PERMISSION_REGISTRY as JSON
- [ ] 5.15 Add error handling and proper HTTP status codes to all endpoints

## 6. React Components

- [ ] 6.1 Update `src/components/react/RoleGuard.tsx` to support custom roles
- [ ] 6.2 Add organizationId prop to RoleGuard component
- [ ] 6.3 Update component to call extended getUserRole with org context
- [ ] 6.4 Create `src/components/dashboard/CustomRoleManager.tsx`
- [ ] 6.5 Add role list view with create, edit, delete actions
- [ ] 6.6 Create `src/components/dashboard/CustomRoleForm.tsx`
- [ ] 6.7 Add form fields (name, description, core_role_mapping)
- [ ] 6.8 Add permission selection checkboxes from PERMISSION_REGISTRY
- [ ] 6.9 Add validation for required fields and unique role names
- [ ] 6.10 Create `src/components/dashboard/CustomRolePermissions.tsx`
- [ ] 6.11 Add permission template presets (moderator, editor, viewer)
- [ ] 6.12 Add permission toggle UI with resource grouping
- [ ] 6.13 Create `src/components/dashboard/RoleAssignmentModal.tsx`
- [ ] 6.14 Add user selection dropdown (org members only)
- [ ] 6.15 Add role selection dropdown (org custom roles only)
- [ ] 6.16 Add assign/unassign functionality with confirmation
- [ ] 6.17 Add loading states and error handling to all components

## 7. Astro Components & Pages

- [ ] 7.1 Update `src/components/astro/RoleGuard.astro` to support custom roles
- [ ] 7.2 Add organizationId prop to component interface
- [ ] 7.3 Update debug mode to show custom role resolution details
- [ ] 7.4 Create `src/pages/dashboard/roles/index.astro`
- [ ] 7.5 Add page layout with navigation to create role
- [ ] 7.6 Integrate CustomRoleManager React component
- [ ] 7.7 Add organization context from Astro.locals
- [ ] 7.8 Create `src/pages/dashboard/roles/create.astro`
- [ ] 7.9 Add page title and breadcrumb navigation
- [ ] 7.10 Integrate CustomRoleForm React component
- [ ] 7.11 Add success redirect to role list after creation
- [ ] 7.12 Create `src/pages/dashboard/roles/[id]/edit.astro`
- [ ] 7.13 Fetch existing role data from API
- [ ] 7.14 Pre-populate CustomRoleForm with existing data
- [ ] 7.15 Add delete role confirmation dialog
- [ ] 7.16 Protect all role management pages with org:admin role guard

## 8. Feature Flag System

- [ ] 8.1 Create `src/utils/feature-flags.ts` utility
- [ ] 8.2 Add CUSTOM_ROLES_ENABLED feature flag reading from environment
- [ ] 8.3 Add utility function `isFeatureEnabled(featureName)` for future flags
- [ ] 8.4 Update API endpoints to check feature flag before processing
- [ ] 8.5 Update admin UI pages to check feature flag and show 404 if disabled
- [ ] 8.6 Add feature flag status to debug mode output
- [ ] 8.7 Document feature flag usage in CLAUDE.md

## 9. Unit Tests

- [ ] 9.1 Create `tests/utils/permissions.test.ts`
- [ ] 9.2 Add tests for permission validation functions
- [ ] 9.3 Add tests for PERMISSION_REGISTRY structure
- [ ] 9.4 Create `tests/utils/custom-roles.test.ts`
- [ ] 9.5 Add tests for resolveUserRole with custom roles
- [ ] 9.6 Add tests for getCustomRoleForUser database queries
- [ ] 9.7 Add tests for custom role caching logic
- [ ] 9.8 Update `tests/utils/role-guard.test.ts`
- [ ] 9.9 Add test scenarios for custom role hierarchical checks
- [ ] 9.10 Add test scenarios for custom role with useHierarchy=false
- [ ] 9.11 Add test scenarios for custom role precedence over core roles
- [ ] 9.12 Add test scenarios for org context in role resolution
- [ ] 9.13 Add edge case tests (null custom role, missing core_role_mapping)
- [ ] 9.14 Create `tests/components/RoleGuard.custom.test.tsx`
- [ ] 9.15 Add React component tests with custom role props

## 10. Integration Tests

- [ ] 10.1 Create `tests/integration/custom-role-crud.test.ts`
- [ ] 10.2 Add test for creating custom role via API
- [ ] 10.3 Add test for listing custom roles by organization
- [ ] 10.4 Add test for updating custom role name and permissions
- [ ] 10.5 Add test for soft-deleting custom role
- [ ] 10.6 Add test for preventing cross-org access to custom roles
- [ ] 10.7 Add test for permission validation during role creation
- [ ] 10.8 Create `tests/integration/role-assignment.test.ts`
- [ ] 10.9 Add test for assigning custom role to user
- [ ] 10.10 Add test for unassigning custom role from user
- [ ] 10.11 Add test for preventing duplicate role assignments
- [ ] 10.12 Add test for preventing cross-org role assignment
- [ ] 10.13 Add test for role resolution after assignment

## 11. E2E Tests

- [ ] 11.1 Create `e2e/role-management.spec.ts`
- [ ] 11.2 Add E2E test for navigating to role management page
- [ ] 11.3 Add E2E test for creating custom role via UI
- [ ] 11.4 Add E2E test for adding permissions to custom role
- [ ] 11.5 Add E2E test for editing custom role name and description
- [ ] 11.6 Add E2E test for deleting custom role with confirmation
- [ ] 11.7 Add E2E test for assigning role to user
- [ ] 11.8 Add E2E test for verifying role assignment in user profile
- [ ] 11.9 Add E2E test for content access with custom role
- [ ] 11.10 Add E2E test for role guard blocking access without permission

## 12. Documentation

- [ ] 12.1 Create `docs/guide/custom-roles.md` user guide
- [ ] 12.2 Add section on creating custom roles
- [ ] 12.3 Add section on managing permissions
- [ ] 12.4 Add section on assigning roles to users
- [ ] 12.5 Add troubleshooting section for common issues
- [ ] 12.6 Create `docs/guide/permissions.md` permission system documentation
- [ ] 12.7 Document all available permissions in PERMISSION_REGISTRY
- [ ] 12.8 Explain permission format (resource:action)
- [ ] 12.9 Explain core role mapping and security boundaries
- [ ] 12.10 Create `docs/database/custom-role-schema.md`
- [ ] 12.11 Document custom_roles table schema
- [ ] 12.12 Document role_permissions table schema
- [ ] 12.13 Document user_custom_roles table schema
- [ ] 12.14 Add ER diagram showing table relationships
- [ ] 12.15 Update `CLAUDE.md` with custom role system overview
- [ ] 12.16 Add custom role system to Project Overview section
- [ ] 12.17 Add custom role examples to role-guard usage
- [ ] 12.18 Update `/docs/database/supabase-migration-refactor-plan.md`
- [ ] 12.19 Document new migration 003_add_custom_role_tables
- [ ] 12.20 Add rollback instructions for custom role tables

## 13. Performance Optimization

- [ ] 13.1 Add performance monitoring to resolveUserRole function
- [ ] 13.2 Add cache hit/miss metrics for custom role resolution
- [ ] 13.3 Implement batch loading for custom roles in organization context
- [ ] 13.4 Add lazy loading for permission registry (defer until needed)
- [ ] 13.5 Optimize database indexes based on query patterns
- [ ] 13.6 Add query profiling tests to ensure <5ms overhead target
- [ ] 13.7 Implement role preloading for frequently accessed organizations

## 14. Security Hardening

- [ ] 14.1 Add RLS policy tests for cross-org access prevention
- [ ] 14.2 Add SQL injection prevention tests for custom role CRUD
- [ ] 14.3 Add authorization tests for org:admin requirement
- [ ] 14.4 Add tests for permission escalation prevention
- [ ] 14.5 Add audit logging for all custom role operations
- [ ] 14.6 Implement rate limiting on role creation API (10 roles per hour)
- [ ] 14.7 Add input sanitization for custom role names and descriptions
- [ ] 14.8 Add CSRF protection to all role mutation endpoints

## 15. Migration & Rollout

- [ ] 15.1 Create rollout plan document
- [ ] 15.2 Identify pilot organizations for testing
- [ ] 15.3 Apply database migration to staging environment
- [ ] 15.4 Deploy code with feature flag disabled to production
- [ ] 15.5 Enable feature flag for pilot organizations
- [ ] 15.6 Monitor custom role usage and performance metrics
- [ ] 15.7 Collect feedback from pilot users
- [ ] 15.8 Fix any issues discovered during pilot
- [ ] 15.9 Enable feature flag for all organizations
- [ ] 15.10 Announce feature in release notes and documentation

## 16. Monitoring & Observability

- [ ] 16.1 Add custom role resolution latency tracking
- [ ] 16.2 Add custom role creation rate monitoring
- [ ] 16.3 Add permission assignment pattern analytics
- [ ] 16.4 Add role cache hit rate dashboard
- [ ] 16.5 Add error rate monitoring for role APIs
- [ ] 16.6 Set up alerts for performance degradation (>5ms overhead)
- [ ] 16.7 Set up alerts for cross-org access attempts
- [ ] 16.8 Create dashboard for custom role usage statistics
