# Supabase Database Migrations

This directory contains PostgreSQL migrations for the Supabase database provider.

> **Note**: For Turso (LibSQL) migrations, see `/db/migrations/` directory.
>
> **Note**: An older migration directory exists at `scripts/supabase-migrations/` (Aug 2025) that created a simpler users table. This was superseded by the comprehensive migrations in this directory (Oct 2025) which add roles, organizations, and preferences. For new installations, use the migrations in THIS directory.

---

## Quick Start

### Fresh Database Installation

For **new databases**, run only these two migrations in order:

```bash
# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres"

# Apply core schema
psql $DATABASE_URL -f scripts/migrations/001_core_schema.sql

# Apply security policies
psql $DATABASE_URL -f scripts/migrations/002_security_policies.sql
```

**That's it!** Skip migrations 003 and 004 - they are deprecated/redundant.

---

### Existing Database Upgrade

If you have an **existing database** with older migrations applied, consult the upgrade guide:
`docs/database/supabase-migration-refactor-plan.md`

---

## Active Migrations (Current State)

### ✅ Required Migrations

| File                        | Created    | Purpose                               | Status     |
| --------------------------- | ---------- | ------------------------------------- | ---------- |
| `001_core_schema.sql`       | 2025-10-12 | Core tables, roles, indexes, triggers | **ACTIVE** |
| `002_security_policies.sql` | 2025-10-06 | Row Level Security (RLS) policies     | **ACTIVE** |

### ⚠️ Deprecated Migrations

| File                               | Created    | Purpose                     | Status                                 |
| ---------------------------------- | ---------- | --------------------------- | -------------------------------------- |
| `003_user_roles.sql`               | 2025-10-10 | Role ENUM creation          | **REDUNDANT** - Duplicates 001         |
| `004_clerk_email_verification.sql` | 2025-10-11 | Email uniqueness constraint | **DEPRECATED** - Consolidated into 001 |

**Why deprecated?** Migration 001 was refactored on 2025-10-12 to consolidate work from migrations 003 and 004. The numbered prefix (001) doesn't reflect chronological creation order.

---

## Migration Details

### 001_core_schema.sql

**Purpose**: Foundation migration establishing the entire user management system.

**Creates**:

- `user_role` ENUM type (`member`, `admin`, `super_admin`)
- `users` table (synced from Clerk authentication)
  - Stores clerk_id, email, username, full_name, avatar_url
  - Role-based access control (RBAC) with default role 'member'
  - JSONB app_metadata for application-specific data
- `organization_memberships` table (Clerk organizations sync)
- `user_preferences` table (app-specific settings: theme, notifications, language, timezone)
- 7 performance indexes including partial unique index on email
- `update_updated_at()` trigger function for automatic timestamp management
- Extensive documentation via SQL COMMENT statements

**Rollback**: `rollback_001_core_schema.sql`

---

### 002_security_policies.sql

**Purpose**: Implements Row Level Security (RLS) policies for all tables.

**Creates**:

- **Users table policies** (3 policies):
  - Users can view/update their own profile (Clerk JWT 'sub' claim)
  - Service role has full access (for webhooks)

- **Organization memberships policies** (3 policies):
  - Users view their own memberships
  - Org admins see all org members
  - Service role has full access

- **User preferences policies** (2 policies):
  - Users have full CRUD on their own preferences
  - Service role has full access

**Total**: 8 security policies with comprehensive documentation

**Rollback**: `rollback_002_security_policies.sql`

---

## Rollback Procedures

### Rollback All Migrations (Nuclear Option)

```bash
# Rollback in reverse order
psql $DATABASE_URL -f scripts/migrations/rollback_002_security_policies.sql
psql $DATABASE_URL -f scripts/migrations/rollback_001_core_schema.sql
```

**Warning**: This will drop all tables and data! Use with extreme caution.

### Rollback Single Migration

```bash
# Example: Rollback security policies only
psql $DATABASE_URL -f scripts/migrations/rollback_002_security_policies.sql
```

