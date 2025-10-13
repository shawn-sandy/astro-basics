# Role Guard Specification Changes

## MODIFIED Requirements

### Requirement: Hierarchical Role Privilege Escalation

The role guard system SHALL implement hierarchical privilege escalation where higher-level user roles automatically inherit access permissions from lower-level roles, using role definitions from the configurable role system.

**Role Hierarchy Levels**:

- Roles and their hierarchy levels SHALL be defined in `config/roles.config.ts`
- Default roles: `member` (level 1), `admin` (level 2), `super_admin` (level 3)
- Custom roles SHALL be supported based on setup configuration
- Hierarchy levels SHALL be loaded from generated `ROLE_HIERARCHY` constant

**Hierarchy Rules**:

- A user with role level N SHALL have access to content requiring any role with level ≤ N
- A user with role level N SHALL NOT have access to content requiring role with level > N
- Role hierarchy applies ONLY to user roles (not organization roles)
- Organization roles (`org:admin`, `org:member`) SHALL use flat equality matching without hierarchy
- Custom roles SHALL participate in hierarchy based on configured levels

#### Scenario: Admin accessing member-restricted content

- **GIVEN** a user with role `admin` (level 2 from configuration)
- **WHEN** checking access to content with `allowedRoles: ['member']` (level 1)
- **THEN** access SHALL be granted because admin level ≥ member level

#### Scenario: Super admin accessing member-restricted content

- **GIVEN** a user with role `super_admin` (level 3 from configuration)
- **WHEN** checking access to content with `allowedRoles: ['member']` (level 1)
- **THEN** access SHALL be granted because super_admin level ≥ member level

#### Scenario: Super admin accessing admin-restricted content

- **GIVEN** a user with role `super_admin` (level 3 from configuration)
- **WHEN** checking access to content with `allowedRoles: ['admin']` (level 2)
- **THEN** access SHALL be granted because super_admin level ≥ admin level

#### Scenario: Member attempting to access admin-restricted content

- **GIVEN** a user with role `member` (level 1 from configuration)
- **WHEN** checking access to content with `allowedRoles: ['admin']` (level 2)
- **THEN** access SHALL be denied because member level < admin level

#### Scenario: Member attempting to access super admin content

- **GIVEN** a user with role `member` (level 1 from configuration)
- **WHEN** checking access to content with `allowedRoles: ['super_admin']` (level 3)
- **THEN** access SHALL be denied because member level < super_admin level

#### Scenario: Admin attempting to access super admin content

- **GIVEN** a user with role `admin` (level 2 from configuration)
- **WHEN** checking access to content with `allowedRoles: ['super_admin']` (level 3)
- **THEN** access SHALL be denied because admin level < super_admin level

#### Scenario: Multiple allowed roles with mixed levels

- **GIVEN** a user with role `admin` (level 2 from configuration)
- **WHEN** checking access to content with `allowedRoles: ['member', 'admin', 'super_admin']`
- **THEN** access SHALL be granted because admin level ≥ member level (lowest required)

#### Scenario: Unauthenticated user access attempt

- **GIVEN** a user with no authenticated role (null)
- **WHEN** checking access to content with any `allowedRoles`
- **THEN** access SHALL be denied regardless of hierarchy configuration

#### Scenario: Custom role in hierarchy (moderator)

- **GIVEN** configuration with custom role `moderator` (level 2)
- **AND** user with role `moderator`
- **WHEN** checking access to content with `allowedRoles: ['member']` (level 1)
- **THEN** access SHALL be granted because moderator level ≥ member level

#### Scenario: Custom role hierarchy ordering

- **GIVEN** configuration with roles: member (level 1), contributor (level 2), moderator (level 3), admin (level 4)
- **AND** user with role `moderator` (level 3)
- **WHEN** checking access to content with `allowedRoles: ['contributor']` (level 2)
- **THEN** access SHALL be granted because moderator level ≥ contributor level

#### Scenario: Unknown custom role defaults to no access

