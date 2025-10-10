# Implementation Tasks: Configurable Role System

## 1. Configuration System

### 1.1 Create Role Configuration Schema

- [ ] 1.1.1 Create `config/roles.config.ts` with TypeScript configuration structure
- [ ] 1.1.2 Define role configuration interface (`RoleDefinition`, `RoleConfig`)
- [ ] 1.1.3 Create default configuration with 3-tier system (member, admin, super_admin)
- [ ] 1.1.4 Add JSDoc comments explaining each configuration field
- [ ] 1.1.5 Export configuration as `const` assertion for type inference

### 1.2 Implement Configuration Validation

- [ ] 1.2.1 Create `scripts/lib/role-validator.ts`
- [ ] 1.2.2 Install Zod dependency (`npm install zod`)
- [ ] 1.2.3 Define Zod schema for role name validation (lowercase alphanumeric, underscores only)
- [ ] 1.2.4 Define Zod schema for hierarchy level validation (1-10 range)
- [ ] 1.2.5 Define Zod schema for role label validation (1-50 characters)
- [ ] 1.2.6 Implement core role requirement validation (member, admin, super_admin mandatory)
- [ ] 1.2.7 Implement unique role name validation
- [ ] 1.2.8 Implement unique hierarchy level validation
- [ ] 1.2.9 Create blocklist for SQL keywords (user, role, select, etc.)
- [ ] 1.2.10 Create blocklist for TypeScript keywords (class, interface, type, etc.)
- [ ] 1.2.11 Implement custom validation error messages
- [ ] 1.2.12 Export `validateRoleConfig(config)` function
- [ ] 1.2.13 Write unit tests for validation scenarios (valid and invalid configs)

### 1.3 Create Configuration Templates

- [ ] 1.3.1 Create `config/templates/` directory
- [ ] 1.3.2 Create `basic-roles.template.ts` (member, admin, super_admin only)
- [ ] 1.3.3 Create `standard-roles.template.ts` (+ moderator, contributor)
- [ ] 1.3.4 Create `blog-roles.template.ts` (+ author, editor)
- [ ] 1.3.5 Create `saas-roles.template.ts` (+ viewer, contributor, manager)
- [ ] 1.3.6 Create `forum-roles.template.ts` (+ moderator, curator, volunteer)
- [ ] 1.3.7 Add README explaining templates and customization

## 2. Setup Script (Interactive CLI)

### 2.1 Create Setup Script Foundation

- [ ] 2.1.1 Create `scripts/setup-roles.ts` main script file
- [ ] 2.1.2 Install inquirer dependency (`npm install inquirer` and `@types/inquirer`)
- [ ] 2.1.3 Implement CLI header/banner with project name and version
- [ ] 2.1.4 Implement configuration file detection (check if `config/roles.config.ts` exists)
- [ ] 2.1.5 Implement "first run" vs "update" workflow detection
- [ ] 2.1.6 Add colorized console output using chalk or native Node.js colors

### 2.2 Implement Interactive Prompts

- [ ] 2.2.1 Create template selection prompt (basic, standard, blog, saas, forum, custom)
- [ ] 2.2.2 Create role selection prompt with checkboxes (core roles disabled/required)
- [ ] 2.2.3 Create custom role name input prompt with validation
- [ ] 2.2.4 Create hierarchy level input prompt (1-10 with suggestion based on existing)
- [ ] 2.2.5 Create role label input prompt with default suggestion
- [ ] 2.2.6 Create "add another role?" confirmation prompt
- [ ] 2.2.7 Create configuration summary/review prompt before saving
- [ ] 2.2.8 Create overwrite confirmation prompt for existing config
- [ ] 2.2.9 Implement prompt validation with error messages and retry logic

### 2.2.10 Add Setup Wizard Features

- [ ] 2.2.10 Implement smart defaults based on role name (e.g., "moderator" suggests level 2)
- [ ] 2.2.11 Implement hierarchy level conflict detection and auto-suggestion
- [ ] 2.2.12 Implement role name conflict detection with existing roles
- [ ] 2.2.13 Add "help" messages for each prompt explaining options
- [ ] 2.2.14 Add progress indicator for multi-step setup

