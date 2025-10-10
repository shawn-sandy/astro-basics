# Configurable Roles Specification

## ADDED Requirements

### Requirement: Role Configuration Schema Validation

The system SHALL validate role configuration files using a Zod schema to ensure type safety and prevent invalid role definitions.

**Validation Rules**:

- Role names SHALL be lowercase alphanumeric with underscores only (regex: `^[a-z][a-z0-9_]*$`)
- Role names SHALL be between 2 and 30 characters long
- Hierarchy levels SHALL be integers between 1 and 10 (inclusive)
- Role labels SHALL be non-empty strings between 1 and 50 characters
- Role names SHALL NOT conflict with SQL reserved keywords (user, role, select, insert, update, delete, etc.)
- Role names SHALL NOT conflict with TypeScript reserved keywords (class, interface, type, enum, const, let, var, etc.)
- Configuration SHALL include exactly 3 core roles: member, admin, super_admin
- All role names SHALL be unique within the configuration
- All hierarchy levels SHALL be unique within the configuration

#### Scenario: Valid configuration passes validation

- **GIVEN** a configuration with roles `[{name: 'member', level: 1}, {name: 'admin', level: 2}, {name: 'super_admin', level: 3}]`
- **WHEN** validation is performed using the Zod schema
- **THEN** validation SHALL pass without errors

#### Scenario: Invalid role name with uppercase rejected

- **GIVEN** a configuration with role name `'Admin'` (contains uppercase)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Role name must be lowercase alphanumeric with underscores"

#### Scenario: Invalid role name with special characters rejected

- **GIVEN** a configuration with role name `'super-admin'` (contains hyphen)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Role name must be lowercase alphanumeric with underscores"

#### Scenario: Role name too short rejected

- **GIVEN** a configuration with role name `'a'` (1 character)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Role name must be at least 2 characters"

#### Scenario: Role name too long rejected

- **GIVEN** a configuration with role name `'this_is_an_extremely_long_role_name_that_exceeds_thirty_characters'` (>30 characters)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Role name must be at most 30 characters"

#### Scenario: Hierarchy level out of range rejected

- **GIVEN** a configuration with hierarchy level `11` (above maximum)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Level must be at most 10"

#### Scenario: Hierarchy level non-integer rejected

- **GIVEN** a configuration with hierarchy level `2.5` (decimal)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Level must be an integer"

#### Scenario: Missing core role rejected

- **GIVEN** a configuration with roles `[{name: 'member', level: 1}, {name: 'admin', level: 2}]` (missing super_admin)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "super_admin role is required"

#### Scenario: Duplicate role name rejected

- **GIVEN** a configuration with roles `[{name: 'member', level: 1}, {name: 'member', level: 2}]`
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Role names must be unique"

#### Scenario: Duplicate hierarchy level rejected

- **GIVEN** a configuration with roles `[{name: 'member', level: 1}, {name: 'moderator', level: 1}]`
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Hierarchy levels must be unique"

#### Scenario: SQL keyword blocklist enforced

- **GIVEN** a configuration with role name `'user'` (SQL reserved keyword)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Role name conflicts with SQL keyword"

#### Scenario: TypeScript keyword blocklist enforced

- **GIVEN** a configuration with role name `'interface'` (TypeScript reserved keyword)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error message "Role name conflicts with TypeScript keyword"

### Requirement: Interactive Setup Wizard

The system SHALL provide an interactive CLI wizard using inquirer to guide developers through role configuration setup.

**Wizard Features**:

- Template selection (basic, standard, blog, saas, forum, custom)
- Role selection with checkboxes (core roles disabled/required)
- Custom role name input with real-time validation
- Hierarchy level input with smart suggestions
- Role label input with auto-generated defaults
- Configuration summary review before saving
- Overwrite confirmation for existing configurations
- Colorized console output for improved readability

#### Scenario: First-time setup with template selection

- **GIVEN** no existing configuration file exists at `config/roles.config.ts`
- **WHEN** developer runs `npm run setup:roles`
- **THEN** wizard SHALL display template selection prompt with options: basic, standard, blog, saas, forum, custom
- **AND** wizard SHALL NOT display overwrite confirmation

#### Scenario: Update existing configuration

- **GIVEN** existing configuration file exists at `config/roles.config.ts`
- **WHEN** developer runs `npm run setup:roles`
- **THEN** wizard SHALL detect existing configuration
- **AND** wizard SHALL display overwrite confirmation prompt
- **AND** wizard SHALL create backup file `config/roles.config.ts.backup` if user confirms overwrite

