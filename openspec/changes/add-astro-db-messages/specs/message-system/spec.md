# Message System - Spec Delta

## MODIFIED Requirements

### Requirement: Message Storage Backend

The message system SHALL use Turso (LibSQL) as the exclusive storage backend for all message operations.

**Modified from multi-provider support to Turso-only enforcement:**

#### Scenario: Turso as message storage

- **WHEN** any message operation is performed (create, read, update, archive)
- **THEN** the operation SHALL execute against Turso database exclusively
- **AND** no provider selection or fallback logic SHALL be invoked
- **AND** the unified `Message` interface SHALL ensure type safety

#### Scenario: Message data persistence

- **WHEN** a message is inserted via `insertMessage()`
- **THEN** the message SHALL be stored in Turso's messages table
- **AND** all fields from `MessageData` interface SHALL be persisted
- **AND** auto-generated fields (id, created_at, updated_at) SHALL be handled by Turso

### Requirement: Turso Schema Management

The message system SHALL maintain a well-defined Turso schema with proper indexing and constraints.

**New requirement for Turso standardization:**

#### Scenario: Messages table schema

- **WHEN** Turso database is initialized
- **THEN** messages table SHALL be created with all fields from `Message` interface
- **AND** primary key SHALL be defined on id field (auto-increment)
- **AND** indexes SHALL exist on created_at, is_read, and is_archived for query performance
- **AND** NOT NULL constraints SHALL be enforced on required fields

#### Scenario: Schema migration versioning

- **WHEN** schema changes are required
- **THEN** changes SHALL be tracked in versioned migration files
- **AND** migration files SHALL be idempotent (safe to re-run)
- **AND** rollback scripts SHALL exist for each migration

## ADDED Requirements

### Requirement: Enhanced Turso Message Operations

The message system SHALL provide optimized Turso-specific implementations for all message operations with comprehensive error handling.

#### Scenario: Efficient message retrieval

- **WHEN** `getMessages()` is called with filter options
- **THEN** Turso query SHALL use appropriate indexes for performance
- **AND** pagination SHALL be implemented efficiently with LIMIT/OFFSET
- **AND** results SHALL be ordered by created_at DESC by default
- **AND** query execution SHALL complete within 100ms (P95)

#### Scenario: Bulk message operations

- **WHEN** multiple messages need to be updated (e.g., mark all as read)
- **THEN** operations SHALL use Turso's batch update capabilities
- **AND** transactions SHALL be used to ensure atomicity
- **AND** progress SHALL be reported for operations affecting >100 messages

#### Scenario: Message archival with soft delete

- **WHEN** `archiveMessage(id)` is called
- **THEN** the message SHALL be marked as archived (is_archived = true)
- **AND** the message SHALL remain in the database (soft delete)
- **AND** updated_at timestamp SHALL be updated
- **AND** archived messages SHALL be excluded from default queries

### Requirement: Turso Development Tooling

The message system SHALL provide comprehensive tooling for Turso database operations during development.

#### Scenario: Interactive database shell

- **WHEN** developer runs `npm run db:turso:shell`
- **THEN** Turso CLI SHALL open interactive SQL shell
- **AND** developer SHALL be able to query messages table directly
- **AND** changes SHALL be reflected immediately in development environment

#### Scenario: Schema inspection

- **WHEN** developer runs `npm run db:turso:inspect`
- **THEN** complete schema definition SHALL be displayed
- **AND** indexes, constraints, and triggers SHALL be listed
- **AND** table statistics (row count, size) SHALL be shown

#### Scenario: Seed data management

- **WHEN** developer runs `npm run db:seed`
- **THEN** Turso messages table SHALL be populated with test data
- **AND** seed data SHALL include variety of message states
- **AND** existing data SHALL be preserved (idempotent seeding)

### Requirement: Turso-Specific Performance Optimization

The message system SHALL leverage Turso's edge distribution capabilities for optimal global performance.

#### Scenario: Edge replica utilization

- **WHEN** messages are queried from geographically distributed locations
- **THEN** Turso SHALL serve reads from nearest edge replica
- **AND** latency SHALL be <50ms for P95 of global requests
- **AND** replica lag SHALL not exceed 100ms

#### Scenario: Read/write separation

- **WHEN** message read operations occur
- **THEN** queries SHALL utilize Turso read replicas when available
- **AND** write operations SHALL go to primary database
- **AND** replication SHALL be monitored for consistency

### Requirement: Migration from Supabase Messages

The message system SHALL support safe migration from existing Supabase message storage to Turso.

#### Scenario: Complete data migration

- **WHEN** migration script is executed
- **THEN** all existing messages SHALL be exported from Supabase
- **AND** data SHALL be validated against expected schema
- **AND** messages SHALL be imported to Turso with integrity checks
- **AND** data checksums SHALL match before and after migration
- **AND** zero data loss SHALL be guaranteed