### 2.3 Implement Configuration Writer

- [ ] 2.3.1 Create function to format role config as TypeScript code
- [ ] 2.3.2 Create function to write formatted config to `config/roles.config.ts`
- [ ] 2.3.3 Implement automatic code formatting using Prettier (if available)
- [ ] 2.3.4 Add file header comment with generation timestamp and instructions
- [ ] 2.3.5 Implement backup of existing config before overwrite (`config/roles.config.ts.backup`)
- [ ] 2.3.6 Add validation that written config can be imported successfully

## 3. Type Generation Engine

### 3.1 Create Type Generator

- [ ] 3.1.1 Create `scripts/lib/role-generator.ts`
- [ ] 3.1.2 Implement `generateRoleTypes(config)` function
- [ ] 3.1.3 Generate `UserRole` union type from config role names
- [ ] 3.1.4 Generate `USER_ROLES` const array from config role names
- [ ] 3.1.5 Generate `ROLE_HIERARCHY` const object from config levels
- [ ] 3.1.6 Generate `ROLE_LABELS` const object from config labels
- [ ] 3.1.7 Add TypeScript `as const` assertions for type narrowing
- [ ] 3.1.8 Add file header warning ("AUTO-GENERATED - DO NOT EDIT MANUALLY")
- [ ] 3.1.9 Add source reference comment ("Generated from: config/roles.config.ts")
- [ ] 3.1.10 Add generation timestamp in comment
- [ ] 3.1.11 Add command to regenerate ("Run: npm run setup:roles")

### 3.2 Implement Type Writer

- [ ] 3.2.1 Create function to write generated types to `src/types/generated-roles.ts`
- [ ] 3.2.2 Ensure output directory exists (`src/types/`) before writing
- [ ] 3.2.3 Implement automatic code formatting using Prettier
- [ ] 3.2.4 Validate generated TypeScript syntax (attempt to parse with TypeScript API)
- [ ] 3.2.5 Create backup of existing generated file before overwrite
- [ ] 3.2.6 Write success message with file path

### 3.3 Update Existing Type Exports

- [ ] 3.3.1 Modify `src/utils/role-types.ts` to re-export from generated types
- [ ] 3.3.2 Add conditional import (use generated if exists, fallback to hardcoded)
- [ ] 3.3.3 Add comment explaining generated vs hardcoded separation
- [ ] 3.3.4 Update JSDoc comments to reference generation process
- [ ] 3.3.5 Test backward compatibility with existing imports

## 4. Migration Generation Engine

### 4.1 Create Migration Generator

- [ ] 4.1.1 Create `scripts/lib/migration-generator.ts`
- [ ] 4.1.2 Implement `generateRoleMigration(config)` function
- [ ] 4.1.3 Generate PostgreSQL ENUM creation SQL with role names
- [ ] 4.1.4 Add role descriptions as SQL comments (from labels)
- [ ] 4.1.5 Generate idempotent SQL using `CREATE TYPE IF NOT EXISTS` pattern (or DO block)
- [ ] 4.1.6 Generate transaction wrapper (BEGIN/COMMIT)
- [ ] 4.1.7 Generate verification queries to confirm ENUM created
- [ ] 4.1.8 Add migration file header with description and timestamp

### 4.2 Implement Migration Numbering

- [ ] 4.2.1 Create function to scan `scripts/migrations/` for existing migrations
- [ ] 4.2.2 Implement auto-increment logic for migration number (find max + 1)
- [ ] 4.2.3 Format migration number with zero-padding (001, 002, etc.)
- [ ] 4.2.4 Detect migration number conflicts and warn user
- [ ] 4.2.5 Implement manual override for migration number (advanced option)

### 4.3 Generate Rollback Migration

- [ ] 4.3.1 Create `generateRollbackMigration(config)` function
- [ ] 4.3.2 Generate SQL to drop ENUM type (with CASCADE if needed)
- [ ] 4.3.3 Add safety warnings in rollback migration comments
- [ ] 4.3.4 Generate idempotent rollback using `DROP TYPE IF EXISTS`
- [ ] 4.3.5 Write rollback migration to `scripts/migrations/rollback_XXX_user_roles.sql`

