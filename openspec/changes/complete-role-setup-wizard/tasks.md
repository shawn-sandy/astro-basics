# Implementation Tasks: Complete Interactive Role Setup Wizard

## 1. Template System

### 1.1 Create Template Directory Structure

- [ ] 1.1.1 Create `config/templates/` directory
- [ ] 1.1.2 Create `config/templates/README.md` with template documentation
- [ ] 1.1.3 Define shared TypeScript type for templates (import from roles.config.ts)

### 1.2 Create Role Templates

- [ ] 1.2.1 Create `config/templates/basic-roles.template.ts` (member, admin, super_admin)
- [ ] 1.2.2 Create `config/templates/forum-roles.template.ts` (+ moderator, curator)
- [ ] 1.2.3 Create `config/templates/blog-roles.template.ts` (+ author, editor)
- [ ] 1.2.4 Create `config/templates/saas-roles.template.ts` (+ viewer, contributor, manager)
- [ ] 1.2.5 Add JSDoc comments to each template explaining use case
- [ ] 1.2.6 Add descriptions field to each role in templates

### 1.3 Template Loading Logic

- [ ] 1.3.1 Create `scripts/lib/template-loader.ts`
- [ ] 1.3.2 Implement `async loadTemplate(name: string): Promise<RoleConfig>`
- [ ] 1.3.3 Implement `listAvailableTemplates(): string[]`
- [ ] 1.3.4 Add error handling for missing templates
- [ ] 1.3.5 Write unit tests for template loading

## 2. Interactive Prompt System

### 2.1 Setup Utilities Module

- [ ] 2.1.1 Create `scripts/lib/setup-utils.ts`
- [ ] 2.1.2 Implement `suggestHierarchyLevel(roleName, existingConfig): number`
- [ ] 2.1.3 Implement `suggestLabel(roleName): string`
- [ ] 2.1.4 Implement `displayRoleTable(config): void` using console.table or similar
- [ ] 2.1.5 Implement `levelAlreadyUsed(level, config): boolean`
- [ ] 2.1.6 Add unit tests for utility functions

### 2.2 Welcome & Detection

- [ ] 2.2.1 Implement welcome banner with ASCII art or styled text
- [ ] 2.2.2 Detect existing `config/roles.config.ts`
- [ ] 2.2.3 Implement overwrite confirmation prompt if config exists
- [ ] 2.2.4 Implement backup creation before overwrite
- [ ] 2.2.5 Display current configuration summary if exists

### 2.3 Template Selection Prompt

- [ ] 2.3.1 Create inquirer list prompt for template selection
- [ ] 2.3.2 Add template descriptions to choices
- [ ] 2.3.3 Implement "Custom (start from scratch)" option
- [ ] 2.3.4 Load selected template
- [ ] 2.3.5 Display loaded template roles in table format

### 2.4 Custom Role Addition Prompts

- [ ] 2.4.1 Create "Add custom roles?" confirmation prompt
- [ ] 2.4.2 Implement role name input prompt with validation
  - [ ] 2.4.2a Use existing `validateRoleName()` from role-validator
  - [ ] 2.4.2b Show example format on validation error
  - [ ] 2.4.2c Check for name conflicts with existing roles
- [ ] 2.4.3 Implement hierarchy level input prompt
  - [ ] 2.4.3a Show smart suggestion in prompt message
  - [ ] 2.4.3b Validate range (1-10)
  - [ ] 2.4.3c Warn if level already used (allow override)
- [ ] 2.4.4 Implement role label input prompt
  - [ ] 2.4.4a Show auto-generated default from role name
  - [ ] 2.4.4b Allow user to customize or accept default
  - [ ] 2.4.4c Validate length (1-50 characters)
- [ ] 2.4.5 Display newly added role in table
- [ ] 2.4.6 Create "Add another role?" confirmation prompt
- [ ] 2.4.7 Implement loop for adding multiple custom roles

### 2.5 Final Review & Confirmation

- [ ] 2.5.1 Display complete role configuration in formatted table
- [ ] 2.5.2 Show role count summary
- [ ] 2.5.3 Create final confirmation prompt ("Generate files?")
- [ ] 2.5.4 Implement cancellation handling at any stage

## 3. Setup Orchestrator

### 3.1 Main Workflow Implementation

- [ ] 3.1.1 Refactor `scripts/setup-roles.ts` to use async/await workflow
- [ ] 3.1.2 Implement step-by-step execution with progress indicators
- [ ] 3.1.3 Add try-catch wrapper around entire workflow
- [ ] 3.1.4 Implement dry-run mode detection from CLI args
- [ ] 3.1.5 Add colored output using chalk or Node.js native colors

### 3.2 Validation Step

- [ ] 3.2.1 Call existing `validateRoleConfig()` with user's config
- [ ] 3.2.2 Display validation errors with context
- [ ] 3.2.3 Exit gracefully on validation failure
- [ ] 3.2.4 Show validation success message

### 3.3 Type Generation Step

