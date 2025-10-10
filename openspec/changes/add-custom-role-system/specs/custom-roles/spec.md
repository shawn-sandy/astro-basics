# Custom Roles Specification

## ADDED Requirements

### Requirement: Custom Role Creation

The system SHALL allow organization administrators to create custom roles with configurable names, descriptions, core role mappings, and permissions.

**Creation Rules**:

- Only users with `org:admin` or `super_admin` roles SHALL create custom roles
- Custom role names MUST be unique within an organization (case-insensitive)
- Custom role names MUST be 3-50 characters, alphanumeric with spaces/hyphens allowed
- Each custom role MUST map to a core role (`member`, `admin`, or `super_admin`)
- Custom roles MUST be scoped to a single organization (multi-tenant isolation)
- Creator SHALL be recorded in `created_by` field for audit trail

#### Scenario: Organization admin creates custom role

- **GIVEN** a user with `org:admin` role in organization "org_abc"
- **WHEN** creating custom role "Moderator" with `core_role_mapping: 'admin'`
- **THEN** custom role SHALL be created successfully with organization_id "org_abc"

#### Scenario: Member attempts to create custom role

- **GIVEN** a user with `member` role in organization "org_abc"
- **WHEN** attempting to create custom role "Moderator"
- **THEN** creation SHALL be rejected with "Forbidden - Admin access required"

#### Scenario: Duplicate custom role name rejected

- **GIVEN** an existing custom role named "Moderator" in organization "org_abc"
- **WHEN** attempting to create another custom role named "Moderator" in same organization
- **THEN** creation SHALL be rejected with "Role name already exists in organization"

#### Scenario: Invalid custom role name rejected

- **GIVEN** a user attempting to create custom role with name "AB" (too short)
- **WHEN** submitting role creation form
- **THEN** creation SHALL be rejected with "Role name must be 3-50 characters"

#### Scenario: Cross-organization custom role isolation

- **GIVEN** an existing custom role named "Moderator" in organization "org_abc"
- **WHEN** creating custom role named "Moderator" in organization "org_xyz"
- **THEN** creation SHALL succeed because names are scoped to organization

### Requirement: Custom Role Listing

The system SHALL allow users to list custom roles within their organization with filtering and sorting capabilities.

**Listing Rules**:

- Users SHALL only see custom roles from organizations they are members of
- Soft-deleted roles (`is_active: false`) SHALL be excluded from listings by default
- Results SHALL include role name, description, core_role_mapping, permission count, and created_at
- Results SHALL be sortable by name, created_at, or permission count
- Pagination SHALL be supported for organizations with >50 custom roles

#### Scenario: User lists custom roles in their organization

- **GIVEN** a user who is member of organization "org_abc"
- **AND** organization "org_abc" has 3 custom roles: "Moderator", "Viewer", "Editor"
- **WHEN** fetching custom roles for organization "org_abc"
- **THEN** response SHALL include all 3 custom roles

#### Scenario: User cannot see custom roles from other organizations

- **GIVEN** a user who is member of organization "org_abc"
- **AND** organization "org_xyz" has custom role "Secret Role"
- **WHEN** attempting to fetch custom roles for organization "org_xyz"
- **THEN** request SHALL be rejected with "Forbidden - Not a member of organization"

#### Scenario: Soft-deleted roles excluded from listing

- **GIVEN** organization "org_abc" has custom role "Old Role" with `is_active: false`
- **WHEN** fetching custom roles for organization "org_abc"
- **THEN** response SHALL NOT include "Old Role"

#### Scenario: Custom role listing includes permission count

- **GIVEN** custom role "Moderator" with 5 assigned permissions
- **WHEN** fetching custom roles for organization
- **THEN** "Moderator" entry SHALL include `permission_count: 5`

### Requirement: Custom Role Update

The system SHALL allow organization administrators to update custom role properties including name, description, core role mapping, and permissions.

**Update Rules**:

- Only `org:admin` or `super_admin` roles SHALL update custom roles
- Updating core_role_mapping SHALL affect all users assigned to the role immediately
- Role name changes MUST maintain uniqueness within organization
- Updating permissions SHALL be validated against PERMISSION_REGISTRY
- Updates SHALL record `updated_at` timestamp for audit trail

#### Scenario: Organization admin updates custom role name

- **GIVEN** an existing custom role "Moderater" (typo) with id "role_123"
- **WHEN** org admin updates name to "Moderator"
- **THEN** role SHALL be updated successfully and `updated_at` timestamp refreshed

#### Scenario: Updating core_role_mapping affects assigned users