### 4.4 Implement Migration Writer

- [ ] 4.4.1 Create function to write migration SQL to file
- [ ] 4.4.2 Use naming pattern: `XXX_user_roles.sql` (where XXX is number)
- [ ] 4.4.3 Write both forward and rollback migrations
- [ ] 4.4.4 Validate SQL syntax (basic parsing check)
- [ ] 4.4.5 Write success message with migration file paths

### 4.5 Turso Migration Support (Optional)

- [ ] 4.5.1 Generate Turso-compatible migration (TEXT column with CHECK constraint)
- [ ] 4.5.2 Detect database provider from environment (Supabase vs Turso)
- [ ] 4.5.3 Generate appropriate migration for detected provider
- [ ] 4.5.4 Add provider detection skip flag for manual selection

## 5. Integration & Orchestration

### 5.1 Implement Setup Orchestrator

- [ ] 5.1.1 Create main setup flow in `scripts/setup-roles.ts`
- [ ] 5.1.2 Implement workflow: validate config → generate types → generate migration
- [ ] 5.1.3 Add error handling for each step with rollback on failure
- [ ] 5.1.4 Implement success summary showing all generated files
- [ ] 5.1.5 Add "next steps" guidance (run db:migrate, commit files, etc.)
- [ ] 5.1.6 Implement dry-run mode (`--dry-run` flag) that shows what would be generated

### 5.2 Add Package.json Scripts

- [ ] 5.2.1 Add `"setup:roles": "tsx scripts/setup-roles.ts"` script
- [ ] 5.2.2 Add `"setup:roles:dry-run": "tsx scripts/setup-roles.ts --dry-run"` script
- [ ] 5.2.3 Add `"validate:roles": "tsx scripts/lib/role-validator.ts"` script (standalone validation)
- [ ] 5.2.4 Update `package.json` description with setup command

### 5.3 Update Git Configuration

- [ ] 5.3.1 Ensure `src/types/generated-roles.ts` is NOT in `.gitignore` (should be tracked)
- [ ] 5.3.2 Ensure `config/roles.config.ts` is tracked in Git
- [ ] 5.3.3 Add `*.backup` to `.gitignore` (backup files should not be tracked)
- [ ] 5.3.4 Document in README that generated files should be committed

## 6. Testing

### 6.1 Unit Tests for Validation

- [ ] 6.1.1 Create `tests/scripts/role-validator.test.ts`
- [ ] 6.1.2 Test valid configuration passes validation
- [ ] 6.1.3 Test invalid role name rejected (uppercase, special chars, etc.)
- [ ] 6.1.4 Test invalid hierarchy level rejected (out of range, non-integer)
- [ ] 6.1.5 Test missing core roles rejected (member, admin, super_admin required)
- [ ] 6.1.6 Test duplicate role names rejected
- [ ] 6.1.7 Test duplicate hierarchy levels rejected
- [ ] 6.1.8 Test SQL keyword blocklist enforced
- [ ] 6.1.9 Test TypeScript keyword blocklist enforced
- [ ] 6.1.10 Test custom error messages are descriptive

### 6.2 Unit Tests for Type Generation

- [ ] 6.2.1 Create `tests/scripts/role-generator.test.ts`
- [ ] 6.2.2 Test UserRole union type generated correctly
- [ ] 6.2.3 Test USER_ROLES array generated correctly
- [ ] 6.2.4 Test ROLE_HIERARCHY object generated correctly
- [ ] 6.2.5 Test ROLE_LABELS object generated correctly
- [ ] 6.2.6 Test `as const` assertions present in generated code
- [ ] 6.2.7 Test file header comments generated correctly
- [ ] 6.2.8 Test generated TypeScript is syntactically valid
- [ ] 6.2.9 Test generated types are importable and usable

### 6.3 Unit Tests for Migration Generation