- [ ] 3.3.1 Call existing `generateRoleTypes()` function
- [ ] 3.3.2 Format generated types with Prettier
  - [ ] 3.3.2a Install prettier as dependency (if not already)
  - [ ] 3.3.2b Add Prettier formatting to role-generator.ts
  - [ ] 3.3.2c Use project's Prettier config
- [ ] 3.3.3 Write types to `src/types/generated-roles.ts`
- [ ] 3.3.4 Show success message with file path
- [ ] 3.3.5 In dry-run mode, display generated types (truncated)

### 3.4 Migration Generation Step

- [ ] 3.4.1 Get next migration number using existing logic
- [ ] 3.4.2 Call existing `generateRoleMigration()` function
- [ ] 3.4.3 Write migration to `scripts/migrations/XXX_user_roles.sql`
- [ ] 3.4.4 Generate rollback migration
- [ ] 3.4.5 Show success message with file paths
- [ ] 3.4.6 In dry-run mode, display migration SQL (truncated)

### 3.5 Configuration File Writing

- [ ] 3.5.1 Format configuration as TypeScript code
- [ ] 3.5.2 Add file header comment with generation timestamp
- [ ] 3.5.3 Write to `config/roles.config.ts`
- [ ] 3.5.4 Verify file is syntactically valid (try to import)
- [ ] 3.5.5 Show success message

### 3.6 Success Summary

- [ ] 3.6.1 Display success banner
- [ ] 3.6.2 List all generated files with paths
- [ ] 3.6.3 Show role count summary
- [ ] 3.6.4 Display "Next Steps" instructions
  - [ ] 3.6.4a Review generated files
  - [ ] 3.6.4b Run database migration
  - [ ] 3.6.4c Commit to version control
- [ ] 3.6.5 Add helpful tips (optional)

## 4. Error Handling & Recovery

### 4.1 Validation Error Handling

- [ ] 4.1.1 Catch validation errors during prompts
- [ ] 4.1.2 Display specific error message with field context
- [ ] 4.1.3 Allow retry without losing other input
- [ ] 4.1.4 Show examples of valid input format

### 4.2 File Operation Error Handling

- [ ] 4.2.1 Implement atomic file writes (write to .tmp, then rename)
- [ ] 4.2.2 Create automatic backup before overwrite
- [ ] 4.2.3 Implement rollback on failure
  - [ ] 4.2.3a Restore backup if exists
  - [ ] 4.2.3b Clean up partial files
  - [ ] 4.2.3c Show rollback success message
- [ ] 4.2.4 Handle file permission errors
- [ ] 4.2.5 Handle disk full errors

### 4.3 User Cancellation Handling

- [ ] 4.3.1 Detect Ctrl+C / SIGINT
- [ ] 4.3.2 Detect "No" at confirmation prompts
- [ ] 4.3.3 Clean up partial work
- [ ] 4.3.4 Display cancellation message
- [ ] 4.3.5 Exit with code 0 (user cancellation is not an error)

### 4.4 Template Loading Errors

- [ ] 4.4.1 Handle missing template file
- [ ] 4.4.2 Handle malformed template (invalid TypeScript)
- [ ] 4.4.3 Display helpful error message
- [ ] 4.4.4 Suggest available templates

## 5. Testing

### 5.1 Unit Tests for Utilities

- [ ] 5.1.1 Test `suggestHierarchyLevel()` with various role names
- [ ] 5.1.2 Test `suggestLabel()` snake_case to Title Case conversion
- [ ] 5.1.3 Test `levelAlreadyUsed()` detection
- [ ] 5.1.4 Test `displayRoleTable()` formatting
- [ ] 5.1.5 Test template loader with valid/invalid templates

### 5.2 Integration Tests (Mocked Inquirer)

- [ ] 5.2.1 Create `tests/integration/setup-wizard.test.ts`
- [ ] 5.2.2 Mock inquirer.prompt responses
- [ ] 5.2.3 Test complete workflow: template selection → generation
- [ ] 5.2.4 Test adding custom roles
- [ ] 5.2.5 Test overwrite confirmation flow
- [ ] 5.2.6 Test dry-run mode (no files written)
- [ ] 5.2.7 Test cancellation at various stages
- [ ] 5.2.8 Test error recovery and rollback

### 5.3 Template Validation Tests

- [ ] 5.3.1 Test each template can be loaded
- [ ] 5.3.2 Test each template passes validation
- [ ] 5.3.3 Test templates generate valid TypeScript types
- [ ] 5.3.4 Test templates generate valid SQL migrations

### 5.4 Manual Testing Checklist

- [ ] 5.4.1 Run wizard with each template (basic, forum, blog, saas, custom)
- [ ] 5.4.2 Add 1-3 custom roles interactively
- [ ] 5.4.3 Trigger each validation error intentionally
  - [ ] Invalid role name (uppercase, special chars)
  - [ ] Invalid hierarchy level (out of range, non-integer)
  - [ ] Duplicate role name
- [ ] 5.4.4 Cancel at different stages (template selection, custom role, confirmation)
- [ ] 5.4.5 Overwrite existing configuration
- [ ] 5.4.6 Run in dry-run mode
- [ ] 5.4.7 Verify generated files compile and work
- [ ] 5.4.8 Apply generated migration to database
- [ ] 5.4.9 Test role-guard with generated types

