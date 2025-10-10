# User Sync Specification Deltas

## ADDED Requirements

### Requirement: Email Uniqueness Enforcement

The system SHALL enforce email address uniqueness at the database level for all non-NULL email values in the `users` table.

**Constraint Type**: PostgreSQL partial unique index on `users.email WHERE email IS NOT NULL`

**Behavior**:

- Non-NULL email addresses SHALL be unique across all user records
- NULL email values SHALL NOT participate in uniqueness checking (multiple NULLs allowed)
- Attempts to insert or update a user with a duplicate non-NULL email SHALL fail with PostgreSQL error code `23505`
- The constraint name SHALL be `idx_users_email_unique` for error handling reference

#### Scenario: Successful user creation with unique email

- **GIVEN** no existing user has email "user@example.com"
- **WHEN** a new user is created with email "user@example.com"
- **THEN** the user record SHALL be created successfully
- **AND** the email SHALL be stored in the `users` table

#### Scenario: Duplicate email insert attempt fails

- **GIVEN** a user exists with email "user@example.com"
- **WHEN** attempting to insert a new user with email "user@example.com"
- **THEN** the database SHALL reject the insert with error code `23505`
- **AND** the constraint name in the error SHALL be `idx_users_email_unique`

#### Scenario: Duplicate email update attempt fails

- **GIVEN** user A has email "alice@example.com"
- **AND** user B has email "bob@example.com"
- **WHEN** attempting to update user B's email to "alice@example.com"
- **THEN** the database SHALL reject the update with error code `23505`

#### Scenario: Multiple NULL emails are allowed

- **GIVEN** user A has email NULL
- **WHEN** creating user B with email NULL
- **THEN** both users SHALL exist in the database
- **AND** no uniqueness constraint violation SHALL occur

#### Scenario: Updating NULL to non-NULL unique email succeeds

- **GIVEN** user A has email NULL
- **AND** no user has email "newuser@example.com"
- **WHEN** updating user A's email to "newuser@example.com"
- **THEN** the update SHALL succeed
- **AND** user A's email SHALL be "newuser@example.com"

### Requirement: Webhook Duplicate Email Handling

The Clerk webhook handler SHALL gracefully handle email uniqueness constraint violations without causing webhook failures.

**Error Detection**: Catch PostgreSQL error code `23505` with constraint `idx_users_email_unique`

**Response Behavior**:

- Log the conflict with user details (clerk_id, email)
- Return HTTP 409 Conflict status with actionable error message
- Include suggestion to contact support
- Do NOT retry the operation automatically

#### Scenario: Webhook receives duplicate email for new user

- **GIVEN** a user exists with email "duplicate@example.com"
- **WHEN** Clerk webhook sends `user.created` event with email "duplicate@example.com" and different clerk_id
- **THEN** the webhook handler SHALL catch the unique constraint violation
- **AND** return HTTP 409 with error message "Email already exists"
- **AND** log the conflict event with both clerk_ids

#### Scenario: Webhook receives duplicate email for user update

- **GIVEN** user A has email "original@example.com"
- **AND** user B has email "existing@example.com"
- **WHEN** Clerk webhook sends `user.updated` event changing user A's email to "existing@example.com"
- **THEN** the webhook handler SHALL catch the unique constraint violation
- **AND** return HTTP 409 with error message "Email already exists"
- **AND** user A's email SHALL remain "original@example.com"

#### Scenario: Webhook with unique email succeeds normally

- **GIVEN** no user has email "newuser@example.com"
- **WHEN** Clerk webhook sends `user.created` event with email "newuser@example.com"
- **THEN** the webhook SHALL process successfully
- **AND** return HTTP 200
- **AND** create the user record with the email

#### Scenario: Webhook error response includes actionable guidance

- **GIVEN** a duplicate email constraint violation occurs
- **WHEN** the webhook handler constructs the error response
- **THEN** the response SHALL include HTTP status 409
- **AND** the response body SHALL contain field "error" with value "Email already exists"
- **AND** the response body SHALL contain field "message" with user-friendly explanation
- **AND** the response body SHALL contain field "suggestion" with support contact guidance

### Requirement: Manual Sync Duplicate Email Handling

The manual user sync endpoint SHALL gracefully handle email uniqueness constraint violations with clear error messages.

**Error Detection**: Catch PostgreSQL error code `23505` with constraint `idx_users_email_unique`

**Response Behavior**:

- Return HTTP 409 Conflict status
- Provide user-friendly error message explaining the conflict
- Include actionable next steps for the user
- Log the conflict for administrator investigation

#### Scenario: Manual sync with duplicate email fails gracefully