- [ ] 6.3.1 Create `tests/scripts/migration-generator.test.ts`
- [ ] 6.3.2 Test PostgreSQL ENUM SQL generated correctly
- [ ] 6.3.3 Test migration number auto-increment works correctly
- [ ] 6.3.4 Test migration numbering detects conflicts
- [ ] 6.3.5 Test rollback migration generated correctly
- [ ] 6.3.6 Test idempotency patterns (IF NOT EXISTS) present
- [ ] 6.3.7 Test transaction wrappers (BEGIN/COMMIT) present
- [ ] 6.3.8 Test migration file naming follows pattern
- [ ] 6.3.9 Test SQL syntax validity (basic parsing)

### 6.4 Integration Tests for Setup Workflow

- [ ] 6.4.1 Create `tests/integration/setup-roles-workflow.test.ts`
- [ ] 6.4.2 Test complete workflow: config → types → migration
- [ ] 6.4.3 Test setup with default 3-tier system
- [ ] 6.4.4 Test setup with custom roles (5-6 roles)
- [ ] 6.4.5 Test setup update (modifying existing config)
- [ ] 6.4.6 Test setup dry-run mode (no files written)
- [ ] 6.4.7 Test error handling and rollback on failure
- [ ] 6.4.8 Test generated files are git-committable (valid syntax)
- [ ] 6.4.9 Test backward compatibility (existing role-guard works with generated types)

### 6.5 Integration with Existing Tests

- [ ] 6.5.1 Run existing `tests/utils/role-guard.test.ts` with generated types
- [ ] 6.5.2 Ensure no test failures due to type generation
- [ ] 6.5.3 Ensure type-check passes (`npm run type-check`)
- [ ] 6.5.4 Ensure build passes (`npm run build`)
- [ ] 6.5.5 Ensure all linters pass (`npm run lint:all`)

## 7. Documentation

### 7.1 Create User Documentation

- [ ] 7.1.1 Create `docs/guide/configurable-roles.md`
- [ ] 7.1.2 Document "Getting Started" with setup wizard
- [ ] 7.1.3 Document configuration file structure and options
- [ ] 7.1.4 Document how to add custom roles
- [ ] 7.1.5 Document how to update existing roles
- [ ] 7.1.6 Document migration workflow after setup
- [ ] 7.1.7 Add troubleshooting section for common errors
- [ ] 7.1.8 Add examples for different use cases (blog, SaaS, forum)

### 7.2 Create Technical Reference

- [ ] 7.2.1 Create `docs/guide/role-configuration-reference.md`
- [ ] 7.2.2 Document RoleDefinition interface with all fields
- [ ] 7.2.3 Document RoleConfig interface with validation rules
- [ ] 7.2.4 Document Zod schema details and validation logic
- [ ] 7.2.5 Document generated type exports and usage
- [ ] 7.2.6 Document migration generation logic and patterns
- [ ] 7.2.7 Add code examples for each configuration option

### 7.3 Create Developer Workflow Guide

- [ ] 7.3.1 Create `docs/development/setup-roles-workflow.md`
- [ ] 7.3.2 Document recommended workflow (edit → setup → migrate → commit)
- [ ] 7.3.3 Document how to review generated files before committing
- [ ] 7.3.4 Document how to handle setup errors
- [ ] 7.3.5 Document how to rollback migrations
- [ ] 7.3.6 Document team collaboration best practices (PR process)
- [ ] 7.3.7 Add flowchart showing decision tree for role changes

### 7.4 Update Project Documentation

- [ ] 7.4.1 Update `CLAUDE.md` with configurable role system section
- [ ] 7.4.2 Update `README.md` Essential Commands with `setup:roles`
- [ ] 7.4.3 Update `docs/database/migrations.md` with role migration generation
- [ ] 7.4.4 Update existing role-guard documentation with generated types usage
- [ ] 7.4.5 Add migration path from hardcoded to configurable system
- [ ] 7.4.6 Add comparison with `add-custom-role-system` proposal

### 7.5 Create Example Configurations

