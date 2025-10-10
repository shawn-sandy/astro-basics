# Role Guard Specification - Custom Role Extensions

## MODIFIED Requirements

### Requirement: Hierarchical Role Privilege Escalation

The role guard system SHALL implement hierarchical privilege escalation where higher-level user roles automatically inherit access permissions from lower-level roles, INCLUDING custom roles that map to core role equivalents.

**Role Hierarchy Levels**:

- `member` (level 1) - Base user role with standard permissions
- `admin` (level 2) - Administrative role with all member permissions plus administrative capabilities
- `super_admin` (level 3) - System administrator role with all admin permissions plus system-wide control
- **CUSTOM ROLES** - Organization-specific roles that map to one of the core roles above

**Hierarchy Rules**:

- A user with role level N SHALL have access to content requiring any role with level ≤ N
- A user with role level N SHALL NOT have access to content requiring role with level > N
- Role hierarchy applies to user roles AND custom roles via `core_role_mapping`
- Organization roles (`org:admin`, `org:member`) SHALL use flat equality matching without hierarchy
- Custom roles SHALL resolve to their `core_role_mapping` for hierarchy comparison

**Custom Role Resolution**:

- When a user has a custom role assigned, the system SHALL use the custom role's `core_role_mapping` to determine hierarchy level
- Custom role resolution SHALL take precedence over core role in organization context
- If no custom role is assigned, the system SHALL fall back to core role resolution

#### Scenario: Admin accessing member-restricted content

- **GIVEN** a user with role `admin` (level 2)
- **WHEN** checking access to content with `allowedRoles: ['member']` (level 1)
- **THEN** access SHALL be granted because admin level ≥ member level

#### Scenario: Super admin accessing member-restricted content

- **GIVEN** a user with role `super_admin` (level 3)
- **WHEN** checking access to content with `allowedRoles: ['member']` (level 1)
- **THEN** access SHALL be granted because super_admin level ≥ member level

#### Scenario: Super admin accessing admin-restricted content

- **GIVEN** a user with role `super_admin` (level 3)
- **WHEN** checking access to content with `allowedRoles: ['admin']` (level 2)
- **THEN** access SHALL be granted because super_admin level ≥ admin level

#### Scenario: Member attempting to access admin-restricted content

- **GIVEN** a user with role `member` (level 1)
- **WHEN** checking access to content with `allowedRoles: ['admin']` (level 2)
- **THEN** access SHALL be denied because member level < admin level

#### Scenario: Member attempting to access super admin content

- **GIVEN** a user with role `member` (level 1)
- **WHEN** checking access to content with `allowedRoles: ['super_admin']` (level 3)
- **THEN** access SHALL be denied because member level < super_admin level

#### Scenario: Admin attempting to access super admin content

- **GIVEN** a user with role `admin` (level 2)
- **WHEN** checking access to content with `allowedRoles: ['super_admin']` (level 3)
- **THEN** access SHALL be denied because admin level < super_admin level

#### Scenario: Multiple allowed roles with mixed levels

- **GIVEN** a user with role `admin` (level 2)
- **WHEN** checking access to content with `allowedRoles: ['member', 'admin', 'super_admin']`
- **THEN** access SHALL be granted because admin level ≥ member level (lowest required)

#### Scenario: Unauthenticated user access attempt

- **GIVEN** a user with no authenticated role (null)
- **WHEN** checking access to content with any `allowedRoles`
- **THEN** access SHALL be denied regardless of hierarchy configuration

#### Scenario: Custom role mapped to admin accessing member content

- **GIVEN** a user with custom role "Moderator" with `core_role_mapping: 'admin'` (level 2)
- **WHEN** checking access to content with `allowedRoles: ['member']` (level 1)
- **THEN** access SHALL be granted because admin level (from mapping) ≥ member level

#### Scenario: Custom role mapped to member attempting admin content

- **GIVEN** a user with custom role "Viewer" with `core_role_mapping: 'member'` (level 1)
- **WHEN** checking access to content with `allowedRoles: ['admin']` (level 2)
- **THEN** access SHALL be denied because member level (from mapping) < admin level

#### Scenario: Custom role mapped to super_admin accessing admin content

- **GIVEN** a user with custom role "System Manager" with `core_role_mapping: 'super_admin'` (level 3)
- **WHEN** checking access to content with `allowedRoles: ['admin']` (level 2)
- **THEN** access SHALL be granted because super_admin level (from mapping) ≥ admin level