- **GIVEN** user with role `unknown_role` not in `ROLE_HIERARCHY`
- **WHEN** checking access to any content
- **THEN** role level SHALL default to 0 (no access)
- **AND** access SHALL be denied for all hierarchy checks

### Requirement: Configuration-Aware Type Validation

The role guard system SHALL use role definitions from generated TypeScript types and validate roles against the configured set.

**Type Integration**:

- `UserRole` type SHALL be imported from `src/types/generated-roles.ts` (via re-export from `role-types.ts`)
- `USER_ROLES` constant SHALL reflect configured roles
- `ROLE_HIERARCHY` SHALL use hierarchy levels from configuration
- `ROLE_LABELS` SHALL use display labels from configuration
- Fallback to hardcoded types if generated file doesn't exist

#### Scenario: Generated types used when available

- **GIVEN** generated types file exists at `src/types/generated-roles.ts` with custom roles
- **WHEN** role-guard imports types from `role-types.ts`
- **THEN** imports SHALL use generated types (not hardcoded)
- **AND** custom roles SHALL be recognized as valid `UserRole` values

#### Scenario: Hardcoded types fallback when generated missing

- **GIVEN** generated types file does NOT exist
- **WHEN** role-guard imports types from `role-types.ts`
- **THEN** imports SHALL use hardcoded 3-tier types (member, admin, super_admin)
- **AND** application SHALL function normally with default roles

#### Scenario: Configuration change reflected after regeneration

- **GIVEN** configuration is updated with new role `editor` (level 3)
- **AND** developer runs `npm run setup:roles` to regenerate types
- **WHEN** application is restarted
- **THEN** role-guard SHALL recognize `editor` as valid role
- **AND** hierarchy level 3 SHALL apply to `editor` role

#### Scenario: Startup validation detects invalid roles

- **GIVEN** database contains user with role `legacy_role` not in current configuration
- **WHEN** application starts and loads role configuration
- **THEN** system SHALL log warning "Role 'legacy_role' not found in configuration"
- **AND** system SHALL continue functioning (defensive programming)
- **AND** access checks for `legacy_role` SHALL default to level 0 (denied)

### Requirement: Enhanced Error Messages for Configured Roles

The role guard system SHALL provide clear error messages referencing configured roles when access is denied.

**Error Message Requirements**:

- Error messages SHALL list all configured roles when validation fails
- Error messages SHALL indicate whether roles are from configuration or hardcoded
- Error messages SHALL suggest running setup if role not found
- Debug mode SHALL show role configuration source

#### Scenario: Access denied error lists configured roles

- **GIVEN** configuration with roles: member, contributor, moderator, admin, super_admin
- **AND** user with role `member` attempts to access admin content
- **WHEN** access is denied
- **THEN** error message SHALL be "User role 'member' does not meet hierarchy requirements for roles: admin"
- **AND** error SHALL indicate user's hierarchy level (1) and required level (4)

#### Scenario: Invalid role error suggests setup

- **GIVEN** code references role `'editor'` not in configuration
- **WHEN** role validation occurs
- **THEN** error message SHALL be "Role 'editor' not found in configuration. Available roles: member, contributor, admin, super_admin"
- **AND** error SHALL suggest "Run 'npm run setup:roles' to add custom roles"

#### Scenario: Debug mode shows configuration source

- **GIVEN** role-guard running in debug mode
- **WHEN** access check is performed
- **THEN** debug output SHALL display "Roles loaded from: src/types/generated-roles.ts"
- **AND** debug output SHALL show all configured roles with hierarchy levels
- **AND** debug output SHALL indicate whether using generated or hardcoded types

#### Scenario: Helpful error for misconfigured hierarchy

- **GIVEN** configuration has conflicting hierarchy levels (two roles at level 2)
- **WHEN** application starts
- **THEN** system SHALL log error "Configuration error: Duplicate hierarchy level 2 for roles: contributor, moderator"
- **AND** system SHALL suggest "Fix config/roles.config.ts and run setup:roles"
