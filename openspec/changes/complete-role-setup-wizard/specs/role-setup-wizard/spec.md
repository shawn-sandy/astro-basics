# role-setup-wizard Specification

## Purpose

The role setup wizard provides an interactive command-line interface for developers to configure application roles at project setup time, eliminating manual configuration file editing and reducing setup errors.

## ADDED Requirements

### Requirement: Interactive Template Selection

The wizard SHALL provide a menu of pre-configured role templates that developers can select as starting points for their role configuration.

**Available Templates**:

- `basic` - Default 3-tier system (member, admin, super_admin)
- `forum` - Forum platform (+ moderator, curator)
- `blog` - Blog/content platform (+ author, editor)
- `saas` - SaaS application (+ viewer, contributor, manager)
- `custom` - Start from scratch with core roles only

#### Scenario: Developer selects basic template

- **GIVEN** a developer runs `npm run setup:roles`
- **WHEN** they select "Basic (3 roles: member, admin, super_admin)" from the template menu
- **THEN** the wizard SHALL load a configuration with exactly 3 roles: member (level 1), admin (level 3), super_admin (level 4)

#### Scenario: Developer selects forum template

- **GIVEN** a developer runs `npm run setup:roles`
- **WHEN** they select "Forum (+ moderator, curator)" from the template menu
- **THEN** the wizard SHALL load a configuration with 5 roles: member, moderator, curator, admin, super_admin

#### Scenario: Developer selects custom template

- **GIVEN** a developer runs `npm run setup:roles`
- **WHEN** they select "Custom (start from scratch)" from the template menu
- **THEN** the wizard SHALL load a configuration with only the 3 required core roles: member, admin, super_admin

#### Scenario: Template loading failure

- **GIVEN** a template file is missing or corrupted
- **WHEN** the wizard attempts to load that template
- **THEN** the wizard SHALL display an error message, list available templates, and allow the developer to select a different template

### Requirement: Custom Role Addition

The wizard SHALL allow developers to add custom roles beyond the template with guided prompts for role name, hierarchy level, and display label.

**Input Validation**:

- Role name: lowercase letters, numbers, and underscores only
- Hierarchy level: integer between 1 and 10
- Label: 1-50 printable characters

#### Scenario: Developer adds a custom role

- **GIVEN** a developer has selected a template
- **WHEN** they choose to add a custom role named "moderator" with level 2 and label "Moderator"
- **THEN** the wizard SHALL add the role to the configuration and display it in the role table

#### Scenario: Developer adds role with invalid name

- **GIVEN** a developer is adding a custom role
- **WHEN** they enter "Moderator" (uppercase) as the role name
- **THEN** the wizard SHALL display validation error "Role name must be lowercase letters, numbers, and underscores only" and allow retry

#### Scenario: Developer adds role with duplicate name

- **GIVEN** a configuration already contains a role named "moderator"
- **WHEN** a developer attempts to add another role named "moderator"
- **THEN** the wizard SHALL display error "Role 'moderator' already exists" and allow retry with a different name

#### Scenario: Developer uses smart hierarchy suggestion

- **GIVEN** a developer is adding a role named "moderator"
- **WHEN** the wizard prompts for hierarchy level
- **THEN** the wizard SHALL suggest level 2 as the default based on the role name

#### Scenario: Developer uses auto-generated label

- **GIVEN** a developer is adding a role named "forum_moderator"
- **WHEN** the wizard prompts for label
- **THEN** the wizard SHALL suggest "Forum Moderator" (Title Case) as the default

### Requirement: Configuration Review and Confirmation

The wizard SHALL display a formatted table of all configured roles and require explicit confirmation before generating files.

#### Scenario: Developer reviews configuration before generation

- **GIVEN** a developer has completed role configuration
- **WHEN** the wizard displays the final review
- **THEN** the wizard SHALL show a table with columns: role name, hierarchy level, and label for all configured roles

#### Scenario: Developer cancels at confirmation

- **GIVEN** a developer sees the final confirmation prompt "Generate files?"
- **WHEN** they answer "No"
- **THEN** the wizard SHALL display "Setup cancelled" and exit without writing any files

#### Scenario: Developer confirms generation

- **GIVEN** a developer sees the final confirmation prompt "Generate files?"
- **WHEN** they answer "Yes"
- **THEN** the wizard SHALL proceed to validation and file generation steps

### Requirement: Automatic File Generation

The wizard SHALL generate all required files (configuration, types, migrations) in a single operation after developer confirms the configuration.

**Files Generated**:

1. `config/roles.config.ts` - Role configuration
2. `src/types/generated-roles.ts` - TypeScript types
3. `scripts/migrations/XXX_user_roles.sql` - Database migration
4. `scripts/migrations/rollback_XXX_user_roles.sql` - Rollback migration

#### Scenario: Successful file generation

- **GIVEN** a developer has confirmed a valid configuration
- **WHEN** the wizard generates files
- **THEN** all 4 files SHALL be created with correct content and the wizard SHALL display success messages with file paths

#### Scenario: Validation error during generation

- **GIVEN** a developer has confirmed a configuration
- **WHEN** validation detects an error (e.g., duplicate hierarchy level)
- **THEN** the wizard SHALL display the validation error, NOT create any files, and exit with error code 1

#### Scenario: Dry-run mode

- **GIVEN** a developer runs `npm run setup:roles:dry-run`
- **WHEN** they complete the wizard
- **THEN** the wizard SHALL display what would be generated but NOT write any files to disk

