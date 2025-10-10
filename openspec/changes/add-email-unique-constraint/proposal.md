# Add Email Unique Constraint

## Why

The `users` table in Supabase currently allows duplicate email addresses because the `email` column lacks a UNIQUE constraint. This creates a **critical security vulnerability** and data integrity issue:

- Multiple users can register with the same email address
- Email-based features (password reset, notifications, user lookup) behave unpredictably
- Potential for authentication confusion and account takeover scenarios
- Violates fundamental database normalization principles

The root cause is that the database schema only enforces uniqueness on `clerk_id`, not on `email`. While Clerk prevents duplicate emails at the authentication layer, direct database operations or race conditions can bypass this protection.

## What Changes

**Database Schema:**

- Add UNIQUE constraint to `users.email` column (with NULL handling)
- Create `user_sync_audit` table for duplicate attempt logging
- Create database trigger to automatically log all duplicate email attempts
- Create trigger function `log_duplicate_email_attempt()` for audit trail

**Migration:**

- Create migration `003_add_email_unique_constraint.sql` with all database changes
- Include duplicate cleanup strategy
- Create rollback migration for safe schema reversion

**Error Handling:**

- Update webhook handler (`src/pages/api/webhooks/clerk.ts`) to gracefully handle unique constraint violations
- Update manual sync endpoint (`src/pages/api/user/sync.ts`) with better conflict error messages
- Add admin notification logging for all duplicate email conflicts

**User Experience:**

- Create dashboard alert component to notify users of failed profile sync
- Display persistent alert until sync succeeds
- Provide clear actionable guidance to users

**Documentation:**

- Create migration guide in `project-docs/05-database/email-uniqueness-migration.md`
- Document audit table schema and query examples
- Update CLAUDE.md with new database tables and features

**Breaking Change**: ❌ None - This is a data integrity enhancement that enforces existing business rules

## Impact

### Affected Specs

- **user-sync** (new capability) - User synchronization from Clerk to Supabase with email uniqueness enforcement

### Affected Code

**Database:**

- `scripts/migrations/003_add_email_unique_constraint.sql` (new) - Adds constraint, audit table, and trigger
- `scripts/migrations/rollback_003_add_email_unique_constraint.sql` (new) - Safe rollback script

**API Endpoints:**

- `src/pages/api/webhooks/clerk.ts` - Add error handling and admin notifications
- `src/pages/api/user/sync.ts` - Add error handling and admin notifications

**Utilities:**

- `src/utils/user-sync-status.ts` (new) - Check if user profile is synced

**Components:**

- `src/components/astro/SyncStatusAlert.astro` (new) - Dashboard alert for failed sync

**Documentation:**

- `project-docs/05-database/email-uniqueness-migration.md` (new) - Migration guide with audit examples
- `CLAUDE.md` - Update database section with new tables and features

### Migration Strategy

**Pre-Migration**: Identify existing duplicates with SQL query for manual admin resolution

**Migration Execution**: Add partial unique index that allows multiple NULL emails but enforces uniqueness for non-NULL values

**Post-Migration**: All future user sync operations will fail gracefully if duplicate email detected

### Risk Assessment

**Low Risk** - This change:

- Does NOT modify existing data (only adds constraint)
- Has clear rollback path (drop constraint)
- Graceful error handling prevents service disruption
- Aligns with existing Clerk authentication behavior
