# user-sync Specification

## Purpose

TBD - created by archiving change verify-clerk-email-settings. Update Purpose after archive.

## Requirements

### Requirement: Basic Email Uniqueness Enforcement

The system SHALL enforce email address uniqueness at the database level for all non-NULL email values in the `users` table, serving as defense-in-depth alongside Clerk's authentication-layer enforcement.

**Rationale**: While Clerk prevents duplicate emails during signup and authentication, database-level enforcement protects against edge cases including direct database operations, race conditions during concurrent webhook processing, and potential integration bugs.

**Implementation**:

- Partial unique index allowing multiple NULL values but enforcing uniqueness for non-NULL emails
- Constraint name: `idx_users_email_unique` for consistent error handling
- PostgreSQL error code `23505` indicates uniqueness violation

**Acceptance Criteria**:

- Non-NULL email addresses SHALL be unique across all user records
- NULL email values SHALL NOT participate in uniqueness checking (multiple NULLs allowed)
- Attempts to insert or update a user with duplicate non-NULL email SHALL fail with error code `23505`
- The constraint name SHALL be `idx_users_email_unique` for application-level error detection

#### Scenario: Duplicate non-NULL email insert fails

- **GIVEN** a user exists with email "<user@example.com>"
- **WHEN** attempting to insert another user with email "<user@example.com>"
- **THEN** the database SHALL reject the insert with PostgreSQL error code `23505`
- **AND** the constraint name in the error SHALL be `idx_users_email_unique`

#### Scenario: Duplicate non-NULL email update fails

- **GIVEN** a user A with email "<usera@example.com>"
- **AND** a user B with email "<userb@example.com>"
- **WHEN** attempting to update user B's email to "<usera@example.com>"
- **THEN** the database SHALL reject the update with error code `23505`

#### Scenario: Multiple NULL emails are allowed

- **GIVEN** a user exists with NULL email
- **WHEN** inserting another user with NULL email
- **THEN** the insert SHALL succeed
- **AND** both users SHALL have NULL email values

#### Scenario: Idempotent migration execution

- **GIVEN** the migration `003_clerk_email_verification.sql` has been applied
- **WHEN** running the migration again
- **THEN** the migration SHALL complete successfully without errors
- **AND** the constraint SHALL remain in place

### Requirement: Webhook Duplicate Email Handling

The Clerk webhook handler SHALL gracefully handle email uniqueness constraint violations without causing webhook failures or service disruption.

**Rationale**: Webhook processing failures can cause Clerk to retry events repeatedly, creating noise in logs and potentially triggering rate limits. Graceful error handling ensures system stability while providing clear diagnostic information.

**Error Detection**:

- Catch PostgreSQL error code `23505` from Supabase client
- Check constraint name matches `idx_users_email_unique`

**Response Strategy**:

- Return HTTP 409 Conflict (not 500 Internal Server Error)
- Provide user-friendly error message explaining duplicate email
- Log error with structured data for monitoring

**Acceptance Criteria**:

- Webhook SHALL return 409 status code when duplicate email detected
- Webhook SHALL NOT throw unhandled exceptions
- Error logs SHALL include Clerk user ID and email address
- Webhook SHALL return within 5 seconds even with error

#### Scenario: User creation with duplicate email returns 409

- **GIVEN** a user exists in Supabase with email "<user@example.com>"
- **WHEN** webhook receives `user.created` event with same email "<user@example.com>"
- **THEN** the webhook SHALL return HTTP 409 Conflict
- **AND** the response body SHALL contain error message "Email already exists"
- **AND** the error SHALL be logged with level "error"

#### Scenario: User update with duplicate email returns 409

- **GIVEN** user A exists with email "<usera@example.com>"
- **AND** user B exists with email "<userb@example.com>"
- **WHEN** webhook receives `user.updated` event changing user B's email to "<usera@example.com>"
- **THEN** the webhook SHALL return HTTP 409 Conflict
- **AND** the error SHALL be logged with both Clerk IDs

#### Scenario: Duplicate email error is logged

- **GIVEN** a duplicate email constraint violation occurs
- **WHEN** the webhook processes the event
- **THEN** a log entry SHALL be created with:
  - Level: "error"
  - Message containing "duplicate email" or "email already exists"
  - Clerk user ID
  - Email address that caused the conflict
  - Timestamp

### Requirement: Migration Idempotency

The email uniqueness migration SHALL be idempotent and safe to run multiple times without causing errors or data loss.

**Rationale**: Idempotent migrations prevent deployment failures in CI/CD pipelines and allow safe re-execution during troubleshooting or rollback scenarios.

**Implementation**:

- Use `CREATE UNIQUE INDEX IF NOT EXISTS` syntax
- Include verification query to confirm constraint creation
- Provide clear success/failure notices
- Safe rollback script using `DROP INDEX IF EXISTS`

**Acceptance Criteria**:

- Running migration multiple times SHALL NOT cause errors
- Verification query SHALL confirm constraint exists after migration
- Rollback SHALL safely remove constraint without data loss

#### Scenario: First migration run creates constraint

- **GIVEN** the `idx_users_email_unique` constraint does not exist
- **WHEN** running migration `003_clerk_email_verification.sql`
- **THEN** the constraint SHALL be created successfully
- **AND** verification query SHALL return success notice

#### Scenario: Subsequent migration runs are no-ops

- **GIVEN** the `idx_users_email_unique` constraint already exists
- **WHEN** running migration `003_clerk_email_verification.sql` again
- **THEN** the migration SHALL complete without errors
- **AND** the constraint SHALL remain unchanged

#### Scenario: Rollback removes constraint safely

- **GIVEN** the `idx_users_email_unique` constraint exists
- **WHEN** running rollback migration `rollback_003_clerk_email_verification.sql`
- **THEN** the constraint SHALL be dropped
- **AND** no user data SHALL be modified or deleted
- **AND** subsequent duplicate email inserts SHALL succeed
