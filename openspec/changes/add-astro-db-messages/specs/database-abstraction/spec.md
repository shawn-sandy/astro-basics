# Database Abstraction - Spec Delta

## MODIFIED Requirements

### Requirement: Message Database Provider Enforcement

The database abstraction layer SHALL enforce Turso as the exclusive provider for message operations, removing multi-provider complexity.

**Modified from multi-provider support to Turso-only enforcement:**

#### Scenario: Turso-only message operations

- **WHEN** any message operation is requested (insert, get, update, archive)
- **THEN** the system SHALL use `TursoDatabase` class exclusively
- **AND** no provider selection logic SHALL be applied for messages

#### Scenario: Turso configuration validation

- **WHEN** the application starts
- **THEN** the system SHALL validate presence of `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- **AND** SHALL throw descriptive error if Turso credentials are missing
- **AND** error message SHALL include setup instructions with next steps

### Requirement: Simplified Provider Detection

The provider detection system SHALL focus on determining available providers for non-message operations only, simplifying the abstraction layer.

**Modified to exclude messages from provider selection logic:**

#### Scenario: Provider detection for non-message operations

- **WHEN** `detectDatabaseProviders()` is called
- **THEN** the system SHALL check Supabase configuration for users/orgs/comments
- **AND** SHALL NOT perform provider detection for message operations
- **AND** SHALL return detection results excluding message storage concerns

#### Scenario: Database instance factory simplified

- **WHEN** `getDatabase()` is called for message operations
- **THEN** the function SHALL return a `TursoDatabase` instance directly
- **AND** SHALL NOT check `DATABASE_PROVIDER` environment variable
- **AND** SHALL validate Turso configuration before returning instance

### Requirement: Enhanced Error Diagnostics

The Turso database implementation SHALL provide comprehensive error diagnostics to improve developer experience and reduce troubleshooting time.

**New requirement added for Turso standardization:**

#### Scenario: Connection failure diagnostics

- **WHEN** Turso connection fails
- **THEN** error message SHALL indicate specific failure reason (invalid URL, auth token, network)
- **AND** SHALL provide actionable next steps (check credentials, verify network, contact support)
- **AND** SHALL include relevant environment variable names in error message

#### Scenario: Query failure diagnostics

- **WHEN** a Turso query fails
- **THEN** error SHALL include query context (operation type, affected table)
- **AND** SHALL log query details for debugging (excluding sensitive data)
- **AND** SHALL suggest common fixes (schema mismatch, constraint violation, etc.)

## ADDED Requirements

### Requirement: Turso Connection Health Monitoring

The system SHALL provide connection health monitoring for Turso database to enable proactive issue detection.

#### Scenario: Connection health check

- **WHEN** `isConfigured()` is called on `TursoDatabase` instance
- **THEN** the system SHALL verify connection credentials exist
- **AND** SHALL optionally perform connectivity test if requested
- **AND** SHALL return detailed health status (connected, credentials missing, network error)

#### Scenario: Automatic retry with exponential backoff

- **WHEN** a Turso operation encounters a transient failure
- **THEN** the system SHALL retry with exponential backoff (100ms, 200ms, 400ms)
- **AND** SHALL log retry attempts for monitoring
- **AND** SHALL fail after 3 attempts with comprehensive error message

### Requirement: Migration Tooling Support

The database abstraction layer SHALL support safe migration from Supabase messages to Turso messages with data integrity guarantees.

#### Scenario: Export messages from Supabase

- **WHEN** migration export is initiated
- **THEN** all messages SHALL be exported to JSON intermediate format
- **AND** export SHALL include all message fields defined in `Message` interface
- **AND** export SHALL validate data integrity with checksums

#### Scenario: Import messages to Turso

- **WHEN** migration import is initiated
- **THEN** JSON data SHALL be validated against Turso schema
- **AND** import SHALL be idempotent (safe to re-run without duplicates)
- **AND** import SHALL report progress for datasets >1000 messages
- **AND** import SHALL create backup before executing

#### Scenario: Dry-run migration preview

- **WHEN** migration is run in dry-run mode
- **THEN** the system SHALL validate data without making changes
- **AND** SHALL report schema compatibility issues
- **AND** SHALL estimate migration duration based on data volume

### Requirement: Query Performance Logging

The Turso implementation SHALL log query performance metrics to enable optimization.

#### Scenario: Query duration tracking

- **WHEN** a Turso query executes
- **THEN** execution duration SHALL be measured
- **AND** slow queries (>100ms) SHALL be logged with details
- **AND** query patterns SHALL be available for analysis

#### Scenario: Performance metrics aggregation

- **WHEN** performance data is collected
- **THEN** metrics SHALL include P50, P95, P99 latencies
- **AND** metrics SHALL be segmented by operation type (insert, select, update, delete)
- **AND** metrics SHALL be exportable for dashboard visualization

## REMOVED Requirements

### Requirement: Multi-Provider Message Support (REMOVED)

The requirement to support multiple database providers (Supabase, Turso, Astro DB) for message storage has been removed in favor of Turso-only standardization.

**Rationale:** Dual-provider support added unnecessary complexity without measurable benefits. Turso's edge distribution and production readiness make it the optimal choice for message storage.

### Requirement: DATABASE_PROVIDER for Messages (REMOVED)

The `DATABASE_PROVIDER` environment variable no longer controls message storage provider selection.

**Rationale:** Since Turso is the only provider for messages, environment variable selection is unnecessary. This simplifies configuration and reduces potential for misconfiguration.

### Requirement: Provider Switching Runtime Support (REMOVED)

The ability to switch message providers at runtime has been removed.

**Rationale:** Runtime provider switching added complexity and testing overhead. Turso standardization provides a single, well-tested path for message operations.

## UNCHANGED Requirements

The following requirements remain unchanged from the original database abstraction specification:

- **Database Interface Contract**: The `Database` interface continues to define message operations (insertMessage, getMessages, etc.)
- **Type Safety**: TypeScript interfaces ensure compile-time validation of database operations
- **Message Data Structure**: The `Message` interface in `database-types.ts` remains the canonical schema definition
- **Error Handling**: Database operations continue to use Promise-based error handling with typed errors

## Migration Impact

### For Existing Code

- **API Consumers**: No changes required; `getDatabase()` continues to return a `Database` interface implementation
- **Tests**: Multi-provider message tests should be removed; Turso-only tests should be added
- **Configuration**: Projects must set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (Supabase variables no longer used for messages)

### For New Features

- **Message Operations**: Always use `TursoDatabase` directly or via `getDatabase()` (both return Turso instance)
- **Provider Selection**: No provider selection needed for messages; Turso is always used
- **Error Handling**: Leverage enhanced error diagnostics for better debugging

## Validation Criteria

- [ ] All message operations use TursoDatabase exclusively
- [ ] No runtime provider selection logic exists for messages
- [ ] Turso connection validation provides actionable error messages
- [ ] Migration tooling successfully transfers data from Supabase to Turso
- [ ] Query performance logging identifies optimization opportunities
- [ ] Retry logic handles transient failures gracefully
- [ ] Documentation clearly explains Turso-only architecture
