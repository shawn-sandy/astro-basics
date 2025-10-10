# Database Schema Specification - Custom Role Tables

## ADDED Requirements

### Requirement: Custom Roles Table

The database SHALL include a `custom_roles` table to store organization-specific role definitions with core role mappings.

**Table Schema**:

```sql
CREATE TABLE custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  name text NOT NULL,
  description text,
  core_role_mapping user_role NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, name)
);
```

**Schema Rules**:

- `id` SHALL be auto-generated UUID primary key
- `organization_id` SHALL match Clerk organization ID from `organization_memberships` table
- `name` SHALL be unique per organization (case-insensitive via unique constraint)
- `core_role_mapping` SHALL reference existing `user_role` ENUM (member, admin, super_admin)
- `is_active` SHALL default to `true` for soft-delete support
- `created_by` SHALL reference user who created the role (nullable for system-created roles)
- Timestamps SHALL auto-populate on insert (`created_at`) and update (`updated_at`)

#### Scenario: Insert custom role with all required fields

- **GIVEN** organization "org_abc" and user "user_123" with org:admin role
- **WHEN** executing `INSERT INTO custom_roles (organization_id, name, core_role_mapping, created_by) VALUES ('org_abc', 'Moderator', 'admin', 'user_123')`
- **THEN** row SHALL be created with auto-generated UUID, `is_active=true`, and current timestamps

#### Scenario: Unique constraint prevents duplicate names in same org

- **GIVEN** existing custom role with `organization_id='org_abc'` and `name='Moderator'`
- **WHEN** attempting to insert another role with same `organization_id='org_abc'` and `name='Moderator'`
- **THEN** insert SHALL fail with unique constraint violation error

#### Scenario: Same role name allowed in different organizations

- **GIVEN** existing custom role with `organization_id='org_abc'` and `name='Moderator'`
- **WHEN** inserting role with `organization_id='org_xyz'` and `name='Moderator'`
- **THEN** insert SHALL succeed because unique constraint is scoped to (organization_id, name)

#### Scenario: Invalid core_role_mapping rejected

- **GIVEN** valid organization and user
- **WHEN** attempting to insert custom role with `core_role_mapping='invalid_role'`
- **THEN** insert SHALL fail because 'invalid_role' is not in user_role ENUM

#### Scenario: Soft delete via is_active flag

- **GIVEN** existing custom role with id "role_123"
- **WHEN** executing `UPDATE custom_roles SET is_active=false WHERE id='role_123'`
- **THEN** row SHALL be updated and excluded from active role queries

### Requirement: Role Permissions Table

The database SHALL include a `role_permissions` table to store many-to-many relationships between custom roles and permissions.

**Table Schema**:

```sql
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id uuid REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz DEFAULT now(),

  UNIQUE(custom_role_id, permission)
);
```

**Schema Rules**:

- `id` SHALL be auto-generated UUID primary key
- `custom_role_id` SHALL foreign key reference `custom_roles.id` with CASCADE delete
- `permission` SHALL be text in `resource:action` format (validated by application layer)
- Unique constraint SHALL prevent duplicate permissions per role
- CASCADE delete SHALL automatically remove permissions when role is deleted

#### Scenario: Insert permission for custom role

- **GIVEN** existing custom role with id "role_123"
- **WHEN** executing `INSERT INTO role_permissions (custom_role_id, permission) VALUES ('role_123', 'posts:delete')`
- **THEN** row SHALL be created with auto-generated UUID and current timestamp

#### Scenario: Unique constraint prevents duplicate permissions

- **GIVEN** existing permission with `custom_role_id='role_123'` and `permission='posts:delete'`
- **WHEN** attempting to insert another permission with same `custom_role_id='role_123'` and `permission='posts:delete'`
- **THEN** insert SHALL fail with unique constraint violation error

#### Scenario: CASCADE delete removes permissions when role deleted

- **GIVEN** custom role with id "role_123" has 5 permissions in `role_permissions` table
- **WHEN** executing `DELETE FROM custom_roles WHERE id='role_123'`
- **THEN** all 5 permission rows SHALL be automatically deleted via CASCADE

#### Scenario: Query all permissions for a role