- **GIVEN** a user exists with email "existing@example.com"
- **AND** authenticated user attempts to sync with email "existing@example.com"
- **WHEN** calling POST /api/user/sync
- **THEN** the endpoint SHALL return HTTP 409
- **AND** the response SHALL include error "Email already exists"
- **AND** the response SHALL include suggestion to contact support

#### Scenario: Manual sync with unique email succeeds

- **GIVEN** no user has email "newuser@example.com"
- **AND** authenticated user's Clerk profile has email "newuser@example.com"
- **WHEN** calling POST /api/user/sync
- **THEN** the endpoint SHALL return HTTP 200
- **AND** the user record SHALL be created/updated with the email
- **AND** the response SHALL include success confirmation

#### Scenario: Manual sync logs duplicate email attempts

- **GIVEN** a duplicate email constraint violation occurs during sync
- **WHEN** the error handler catches the violation
- **THEN** the system SHALL log an error with severity "error"
- **AND** the log SHALL include the conflicting email address
- **AND** the log SHALL include the user's clerk_id
- **AND** the log SHALL include timestamp for audit trail

### Requirement: Migration Idempotency and Verification

The email uniqueness migration SHALL be idempotent and include self-verification of successful constraint creation.

**Idempotency**: Migration can be run multiple times without errors using `IF NOT EXISTS` clause

**Verification**: Migration includes PostgreSQL procedural block to verify constraint creation

**Reporting**: Migration outputs success or failure status via RAISE NOTICE/WARNING

#### Scenario: First migration run creates constraint

- **GIVEN** the `idx_users_email_unique` constraint does not exist
- **WHEN** running migration `003_add_email_unique_constraint.sql`
- **THEN** the constraint SHALL be created successfully
- **AND** verification query SHALL report success via RAISE NOTICE
- **AND** `\d users` SHALL show the unique index

#### Scenario: Second migration run is idempotent

- **GIVEN** the `idx_users_email_unique` constraint already exists
- **WHEN** running migration `003_add_email_unique_constraint.sql` again
- **THEN** the migration SHALL complete without errors
- **AND** verification query SHALL report success via RAISE NOTICE
- **AND** the constraint SHALL remain unchanged

#### Scenario: Migration verification detects creation failure

- **GIVEN** constraint creation fails for any reason
- **WHEN** the verification block queries for the constraint
- **THEN** the verification SHALL report failure via RAISE WARNING
- **AND** administrators SHALL be alerted to investigate

### Requirement: Rollback Migration Safety

The system SHALL provide a safe rollback migration that removes the email uniqueness constraint without data loss.

**Rollback Operation**: Drop the unique index using `IF EXISTS` clause

**Data Preservation**: Rollback does NOT modify any user data

**Verification**: Rollback includes verification that constraint is removed

#### Scenario: Rollback removes constraint successfully

- **GIVEN** the `idx_users_email_unique` constraint exists
- **WHEN** running rollback migration `rollback_003_add_email_unique_constraint.sql`
- **THEN** the constraint SHALL be dropped
- **AND** `\d users` SHALL NOT show the unique index
- **AND** all user data SHALL remain unchanged

#### Scenario: Rollback is idempotent

- **GIVEN** the `idx_users_email_unique` constraint does not exist
- **WHEN** running rollback migration
- **THEN** the rollback SHALL complete without errors
- **AND** no changes SHALL be made to the database

#### Scenario: After rollback, duplicate emails are allowed

- **GIVEN** rollback migration has been executed
- **AND** a user exists with email "duplicate@example.com"
- **WHEN** attempting to insert another user with email "duplicate@example.com"
- **THEN** the insert SHALL succeed
- **AND** two users SHALL exist with the same email

### Requirement: Database Trigger Audit Logging

The system SHALL automatically log all duplicate email attempts to a dedicated `user_sync_audit` table using PostgreSQL triggers.

**Audit Table**: `user_sync_audit` with fields: id, event_type, clerk_id, email, error_code, error_message, metadata, created_at

**Trigger Behavior**:

- Executes BEFORE INSERT or UPDATE operations on users table
- Logs attempts where email already exists for different clerk_id
- Captures metadata including operation type and timestamp
- Does NOT block the operation (constraint enforcement handles that)

**Retention**: Audit logs persist indefinitely for compliance and investigation

#### Scenario: Duplicate email attempt is logged to audit table

- **GIVEN** a user exists with email "existing@example.com" and clerk_id "clerk_123"
- **WHEN** attempting to insert a new user with email "existing@example.com" and clerk_id "clerk_456"
- **THEN** a record SHALL be inserted into `user_sync_audit` table
- **AND** the audit record SHALL contain event_type "duplicate_email_attempt"
- **AND** the audit record SHALL contain clerk_id "clerk_456"
- **AND** the audit record SHALL contain email "existing@example.com"
- **AND** the audit record SHALL contain error_code "23505"