## 6. Documentation

### 6.1 Template Documentation

- [ ] 6.1.1 Write `config/templates/README.md`
- [ ] 6.1.2 Document each template's intended use case
- [ ] 6.1.3 Explain how to create custom templates
- [ ] 6.1.4 Add examples of template customization
- [ ] 6.1.5 Document template file structure

### 6.2 User Guide Updates

- [ ] 6.2.1 Update `project-docs/02-guides/configurable-roles.md`
- [ ] 6.2.2 Add "Interactive Setup Wizard" section
- [ ] 6.2.3 Add walkthrough with screenshots/examples
- [ ] 6.2.4 Document each prompt and what it does
- [ ] 6.2.5 Add troubleshooting section for common issues

### 6.3 README Updates

- [ ] 6.3.1 Update `README.md` Essential Commands section
- [ ] 6.3.2 Add interactive wizard example
- [ ] 6.3.3 Highlight improved developer experience
- [ ] 6.3.4 Add GIF or ASCII recording of wizard (optional)

### 6.4 CLAUDE.md Updates

- [ ] 6.4.1 Update `CLAUDE.md` with wizard command
- [ ] 6.4.2 Add note about template system
- [ ] 6.4.3 Update role configuration workflow

## 7. Code Quality & Polish

### 7.1 Code Review

- [ ] 7.1.1 Add JSDoc comments to all new functions
- [ ] 7.1.2 Ensure consistent error messages
- [ ] 7.1.3 Remove console.log debug statements
- [ ] 7.1.4 Use proper logging (chalk, not console.log)
- [ ] 7.1.5 Ensure all files have proper headers

### 7.2 Linting & Formatting

- [ ] 7.2.1 Run ESLint on all modified files
- [ ] 7.2.2 Run Prettier on all modified files
- [ ] 7.2.3 Run TypeScript type-check
- [ ] 7.2.4 Fix any linting errors
- [ ] 7.2.5 Ensure code passes CI checks

### 7.3 Performance Check

- [ ] 7.3.1 Test wizard performance with large templates
- [ ] 7.3.2 Optimize template loading (lazy load)
- [ ] 7.3.3 Profile type generation with Prettier
- [ ] 7.3.4 Ensure wizard completes in < 30 seconds

### 7.4 User Experience Polish

- [ ] 7.4.1 Add loading spinners for long operations
- [ ] 7.4.2 Use emoji sparingly for visual appeal
- [ ] 7.4.3 Ensure color scheme is accessible
- [ ] 7.4.4 Test wizard in different terminal emulators
- [ ] 7.4.5 Add help text for complex prompts

## 8. Package & Dependency Management

### 8.1 Dependencies

- [ ] 8.1.1 Verify inquirer is in package.json (already installed)
- [ ] 8.1.2 Verify chalk or use native Node.js colors
- [ ] 8.1.3 Verify prettier is available
- [ ] 8.1.4 Document minimum Node.js version if needed

### 8.2 Package Scripts

- [ ] 8.2.1 Verify `setup:roles` script works
- [ ] 8.2.2 Verify `setup:roles:dry-run` script works
- [ ] 8.2.3 Update package.json description (if needed)
- [ ] 8.2.4 Add any new scripts if needed

## 9. Final Validation

### 9.1 End-to-End Test

- [ ] 9.1.1 Fresh clone of repository
- [ ] 9.1.2 Run `npm install`
- [ ] 9.1.3 Run `npm run setup:roles`
- [ ] 9.1.4 Complete wizard with custom roles
- [ ] 9.1.5 Run `npm run db:migrate`
- [ ] 9.1.6 Verify application works with generated roles
- [ ] 9.1.7 Run all tests (`npm test`)
- [ ] 9.1.8 Run type-check (`npm run type-check`)

### 9.2 Documentation Review

- [ ] 9.2.1 Proofread all documentation
- [ ] 9.2.2 Verify all links work
- [ ] 9.2.3 Verify all code examples are correct
- [ ] 9.2.4 Ensure documentation matches implementation

### 9.3 OpenSpec Validation

- [ ] 9.3.1 Run `openspec validate complete-role-setup-wizard --strict`
- [ ] 9.3.2 Fix any validation errors
- [ ] 9.3.3 Ensure all requirements have scenarios
- [ ] 9.3.4 Verify task completion matches implementation

## Summary

**Total Tasks**: 153
**Completion Criteria**:

- Interactive wizard is fully functional
- All templates are available and tested
- Documentation is complete and accurate
- All tests pass
- User experience is polished and intuitive

**High Priority** (MVP):

- Template system (Section 1)
- Interactive prompts (Section 2)
- Setup orchestrator (Section 3)
- Basic error handling (Section 4)
- Integration tests (Section 5.2)

**Medium Priority**:

- Advanced error recovery (Section 4.2-4.4)
- Comprehensive testing (Section 5)
- Documentation (Section 6)

**Low Priority** (Polish):

- Code quality checks (Section 7)
- Performance optimization (Section 7.3)
- UX polish (Section 7.4)
