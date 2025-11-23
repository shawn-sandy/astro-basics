# ⚠️ ARCHIVED: Original Supabase Migrations (August 2025)

**Archive Date:** 2025-11-21
**Original Location:** `scripts/supabase-migrations/`
**Superseded By:** `scripts/migrations/` (October 2025)

---

## Why Was This Archived?

This directory contained an early, simpler migration system from August 2025 that was **superseded** by a comprehensive user management system in October 2025.

The newer system adds critical features that weren't in this original version:

- ✓ Role-based access control (RBAC) with `user_role` ENUM
- ✓ Organization memberships (Clerk integration)
- ✓ User preferences (theme, notifications, language, timezone)
- ✓ Advanced RLS policies (8 comprehensive policies vs 3 basic)
- ✓ Migration tracking system
- ✓ Comprehensive documentation and rollback procedures

---

## Contents of This Archive

### 001_create_users_table.sql (Created: Aug 22, 2025)

**Purpose:** Created a basic users table synced with Clerk

**Features:**

- Basic user fields: clerk_id, email, username, full_name, avatar_url
- Simple `metadata` JSONB field (no structured preferences)
- **No role system** - all users equal
- **No organization support**
- Auto-update trigger for `updated_at`

### 002_enable_rls_policies.sql (Created: Aug 14, 2025)

**Purpose:** Enabled basic RLS policies

**Features:**

- 3 policies for users table (view/update own profile, service role access)
- Policies for messages table (not in new system)
- Basic Clerk JWT authentication using `auth.jwt()->>'sub'`

### README.md

Original documentation that mentions a comment system (migrations 003/004).
These comment migrations were never created in this directory.

---

## Evolution Timeline

```
August 2025: Simple Migration System
└─ scripts/supabase-migrations/
   ├── 001_create_users_table.sql - Basic users, no roles
   └── 002_enable_rls_policies.sql - Basic RLS
       └─ Intended for blog comment system

October 2025: Comprehensive Migration System
└─ scripts/migrations/
   ├── 001_core_schema.sql - Users + Roles + Orgs + Preferences
   ├── 002_security_policies.sql - Advanced RLS (8 policies)
   └── 005_migration_tracking.sql - Migration tracking

November 2025: Migration Cleanup
└─ Archived old system to preserve history
└─ Documented evolution and supersession
```

---

## For New Installations

**⚠️ DO NOT USE THESE ARCHIVED MIGRATIONS**

Instead, use the current migration system in `scripts/migrations/`:

```bash
# Set database connection
export DATABASE_URL="postgresql://postgres:[password]@[project].supabase.co:5432/postgres"

# Apply current migrations
psql $DATABASE_URL -f scripts/migrations/001_core_schema.sql
psql $DATABASE_URL -f scripts/migrations/002_security_policies.sql
psql $DATABASE_URL -f scripts/migrations/005_migration_tracking.sql

# Check status
./scripts/migrations/check-migration-status.sh
```

**See:** `scripts/migrations/README.md` for complete documentation

---

## For Existing Databases (Rare Case)

If you have a database that used these August 2025 migrations and need to upgrade:

### ⚠️ Breaking Changes Between Old and New Systems

1. **New users table includes:**
   - `role` column (ENUM: member, admin, super_admin)
   - Structured instead of generic metadata field
   - Additional indexes for performance

2. **New tables added:**
   - `organization_memberships` - Clerk organization sync
   - `user_preferences` - Structured user settings
   - `schema_migrations` - Migration tracking

3. **RLS policies expanded:**
   - Organization-aware policies
   - More granular access control
   - Service role policies for webhooks

### Upgrade Path

If you need to upgrade from the old system, you have two options:

**Option A: Fresh Start (Recommended)**

1. Export any critical user data
2. Drop old schema
3. Apply new migrations
4. Re-import data

**Option B: Bridging Migration (Advanced)**

1. Create custom migration to add missing columns/tables
2. Migrate data from old structure to new
3. Update RLS policies

**Note:** No automated bridging migration exists. Manual intervention required.

---

## Comparison: Old vs New

| Feature                | Old (Aug 2025)  | New (Oct 2025)           |
| ---------------------- | --------------- | ------------------------ |
| **Users table**        | Basic           | Comprehensive with roles |
| **Role system**        | ✗ None          | ✓ 3-tier ENUM            |
| **Organizations**      | ✗ None          | ✓ Full support           |
| **Preferences**        | ✗ Generic JSONB | ✓ Structured table       |
| **RLS policies**       | 3 basic         | 8 comprehensive          |
| **Messages table**     | ✓ Included      | Separate concern         |
| **Migration tracking** | ✗ Manual        | ✓ Automated              |
| **Documentation**      | Basic README    | Comprehensive guides     |
| **Rollback scripts**   | ✗ None          | ✓ All migrations         |
| **Verification**       | ✗ None          | ✓ Built-in checks        |

---

## Why Keep This Archive?

This directory is preserved for:

1. **Historical Context** - Understanding the project's schema evolution
2. **Reference** - Comparing old vs new implementation approaches
3. **Recovery** - Rare cases where old schema information is needed
4. **Documentation** - Learning from the migration refactoring process

---

## Related Documentation

- **Current Migrations:** `scripts/migrations/README.md`
- **Migration Tracking:** `scripts/migrations/005_migration_tracking.sql`
- **Database Overview:** `project-docs/05-database/README.md`
- **Clerk Integration:** `project-docs/04-integrations/clerk-authentication.md`

---

## Questions?

If you're working with this archived directory and have questions:

1. **For new features** → Use `scripts/migrations/` instead
2. **For migration help** → See `scripts/migrations/README.md`
3. **For database issues** → Check project documentation
4. **For historical context** → This file documents the evolution

**This archive is preserved for reference only. Do not use for production deployments.**

---

**Archived:** 2025-11-21
**Reason:** Superseded by comprehensive migration system
**Preserved By:** Migration cleanup and organization initiative
