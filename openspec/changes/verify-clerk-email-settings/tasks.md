# Implementation Tasks: Verify Clerk Email Settings

## 1. Clerk Dashboard Configuration

- [ ] 1.1 Log into Clerk Dashboard at https://dashboard.clerk.com
- [ ] 1.2 Navigate to Settings → Restrictions
- [ ] 1.3 Verify email uniqueness is enforced (should be enabled by default)
- [ ] 1.4 Enable "Block email subaddresses" to prevent `email+tag@example.com` abuse
- [ ] 1.5 Enable "Block disposable emails" to prevent spam accounts
- [ ] 1.6 Document current restriction settings in project documentation

## 2. Database Migration

- [ ] 2.1 Check for existing duplicate emails with query: `SELECT email, COUNT(*) FROM users WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1`
- [ ] 2.2 Resolve any duplicate emails manually if found
- [ ] 2.3 Create migration `scripts/migrations/003_clerk_email_verification.sql`
- [ ] 2.4 Add partial unique index: `CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE email IS NOT NULL`
- [ ] 2.5 Include verification query in migration
- [ ] 2.6 Create rollback migration `scripts/migrations/rollback_003_clerk_email_verification.sql`
- [ ] 2.7 Test migration on local development database

## 3. Webhook Error Handling

- [ ] 3.1 Open `src/pages/api/webhooks/clerk.ts`
- [ ] 3.2 Update `user.created` handler (line 154) to catch PostgreSQL error code 23505
- [ ] 3.3 Add error handling logic for duplicate email constraint violations
- [ ] 3.4 Return 409 Conflict response with clear error message
- [ ] 3.5 Log duplicate email attempts with structured logging
- [ ] 3.6 Update `user.updated` handler (line 223) with same error handling
- [ ] 3.7 Add JSDoc comments explaining error handling strategy

## 4. Testing

- [ ] 4.1 Verify Clerk prevents duplicate email signups in Clerk Dashboard
- [ ] 4.2 Apply migration to local database
- [ ] 4.3 Attempt to insert duplicate email via SQL (should fail with error code 23505)
- [ ] 4.4 Test webhook handler with simulated duplicate email scenario
- [ ] 4.5 Verify 409 Conflict response is returned
- [ ] 4.6 Check application logs for duplicate email entries
- [ ] 4.7 Verify NULL emails are allowed (multiple NULLs)
- [ ] 4.8 Test rollback migration to ensure safe reversion

## 5. Documentation

- [ ] 5.1 Update `CLAUDE.md` Database Integration section
- [ ] 5.2 Document that Clerk is source of truth for email uniqueness
- [ ] 5.3 Document database constraint as defense-in-depth measure
- [ ] 5.4 Add troubleshooting section for duplicate email errors
- [ ] 5.5 Document Clerk Dashboard restriction settings

## 6. Validation

- [ ] 6.1 Run `openspec validate verify-clerk-email-settings --strict`
- [ ] 6.2 Fix any validation errors
- [ ] 6.3 Review proposal with team for approval
- [ ] 6.4 Get approval before proceeding to production deployment

## 7. Deployment

- [ ] 7.1 Apply migration to staging database
- [ ] 7.2 Monitor staging environment for 24 hours
- [ ] 7.3 Apply migration to production database during low-traffic window
- [ ] 7.4 Monitor error logs for 48 hours post-deployment
- [ ] 7.5 Verify no duplicate email attempts in logs
