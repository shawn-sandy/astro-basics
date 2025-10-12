# Consolidate Email Constraint to Core Schema Migration

## Why

The email uniqueness constraint is currently implemented as a separate migration (004_clerk_email_verification.sql), creating unnecessary complexity for new installations. This requires running 4 migrations (001, 002, 003, 004) when the email constraint is logically part of the core user schema and should be defined alongside the users table in migration 001.

**Current Problems:**

- New installations must run 4 separate migrations when only 2 are logically necessary
- Email uniqueness is separated from the users table definition, making schema harder to understand
- Migration 004 includes pre-migration validation logic (duplicate detection) that is only needed for existing databases, not fresh installations
- Developers must read multiple files to understand the complete users table schema

**Opportunity:**
By consolidating the email uniqueness constraint into migration 001_core_schema.sql, we can:

- Reduce setup complexity from 4 migrations to 2 migrations for new installations
- Improve schema comprehension by keeping related constraints together
- Maintain backward compatibility through idempotent migration design
- Preserve migration 004 for existing deployments that need the validation logic

## What Changes

**Database Schema Consolidation:**

- Add partial unique index `idx_users_email_unique` to migration 001_core_schema.sql
- Remove non-unique index `idx_users_email` from migration 001 (replaced by unique index)
- Add email uniqueness documentation comments to migration 001
- Update verification section in migration 001 to validate email constraint

**Migration 004 Preservation:**

- Keep migration 004_clerk_email_verification.sql for backward compatibility
- Mark migration 004 as "deprecated for new installations" in header comments
- Update migration 004 documentation to reference migration 001 for new setups

**Rollback Script Updates:**

- Add email constraint removal to rollback_001_core_schema.sql
- Ensure rollback script includes: `DROP INDEX IF EXISTS idx_users_email_unique;`

**Documentation Updates:**

- Update CLAUDE.md migration documentation to reflect consolidated approach
- Document that new installations only need migrations 001 + 002
- Document that existing installations with migration 004 applied are unaffected

**Breaking Change**: ❌ None - This is a refactoring that maintains identical database state. Existing deployments are unaffected due to idempotent migration design (IF NOT EXISTS checks).

## Impact

### Affected Specs

- **database-migration** (new capability) - Database migration structure and consolidation patterns

### Affected Code

**Database Migrations:**

- `scripts/migrations/001_core_schema.sql` - Add email uniqueness constraint and update verification
- `scripts/migrations/rollback_001_core_schema.sql` - Add email constraint rollback step
- `scripts/migrations/004_clerk_email_verification.sql` - Update header with deprecation notice

**Documentation:**

- `CLAUDE.md` - Update Supabase migration section with new 2-migration approach
- `project-docs/05-database/supabase-migration-refactor-plan.md` - Update if exists

### Migration Strategy

**For New Installations:**

1. Run migration 001 (includes email constraint) → 002 (security policies)
2. Complete setup in 2 migrations instead of 4

**For Existing Installations:**

1. No action required if migration 004 already applied
2. Idempotent design means migration 001 won't duplicate constraint
3. Can continue using existing 4-migration path safely

**Technical Implementation:**

- Use `IF NOT EXISTS` checks in migration 001 to prevent conflicts
- Email constraint creation wrapped in DO block with existence check
- Rollback script updated to handle constraint removal

### Risk Assessment

**Very Low Risk** - This change:

- Does NOT modify database state for any installation path
- Maintains backward compatibility through idempotent design
- Only affects new installations (simplified setup path)
- Has clear rollback capability (drop index)
- No code changes to application layer required
- No breaking changes to existing behavior

**Safety Measures:**

- Idempotent migration design prevents duplicate constraint creation
- Existing migration 004 preserved for backward compatibility
- Rollback scripts updated and tested
- Documentation clearly explains both installation paths
