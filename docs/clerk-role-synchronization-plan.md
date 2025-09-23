# Clerk Role Synchronization Plan

## Executive Summary

This document outlines the plan to synchronize Clerk authentication roles with the existing Supabase role system in the astro-basics project. The goal is to create a unified role management system that leverages the database as the single source of truth while maintaining Clerk session integration.

## Current State Analysis

### ✅ What's Working

- Supabase users table has role column: `volunteer`, `coordinator`, `super_admin`
- Clerk captures roles in session claims (`locals.userRole`)
- Basic route protection exists for authenticated users
- Organization-level context is maintained (`organization_id`, `is_active`)

### ❌ Current Gaps

- No synchronization between Clerk roles and Supabase roles
- Application logic doesn't use database roles for access control
- Type definitions don't match actual database schema
- Roles exist only in session claims, not persisted consistently

## Database Role Structure

**Current Supabase Users Table Role Configuration:**

```sql
role TEXT CHECK (role = ANY (ARRAY['super_admin'::text, 'coordinator'::text, 'volunteer'::text]))
DEFAULT 'volunteer'::text
```

**Role Hierarchy:**

1. `volunteer` (default role) - Basic access
2. `coordinator` - Management access
3. `super_admin` - Full administrative access

**Organization Context:**

- `organization_id` (default: `'serve513-beta'::text`)
- `is_active` boolean flag for user status

## Implementation Plan

### Phase 1: Update Type Definitions to Match Database

#### 1.1 Sync Role Types

- **File**: `src/types/roles.ts`
- **Action**: Update role definitions to match database schema
- **Changes**:
  ```typescript
  export const APP_ROLES = {
    VOLUNTEER: 'volunteer',
    COORDINATOR: 'coordinator',
    SUPER_ADMIN: 'super_admin',
  } as const
  ```

#### 1.2 Update Database Types

- **File**: `src/libs/database.types.ts`
- **Action**: Add role field to users table type definition
- **Changes**: Include role column in TypeScript interface

#### 1.3 Create Permission Mappings

- **Action**: Map organization-specific roles to application permissions
- **Context**: Volunteer management, coordination, and administrative functions

### Phase 2: Role Synchronization System

#### 2.1 Database-First Role Management

- **Strategy**: Use Supabase database as primary role source
- **Fallback**: Clerk session claims when database unavailable
- **Implementation**: Role fetch utilities that prioritize database

#### 2.2 Enhanced Webhook Integration

- **File**: `src/pages/api/webhooks/clerk.ts`
- **Action**: Update webhook to respect and sync database roles
- **Features**:
  - Bidirectional role sync (Clerk ↔ Supabase)
  - Organization context preservation
  - Role change event handling

#### 2.3 Role Sync Utilities

- **Files**: `src/utils/roles.ts`, `src/utils/role-sync.ts`
- **Functions**:
  - `syncRoleFromDatabase(userId: string)`
  - `updateClerkRole(userId: string, role: string)`
  - `validateRoleConsistency()`

### Phase 3: Application Integration

#### 3.1 Update Middleware

- **File**: `src/middleware.ts`
- **Changes**:
  - Fetch user role from database during authentication
  - Use database role for route protection
  - Maintain backwards compatibility with session claims
  - Add organization context validation

#### 3.2 Enhanced Route Protection

- **Implementation**: Role-based route guards
- **Protected Routes**:
  ```typescript
  '/admin': 'super_admin',
  '/dashboard/coordination': 'coordinator',
  '/dashboard/management': 'coordinator',
  '/dashboard/analytics': 'coordinator'
  ```

#### 3.3 Role Context Provider

- **File**: `src/utils/role-context.ts`
- **Purpose**: Provide role context throughout the application
- **Features**: Organization-scoped permissions, role inheritance

### Phase 4: Component-Level Role Management

#### 4.1 Role-Based Components

- **Components to Create**:
  - `<VolunteerOnly>` - Volunteer level access
  - `<CoordinatorOnly>` - Coordination level access
  - `<SuperAdminOnly>` - Administrative access
  - `<RoleGuard role="coordinator">` - Generic role guard

#### 4.2 Update Existing Pages

