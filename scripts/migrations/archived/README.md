# Archived Migrations

**Archive Date:** 2025-10-06
**Reason:** Migration consolidation and refactoring

## Overview

This directory contains the original fragmented migration files that have been replaced by consolidated migrations. These files are preserved for historical reference but should **NOT** be used for new database setups.

## Why Were These Archived?

The original 6 migration files contained:

- Redundant role system modifications (migrations 003-006)
- Type mismatches (TEXT column vs. ENUM type)
- Complex dependency chains
- Lack of clear rollback procedures

These issues were resolved by consolidating into 2 optimized migrations with a simplified 3-tier role system.

## Archived Files

### 001_create_users_with_roles.sql

- **Purpose:** Created users, organization_memberships, and user_preferences tables
- **Issues:** No role ENUM defined, role system incomplete
- **Replaced by:** 001_core_schema.sql (consolidated)

### 002_create_rls_policies.sql

- **Purpose:** Created RLS policies for all tables
- **Issues:** None - worked correctly
- **Replaced by:** 002_security_policies.sql (consolidated)

### 003_add_user_role_column.sql

- **Purpose:** Added role column as TEXT with CHECK constraint
- **Issues:** Should have been ENUM from the start, created type mismatch
- **Replaced by:** 001_core_schema.sql (role as ENUM)

### 004_add_member_to_role_enum.sql

- **Purpose:** Attempted to add 'member' and 'admin' to user_role ENUM
- **Issues:** ENUM didn't exist yet (created in migration 003 as TEXT)
- **Replaced by:** 001_core_schema.sql (ENUM from start)

### 005_replace_volunteer_with_member.sql

- **Purpose:** Replace deprecated 'volunteer' role with 'member'
- **Issues:** Complex ENUM recreation, no verification
- **Replaced by:** 001_core_schema.sql (correct ENUM from start)

### 006_complete_member_migration.sql

- **Purpose:** Comprehensive fix combining migrations 004-005
- **Issues:** Kept old migrations, still included 'coordinator' role
- **Replaced by:** 001_core_schema.sql (simplified to 3 roles)

## Migration Timeline

```
Original (Fragmented):
001 → 002 → 003 → 004 → 005 → 006
└─ Users/Orgs    └─ Role System Issues ─┘
   └─ RLS

New (Consolidated):
001_core_schema.sql → 002_security_policies.sql
└─ All tables, ENUM, triggers  └─ All RLS policies
```

## Key Changes in New Migrations

### Role System Simplification

**Before:** TEXT column with CHECK constraint for roles: `member, coordinator, admin, super_admin`
**After:** ENUM type with 3 roles: `member, admin, super_admin`

### Why Remove 'coordinator'?

- Simplified role hierarchy (3 levels instead of 4)
- Clearer permission boundaries
- Reduced complexity in RBAC logic
- Aligns with common patterns: basic users → org admins → system admins

### Technical Improvements

1. **Idempotent operations** - Can safely re-run migrations
2. **Built-in verification** - Migrations report success/failure
3. **Clear rollback path** - Dedicated rollback scripts provided
4. **Better documentation** - Extensive COMMENT statements
5. **Single transaction** - Each migration runs atomically

## Using New Migrations

### For Fresh Databases

```bash
# Apply in order
psql $DATABASE_URL -f scripts/migrations/001_core_schema.sql
psql $DATABASE_URL -f scripts/migrations/002_security_policies.sql
```

### For Existing Databases

If you've already applied the old migrations, see the **Migration Refactoring Implementation Plan** at:
`docs/database/supabase-migration-refactor-plan.md`

It provides strategies for:

- In-place upgrade (preserves data)
- Fresh start (drops and recreates)
- Bridging migration (transforms old → new)

## Rollback Procedures

To rollback the new consolidated migrations:

```bash
# Rollback security policies first
psql $DATABASE_URL -f scripts/migrations/rollback_002_security_policies.sql

# Then rollback core schema
psql $DATABASE_URL -f scripts/migrations/rollback_001_core_schema.sql
```

**Warning:** Rollback 001 will delete ALL data!

## Reference

- **Planning Document:** `docs/database/supabase-migration-refactor-plan.md`
- **New Migrations:** `scripts/migrations/001_core_schema.sql`, `002_security_policies.sql`
- **Rollback Scripts:** `scripts/migrations/rollback_*.sql`

## Additional Deprecated Migrations (2025-10)

After the initial consolidation on 2025-10-06, two additional migrations were created and later deprecated:

### 003_user_roles.DEPRECATED.sql

- **Created:** 2025-10-10
- **Purpose:** Auto-generated from `config/roles.config.ts` to sync role ENUM
- **Issues:** Redundant - duplicates work already done in 001_core_schema.sql
- **Archive Date:** 2025-11-21
- **Why Deprecated:** The `user_role` ENUM type was already created and populated in the consolidated 001_core_schema.sql. This migration attempted to create the same ENUM, making it completely redundant.

### 004_clerk_email_verification.DEPRECATED.sql

- **Created:** 2025-10-11
- **Purpose:** Add email uniqueness constraint (defense-in-depth)
- **Issues:** Functionality consolidated into 001_core_schema.sql on 2025-10-12
- **Archive Date:** 2025-11-21
- **Why Deprecated:** The partial unique index on email (allowing multiple NULLs but preventing duplicate non-NULL emails) was added directly to 001_core_schema.sql. This migration became redundant for fresh installations but remains safe for existing databases due to idempotent design.

---

## Migration History

| Migration                                            | Status   | Archive Date | Notes                               |
| ---------------------------------------------------- | -------- | ------------ | ----------------------------------- |
| 001_create_users_with_roles.sql                      | ARCHIVED | 2025-10-06   | Replaced by consolidated 001        |
| 002_create_rls_policies.sql                          | ARCHIVED | 2025-10-06   | Replaced by consolidated 002        |
| 003_add_user_role_column.sql                         | ARCHIVED | 2025-10-06   | Type mismatch - replaced            |
| 004_add_member_to_role_enum.sql                      | ARCHIVED | 2025-10-06   | ENUM didn't exist - replaced        |
| 005_replace_volunteer_with_member.sql                | ARCHIVED | 2025-10-06   | Complex workaround - replaced       |
| 006_complete_member_migration.sql                    | ARCHIVED | 2025-10-06   | Partial fix - replaced              |
| 003_user_roles.DEPRECATED.sql                        | ARCHIVED | 2025-11-21   | Redundant with consolidated 001     |
| rollback_003_user_roles.DEPRECATED.sql               | ARCHIVED | 2025-11-21   | Rollback for deprecated 003         |
| 004_clerk_email_verification.DEPRECATED.sql          | ARCHIVED | 2025-11-21   | Consolidated into 001 on 2025-10-12 |
| rollback_004_clerk_email_verification.DEPRECATED.sql | ARCHIVED | 2025-11-21   | Rollback for deprecated 004         |

---

**Do not use these archived migrations for new setups.** They are preserved only for historical reference and understanding the evolution of the schema.

For questions or issues, refer to the implementation plan document or the main migrations README at `scripts/migrations/README.md`.
