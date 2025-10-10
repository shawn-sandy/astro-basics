# Implementation Tasks

## 1. Database Schema Changes

- [ ] 1.1 Create SQL query to identify existing duplicate emails in Supabase
- [ ] 1.2 Create `user_sync_audit` table for duplicate attempt logging
- [ ] 1.3 Create database trigger function `log_duplicate_email_attempt()`
- [ ] 1.4 Create trigger `log_user_email_duplicates` on users table
- [ ] 1.5 Create migration `003_add_email_unique_constraint.sql` with partial unique index
- [ ] 1.6 Include audit table, trigger, and constraint in single migration
- [ ] 1.7 Create rollback migration `rollback_003_add_email_unique_constraint.sql`
- [ ] 1.8 Add migration documentation comments explaining all components
- [ ] 1.9 Include verification queries in migration to confirm all creations

## 2. Application Error Handling

- [ ] 2.1 Update `src/pages/api/webhooks/clerk.ts` to catch unique constraint violations
- [ ] 2.2 Add helpful error messages for email conflict scenarios in webhook handler
- [ ] 2.3 Add admin notification logging to webhook handler for duplicates
- [ ] 2.4 Update `src/pages/api/user/sync.ts` to catch unique constraint violations
- [ ] 2.5 Add helpful error messages for email conflict scenarios in manual sync
- [ ] 2.6 Add admin notification logging to manual sync for duplicates
- [ ] 2.7 Ensure error responses include actionable guidance for users

## 3. User Dashboard Alert

- [ ] 3.1 Create utility function `checkUserSyncStatus()` in `src/utils/user-sync-status.ts`
- [ ] 3.2 Add JSDoc comments explaining sync status check logic
- [ ] 3.3 Create dashboard alert component `src/components/astro/SyncStatusAlert.astro`
- [ ] 3.4 Integrate alert component into dashboard layout
- [ ] 3.5 Test alert displays for users with failed sync
- [ ] 3.6 Test alert hides for users with successful sync
- [ ] 3.7 Verify performance (<100ms query time)

## 4. Testing

- [ ] 4.1 Test migration on development Supabase instance
- [ ] 4.2 Verify constraint enforcement with duplicate email insert attempt
- [ ] 4.3 Verify NULL emails are still allowed (multiple NULL values)
- [ ] 4.4 Verify trigger logs duplicate attempts to `user_sync_audit` table
- [ ] 4.5 Verify audit log contains correct metadata (operation, timestamp)
- [ ] 4.6 Test webhook handler error handling with simulated duplicate
- [ ] 4.7 Verify webhook handler logs admin notification
- [ ] 4.8 Test manual sync endpoint error handling with simulated duplicate
- [ ] 4.9 Verify manual sync logs admin notification
- [ ] 4.10 Test dashboard alert displays for failed sync user
- [ ] 4.11 Test dashboard alert hides for successfully synced user
- [ ] 4.12 Test rollback migration removes constraint, trigger, and audit table
- [ ] 4.13 Verify rollback restores ability to insert duplicate emails

## 5. Documentation

- [ ] 5.1 Create `project-docs/05-database/email-uniqueness-migration.md`
- [ ] 5.2 Document duplicate email detection query
- [ ] 5.3 Document admin resolution steps for existing duplicates
- [ ] 5.4 Document audit table schema and query examples
- [ ] 5.5 Document how to query audit logs for investigation
- [ ] 5.6 Update `CLAUDE.md` database section with email uniqueness requirement
- [ ] 5.7 Update `CLAUDE.md` with audit table information
- [ ] 5.8 Add troubleshooting section for email conflict errors
- [ ] 5.9 Document dashboard alert component usage

## 6. Validation

- [ ] 6.1 Run `openspec validate add-email-unique-constraint --strict`
- [ ] 6.2 Fix any validation errors or warnings
- [ ] 6.3 Confirm all requirements have scenarios
- [ ] 6.4 Ensure ADDED/MODIFIED/REMOVED sections are properly formatted

## 7. Pre-Deployment Checks

- [ ] 7.1 Identify and resolve existing duplicate emails in production database
- [ ] 7.2 Backup current database state before migration
- [ ] 7.3 Notify team of upcoming schema change
- [ ] 7.4 Prepare rollback plan and communication
- [ ] 7.5 Review audit table retention and cleanup strategy

## 8. Deployment

- [ ] 8.1 Apply migration to production Supabase instance
- [ ] 8.2 Verify constraint creation with `\d users` command
- [ ] 8.3 Verify audit table exists with `\d user_sync_audit` command
- [ ] 8.4 Verify trigger exists with query to `pg_trigger`
- [ ] 8.5 Monitor error logs for unique constraint violations
- [ ] 8.6 Monitor audit table for duplicate attempt logging
- [ ] 8.7 Test user registration flow end-to-end
- [ ] 8.8 Test dashboard alert for user with failed sync
- [ ] 8.9 Update deployment documentation with migration notes
- [ ] 8.10 Set up monitoring alerts for admin notifications (optional)