#### Scenario: Migration rollback support

- **WHEN** migration encounters errors
- **THEN** automatic backup SHALL be created before import
- **AND** rollback procedure SHALL restore Supabase as message provider
- **AND** application SHALL continue functioning with Supabase
- **AND** detailed error logs SHALL be available for debugging

#### Scenario: Dry-run validation

- **WHEN** migration is run in dry-run mode
- **THEN** all validation checks SHALL execute without data changes
- **AND** schema compatibility SHALL be verified
- **AND** estimated migration time SHALL be calculated
- **AND** potential issues SHALL be reported before actual migration

## REMOVED Requirements

### Requirement: Multi-Provider Message Storage (REMOVED)

The requirement to support multiple database backends (Supabase, Turso, Astro DB) for messages has been removed.

**Rationale:** Turso's edge distribution, production reliability, and performance characteristics make it the optimal choice for message storage. Supporting multiple providers added complexity without commensurate benefits.

### Requirement: Astro DB Integration (REMOVED)

The planned Astro DB integration for messages has been removed in favor of Turso standardization.

**Rationale:** Turso provides superior production tooling, maturity, and operational experience. Astro DB would introduce another technology to maintain without clear advantages over Turso.

### Requirement: Database Provider Selection for Messages (REMOVED)

The environment variable-based provider selection for messages has been removed.

**Rationale:** With Turso as the exclusive provider, selection logic is unnecessary and potentially confusing. Configuration is simplified to just Turso credentials.

## UNCHANGED Requirements

The following requirements remain unchanged from the original message system specification:

- **Message Interface**: The `Message` TypeScript interface continues to define the canonical data structure
- **CRUD Operations**: Create, Read, Update, Delete operations maintain their existing API contracts
- **Pagination Support**: Message retrieval continues to support limit/offset pagination
- **Filter Capabilities**: Filtering by is_read, is_archived, and date ranges remains supported
- **API Endpoints**: The `/api/messages` endpoint structure remains unchanged
- **Type Safety**: All operations maintain strict TypeScript type checking

## Migration Impact

### For Existing Deployments

**Projects using Supabase for messages:**

1. Run migration assessment to determine data volume
2. Execute migration script during maintenance window
3. Validate data integrity post-migration
4. Update environment variables to use Turso credentials
5. Monitor performance for 48 hours post-migration

**Projects using Turso for messages:**

- No migration required
- May benefit from enhanced error handling and performance logging
- Should apply schema migrations to add new indexes

### For New Deployments

- Set up Turso database using interactive wizard (`npm run db:turso:setup`)
- Configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables
- Run schema migrations (`npm run db:migrate:turso`)
- Seed test data if desired (`npm run db:seed`)
- Messages work immediately with no provider selection required

## Performance Targets

The Turso-based message system SHALL meet or exceed these performance benchmarks:

- **Message Insertion**: <50ms (P95)
- **Message Retrieval (paginated)**: <100ms (P95)
- **Message Update**: <50ms (P95)
- **Bulk Operations (100 messages)**: <500ms (P95)
- **Global Read Latency**: <50ms (P95) via edge replicas
- **Database Availability**: 99.9% uptime SLA

## Monitoring and Observability

### Required Metrics

- Message operation latency (P50, P95, P99)
- Error rate per operation type
- Turso connection pool utilization
- Query execution time distribution
- Replica lag (for edge distribution)

### Alerting Thresholds

- Error rate >1% triggers warning
- P95 latency >200ms triggers investigation
- Connection failures >5 in 5 minutes triggers alert
- Replica lag >500ms triggers warning

## Validation Criteria

- [ ] All message operations execute against Turso exclusively
- [ ] No multi-provider selection logic exists in codebase
- [ ] Schema migrations are versioned and idempotent
- [ ] Migration script successfully transfers data from Supabase
- [ ] Performance targets are met in production environment
- [ ] Monitoring and alerting are operational
- [ ] Documentation accurately reflects Turso-only architecture
- [ ] Developer tooling (shell, inspect, seed) functions correctly
- [ ] Edge replicas reduce global latency as expected
- [ ] Rollback procedures are tested and documented

## Future Enhancements

The following enhancements may be considered in future iterations:

1. **Real-time message subscriptions** - Leverage Turso's change data capture for live updates
2. **Full-text search** - Add FTS5 indexing for message content search
3. **Message threading** - Support parent-child message relationships
4. **Attachment support** - Store message attachments with references to object storage
5. **Message templates** - Provide reusable message templates for common scenarios
6. **Analytics dashboard** - Visualize message metrics and trends over time

These enhancements should maintain Turso as the exclusive storage backend while adding new capabilities on top of the established foundation.