- **GIVEN** custom role "Editor" with `core_role_mapping: 'member'` assigned to 10 users
- **WHEN** org admin updates `core_role_mapping` to `'admin'`
- **THEN** all 10 users SHALL immediately gain admin-level hierarchy privileges

#### Scenario: Member cannot update custom role

- **GIVEN** a user with `member` role attempting to update custom role "Moderator"
- **WHEN** submitting update request
- **THEN** request SHALL be rejected with "Forbidden - Admin access required"

#### Scenario: Update with duplicate name rejected

- **GIVEN** existing custom roles "Editor" and "Moderator" in organization "org_abc"
- **WHEN** attempting to rename "Editor" to "Moderator"
- **THEN** update SHALL be rejected with "Role name already exists in organization"

### Requirement: Custom Role Deletion

The system SHALL allow organization administrators to delete custom roles using soft-delete pattern for data integrity.

**Deletion Rules**:

- Only `org:admin` or `super_admin` roles SHALL delete custom roles
- Deletion SHALL use soft-delete by setting `is_active: false` (preserve audit trail)
- Soft-deleted roles SHALL be excluded from listings and role resolution
- Deleting a role SHALL NOT delete user assignments (assignments remain for audit)
- Users with soft-deleted role assignments SHALL fall back to core role
- Hard-delete SHALL NOT be exposed via API (database-only operation)

#### Scenario: Organization admin soft-deletes custom role

- **GIVEN** an existing custom role "Old Role" with id "role_123"
- **WHEN** org admin deletes role "role_123"
- **THEN** role SHALL be marked `is_active: false` and excluded from listings

#### Scenario: User with deleted role falls back to core role

- **GIVEN** user has custom role "Old Role" assigned (soft-deleted)
- **WHEN** checking user access with organization context
- **THEN** role resolution SHALL skip soft-deleted role and use core role fallback

#### Scenario: Deleted role assignments preserved for audit

- **GIVEN** custom role "Old Role" assigned to 5 users before deletion
- **WHEN** role is soft-deleted
- **THEN** `user_custom_roles` table SHALL retain all 5 assignment records

#### Scenario: Member cannot delete custom role

- **GIVEN** a user with `member` role attempting to delete custom role "Moderator"
- **WHEN** submitting delete request
- **THEN** request SHALL be rejected with "Forbidden - Admin access required"

### Requirement: Permission Assignment to Custom Roles

The system SHALL allow organization administrators to assign and remove permissions from custom roles using predefined permission registry.

**Permission Assignment Rules**:

- Only `org:admin` or `super_admin` roles SHALL manage permissions
- All permissions MUST exist in PERMISSION_REGISTRY (no arbitrary permissions)
- Permissions requiring higher core role than role's mapping SHALL be rejected
- Duplicate permission assignments SHALL be prevented (unique constraint)
- Permission removal SHALL take effect immediately for assigned users

#### Scenario: Admin assigns valid permission to custom role

- **GIVEN** custom role "Moderator" with `core_role_mapping: 'admin'`
- **WHEN** org admin assigns permission "posts:delete" (requires admin)
- **THEN** permission SHALL be assigned successfully

#### Scenario: Invalid permission rejected

- **GIVEN** custom role "Moderator"
- **WHEN** attempting to assign permission "invalid:action" (not in registry)
- **THEN** assignment SHALL be rejected with "Permission not found in registry"

#### Scenario: Permission requiring higher core role rejected

- **GIVEN** custom role "Viewer" with `core_role_mapping: 'member'`
- **WHEN** attempting to assign permission "users:delete" (requires super_admin)
- **THEN** assignment SHALL be rejected with "Permission requires super_admin role but role maps to member"

#### Scenario: Duplicate permission assignment prevented

- **GIVEN** custom role "Moderator" already has permission "posts:delete"
- **WHEN** attempting to assign "posts:delete" again
- **THEN** operation SHALL succeed idempotently (no error, no duplicate created)

#### Scenario: Permission removal from custom role

- **GIVEN** custom role "Moderator" has permission "posts:delete"
- **WHEN** org admin removes permission "posts:delete"
- **THEN** permission SHALL be removed and users SHALL lose access immediately

### Requirement: Custom Role Assignment to Users

The system SHALL allow organization administrators to assign and unassign custom roles to organization members.

**Assignment Rules**:

- Only `org:admin` or `super_admin` roles SHALL assign custom roles
- Users can be assigned multiple custom roles within same organization
- Users can only be assigned roles from organizations they are members of
- Assignment SHALL record `assigned_by` user ID for audit trail
- Duplicate assignments SHALL be prevented (unique constraint)