- **Dashboard** (`src/pages/dashboard/index.astro`):

  - Add role-based feature visibility
  - Show organization context
  - Display user role and permissions

- **Admin Page** (`src/pages/admin.astro`):
  - Enforce super_admin role requirement
  - Add role management interface
  - Organization member management

#### 4.3 Navigation Updates

- **File**: `src/components/astro/Navigation.astro`
- **Changes**: Role-based navigation items, organization context display

### Phase 5: Enhanced Access Control

#### 5.1 RLS Policy Integration

- **Strategy**: Leverage existing RLS policies with role-based access
- **Implementation**:
  - Organization-scoped role permissions
  - Role-based data filtering
  - Cross-table role validation

#### 5.2 API Endpoint Protection

- **Files**: `src/pages/api/**/*.ts`
- **Changes**: Role validation for sensitive operations
- **Examples**:
  - User management APIs (coordinator+)
  - System administration (super_admin only)
  - Organization data access (role + org context)

### Phase 6: Testing and Validation

#### 6.1 Role Synchronization Tests

- **Test**: Role changes in Clerk sync to database
- **Test**: Database role changes reflect in application
- **Test**: Organization context preservation

#### 6.2 Access Control Tests

- **Test**: Route protection based on database roles
- **Test**: Component rendering based on roles
- **Test**: API endpoint access control

#### 6.3 Edge Case Handling

- **Test**: Database unavailable fallback to session claims
- **Test**: Role conflicts between systems
- **Test**: Organization context mismatches

## Technical Implementation Details

### Database Queries

```sql
-- Get user role with organization context
SELECT role, organization_id, is_active
FROM users
WHERE clerk_id = $1 AND is_active = true;

-- Update user role
UPDATE users
SET role = $2, updated_at = NOW()
WHERE clerk_id = $1 AND organization_id = $3;
```

### Middleware Integration

```typescript
// Enhanced auth middleware with database role fetch
const userRole = await getUserRoleFromDatabase(locals.userId)
locals.userRole = userRole || auth().sessionClaims?.role
locals.organizationId = userOrgId
```

### Component Usage

```astro
<CoordinatorOnly>
  <AdminPanel />
</CoordinatorOnly>

<RoleGuard role="super_admin" organization="serve513-beta">
  <SystemSettings />
</RoleGuard>
```

## Migration Strategy

### Phase 1: Non-Breaking Changes

1. Add new role utilities alongside existing system
2. Update type definitions without breaking existing code
3. Enhance webhook without changing current behavior

### Phase 2: Gradual Migration

1. Update middleware to use database roles as primary source
2. Migrate pages one by one to use new role system
3. Add role-based components incrementally

### Phase 3: Final Integration

1. Remove deprecated role handling code
2. Complete test coverage for all role scenarios
3. Documentation updates for new role system

## Expected Outcomes

### Immediate Benefits

- Database roles become the single source of truth
- Clerk session claims stay in sync with database
- Role changes persist across sessions
- Organization-scoped role management

### Long-term Benefits

- Type-safe role system matching actual database schema
- Simplified role management for administrators
- Better security through database-level role enforcement
- Scalable organization management system

## Risk Mitigation

### Data Consistency

- **Risk**: Role conflicts between Clerk and database
- **Mitigation**: Database-first approach with clear fallback strategy

### Performance Impact

- **Risk**: Additional database queries for role validation
- **Mitigation**: Role caching, optimized queries, session storage

### Backward Compatibility

- **Risk**: Breaking existing role-dependent features
- **Mitigation**: Gradual migration, fallback mechanisms, comprehensive testing

## Success Metrics

1. **Consistency**: 100% role sync between Clerk and database
2. **Performance**: Role validation queries < 50ms average
3. **Reliability**: Zero role-related authentication failures
4. **Usability**: Simplified role management for administrators
5. **Security**: All protected routes enforce database roles

## Next Steps

1. Review and approve this plan
2. Update type definitions to match database schema
3. Implement role synchronization utilities
4. Begin middleware enhancement
5. Create role-based components
6. Test and validate implementation
7. Deploy and monitor

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-20  
**Author**: Claude Code Assistant  
**Project**: astro-basics role management
