# Database Migration Specification - Delta

## ADDED Requirements

### Requirement: Core Schema Consolidation

Database migrations SHALL consolidate logically-related constraints and indexes into the core schema migration where the parent table is defined, rather than fragmenting them across multiple migration files.

**Rationale:** Email uniqueness is an intrinsic property of the users table and should be defined alongside the table creation for better schema comprehension and simplified setup.

#### Scenario: Email uniqueness in core schema

- **GIVEN** a fresh database installation
- **WHEN** migration 001_core_schema.sql is applied
- **THEN** the users table SHALL be created with a partial unique index on email
- **AND** the index SHALL allow multiple NULL values
- **AND** the index SHALL prevent duplicate non-NULL email addresses

#### Scenario: Idempotent constraint creation

- **GIVEN** migration 004 has already applied the email uniqueness constraint
- **WHEN** migration 001 is re-applied or updated
- **THEN** the constraint creation SHALL check for existence using IF NOT EXISTS
- **AND** no duplicate constraint SHALL be created
- **AND** no error SHALL be raised

#### Scenario: New installation path

- **GIVEN** a new database requiring user management
- **WHEN** setting up the database schema
- **THEN** only 2 migrations SHALL be required (001: core schema, 002: security policies)
- **AND** email uniqueness SHALL be enforced from the start
- **AND** all user table constraints SHALL be defined in a single migration

### Requirement: Migration Deprecation Documentation

Migration files that are superseded by consolidation SHALL be marked as deprecated with clear documentation explaining the new recommended approach for fresh installations.

**Rationale:** Preserves backward compatibility for existing deployments while guiding new installations toward the simplified path.

#### Scenario: Deprecated migration header

- **GIVEN** migration 004_clerk_email_verification.sql exists
- **WHEN** the file is opened by a developer
- **THEN** the header comment SHALL include a deprecation notice
- **AND** the notice SHALL reference migration 001 for new installations
- **AND** the notice SHALL confirm safe application for existing databases (idempotent)

#### Scenario: Documentation consistency

- **GIVEN** consolidated migrations are implemented
- **WHEN** CLAUDE.md is consulted for setup instructions
- **THEN** documentation SHALL list 2 migrations for fresh databases
- **AND** documentation SHALL explain migration 004 is for existing deployments only
- **AND** migration consolidation rationale SHALL be documented

### Requirement: Rollback Script Completeness

Rollback scripts SHALL include removal of all constraints, indexes, and objects created by the corresponding forward migration, including consolidated elements.

**Rationale:** Ensures clean rollback capability regardless of whether constraint was added via consolidated migration or separate migration.

#### Scenario: Core schema rollback includes email constraint

- **GIVEN** migration 001 includes email uniqueness constraint
- **WHEN** rollback_001_core_schema.sql is executed
- **THEN** the script SHALL drop idx_users_email_unique index
- **AND** the script SHALL use IF EXISTS to prevent errors
- **AND** rollback SHALL be idempotent and safe to run multiple times

#### Scenario: Rollback order independence

- **GIVEN** both migration 001 (with email constraint) and migration 004 exist
- **WHEN** rollback is required
- **THEN** rollback_001_core_schema.sql SHALL successfully remove the constraint
- **AND** rollback_004_clerk_email_verification.sql SHALL also successfully remove the constraint (if applied separately)
- **AND** neither rollback SHALL fail if constraint is already removed

### Requirement: Verification Section Updates

Migration verification sections SHALL validate the creation of all constraints and indexes defined within the migration, including consolidated elements.

**Rationale:** Ensures migration success is fully validated and issues are detected immediately.

#### Scenario: Email constraint verification in core schema

- **GIVEN** migration 001_core_schema.sql completes execution
- **WHEN** the verification section runs
- **THEN** existence of idx_users_email_unique SHALL be checked
- **AND** verification failure SHALL raise a WARNING or EXCEPTION
- **AND** success message SHALL confirm email uniqueness constraint is active

#### Scenario: Index count reporting

- **GIVEN** migration 001 creates 7 indexes (including email uniqueness)
- **WHEN** verification success message is displayed
- **THEN** the message SHALL report "7 indexes for performance (including email uniqueness)"
- **AND** the message SHALL be accurate and informative

## MODIFIED Requirements

None - This is a new capability specification for migration consolidation patterns.

## REMOVED Requirements

None - No existing requirements are removed by this change.

## RENAMED Requirements

None - No existing requirements are renamed by this change.
