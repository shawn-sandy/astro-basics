# Implementation Tasks

## 1. Update Migration 001 Core Schema

- [x] 1.1 Remove non-unique index `idx_users_email` from PART 3: INDEXES section (line ~103)
- [x] 1.2 Add DO block for partial unique index `idx_users_email_unique` in PART 3: INDEXES section
- [x] 1.3 Include IF NOT EXISTS check in DO block for idempotent constraint creation
- [x] 1.4 Add RAISE NOTICE messages for constraint creation success/skip
- [x] 1.5 Add comment explaining partial unique index design (allows NULL, prevents duplicate non-NULL)
- [x] 1.6 Add COMMENT ON COLUMN statement for users.email in PART 5: DOCUMENTATION section
- [x] 1.7 Update verification section (PART 6) to check idx_users_email_unique existence
- [x] 1.8 Update success message to report "7 indexes for performance (including email uniqueness)"
- [ ] 1.9 Test migration on clean database to ensure constraint is created
- [ ] 1.10 Test migration on database with migration 004 already applied (idempotence)

## 2. Update Rollback Script for Migration 001

- [x] 2.1 Open `scripts/migrations/rollback_001_core_schema.sql`
- [x] 2.2 Add `DROP INDEX IF EXISTS idx_users_email_unique;` in indexes section
- [x] 2.3 Ensure proper ordering (drop indexes before dropping tables)
- [ ] 2.4 Test rollback script on database with constraint created by migration 001
- [ ] 2.5 Test rollback script on database with constraint created by migration 004
- [ ] 2.6 Verify rollback is idempotent (can be run multiple times safely)

## 3. Update Migration 004 with Deprecation Notice

- [x] 3.1 Open `scripts/migrations/004_clerk_email_verification.sql`
- [x] 3.2 Update header comment block with deprecation notice
- [x] 3.3 Add note: "For new installations, use migration 001 which includes this constraint"
- [x] 3.4 Add note: "This migration is safe to apply on existing databases (idempotent design)"
- [x] 3.5 Keep all existing validation and constraint logic intact
- [x] 3.6 Ensure migration 004 still works independently for existing deployments

## 4. Documentation Updates

- [x] 4.1 Update `CLAUDE.md` Supabase Migrations section
- [x] 4.2 Document new 2-migration path for fresh installations (001 + 002)
- [x] 4.3 Document that migration 004 is for existing deployments only
- [x] 4.4 Add note about idempotent design ensuring safety for all installation paths
- [x] 4.5 Update migration file list to reflect consolidation
- [x] 4.6 Update "Applying Migrations" section with new recommended order
- [x] 4.7 Check if `project-docs/05-database/supabase-migration-refactor-plan.md` needs updates
- [x] 4.8 Migration refactor plan documents earlier 6→2 consolidation; not applicable to this change

## 5. Testing and Validation

- [ ] 5.1 Test fresh installation path (run migrations 001 → 002 only)
- [ ] 5.2 Verify email uniqueness constraint is active after migration 001
- [ ] 5.3 Test duplicate email insert attempt (should fail with constraint violation)
- [ ] 5.4 Test NULL email insert (should succeed, multiple NULLs allowed)
- [ ] 5.5 Test existing deployment path (migrations 001 → 002 → 003 → 004)
- [ ] 5.6 Verify no errors when migration 001 reapplied after migration 004
- [ ] 5.7 Test rollback_001_core_schema.sql successfully removes constraint
- [ ] 5.8 Verify rollback allows duplicate email inserts after constraint removal
- [ ] 5.9 Test rollback idempotence (run twice, no errors)

## 6. OpenSpec Validation

- [ ] 6.1 Run `openspec validate consolidate-email-constraint-to-core --strict`
- [ ] 6.2 Fix any validation errors or warnings
- [ ] 6.3 Confirm all requirements have at least one scenario
- [ ] 6.4 Ensure scenario formatting uses `#### Scenario:` header format
- [ ] 6.5 Verify ADDED/MODIFIED/REMOVED sections are properly formatted

## 7. Code Review Preparation

- [ ] 7.1 Review all changes for consistency and completeness
- [ ] 7.2 Ensure backward compatibility is maintained
- [ ] 7.3 Verify no breaking changes introduced
- [ ] 7.4 Confirm documentation accurately reflects implementation
- [ ] 7.5 Prepare summary of changes for code review

## 8. Approval and Implementation

- [ ] 8.1 Request proposal review and approval
- [ ] 8.2 Wait for approval before implementing changes
- [ ] 8.3 After approval, implement tasks sequentially (sections 1-5)
- [ ] 8.4 Mark each task complete as work progresses
- [ ] 8.5 Run final validation after all implementation complete

## 9. Archive Preparation

- [ ] 9.1 Confirm all implementation tasks are complete
- [ ] 9.2 Confirm all tests pass
- [ ] 9.3 Create archive directory `openspec/changes/archive/YYYY-MM-DD-consolidate-email-constraint-to-core/`
- [ ] 9.4 Create new spec file `openspec/specs/database-migration/spec.md` with final requirements
- [ ] 9.5 Run `openspec validate --strict` to confirm archived change passes checks
- [ ] 9.6 Update project.md if migration consolidation pattern should be documented