#### Scenario: Template selection loads predefined roles

- **GIVEN** developer selects "standard" template in wizard
- **WHEN** template is loaded
- **THEN** wizard SHALL pre-populate role selection with: member, moderator, contributor, admin, super_admin
- **AND** core roles (member, admin, super_admin) SHALL be checked and disabled (cannot uncheck)

#### Scenario: Custom role name validation in wizard

- **GIVEN** developer selects "add custom role" option
- **WHEN** developer enters role name `'Super-Admin'` (contains uppercase and hyphen)
- **THEN** wizard SHALL display error message "Role name must be lowercase alphanumeric with underscores"
- **AND** wizard SHALL re-prompt for valid role name

#### Scenario: Smart hierarchy level suggestion

- **GIVEN** existing roles have levels 1, 2, 4
- **AND** developer is adding new role `'moderator'`
- **WHEN** wizard prompts for hierarchy level
- **THEN** wizard SHALL suggest level 3 (fills gap) as default
- **AND** wizard SHALL accept any unused level 1-10

#### Scenario: Auto-generated role label

- **GIVEN** developer enters custom role name `'content_moderator'`
- **WHEN** wizard prompts for role label
- **THEN** wizard SHALL suggest default label "Content Moderator" (title-cased, underscores replaced with spaces)
- **AND** developer MAY accept default or provide custom label

#### Scenario: Configuration summary before saving

- **GIVEN** developer has completed all wizard prompts
- **WHEN** wizard reaches final step
- **THEN** wizard SHALL display summary table with all configured roles (name, level, label)
- **AND** wizard SHALL prompt "Save this configuration? (yes/no)"
- **AND** wizard SHALL only write files if developer confirms

### Requirement: TypeScript Type Generation

The system SHALL auto-generate TypeScript types in `src/types/generated-roles.ts` from the role configuration file.

**Generated Exports**:

- `UserRole` union type with all role names
- `USER_ROLES` const array with all role names (with `as const` assertion)
- `ROLE_HIERARCHY` const object mapping role names to hierarchy levels
- `ROLE_LABELS` const object mapping role names to display labels
- File header warning "AUTO-GENERATED - DO NOT EDIT MANUALLY"
- Source reference comment pointing to `config/roles.config.ts`
- Generation timestamp in ISO 8601 format
- Command to regenerate "Run: npm run setup:roles"

#### Scenario: UserRole union type generated correctly

- **GIVEN** configuration with roles `['member', 'moderator', 'admin', 'super_admin']`
- **WHEN** type generation is executed
- **THEN** generated file SHALL contain `export type UserRole = 'member' | 'moderator' | 'admin' | 'super_admin'`

#### Scenario: USER_ROLES const array generated with const assertion

- **GIVEN** configuration with roles `['member', 'admin', 'super_admin']`
- **WHEN** type generation is executed
- **THEN** generated file SHALL contain `export const USER_ROLES = ['member', 'admin', 'super_admin'] as const`

#### Scenario: ROLE_HIERARCHY object generated correctly

- **GIVEN** configuration with roles `[{name: 'member', level: 1}, {name: 'admin', level: 3}]`
- **WHEN** type generation is executed
- **THEN** generated file SHALL contain `export const ROLE_HIERARCHY = { member: 1, admin: 3 } as const`

#### Scenario: ROLE_LABELS object generated correctly

- **GIVEN** configuration with roles `[{name: 'member', label: 'Member'}, {name: 'super_admin', label: 'Super Administrator'}]`
- **WHEN** type generation is executed
- **THEN** generated file SHALL contain `export const ROLE_LABELS = { member: 'Member', super_admin: 'Super Administrator' } as const`

#### Scenario: File header warning prevents manual edits

- **WHEN** type generation is executed
- **THEN** generated file SHALL contain header comment "AUTO-GENERATED FILE - DO NOT EDIT MANUALLY"
- **AND** header SHALL include source reference "Generated from: config/roles.config.ts"
- **AND** header SHALL include generation timestamp in format "Generated: YYYY-MM-DDTHH:mm:ss.sssZ"
- **AND** header SHALL include regeneration command "Run: npm run setup:roles"

#### Scenario: Generated TypeScript is syntactically valid

- **GIVEN** any valid role configuration
- **WHEN** type generation is executed
- **THEN** generated TypeScript file SHALL be parseable by TypeScript compiler without syntax errors
- **AND** generated file SHALL pass `npm run type-check` validation