- **GIVEN** custom role "role_123" has permissions ["posts:create", "posts:edit", "posts:delete"]
- **WHEN** executing `SELECT permission FROM role_permissions WHERE custom_role_id='role_123'`
- **THEN** query SHALL return all 3 permission strings

### Requirement: User Custom Roles Table

The database SHALL include a `user_custom_roles` table to store assignments of custom roles to users within organizations.

**Table Schema**:

```sql
CREATE TABLE user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  custom_role_id uuid REFERENCES custom_roles(id) ON DELETE CASCADE,
  organization_id text NOT NULL,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now(),

  UNIQUE(user_id, custom_role_id, organization_id)
);
```

**Schema Rules**:

- `id` SHALL be auto-generated UUID primary key
- `user_id` SHALL foreign key reference `users.id` with CASCADE delete
- `custom_role_id` SHALL foreign key reference `custom_roles.id` with CASCADE delete
- `organization_id` SHALL match organization from `custom_roles` and `organization_memberships`
- `assigned_by` SHALL reference user who performed the assignment (nullable for system assignments)
- Unique constraint SHALL prevent duplicate role assignments per user per organization
- CASCADE delete SHALL clean up assignments when user or role is deleted

#### Scenario: Assign custom role to user

- **GIVEN** user "user_123" and custom role "role_456" in organization "org_abc"
- **WHEN** executing `INSERT INTO user_custom_roles (user_id, custom_role_id, organization_id, assigned_by) VALUES ('user_123', 'role_456', 'org_abc', 'admin_user')`
- **THEN** row SHALL be created with auto-generated UUID and current timestamp

#### Scenario: Unique constraint prevents duplicate assignments

- **GIVEN** existing assignment with `user_id='user_123'`, `custom_role_id='role_456'`, `organization_id='org_abc'`
- **WHEN** attempting to insert duplicate assignment with same values
- **THEN** insert SHALL fail with unique constraint violation error

#### Scenario: User can have multiple roles in same organization

- **GIVEN** user "user_123" already assigned role "role_456" in organization "org_abc"
- **WHEN** inserting assignment with `user_id='user_123'`, `custom_role_id='role_789'`, `organization_id='org_abc'`
- **THEN** insert SHALL succeed because unique constraint requires ALL three columns to match

#### Scenario: CASCADE delete removes assignments when user deleted

- **GIVEN** user "user_123" has 3 custom role assignments across 2 organizations
- **WHEN** executing `DELETE FROM users WHERE id='user_123'`
- **THEN** all 3 assignment rows SHALL be automatically deleted via CASCADE

#### Scenario: CASCADE delete removes assignments when role deleted

- **GIVEN** custom role "role_456" is assigned to 10 users
- **WHEN** executing `DELETE FROM custom_roles WHERE id='role_456'`
- **THEN** all 10 assignment rows SHALL be automatically deleted via CASCADE

#### Scenario: Query custom roles for user in organization

- **GIVEN** user "user_123" has roles ["Moderator", "Editor"] in organization "org_abc"
- **WHEN** executing `SELECT custom_role_id FROM user_custom_roles WHERE user_id='user_123' AND organization_id='org_abc'`
- **THEN** query SHALL return both custom_role_id values

### Requirement: Database Indexes

The database SHALL include optimized indexes on custom role tables to support common query patterns with minimal performance overhead.

**Index Definitions**:

```sql
CREATE INDEX idx_custom_roles_org ON custom_roles(organization_id);
CREATE INDEX idx_custom_roles_active ON custom_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_user_custom_roles_user ON user_custom_roles(user_id);
CREATE INDEX idx_user_custom_roles_org ON user_custom_roles(organization_id);
CREATE INDEX idx_user_custom_roles_user_org ON user_custom_roles(user_id, organization_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(custom_role_id);
```

**Index Rules**:

- `idx_custom_roles_org` SHALL optimize queries filtering by organization_id
- `idx_custom_roles_active` SHALL be partial index (WHERE is_active = true) for active role lookups
- `idx_user_custom_roles_user` SHALL optimize queries finding all roles for a user
- `idx_user_custom_roles_org` SHALL optimize queries finding all users with custom roles in org
- `idx_user_custom_roles_user_org` SHALL optimize composite queries (most common pattern)
- `idx_role_permissions_role` SHALL optimize permission lookups for role