- [ ] 7.5.1 Create `examples/` directory in docs
- [ ] 7.5.2 Create example for blog platform (member, author, editor, admin, super_admin)
- [ ] 7.5.3 Create example for SaaS platform (viewer, contributor, manager, admin, super_admin)
- [ ] 7.5.4 Create example for forum (member, moderator, volunteer, curator, admin, super_admin)
- [ ] 7.5.5 Add comments explaining each role's purpose in examples
- [ ] 7.5.6 Add copy-paste instructions for using examples

## 8. Final Validation & Cleanup

### 8.1 Code Quality Checks

- [ ] 8.1.1 Run ESLint on all new TypeScript files (`npm run lint`)
- [ ] 8.1.2 Run Prettier formatting on all new files (`npm run format`)
- [ ] 8.1.3 Run type-check on entire project (`npm run type-check`)
- [ ] 8.1.4 Ensure no console.log statements in production code (use proper logging)
- [ ] 8.1.5 Add JSDoc comments to all exported functions
- [ ] 8.1.6 Ensure all files have proper header comments

### 8.2 Test Coverage

- [ ] 8.2.1 Run test suite with coverage (`npm test -- --coverage`)
- [ ] 8.2.2 Ensure >80% coverage for new code
- [ ] 8.2.3 Ensure critical paths (validation, generation) have 100% coverage
- [ ] 8.2.4 Add missing tests for uncovered branches
- [ ] 8.2.5 Run E2E tests to verify no regressions

### 8.3 Manual Testing

- [ ] 8.3.1 Test setup wizard with default roles
- [ ] 8.3.2 Test setup wizard with custom roles (5+ roles)
- [ ] 8.3.3 Test setup update workflow (modify existing config)
- [ ] 8.3.4 Test validation error messages (try invalid inputs)
- [ ] 8.3.5 Apply generated migration to Supabase database
- [ ] 8.3.6 Test role-guard with generated types in real application
- [ ] 8.3.7 Test backward compatibility (remove generated files, app still works)
- [ ] 8.3.8 Test git workflow (commit generated files, create PR)

### 8.4 Documentation Review

- [ ] 8.4.1 Proofread all documentation for typos and clarity
- [ ] 8.4.2 Verify all code examples in documentation are correct
- [ ] 8.4.3 Verify all links in documentation work
- [ ] 8.4.4 Ensure documentation matches implementation
- [ ] 8.4.5 Get peer review on documentation

### 8.5 OpenSpec Validation

- [ ] 8.5.1 Run `openspec validate add-configurable-role-system --strict`
- [ ] 8.5.2 Fix any validation errors
- [ ] 8.5.3 Ensure all requirements have scenarios
- [ ] 8.5.4 Ensure all scenarios follow proper format (`#### Scenario:`)
- [ ] 8.5.5 Run `openspec diff add-configurable-role-system` to verify changes

## 9. Deployment Preparation

### 9.1 Create Release Notes

- [ ] 9.1.1 Document new setup:roles command
- [ ] 9.1.2 Document upgrade path for existing projects
- [ ] 9.1.3 Document breaking changes (none expected)
- [ ] 9.1.4 Document new dependencies (inquirer, zod)
- [ ] 9.1.5 Add migration guide for projects switching from hardcoded roles

### 9.2 Update CHANGELOG

- [ ] 9.2.1 Add entry for configurable role system feature
- [ ] 9.2.2 List all new commands and files
- [ ] 9.2.3 Document backward compatibility guarantees
- [ ] 9.2.4 Add version number and date

### 9.3 Peer Review Checklist

- [ ] 9.3.1 Code review by at least one other developer
- [ ] 9.3.2 Security review of validation logic and file I/O
- [ ] 9.3.3 Performance review (ensure setup is fast enough)
- [ ] 9.3.4 Documentation review by technical writer (if available)
- [ ] 9.3.5 User experience testing with new team member

### 9.4 Archive Proposal

- [ ] 9.4.1 Complete all tasks in this checklist
- [ ] 9.4.2 Verify implementation matches specifications
- [ ] 9.4.3 Run `openspec archive add-configurable-role-system`
- [ ] 9.4.4 Update main specs in `openspec/specs/` with changes
- [ ] 9.4.5 Move change to `openspec/changes/archive/`
