# Role Guard Specification

## ADDED Requirements

### Requirement: Hierarchical Role Privilege Escalation

The role guard system SHALL implement hierarchical privilege escalation where higher-level user roles automatically inherit access permissions from lower-level roles.

**Role Hierarchy Levels**:

- `member` (level 1) - Base user role with standard permissions
- `admin` (level 2) - Administrative role with all member permissions plus administrative capabilities
- `super_admin` (level 3) - System administrator role with all admin permissions plus system-wide control

**Hierarchy Rules**:

- A user with role level N SHALL have access to content requiring any role with level ≤ N
- A user with role level N SHALL NOT have access to content requiring role with level > N
- Role hierarchy applies ONLY to user roles (`member`, `admin`, `super_admin`)
- Organization roles (`org:admin`, `org:member`) SHALL use flat equality matching without hierarchy

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

### Requirement: Organization Role Flat Matching

The role guard system SHALL use flat equality matching for Clerk organization roles without hierarchical privilege escalation.

**Rationale**: Organization roles are managed by Clerk with organization-specific permissions that may vary between organizations. Hierarchical escalation does not apply to org-scoped roles.

#### Scenario: Org admin accessing org member content

- **GIVEN** a user with role `org:admin`
- **WHEN** checking access to content with `allowedRoles: ['org:member']`
- **THEN** access SHALL be denied because org roles use flat matching (no hierarchy)

#### Scenario: Org member accessing org admin content

- **GIVEN** a user with role `org:member`
- **WHEN** checking access to content with `allowedRoles: ['org:admin']`
- **THEN** access SHALL be denied because org roles use flat matching

#### Scenario: Org admin accessing org admin content

- **GIVEN** a user with role `org:admin`
- **WHEN** checking access to content with `allowedRoles: ['org:admin']`
- **THEN** access SHALL be granted because exact role match

#### Scenario: Mixed user and org roles in allowed list

- **GIVEN** a user with role `admin` (user role, level 2)
- **WHEN** checking access to content with `allowedRoles: ['member', 'org:admin']`
- **THEN** access SHALL be granted due to hierarchical match on `member` role

### Requirement: Configurable Hierarchy Behavior

The role guard system SHALL provide configuration to enable or disable hierarchical checking on a per-guard basis.

**Configuration Option**: `useHierarchy?: boolean`

- **Default**: `true` (hierarchical checking enabled)
- **When `true`**: Use hierarchical privilege escalation for user roles
- **When `false`**: Use flat equality matching for all roles (exact match only)

#### Scenario: Hierarchy enabled by default

- **GIVEN** a role guard with `allowedRoles: ['member']` and NO explicit `useHierarchy` setting
- **WHEN** a user with role `admin` attempts access
- **THEN** access SHALL be granted because `useHierarchy` defaults to `true`

#### Scenario: Hierarchy explicitly enabled

- **GIVEN** a role guard with `allowedRoles: ['member']` and `useHierarchy: true`
- **WHEN** a user with role `admin` attempts access
- **THEN** access SHALL be granted because hierarchical checking is enabled

#### Scenario: Hierarchy explicitly disabled for exact matching

- **GIVEN** a role guard with `allowedRoles: ['member']` and `useHierarchy: false`
- **WHEN** a user with role `admin` attempts access
- **THEN** access SHALL be denied because only exact `member` role matches

#### Scenario: Super admin with hierarchy disabled

- **GIVEN** a role guard with `allowedRoles: ['member']` and `useHierarchy: false`
- **WHEN** a user with role `super_admin` attempts access
- **THEN** access SHALL be denied because hierarchy is disabled (exact match required)

#### Scenario: Hierarchy disabled but exact match exists

- **GIVEN** a role guard with `allowedRoles: ['admin', 'member']` and `useHierarchy: false`
- **WHEN** a user with role `admin` attempts access
- **THEN** access SHALL be granted because `admin` is in the allowed list (exact match)

### Requirement: Hierarchy-Aware Access Evaluation Metadata

The role guard system SHALL provide detailed evaluation metadata when checking access with hierarchy enabled.

**Metadata Fields**:

- `allowed: boolean` - Whether access is granted
- `userRole: AnyRole | null` - The user's current role
- `evaluationMethod: 'hierarchy' | 'exact'` - Method used for evaluation
- `reason?: string` - Human-readable explanation for denial (if denied)

#### Scenario: Successful hierarchical access with metadata