#### Scenario: Fast query for custom roles by organization

- **GIVEN** database with 10,000 custom roles across 1,000 organizations
- **WHEN** executing `SELECT * FROM custom_roles WHERE organization_id='org_abc'`
- **THEN** query SHALL use `idx_custom_roles_org` index for fast lookup

#### Scenario: Fast query for active custom roles only

- **GIVEN** database with 5,000 custom roles, 1,000 soft-deleted
- **WHEN** executing `SELECT * FROM custom_roles WHERE is_active=true AND organization_id='org_abc'`
- **THEN** query SHALL use `idx_custom_roles_active` partial index

#### Scenario: Fast query for user's custom roles in organization

- **GIVEN** database with 50,000 user custom role assignments
- **WHEN** executing `SELECT * FROM user_custom_roles WHERE user_id='user_123' AND organization_id='org_abc'`
- **THEN** query SHALL use `idx_user_custom_roles_user_org` composite index

#### Scenario: Fast query for permissions by role

- **GIVEN** database with 100,000 permission assignments across 10,000 roles
- **WHEN** executing `SELECT permission FROM role_permissions WHERE custom_role_id='role_456'`
- **THEN** query SHALL use `idx_role_permissions_role` index

### Requirement: Row-Level Security Policies

The database SHALL implement Row-Level Security (RLS) policies on custom role tables to enforce organization-scoped access control.

**RLS Policy Definitions**:

```sql
-- Custom Roles Table Policies
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom roles in their orgs"
  ON custom_roles FOR SELECT
  USING (
    organization_id IN (
      SELECT clerk_org_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can create custom roles"
  ON custom_roles FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT clerk_org_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
        AND clerk_org_role = 'org:admin'
    )
  );

CREATE POLICY "Org admins can update custom roles in their orgs"
  ON custom_roles FOR UPDATE
  USING (
    organization_id IN (
      SELECT clerk_org_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
        AND clerk_org_role = 'org:admin'
    )
  );

CREATE POLICY "Org admins can delete custom roles in their orgs"
  ON custom_roles FOR DELETE
  USING (
    organization_id IN (
      SELECT clerk_org_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
        AND clerk_org_role = 'org:admin'
    )
  );
```

**RLS Policy Rules**:

- All users SHALL see custom roles from organizations they are members of
- Only org:admin or super_admin SHALL create, update, or delete custom roles
- Service role SHALL have full access (bypass RLS for server operations)
- Similar policies SHALL apply to `role_permissions` and `user_custom_roles` tables

#### Scenario: User can view custom roles in their organization

- **GIVEN** user "user_123" is member of organization "org_abc"
- **AND** organization "org_abc" has custom role "Moderator"
- **WHEN** querying `SELECT * FROM custom_roles WHERE organization_id='org_abc'`
- **THEN** RLS policy SHALL allow user to see "Moderator" role

#### Scenario: User cannot view custom roles from other organizations

- **GIVEN** user "user_123" is NOT member of organization "org_xyz"
- **AND** organization "org_xyz" has custom role "Secret Role"
- **WHEN** querying `SELECT * FROM custom_roles WHERE organization_id='org_xyz'`
- **THEN** RLS policy SHALL return empty result (no access)

#### Scenario: Org admin can create custom role

- **GIVEN** user "admin_user" has `clerk_org_role='org:admin'` in organization "org_abc"
- **WHEN** inserting new custom role with `organization_id='org_abc'`
- **THEN** RLS policy SHALL allow INSERT operation

#### Scenario: Regular member cannot create custom role

- **GIVEN** user "user_123" has `clerk_org_role='org:member'` in organization "org_abc"
- **WHEN** attempting to insert new custom role with `organization_id='org_abc'`
- **THEN** RLS policy SHALL deny INSERT operation

#### Scenario: Service role bypasses RLS for server operations

- **GIVEN** server making database call with service role credentials
- **WHEN** querying `SELECT * FROM custom_roles`
- **THEN** RLS SHALL be bypassed and ALL custom roles SHALL be returned

### Requirement: Migration Idempotency

The database migration SHALL be idempotent, allowing safe re-execution without errors or data loss.

**Idempotency Rules**:

- All table creation SHALL use `CREATE TABLE IF NOT EXISTS`
- All index creation SHALL use `CREATE INDEX IF NOT EXISTS`
- All RLS policy creation SHALL check for existence before creating
- Migration SHALL be wrapped in transaction (BEGIN/COMMIT)
- Rollback migration SHALL use `DROP TABLE IF EXISTS` for safe cleanup

#### Scenario: Migration runs successfully first time

- **GIVEN** database without custom role tables
- **WHEN** executing migration `003_add_custom_role_tables.sql`
- **THEN** all 3 tables, indexes, and RLS policies SHALL be created successfully

#### Scenario: Migration is idempotent on re-execution

- **GIVEN** database with custom role tables already created
- **WHEN** executing migration `003_add_custom_role_tables.sql` again
- **THEN** migration SHALL complete successfully without errors (IF NOT EXISTS)

#### Scenario: Transaction rollback on error

- **GIVEN** migration encounters error during execution
- **WHEN** error occurs in middle of migration
- **THEN** transaction SHALL rollback and no partial changes SHALL be committed

#### Scenario: Rollback migration removes tables safely

- **GIVEN** database with custom role tables
- **WHEN** executing rollback migration `rollback_003_add_custom_role_tables.sql`
- **THEN** all 3 tables SHALL be dropped with CASCADE (removes dependent objects)

#### Scenario: Rollback migration is idempotent

- **GIVEN** database without custom role tables (already rolled back)
- **WHEN** executing rollback migration `rollback_003_add_custom_role_tables.sql` again
- **THEN** rollback SHALL complete successfully without errors (IF EXISTS)

### Requirement: Database Abstraction Layer Support

The database schema SHALL be compatible with both Supabase (PostgreSQL) and Turso (LibSQL) database backends.

**Compatibility Rules**:

- Table definitions SHALL use standard SQL compatible with both PostgreSQL and SQLite
- Foreign key constraints SHALL be supported by both backends
- UUID generation SHALL use `gen_random_uuid()` for PostgreSQL or equivalent for Turso
- Timestamp types SHALL use `timestamptz` for PostgreSQL, `TEXT` with ISO8601 for Turso
- RLS policies SHALL be PostgreSQL-only (Turso lacks RLS, enforced at application layer)

#### Scenario: Migration runs on Supabase PostgreSQL

- **GIVEN** Supabase PostgreSQL database
- **WHEN** executing migration `003_add_custom_role_tables.sql`
- **THEN** tables SHALL be created with RLS policies enabled

#### Scenario: Migration runs on Turso LibSQL

- **GIVEN** Turso LibSQL database
- **WHEN** executing adapted migration for Turso
- **THEN** tables SHALL be created without RLS policies (application-layer enforcement)

#### Scenario: Database abstraction layer queries both backends

- **GIVEN** unified database abstraction layer in `src/libs/database.ts`
- **WHEN** calling `getCustomRoles(organizationId)`
- **THEN** function SHALL work correctly on both Supabase and Turso backends

### Requirement: Performance Optimization

The database schema SHALL optimize for common query patterns with target <50ms query execution time for custom role resolution.

**Performance Targets**:

- Custom role lookup by user + org: <10ms (most common query)
- Custom role list by organization: <20ms
- Permission list for role: <5ms
- Custom role assignment: <15ms
- Batch role resolution for org members: <50ms

**Optimization Techniques**:

- Composite indexes on frequently joined columns
- Partial indexes for active role filtering
- Denormalization of permission count in custom_roles table
- Connection pooling for database queries
- Query result caching at application layer

#### Scenario: Fast custom role resolution for user in organization

- **GIVEN** database with 10,000 users and 1,000 custom roles
- **WHEN** executing query to resolve custom role for user in organization
- **THEN** query execution time SHALL be <10ms using composite index

#### Scenario: Fast permission lookup for custom role

- **GIVEN** custom role with 20 permissions assigned
- **WHEN** querying `SELECT permission FROM role_permissions WHERE custom_role_id='role_123'`
- **THEN** query execution time SHALL be <5ms using role index

#### Scenario: Batch role resolution for organization members

- **GIVEN** organization with 100 members, 50 having custom roles
- **WHEN** batch querying custom roles for all 100 members
- **THEN** total query execution time SHALL be <50ms using optimized joins