### Requirement: Existing Configuration Detection

The wizard SHALL detect existing role configurations and require confirmation before overwriting, with automatic backup creation.

#### Scenario: No existing configuration

- **GIVEN** `config/roles.config.ts` does not exist
- **WHEN** a developer runs the wizard
- **THEN** the wizard SHALL proceed directly to template selection without prompting about overwrites

#### Scenario: Existing configuration detected

- **GIVEN** `config/roles.config.ts` already exists
- **WHEN** a developer runs the wizard
- **THEN** the wizard SHALL display the current configuration and prompt "Overwrite existing configuration?"

#### Scenario: Developer confirms overwrite

- **GIVEN** an existing configuration is detected
- **WHEN** a developer confirms overwrite
- **THEN** the wizard SHALL create a backup at `config/roles.config.ts.backup` and proceed with setup

#### Scenario: Developer cancels overwrite

- **GIVEN** an existing configuration is detected
- **WHEN** a developer declines to overwrite
- **THEN** the wizard SHALL display "Setup cancelled. Existing configuration preserved." and exit

### Requirement: Error Recovery and Rollback

The wizard SHALL handle errors gracefully and restore the system to its previous state if generation fails after modification.

#### Scenario: Generation fails after backup created

- **GIVEN** the wizard has backed up an existing configuration
- **WHEN** an error occurs during type or migration generation
- **THEN** the wizard SHALL restore the backup to its original location and display "Setup failed. Backup restored."

#### Scenario: File write permission error

- **GIVEN** the wizard attempts to write a file
- **WHEN** a permission error occurs (e.g., read-only file system)
- **THEN** the wizard SHALL display a specific error message about permissions and exit without partial files

#### Scenario: User cancels with Ctrl+C

- **GIVEN** the wizard is running
- **WHEN** a developer presses Ctrl+C
- **THEN** the wizard SHALL catch SIGINT, display "Setup cancelled by user", restore any backups, and exit gracefully

### Requirement: Progress Feedback and Success Summary

The wizard SHALL provide real-time progress indicators during file generation and display a comprehensive success summary with next steps.

#### Scenario: Progress indicators during generation

- **GIVEN** a developer has confirmed configuration
- **WHEN** the wizard is generating files
- **THEN** the wizard SHALL display step-by-step progress messages: "⏳ Validating configuration...", "⏳ Generating TypeScript types...", "⏳ Generating database migration...", "⏳ Writing configuration file..."

#### Scenario: Success summary display

- **GIVEN** file generation completes successfully
- **WHEN** the wizard finishes
- **THEN** the wizard SHALL display:
  - Success banner ("✅ Setup Complete!")
  - List of generated files with paths
  - Role count summary
  - Next steps: (1) Review generated files, (2) Run npm run db:migrate, (3) Commit files to version control

#### Scenario: Validation success feedback

- **GIVEN** the wizard validates the configuration
- **WHEN** validation passes
- **THEN** the wizard SHALL display "✓ Configuration valid" before proceeding to generation

### Requirement: Prettier Formatting for Generated Code

The wizard SHALL format all generated TypeScript code using Prettier with the project's configuration to ensure code style consistency.

#### Scenario: Generated types are formatted

- **GIVEN** the wizard generates TypeScript types
- **WHEN** writing to `src/types/generated-roles.ts`
- **THEN** the file SHALL be formatted using Prettier according to the project's `.prettierrc` configuration

#### Scenario: Prettier formatting fails

- **GIVEN** Prettier encounters a syntax error in generated code
- **WHEN** formatting is attempted
- **THEN** the wizard SHALL log a warning but still write the unformatted code (graceful degradation)

### Requirement: Smart Defaults and Suggestions

The wizard SHALL provide intelligent defaults and suggestions based on role names and existing configuration to reduce manual input.

#### Scenario: Hierarchy level suggestion for common role names

- **GIVEN** a developer enters role name "viewer"
- **WHEN** the hierarchy level prompt appears
- **THEN** the wizard SHALL suggest level 1 based on the role name pattern

#### Scenario: Label auto-generation from role name

- **GIVEN** a developer enters role name "content_moderator"
- **WHEN** the label prompt appears
- **THEN** the wizard SHALL show "Content Moderator" as the default label

#### Scenario: Next available hierarchy level

- **GIVEN** existing roles use levels 1, 3, and 4
- **WHEN** a developer adds a custom role without a recognized name
- **THEN** the wizard SHALL suggest level 5 (max + 1) as the default

#### Scenario: Level conflict warning

- **GIVEN** level 2 is already used by "moderator"
- **WHEN** a developer attempts to use level 2 for a new role
- **THEN** the wizard SHALL display "Level 2 is already used by 'moderator'. Choose a different level or confirm to share this level."

## Implementation Notes

**Dependencies**:

- inquirer.js for interactive prompts (already installed)
- chalk or Node.js native colors for output styling
- Prettier for code formatting (already available)

**File Organization**:

- Templates: `config/templates/*.template.ts`
- Wizard: `scripts/setup-roles.ts` (enhanced)
- Utilities: `scripts/lib/setup-utils.ts` (new)
- Existing: `scripts/lib/role-{validator,generator,migration-generator}.ts`

**Testing Strategy**:

- Unit tests for utility functions (suggestions, formatting)
- Integration tests with mocked inquirer responses
- Manual tests for each template and error scenario