#### Scenario: Admin assigns custom role to organization member

- **GIVEN** user "user_123" is member of organization "org_abc"
- **AND** custom role "Moderator" exists in organization "org_abc"
- **WHEN** org admin assigns "Moderator" role to "user_123"
- **THEN** assignment SHALL succeed and record `assigned_by` in database

#### Scenario: Cannot assign role to non-member

- **GIVEN** user "user_xyz" is NOT member of organization "org_abc"
- **AND** custom role "Moderator" exists in organization "org_abc"
- **WHEN** attempting to assign "Moderator" to "user_xyz"
- **THEN** assignment SHALL be rejected with "User is not member of organization"

#### Scenario: User assigned multiple custom roles

- **GIVEN** user "user_123" already has custom role "Editor" in organization "org_abc"
- **WHEN** org admin assigns additional custom role "Viewer" to "user_123"
- **THEN** assignment SHALL succeed and user SHALL have both roles

#### Scenario: Duplicate assignment prevented

- **GIVEN** user "user_123" already has custom role "Moderator"
- **WHEN** attempting to assign "Moderator" to "user_123" again
- **THEN** operation SHALL succeed idempotently (no error, no duplicate created)

#### Scenario: Member cannot assign custom roles

- **GIVEN** a user with `member` role attempting to assign custom role "Moderator"
- **WHEN** submitting assignment request
- **THEN** request SHALL be rejected with "Forbidden - Admin access required"

### Requirement: Custom Role Unassignment

The system SHALL allow organization administrators to remove custom role assignments from users.

**Unassignment Rules**:

- Only `org:admin` or `super_admin` roles SHALL unassign custom roles
- Unassignment SHALL delete the assignment record from `user_custom_roles` table
- Users SHALL immediately fall back to core role after unassignment
- Unassigning SHALL update cache to prevent stale role resolution

#### Scenario: Admin unassigns custom role from user

- **GIVEN** user "user_123" has custom role "Moderator" assigned
- **WHEN** org admin unassigns "Moderator" from "user_123"
- **THEN** assignment record SHALL be deleted from `user_custom_roles` table

#### Scenario: User falls back to core role after unassignment

- **GIVEN** user "user_123" has custom role "Moderator" (maps to admin) assigned
- **AND** user's core role is `member`
- **WHEN** org admin unassigns "Moderator" from "user_123"
- **THEN** subsequent access checks SHALL use core role `member` (fallback)

#### Scenario: Unassigning non-existent assignment succeeds idempotently

- **GIVEN** user "user_123" does NOT have custom role "Moderator" assigned
- **WHEN** attempting to unassign "Moderator" from "user_123"
- **THEN** operation SHALL succeed without error (idempotent)

#### Scenario: Cache invalidation after unassignment

- **GIVEN** user "user_123" has cached custom role "Moderator"
- **WHEN** org admin unassigns "Moderator" from "user_123"
- **THEN** cache entry SHALL be cleared to prevent stale role resolution

### Requirement: Permission Checking Utility

The system SHALL provide granular permission checking utility for fine-grained access control based on custom role permissions.

**Permission Checking Rules**:

- `hasPermission(user, permission, organizationId)` function SHALL be available
- Function SHALL check if user's custom role includes the specified permission
- If user has multiple custom roles, ANY role with permission SHALL grant access
- If no custom role has permission, function SHALL fall back to core role capabilities
- Permission checks SHALL use cached roles to minimize database queries

#### Scenario: User with custom role has required permission

- **GIVEN** user has custom role "Moderator" with permission "posts:delete"
- **WHEN** checking `hasPermission(user, 'posts:delete', 'org_abc')`
- **THEN** function SHALL return `true`

#### Scenario: User with custom role lacks required permission

- **GIVEN** user has custom role "Viewer" WITHOUT permission "posts:delete"
- **WHEN** checking `hasPermission(user, 'posts:delete', 'org_abc')`
- **THEN** function SHALL return `false`

#### Scenario: User with multiple roles - any grants access

- **GIVEN** user has custom roles "Viewer" and "Editor" in organization "org_abc"
- **AND** "Editor" role has permission "posts:publish"
- **WHEN** checking `hasPermission(user, 'posts:publish', 'org_abc')`
- **THEN** function SHALL return `true` (found in "Editor" role)

#### Scenario: Permission check without organization context

- **GIVEN** user has custom role "Moderator" in organization "org_abc"
- **WHEN** checking `hasPermission(user, 'posts:delete')` WITHOUT organizationId
- **THEN** function SHALL return `false` (custom roles require org context)