---

## Archived Migrations

The `archived/` directory contains 6 original migrations from 2025-10-03 to 2025-10-04 that were **consolidated and replaced** on 2025-10-06.

**Original migrations had issues**:

- Fragmented role system setup across multiple files
- Type mismatches (TEXT column vs ENUM type)
- Complex dependency chains
- Deprecated 4-tier role system (member, coordinator, admin, super_admin)

**Replaced by**: Consolidated `001_core_schema.sql` + `002_security_policies.sql` with simplified 3-tier role system.

See `archived/README.md` for historical details.

---

## Migration Development Guidelines

### Creating New Migrations

1. **Naming Convention**: `00X_descriptive_name.sql`
   - Use sequential numbering (005, 006, etc.)
   - Use snake_case for descriptive names
   - Be specific: `add_user_avatars` not `update_users`

2. **Migration Structure**:

   ```sql
   -- Migration: 00X_descriptive_name.sql
   -- Created: YYYY-MM-DD
   -- Purpose: Brief description of what this migration does
   --
   -- Dependencies: List any migrations this depends on
   -- Rollback: rollback_00X_descriptive_name.sql

   BEGIN;

   -- Your migration code here

   -- Verification (optional but recommended)
   DO $$
   BEGIN
       -- Check that changes were applied correctly
   END $$;

   COMMIT;
   ```

3. **Always Create Rollback Scripts**:
   - Name: `rollback_00X_descriptive_name.sql`
   - Test rollback before committing
   - Document any data loss consequences

4. **Make Migrations Idempotent**:
   - Use `IF NOT EXISTS` clauses
   - Check for existing objects before creating
   - Allow migrations to be safely re-run

5. **Document Your Changes**:
   - Add SQL COMMENT statements for tables/columns
   - Explain business logic in migration comments
   - Update this README with new migration details

### Testing Migrations

```bash
# Test on local development database first
psql $DEV_DATABASE_URL -f scripts/migrations/00X_new_migration.sql

# Verify changes
psql $DEV_DATABASE_URL -c "SELECT * FROM pg_tables WHERE schemaname = 'public';"

# Test rollback
psql $DEV_DATABASE_URL -f scripts/migrations/rollback_00X_new_migration.sql
```

---

## Migration Tracking

Currently, migrations must be **manually tracked** and applied in order.

**Planned Enhancement**: Migration tracking table to record applied migrations and prevent duplicate applications.

---

## Troubleshooting

### "relation already exists" error

This typically means you're re-running a migration that's already been applied. Options:

1. Skip the migration (if it's already applied)
2. Run the rollback script first, then re-apply
3. Check for idempotent design (migrations should handle this gracefully)

### "type already exists" error

The migration is trying to create an ENUM or type that already exists. Usually safe to ignore if the existing type matches expectations.

### RLS Policy blocking access

If you're getting permission denied errors:

1. Check that RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Verify your JWT contains the correct claims (especially 'sub' for user ID)
3. Test with service role key (bypasses RLS) to isolate issue
4. Review policies: `SELECT * FROM pg_policies WHERE schemaname = 'public';`

### Migration verification failures

If a migration's built-in verification fails:

1. Read the error message carefully (migrations include helpful verification)
2. Check that dependencies (other migrations) were applied first
3. Verify your database version supports required features
4. Check for data conflicts (duplicate emails, etc.)

---

## Related Documentation

- **Database Overview**: `/project-docs/05-database/README.md`
- **Turso Migrations**: `/db/migrations/README.md`
- **Clerk Integration**: `/project-docs/04-integrations/clerk-authentication.md`
- **Migration Refactor Plan**: `/docs/database/supabase-migration-refactor-plan.md`

---

## Questions?

If you're unsure about:

- Which migrations to apply → Start with this README
- Existing database upgrades → Consult `docs/database/supabase-migration-refactor-plan.md`
- Migration errors → Check Troubleshooting section above
- Creating new migrations → Follow Development Guidelines section

For project-specific questions, open an issue in the repository.