#### Scenario: Audit log captures operation metadata

- **GIVEN** a duplicate email attempt occurs via INSERT operation
- **WHEN** the trigger function logs the attempt
- **THEN** the metadata field SHALL contain a JSON object
- **AND** the JSON SHALL include "operation" field with value "INSERT"
- **AND** the JSON SHALL include "table" field with value "users"
- **AND** the JSON SHALL include "attempted_at" timestamp

#### Scenario: Audit table allows admin investigation

- **GIVEN** multiple duplicate email attempts have been logged
- **WHEN** admin queries `SELECT * FROM user_sync_audit WHERE event_type = 'duplicate_email_attempt'`
- **THEN** all logged attempts SHALL be returned with timestamps
- **AND** results SHALL be ordered by created_at for timeline analysis
- **AND** admin can identify patterns (e.g., same email attempted multiple times)

#### Scenario: Trigger logs update operations

- **GIVEN** user A has email "alice@example.com"
- **AND** user B has email "bob@example.com"
- **WHEN** attempting to UPDATE user B's email to "alice@example.com"
- **THEN** a record SHALL be inserted into `user_sync_audit`
- **AND** the metadata SHALL indicate operation "UPDATE"

### Requirement: Admin Notification for Duplicate Emails

The system SHALL notify administrators when duplicate email conflicts occur using structured logging with high severity.

**Notification Method**: Structured log entries with severity "error" and category "user_sync"

**Log Fields**: clerk_id, email, timestamp, severity (high), category (user_sync)

**Purpose**: Enable admin monitoring dashboards and alerts to detect integration issues

#### Scenario: Duplicate email triggers admin notification

- **GIVEN** a duplicate email constraint violation occurs during webhook processing
- **WHEN** the webhook handler catches the error
- **THEN** a log entry SHALL be created with severity "error"
- **AND** the log SHALL include category "user_sync"
- **AND** the log SHALL include both clerk_ids (existing and attempted)
- **AND** the log SHALL include the duplicate email address
- **AND** the log message SHALL indicate "Admin Action Required: Duplicate Email"

#### Scenario: Admin can filter duplicate notifications

- **GIVEN** multiple types of errors are being logged
- **WHEN** admin filters logs by category "user_sync" and severity "error"
- **THEN** only duplicate email conflicts SHALL be returned
- **AND** admin can identify frequency and patterns

#### Scenario: Notification includes actionable context

- **GIVEN** a duplicate email notification is logged
- **WHEN** admin views the log entry
- **THEN** the entry SHALL include the conflicting email address
- **AND** the entry SHALL include the clerk_id that attempted the duplicate
- **AND** the entry SHALL include timestamp for temporal analysis
- **AND** admin has sufficient context to investigate in Clerk dashboard

### Requirement: User Dashboard Sync Status Alert

The system SHALL display a visible alert in the user dashboard when profile synchronization fails due to email conflicts.

**Alert Display Conditions**: Show when user exists in Clerk but not in Supabase users table

**Alert Message**: "Profile sync incomplete. Please contact support."

**Alert Placement**: Dashboard page, visible immediately upon login

**Alert Dismissal**: Persistent (non-dismissible) until sync succeeds

#### Scenario: Dashboard shows alert for failed sync

- **GIVEN** a user is authenticated in Clerk with clerk_id "clerk_123"
- **AND** no record exists in Supabase users table for clerk_id "clerk_123"
- **WHEN** user navigates to dashboard page
- **THEN** an alert SHALL be displayed with message "Profile sync incomplete. Please contact support."
- **AND** the alert SHALL be prominently visible (e.g., top of dashboard)

#### Scenario: Dashboard alert disappears after successful sync

- **GIVEN** a user previously had failed sync with alert displayed
- **AND** sync has now completed successfully
- **WHEN** user refreshes dashboard page
- **THEN** the alert SHALL NOT be displayed
- **AND** user sees normal dashboard content

#### Scenario: Sync status check is performant

- **GIVEN** a user loads the dashboard
- **WHEN** the system checks sync status
- **THEN** the query SHALL complete in less than 100ms
- **AND** use indexed lookup on clerk_id for performance

#### Scenario: Alert provides clear next steps

- **GIVEN** a user sees the sync failure alert
- **WHEN** user reads the message
- **THEN** the message SHALL clearly indicate the problem (sync incomplete)
- **AND** the message SHALL provide actionable next step (contact support)
- **AND** optionally include support contact information or link

## MODIFIED Requirements

_None - This is a new capability with only ADDED requirements_

## REMOVED Requirements

_None - This change does not remove any existing functionality_