#### Scenario: Generated types are backward compatible

- **GIVEN** existing code importing `UserRole` from `src/utils/role-types.ts`
- **WHEN** types are generated from configuration
- **THEN** existing imports SHALL continue working without code changes
- **AND** type definitions SHALL remain compatible with existing role-guard functions

### Requirement: PostgreSQL Migration Generation

The system SHALL generate PostgreSQL migration SQL files with ENUM type definitions based on role configuration.

**Migration Content**:

- `CREATE TYPE user_role AS ENUM` statement with role names from configuration
- Role descriptions as SQL comments (from role labels)
- Idempotent migration using DO block with conditional ENUM creation
- Transaction wrapper (BEGIN/COMMIT)
- Verification queries to confirm ENUM created successfully
- Migration file naming pattern: `XXX_user_roles.sql` (where XXX is auto-incremented number)
- Rollback migration: `rollback_XXX_user_roles.sql` with DROP TYPE statement

#### Scenario: ENUM creation SQL generated correctly

- **GIVEN** configuration with roles `['member', 'moderator', 'admin', 'super_admin']`
- **WHEN** migration generation is executed
- **THEN** generated SQL SHALL contain `CREATE TYPE user_role AS ENUM ('member', 'moderator', 'admin', 'super_admin')`

#### Scenario: Role descriptions as SQL comments

- **GIVEN** configuration with role `{name: 'moderator', label: 'Content Moderator'}`
- **WHEN** migration generation is executed
- **THEN** generated SQL SHALL contain SQL comment `-- moderator: Content Moderator` before or in ENUM definition

#### Scenario: Idempotent migration with conditional creation

- **GIVEN** any valid configuration
- **WHEN** migration generation is executed
- **THEN** generated SQL SHALL use DO block pattern:
  ```sql
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM (...);
      END IF;
  END$$;
  ```
- **AND** migration SHALL be safe to run multiple times without errors

#### Scenario: Transaction wrapper for atomicity

- **GIVEN** any valid configuration
- **WHEN** migration generation is executed
- **THEN** generated SQL SHALL start with `BEGIN;` statement
- **AND** generated SQL SHALL end with `COMMIT;` statement
- **AND** all ENUM creation logic SHALL be between BEGIN and COMMIT

#### Scenario: Verification queries confirm ENUM creation

- **GIVEN** any valid configuration
- **WHEN** migration generation is executed
- **THEN** generated SQL SHALL include verification query like:
  ```sql
  SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;
  ```
- **AND** verification SHALL display success message if ENUM exists

#### Scenario: Migration number auto-increments

- **GIVEN** existing migrations `001_core_schema.sql` and `002_security_policies.sql`
- **WHEN** migration generation is executed
- **THEN** generated migration file SHALL be named `003_user_roles.sql` (next sequential number)

#### Scenario: Migration number conflict detection

- **GIVEN** migration number `003` is already used by another migration
- **WHEN** migration generation attempts to use number `003`
- **THEN** generator SHALL detect conflict and warn user
- **AND** generator SHALL suggest next available number or manual override

#### Scenario: Rollback migration drops ENUM safely