### Requirement: Permission Registry

The system SHALL maintain a predefined registry of valid permissions with metadata including resource, action, and minimum core role requirement.

**Registry Structure**:

- Each permission SHALL be defined as `resource:action` string format
- Each permission SHALL specify minimum `coreRoleRequired` (member, admin, or super_admin)
- Registry SHALL be versioned and stored in code (not database)
- New permissions SHALL require code deployment (prevents permission explosion)
- Registry SHALL be exposed via API endpoint for UI consumption

#### Scenario: Validate permission against registry

- **GIVEN** PERMISSION_REGISTRY contains "posts:delete" requiring admin
- **WHEN** validating permission "posts:delete"
- **THEN** validation SHALL succeed and return metadata `{ resource: 'posts', action: 'delete', coreRoleRequired: 'admin' }`

#### Scenario: Invalid permission rejected by registry

- **GIVEN** PERMISSION_REGISTRY does NOT contain "invalid:action"
- **WHEN** validating permission "invalid:action"
- **THEN** validation SHALL fail with "Permission not found in registry"

#### Scenario: Permission registry accessible via API

- **GIVEN** client application needs to display permission selection UI
- **WHEN** fetching `GET /api/roles/permissions`
- **THEN** response SHALL return full PERMISSION_REGISTRY as JSON

#### Scenario: Permission requires minimum core role

- **GIVEN** PERMISSION_REGISTRY defines "users:delete" requiring super_admin
- **AND** custom role "Moderator" has `core_role_mapping: 'admin'`
- **WHEN** attempting to assign "users:delete" to "Moderator"
- **THEN** assignment SHALL be rejected because admin < super_admin

### Requirement: Role Templates

The system SHALL provide pre-defined role templates for common organizational roles to streamline custom role creation.

**Template Definitions**:

- Templates SHALL include: Moderator, Editor, Viewer, Billing Manager
- Each template SHALL define suggested name, description, core_role_mapping, and permission set
- Templates SHALL be stored in code for consistency
- Admins SHALL be able to create role from template with one click
- Template SHALL be editable before final creation (suggestions only)

#### Scenario: Admin creates role from template

- **GIVEN** user is org admin in organization "org_abc"
- **WHEN** selecting "Moderator" template during role creation
- **THEN** form SHALL be pre-populated with template values (name, description, permissions)

#### Scenario: Template suggestions are editable

- **GIVEN** user selected "Editor" template with suggested permissions
- **WHEN** user removes permission "posts:publish" before saving
- **THEN** custom role SHALL be created WITHOUT "posts:publish" (template is suggestion)

#### Scenario: Template includes metadata

- **GIVEN** "Moderator" template
- **THEN** template SHALL include:
  - `name: "Moderator"`
  - `description: "Can moderate content and manage comments"`
  - `core_role_mapping: "admin"`
  - `permissions: ["posts:delete", "comments:moderate", "users:ban"]`

### Requirement: Audit Logging

The system SHALL log all custom role operations for security auditing and compliance.

**Audit Log Requirements**:

- All CRUD operations on custom roles SHALL be logged
- All permission assignments/removals SHALL be logged
- All role assignments/unassignments SHALL be logged
- Logs SHALL include: user ID, action, resource type, resource ID, timestamp, IP address
- Logs SHALL be retained for minimum 90 days

#### Scenario: Custom role creation logged

- **GIVEN** org admin creates custom role "Moderator"
- **WHEN** role is created successfully
- **THEN** audit log SHALL record:
  - `user_id: "user_123"`
  - `action: "custom_role.created"`
  - `resource_id: "role_456"`
  - `metadata: { name: "Moderator", org_id: "org_abc" }`

#### Scenario: Permission assignment logged

- **GIVEN** org admin assigns permission "posts:delete" to role "Moderator"
- **WHEN** assignment succeeds
- **THEN** audit log SHALL record:
  - `user_id: "user_123"`
  - `action: "permission.assigned"`
  - `resource_id: "role_456"`
  - `metadata: { permission: "posts:delete" }`

#### Scenario: Role assignment to user logged

- **GIVEN** org admin assigns custom role "Moderator" to user "user_789"
- **WHEN** assignment succeeds
- **THEN** audit log SHALL record:
  - `user_id: "user_123"` (admin who performed action)
  - `action: "custom_role.assigned"`
  - `resource_id: "role_456"`
  - `metadata: { assigned_to: "user_789", org_id: "org_abc" }`