- **GIVEN** a user with role `admin` and `useHierarchy: true`
- **WHEN** calling `canViewContentDetailed()` with `allowedRoles: ['member']`
- **THEN** result SHALL be `{ allowed: true, userRole: 'admin', evaluationMethod: 'hierarchy' }`

#### Scenario: Denied hierarchical access with reason

- **GIVEN** a user with role `member` and `useHierarchy: true`
- **WHEN** calling `canViewContentDetailed()` with `allowedRoles: ['admin']`
- **THEN** result SHALL include `{ allowed: false, reason: 'User role "member" has insufficient privilege level' }`

#### Scenario: Exact match evaluation metadata

- **GIVEN** a user with role `admin` and `useHierarchy: false`
- **WHEN** calling `canViewContentDetailed()` with `allowedRoles: ['member']`
- **THEN** result SHALL be `{ allowed: false, evaluationMethod: 'exact', reason: 'User role "admin" not in allowed roles: member' }`

#### Scenario: Org role evaluation metadata

- **GIVEN** a user with role `org:admin`
- **WHEN** calling `canViewContentDetailed()` with `allowedRoles: ['org:member']`
- **THEN** result SHALL be `{ allowed: false, evaluationMethod: 'exact', reason: 'Organization roles use flat matching' }`

### Requirement: Backward Compatible Function Signatures

The role guard system SHALL maintain backward compatibility with existing function signatures and default behaviors.

**Compatibility Requirements**:

- All existing function calls SHALL continue working without modification
- Default behavior SHALL be hierarchical checking (improved access control)
- Opt-out SHALL be available via explicit configuration
- TypeScript type definitions SHALL remain compatible with existing code

#### Scenario: Legacy code without hierarchy configuration

- **GIVEN** existing code calling `canViewContent(locals, ['member'])` without hierarchy option
- **WHEN** code is executed after upgrade
- **THEN** function SHALL succeed with hierarchical behavior (default `useHierarchy: true`)

#### Scenario: Existing component without hierarchy prop

- **GIVEN** existing `<RoleGuard allowedRoles={['member']}>` without `useHierarchy` prop
- **WHEN** component is rendered after upgrade
- **THEN** component SHALL render with hierarchical behavior enabled by default

#### Scenario: TypeScript compilation of existing code

- **GIVEN** existing TypeScript code using role guard functions
- **WHEN** code is compiled after upgrade
- **THEN** compilation SHALL succeed without type errors

### Requirement: Performance-Optimized Hierarchy Lookup

The role guard system SHALL perform hierarchy level lookups in O(1) constant time using the `ROLE_HIERARCHY` constant.

**Performance Requirements**:

- Hierarchy level lookup SHALL be a direct object property access
- NO database queries SHALL be added for hierarchy evaluation
- Role caching mechanisms SHALL remain unchanged
- Total access check latency SHALL not increase by more than 1ms

#### Scenario: Hierarchy lookup performance

- **GIVEN** a hierarchy level comparison operation
- **WHEN** checking if `admin` (level 2) >= `member` (level 1)
- **THEN** operation SHALL complete via O(1) constant lookup in `ROLE_HIERARCHY`

#### Scenario: No additional database queries

- **GIVEN** a role guard evaluation with `useHierarchy: true`
- **WHEN** checking access for a cached user role
- **THEN** NO additional database queries SHALL be executed beyond existing role fetch

#### Scenario: Unknown role handling

- **GIVEN** a user with an unknown role not in `ROLE_HIERARCHY`
- **WHEN** hierarchy level is queried
- **THEN** system SHALL assign default level 0 (no access) and continue evaluation

### Requirement: Debug Mode Hierarchy Visibility

The role guard system SHALL display hierarchy evaluation details in debug mode for development and troubleshooting.

**Debug Information**:

- Current user role and hierarchy level
- Allowed roles and their hierarchy levels
- Evaluation method used (hierarchy or exact)
- Access decision result (granted or denied)

#### Scenario: Debug mode shows hierarchy evaluation

- **GIVEN** a `RoleGuard` component with `debug={true}` and `useHierarchy={true}`
- **WHEN** component is rendered in development mode
- **THEN** debug output SHALL display hierarchy levels for user role and allowed roles

#### Scenario: Debug mode in production is disabled

- **GIVEN** a `RoleGuard` component with `debug={true}` in production environment
- **WHEN** component is rendered
- **THEN** debug output SHALL NOT be displayed (production safety)

#### Scenario: Debug mode shows exact matching

- **GIVEN** a `RoleGuard` component with `debug={true}` and `useHierarchy={false}`
- **WHEN** component is rendered in development mode
- **THEN** debug output SHALL indicate exact matching mode is active