- **GIVEN** any valid configuration
- **WHEN** rollback migration is generated
- **THEN** rollback SQL SHALL contain `DROP TYPE IF EXISTS user_role CASCADE;`
- **AND** rollback SHALL include safety warning comment about data loss
- **AND** rollback SHALL be idempotent (safe to run if ENUM doesn't exist)

### Requirement: Configuration File Management

The system SHALL manage role configuration files with validation, backup, and version control integration.

**File Management Features**:

- Write configuration to `config/roles.config.ts` in TypeScript format
- Automatic code formatting using Prettier (if available)
- Backup of existing configuration before overwrite (`config/roles.config.ts.backup`)
- Validation that written config can be imported successfully
- Git-trackable format (no binary files)

#### Scenario: Configuration written in TypeScript format

- **GIVEN** validated role configuration from wizard
- **WHEN** configuration is written to file
- **THEN** file SHALL be written to `config/roles.config.ts`
- **AND** file SHALL be valid TypeScript (importable without syntax errors)
- **AND** file SHALL export `roleConfig` const with `as const` assertion

#### Scenario: Automatic code formatting applied

- **GIVEN** Prettier is installed in project
- **AND** valid role configuration is ready to write
- **WHEN** configuration is written to file
- **THEN** written file SHALL be formatted using Prettier
- **AND** file SHALL match project's Prettier configuration

#### Scenario: Backup created before overwrite

- **GIVEN** existing configuration file at `config/roles.config.ts`
- **WHEN** setup wizard overwrites configuration
- **THEN** existing file SHALL be backed up to `config/roles.config.ts.backup`
- **AND** backup SHALL contain exact copy of original file
- **AND** backup timestamp SHALL be added to backup filename (e.g., `config/roles.config.ts.backup.2025-10-10`)

#### Scenario: Written configuration is importable

- **GIVEN** configuration written to `config/roles.config.ts`
- **WHEN** setup script attempts to import written config
- **THEN** import SHALL succeed without errors
- **AND** imported config SHALL match original configuration data structure

#### Scenario: Configuration tracked in Git

- **GIVEN** project uses Git for version control
- **WHEN** configuration file is written
- **THEN** file SHALL NOT be in `.gitignore`
- **AND** file SHALL be suitable for committing to repository
- **AND** file SHALL contain no secrets or sensitive data

### Requirement: Setup Idempotency

The system SHALL support running setup multiple times safely, allowing configuration updates without data loss.

**Idempotency Features**:

- Detect existing configuration and prompt for update vs new setup
- Backup existing files before overwrite
- Preserve generated types if configuration hasn't changed
- Detect existing migrations and avoid number conflicts
- Allow dry-run mode to preview changes without writing files

#### Scenario: Second setup run detects existing configuration

- **GIVEN** configuration file exists at `config/roles.config.ts`
- **WHEN** developer runs `npm run setup:roles` again
- **THEN** wizard SHALL detect existing configuration
- **AND** wizard SHALL display message "Existing configuration found. Would you like to update it?"
- **AND** wizard SHALL offer options: update, create new, cancel

#### Scenario: Dry-run mode shows changes without writing

- **GIVEN** valid role configuration
- **WHEN** developer runs `npm run setup:roles -- --dry-run`
- **THEN** wizard SHALL execute normally and show summary
- **AND** wizard SHALL display "DRY RUN: No files will be written"
- **AND** wizard SHALL NOT write any files to disk
- **AND** wizard SHALL show what files would have been created/modified

#### Scenario: Unchanged configuration skips generation

- **GIVEN** existing configuration with hash `abc123`
- **AND** developer runs setup without changing configuration
- **WHEN** setup compares configuration hash
- **THEN** setup SHALL detect no changes
- **AND** setup SHALL display message "Configuration unchanged - skipping generation"
- **AND** setup SHALL NOT regenerate types or migrations

#### Scenario: Migration conflict prevents duplicate migrations

- **GIVEN** existing migration `003_user_roles.sql` from previous setup
- **WHEN** setup attempts to generate new migration with same number
- **THEN** setup SHALL detect conflict
- **AND** setup SHALL display error "Migration 003 already exists. Delete it first or manually increment number."
- **AND** setup SHALL NOT overwrite existing migration file

### Requirement: Core Role Protection

The system SHALL enforce that core roles (member, admin, super_admin) are always present and cannot be removed from configuration.

**Protection Rules**:

- Configuration validation SHALL require `member` role
- Configuration validation SHALL require `admin` role
- Configuration validation SHALL require `super_admin` role
- Setup wizard SHALL pre-select core roles with disabled checkboxes
- Validator SHALL reject configurations missing any core role
- Error messages SHALL clearly indicate which core role is missing

#### Scenario: Configuration without member role rejected

- **GIVEN** configuration with roles `['admin', 'super_admin']` (missing member)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error "member role is required (core role)"

#### Scenario: Configuration without admin role rejected

- **GIVEN** configuration with roles `['member', 'super_admin']` (missing admin)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error "admin role is required (core role)"

#### Scenario: Configuration without super_admin role rejected

- **GIVEN** configuration with roles `['member', 'admin']` (missing super_admin)
- **WHEN** validation is performed
- **THEN** validation SHALL fail with error "super_admin role is required (core role)"

#### Scenario: Wizard prevents unchecking core roles

- **GIVEN** setup wizard role selection step
- **WHEN** wizard displays role checkboxes
- **THEN** member, admin, and super_admin checkboxes SHALL be pre-checked
- **AND** core role checkboxes SHALL be disabled (cannot be unchecked)
- **AND** checkbox labels SHALL indicate "(required)" for core roles

#### Scenario: All three core roles present passes validation

- **GIVEN** configuration with roles `['member', 'moderator', 'admin', 'super_admin']`
- **WHEN** validation checks for core roles
- **THEN** validation SHALL pass core role requirement check
- **AND** custom role `moderator` SHALL be allowed alongside core roles

### Requirement: Error Handling and Recovery

The system SHALL provide clear error messages and recovery options when setup fails or validation errors occur.

**Error Handling Features**:

- Descriptive error messages with specific failure reasons
- Suggestions for fixing validation errors
- Automatic rollback if file writes fail
- Recovery of backup files on error
- Detailed logging of all setup operations

#### Scenario: Validation error shows specific failure reason

- **GIVEN** role name `'Super_Admin'` (contains uppercase S)
- **WHEN** validation fails
- **THEN** error message SHALL contain "Role name must be lowercase alphanumeric with underscores"
- **AND** error message SHALL show invalid value `'Super_Admin'`
- **AND** error message SHALL suggest fix "Try: 'super_admin'"

#### Scenario: File write failure triggers rollback

- **GIVEN** setup has successfully written `config/roles.config.ts`
- **AND** setup fails while writing `src/types/generated-roles.ts` due to disk error
- **WHEN** error is detected
- **THEN** setup SHALL restore `config/roles.config.ts` from backup
- **AND** setup SHALL delete any partially written files
- **AND** setup SHALL display error message "Setup failed during type generation - all changes rolled back"

#### Scenario: Backup restoration on critical error

- **GIVEN** existing configuration backed up to `config/roles.config.ts.backup`
- **AND** setup encounters critical error after overwriting config
- **WHEN** error recovery is triggered
- **THEN** system SHALL restore original config from backup file
- **AND** system SHALL display message "Configuration restored from backup"

#### Scenario: Detailed logging for debugging

- **GIVEN** setup running with verbose logging enabled
- **WHEN** any setup operation is performed
- **THEN** system SHALL log operation details to console or log file
- **AND** logs SHALL include timestamps, operation names, and outcomes (success/failure)
- **AND** logs SHALL be helpful for debugging issues

### Requirement: Backward Compatibility Integration

The system SHALL integrate generated types seamlessly with existing role-guard system without breaking changes.

**Integration Requirements**:

- `src/utils/role-types.ts` SHALL re-export types from `src/types/generated-roles.ts`
- If generated types file doesn't exist, SHALL fall back to hardcoded types
- All existing imports of `UserRole`, `USER_ROLES`, `ROLE_HIERARCHY` SHALL continue working
- No changes required to existing role-guard function signatures
- Generated types SHALL match same interface as hardcoded types

#### Scenario: role-types.ts re-exports generated types

- **GIVEN** generated types file exists at `src/types/generated-roles.ts`
- **WHEN** `src/utils/role-types.ts` is imported
- **THEN** module SHALL export `UserRole` from generated file
- **AND** module SHALL export `USER_ROLES` from generated file
- **AND** module SHALL export `ROLE_HIERARCHY` from generated file
- **AND** module SHALL export `ROLE_LABELS` from generated file

#### Scenario: Fallback to hardcoded types when generated file missing

- **GIVEN** generated types file does NOT exist at `src/types/generated-roles.ts`
- **WHEN** `src/utils/role-types.ts` is imported
- **THEN** module SHALL export hardcoded `UserRole` type (member, admin, super_admin)
- **AND** module SHALL export hardcoded constants
- **AND** application SHALL continue functioning with default 3-tier system

#### Scenario: Existing code imports work unchanged

- **GIVEN** existing code with import `import { UserRole } from '#utils/role-types'`
- **WHEN** types are generated from custom configuration
- **THEN** import SHALL continue working without code changes
- **AND** `UserRole` type SHALL reflect custom roles from configuration

#### Scenario: role-guard functions work with generated types

- **GIVEN** generated types with custom role `'moderator'`
- **WHEN** calling `canViewContent(locals, ['moderator'])`
- **THEN** function SHALL accept `'moderator'` as valid role (TypeScript compilation succeeds)
- **AND** function SHALL perform hierarchy checking correctly for custom role
- **AND** no runtime errors SHALL occur

#### Scenario: Generated types interface matches hardcoded

- **GIVEN** hardcoded types export `UserRole`, `USER_ROLES`, `ROLE_HIERARCHY`, `ROLE_LABELS`
- **WHEN** types are generated from configuration
- **THEN** generated exports SHALL have same names and structure
- **AND** generated types SHALL be assignable to same type signatures
- **AND** type compatibility SHALL be maintained for existing code