## ADDED Requirements

### Requirement: Custom Role Resolution

The role guard system SHALL support custom role resolution that integrates organization-specific roles with the existing core role hierarchy.

**Resolution Order** (highest to lowest precedence):

1. Custom role assigned to user in organization context
2. Clerk organization role (`org:admin`, `org:member`)
3. Core user role from Supabase (`member`, `admin`, `super_admin`)

**Custom Role Resolution Rules**:

- Custom roles SHALL only be resolved when `organizationId` context is provided
- Custom role SHALL take precedence over core role in organization context
- Custom role's `core_role_mapping` SHALL determine hierarchy level for privilege escalation
- If no custom role assigned, resolution SHALL fall back to next level (org role or core role)

#### Scenario: User with custom role in organization context

- **GIVEN** a user with custom role "Moderator" (`core_role_mapping: 'admin'`) in organization "org_abc"
- **AND** user's core role is `member` in Supabase
- **WHEN** checking access with `organizationId: 'org_abc'` and `allowedRoles: ['admin']`
- **THEN** access SHALL be granted using custom role's mapping to `admin` (level 2)

#### Scenario: User without custom role falls back to core role

- **GIVEN** a user with NO custom role in organization "org_abc"
- **AND** user's core role is `admin` in Supabase
- **WHEN** checking access with `organizationId: 'org_abc'` and `allowedRoles: ['admin']`
- **THEN** access SHALL be granted using core role `admin` (fallback)

#### Scenario: User with custom role outside organization context

- **GIVEN** a user with custom role "Moderator" in organization "org_abc"
- **WHEN** checking access WITHOUT `organizationId` context (app-level check)
- **THEN** custom role SHALL be ignored and core role from Supabase SHALL be used

#### Scenario: Custom role resolution with caching

- **GIVEN** a user's custom role has been resolved and cached
- **WHEN** checking access again within cache TTL period
- **THEN** cached custom role SHALL be used without database query

#### Scenario: Custom role cache invalidation

- **GIVEN** a user's custom role has been cached
- **WHEN** cache TTL expires
- **THEN** next access check SHALL query database to refresh custom role

### Requirement: Organization Context Support

The role guard system SHALL support organization-scoped role resolution via optional `organizationId` parameter.

**Organization Context Rules**:

- `organizationId` parameter SHALL be optional on all role-checking functions
- When `organizationId` is provided, custom role resolution SHALL be attempted
- When `organizationId` is omitted, only core and org roles SHALL be checked
- Organization context SHALL be validated against user's organization memberships

#### Scenario: Role check with organization context

- **GIVEN** a user checking access to content
- **WHEN** calling `canViewContent(locals, ['admin'], { organizationId: 'org_abc' })`
- **THEN** system SHALL attempt custom role resolution for organization "org_abc"

#### Scenario: Role check without organization context

- **GIVEN** a user checking access to app-level content
- **WHEN** calling `canViewContent(locals, ['admin'])` with NO organizationId
- **THEN** system SHALL skip custom role resolution and use core/org roles only

#### Scenario: Invalid organization context rejected

- **GIVEN** a user is NOT a member of organization "org_xyz"
- **WHEN** calling `canViewContent(locals, ['admin'], { organizationId: 'org_xyz' })`
- **THEN** system SHALL reject resolution and deny access (user not in org)

### Requirement: Custom Role Metadata in Debug Mode

The role guard system SHALL display custom role resolution details in debug mode for troubleshooting.

**Debug Information for Custom Roles**:

- Custom role name and ID
- Core role mapping value
- Effective hierarchy level (from core_role_mapping)
- Resolution path taken (custom → org → core)
- Organization context used for resolution

#### Scenario: Debug mode shows custom role resolution

- **GIVEN** a RoleGuard component with `debug={true}` and user has custom role "Moderator"
- **WHEN** component is rendered in development mode
- **THEN** debug output SHALL display custom role name, core_role_mapping, and effective hierarchy level

#### Scenario: Debug mode shows resolution fallback

- **GIVEN** a RoleGuard component with `debug={true}` and user has NO custom role
- **WHEN** component is rendered in development mode
- **THEN** debug output SHALL indicate "No custom role assigned - using core role fallback"

#### Scenario: Debug mode shows organization context

- **GIVEN** a RoleGuard component with `debug={true}` and `organizationId` provided
- **WHEN** component is rendered in development mode
- **THEN** debug output SHALL display organization ID used for custom role resolution
