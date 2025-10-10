# Default Member Role Implementation Plan

**Date:** 2025-10-04
**Issue:** Users registered via Clerk are automatically assigned "volunteer" role in Supabase, but should be assigned "member" as default
**Status:** 📋 Ready for Implementation
**Branch:** feat/role-auth

---

## Executive Summary

The system currently defaults to "volunteer" role when creating new users, but recent migrations (005_replace_volunteer_with_member.sql) have **removed** "volunteer" from the allowed ENUM values. The codebase already defaults to "member" in most places, but the database schema may still have residual "volunteer" defaults.

**Current State:**

- ✅ Code defaults to 'member' in webhooks ([clerk.ts:126](../src/pages/api/webhooks/clerk.ts#L126), [clerk.ts:196](../src/pages/api/webhooks/clerk.ts#L196))
- ✅ Migration 005 removed "volunteer" from ENUM
- ❌ Database may have DEFAULT constraint still referencing "volunteer"
- ❌ Need verification that all pathways use "member" as default

---

## Root Cause Analysis

### Problem Statement

When users register via Clerk authentication, they should automatically receive the "member" role in Supabase. However, there are concerns that:

1. Database schema may have a `DEFAULT 'volunteer'` constraint on the `users.role` column
2. The "volunteer" role has been removed from the ENUM (migration 005)
3. This creates a mismatch where new users could trigger database errors

### Investigation Findings

**Webhook Handler** ([src/pages/api/webhooks/clerk.ts](../src/pages/api/webhooks/clerk.ts)):

- Lines 126 & 196: `const role = (public_metadata?.role as string) || 'member'`
- ✅ **Correctly defaults to 'member'**

**User Utility** ([src/utils/user.ts](../src/utils/user.ts)):

- Line 94-108: `const role = (user.publicMetadata?.role as string) || 'member'`
- ✅ **Correctly defaults to 'member'**

**Database Migrations:**

- Migration 001: Created users table (no role column initially)
- Migration 003: Added role column with ENUM
- Migration 004: Added 'member' to ENUM
- Migration 005: Removed 'volunteer' from ENUM
- ❓ **Unknown:** Does role column have a DEFAULT constraint?

**Organization Roles:**

- Stored separately in `organization_memberships` table
- Uses 'org:admin' and 'org:member' values
- ✅ **Not affected by this issue**

---

## Implementation Plan

### Phase 1: Verification and Discovery

#### Task 1.1: Check Current Database Schema

**Goal:** Determine if `users.role` column has a DEFAULT constraint

**Actions:**

1. Query Supabase to inspect the `users` table schema
2. Check for DEFAULT constraints on the `role` column
3. Verify current ENUM values allowed

**SQL to Run:**

```sql
-- Check column default
SELECT column_name, column_default, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- Check ENUM values
SELECT enumlabel as allowed_roles
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Check if any users still have 'volunteer' role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

**Expected Outcomes:**

- ENUM should contain: `member`, `coordinator`, `admin`, `super_admin`
- ENUM should NOT contain: `volunteer`
- Column default should be either NULL or 'member'
- No users should have 'volunteer' role

#### Task 1.2: Audit All Role Assignment Code Paths

**Files to Check:**

- [x] `src/pages/api/webhooks/clerk.ts` (verified ✅)
- [x] `src/utils/user.ts` (verified ✅)
- [ ] Any database seed scripts
- [ ] Any manual user creation scripts
- [ ] Test fixtures

**Search Commands:**

```bash
# Find all references to role assignment
rg "role.*=.*['\"]" --type ts --type js

# Find all references to 'volunteer'
rg "volunteer" --type ts --type js --type sql

# Find all DEFAULT statements in migrations
rg "DEFAULT.*role|role.*DEFAULT" scripts/migrations/
```

---

### Phase 2: Schema Corrections

#### Task 2.1: Create Migration to Fix Column Default

**File:** `scripts/migrations/006_ensure_member_default_role.sql`

**Purpose:**

- Ensure `users.role` column defaults to 'member'
- Remove any legacy 'volunteer' defaults
- Update NULL roles to 'member'

**Migration Content:**

```sql
-- Migration: Ensure 'member' is the default role
-- Purpose: Fix any residual DEFAULT constraints pointing to removed 'volunteer' role
-- Created: 2025-10-04
-- Depends on: 005_replace_volunteer_with_member.sql

-- Step 1: Update any NULL roles to 'member'
UPDATE users
SET role = 'member'
WHERE role IS NULL;

-- Step 2: Set column default to 'member'
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'member'::user_role;

-- Step 3: Verify the default is set correctly
SELECT
  column_name,
  column_default,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- Step 4: Show current role distribution
SELECT
  role,
  COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Default role set to member';
  RAISE NOTICE 'All new users will automatically receive member role';
END$$;
```

**How to Apply:**

1. Copy SQL to Supabase Dashboard → SQL Editor
2. Review and execute
3. Verify output shows `column_default = 'member'::user_role`

#### Task 2.2: Verify Migration Application Script

**File:** `scripts/run-default-role-migration.js`

**Purpose:** Helper script to display migration instructions

```javascript
#!/usr/bin/env node

/**
 * Helper script to apply the default role migration
 * This migration ensures 'member' is the default role for new users
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const migrationPath = join(__dirname, 'migrations', '006_ensure_member_default_role.sql')
const migrationSQL = readFileSync(migrationPath, 'utf-8')

console.log('\n=== Migration 006: Ensure Member Default Role ===\n')
console.log('This migration will:')
console.log('  1. Update any NULL roles to "member"')
console.log('  2. Set column default to "member"')
console.log('  3. Verify the default is correctly set\n')

console.log('📋 Instructions:')
console.log('  1. Go to Supabase Dashboard → SQL Editor')
console.log('  2. Copy the SQL below and paste into the editor')
console.log('  3. Execute the migration')
console.log('  4. Verify the output shows column_default = "member"::user_role\n')

console.log('=== SQL Migration ===\n')
console.log(migrationSQL)
console.log('\n=== End of Migration ===\n')
```

---

### Phase 3: Code Verification and Testing

#### Task 3.1: Add Integration Test for Default Role

**File:** `tests/integration/clerk-user-creation.test.ts`

**Purpose:** Verify new users get 'member' role by default

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { getSupabaseServiceRole } from '#libs/supabase-native'

describe('Clerk User Creation - Default Role', () => {
  let supabase: ReturnType<typeof getSupabaseServiceRole>

  beforeAll(() => {
    supabase = getSupabaseServiceRole()
    if (!supabase) {
      throw new Error('Supabase not configured for tests')
    }
  })

  it('should default to member role when role is not specified', async () => {
    const testUser = {
      clerk_id: `test_user_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      username: `testuser_${Date.now()}`,
      full_name: 'Test User',
      // Intentionally omit role to test DEFAULT constraint
    }

    const { data, error } = await supabase.from('users').insert(testUser).select('role').single()

    expect(error).toBeNull()
    expect(data?.role).toBe('member')

    // Cleanup
    await supabase.from('users').delete().eq('clerk_id', testUser.clerk_id)
  })

  it('should allow explicit role assignment', async () => {
    const testUser = {
      clerk_id: `test_admin_${Date.now()}`,
      email: `admin${Date.now()}@example.com`,
      username: `testadmin_${Date.now()}`,
      full_name: 'Test Admin',
      role: 'admin',
    }

    const { data, error } = await supabase.from('users').insert(testUser).select('role').single()

    expect(error).toBeNull()
    expect(data?.role).toBe('admin')

    // Cleanup
    await supabase.from('users').delete().eq('clerk_id', testUser.clerk_id)
  })

  it('should reject invalid role values', async () => {
    const testUser = {
      clerk_id: `test_invalid_${Date.now()}`,
      email: `invalid${Date.now()}@example.com`,
      username: `testinvalid_${Date.now()}`,
      full_name: 'Test Invalid',
      role: 'volunteer', // This should fail since volunteer was removed
    }

    const { data, error } = await supabase.from('users').insert(testUser).select().single()

    expect(error).not.toBeNull()
    expect(error?.message).toContain('invalid input value for enum user_role')
  })
})
```

#### Task 3.2: Update Documentation

**Files to Update:**

1. **[docs/ROLE-SYNC-RESOLUTION.md](../docs/ROLE-SYNC-RESOLUTION.md)**

   - Add note about migration 006
   - Update "Current Role System" section
   - Add new verification step

2. **[docs/clerk-supabase-setup-guide.md](../docs/clerk-supabase-setup-guide.md)**

   - Update default role information
   - Add note about removed 'volunteer' role
   - Update migration checklist

3. **[CLAUDE.md](../CLAUDE.md)** (Project Instructions)
   - Update "Database Integration" section
   - Document current role system
   - Add note about default role behavior

---

### Phase 4: Validation and Rollout

#### Task 4.1: Pre-Deployment Checklist

**Before applying migration:**

- [ ] Backup current database state
- [ ] Run verification queries (Phase 1, Task 1.1)
- [ ] Review current user role distribution
- [ ] Check for any users with NULL roles
- [ ] Verify no code references 'volunteer' role

**Migration Application:**

- [ ] Apply migration 006 in Supabase SQL Editor
- [ ] Verify column default is 'member'::user_role
- [ ] Check no errors in migration output
- [ ] Verify ENUM still contains correct values

**Post-Migration Verification:**

- [ ] Run integration tests: `npm test tests/integration/clerk-user-creation.test.ts`
- [ ] Check webhook logs for successful user creation
- [ ] Create a test user via Clerk and verify role assignment
- [ ] Query Supabase to confirm test user has 'member' role

#### Task 4.2: Create Test User via Clerk

**Manual Test:**

1. Go to Clerk Dashboard → Users
2. Create new test user
3. Check webhook logs: `tail -f logs/webhook.log` (if logging configured)
4. Verify in Supabase:

   ```sql
   SELECT clerk_id, email, role, created_at
   FROM users
   ORDER BY created_at DESC
   LIMIT 5;
   ```

5. Confirm new user has `role = 'member'`

#### Task 4.3: Monitor Production

**Post-Deployment Monitoring:**

- Watch for webhook errors in logs
- Check Supabase error logs for ENUM violations
- Monitor new user sign-ups for correct role assignment
- Set up alert for any 'invalid input value for enum' errors

---

## Risk Assessment

### High Risk

**Issue:** Database ENUM still contains 'volunteer'

- **Impact:** Users could be assigned removed role
- **Likelihood:** Low (migration 005 should have removed it)
- **Mitigation:** Verification query in Phase 1.1

**Issue:** Column has DEFAULT 'volunteer' constraint

- **Impact:** New users without explicit role assignment fail
- **Likelihood:** Medium (unknown current state)
- **Mitigation:** Migration 006 fixes this

### Medium Risk

**Issue:** Clerk publicMetadata contains 'volunteer' for existing users

- **Impact:** User updates fail when syncing to Supabase
- **Likelihood:** Low (previous scripts updated Clerk)
- **Mitigation:** Re-run update script if needed

**Issue:** Code paths bypass role defaulting

- **Impact:** NULL roles in database
- **Likelihood:** Low (code audit in Phase 1.2)
- **Mitigation:** Comprehensive code search and testing

### Low Risk

**Issue:** Test users created with wrong role

- **Impact:** Test failures
- **Likelihood:** Low
- **Mitigation:** Clean test database, update test fixtures

---

## Rollback Plan

### If Migration Fails

**Scenario:** Migration 006 causes errors or breaks user creation

**Rollback Steps:**

1. Restore database from pre-migration backup
2. Investigate error logs
3. Fix migration SQL
4. Re-test in development environment
5. Re-apply when confirmed working

### If Production Issues Occur

**Scenario:** New users cannot be created after migration

**Immediate Actions:**

1. Check Supabase error logs for specific error message
2. If ENUM violation: Verify ENUM contains 'member'
3. If DEFAULT violation: Manually set DEFAULT to NULL temporarily
4. Create emergency migration to fix constraint

**Emergency Migration:**

```sql
-- Temporary fix: Remove DEFAULT constraint
ALTER TABLE users
  ALTER COLUMN role DROP DEFAULT;

-- Then investigate and apply proper fix
```

---

## Success Criteria

### Migration Success

- ✅ Column `users.role` has DEFAULT 'member'::user_role
- ✅ ENUM `user_role` contains: member, coordinator, admin, super_admin
- ✅ ENUM `user_role` does NOT contain: volunteer
- ✅ All existing users have non-NULL roles
- ✅ No users have 'volunteer' role

### Code Verification Success

- ✅ All code paths default to 'member' when role not specified
- ✅ No code references 'volunteer' role
- ✅ Integration tests pass
- ✅ Manual test user creation succeeds

### Production Success

- ✅ New users created via Clerk webhooks get 'member' role
- ✅ No ENUM violation errors in logs
- ✅ No webhook failures related to role assignment
- ✅ User role distribution shows majority as 'member'

---

## Timeline and Effort Estimate

### Phase 1: Verification (1-2 hours)

- Database schema inspection: 30 minutes
- Code audit: 1 hour
- Documentation review: 30 minutes

### Phase 2: Schema Corrections (1 hour)

- Write migration: 30 minutes
- Create helper script: 15 minutes
- Apply and verify: 15 minutes

### Phase 3: Testing (2-3 hours)

- Write integration tests: 1 hour
- Update documentation: 1 hour
- Code review: 1 hour

### Phase 4: Validation (1-2 hours)

- Pre-deployment checks: 30 minutes
- Migration application: 15 minutes
- Post-deployment verification: 30 minutes
- Monitoring: 30 minutes

**Total Estimated Time:** 5-8 hours

---

## Related Files and References

### Code Files

- [src/pages/api/webhooks/clerk.ts](../src/pages/api/webhooks/clerk.ts) - Webhook handler (lines 126, 196)
- [src/utils/user.ts](../src/utils/user.ts) - User utility (line 94-108)
- [src/utils/clerk-roles.ts](../src/utils/clerk-roles.ts) - Organization roles (separate system)
- [src/libs/supabase-auth.ts](../src/libs/supabase-auth.ts) - Supabase client creation

### Migration Files

- `scripts/migrations/001_create_users_with_roles.sql` - Initial schema
- `scripts/migrations/003_add_user_role_column.sql` - Added role column
- `scripts/migrations/004_add_member_to_role_enum.sql` - Added 'member' to ENUM
- `scripts/migrations/005_replace_volunteer_with_member.sql` - Removed 'volunteer'
- `scripts/migrations/006_ensure_member_default_role.sql` - **TO BE CREATED**

### Documentation

- [docs/ROLE-SYNC-RESOLUTION.md](../docs/ROLE-SYNC-RESOLUTION.md) - Previous role sync fix
- [docs/clerk-supabase-setup-guide.md](../docs/clerk-supabase-setup-guide.md) - Setup guide
- [CLAUDE.md](../CLAUDE.md) - Project documentation

### Utility Scripts

- `scripts/check-users-table.js` - Check current user roles
- `scripts/check-role-enum.js` - Verify ENUM values
- `scripts/update-user-roles.js` - Update Clerk metadata
- `scripts/trigger-user-sync.js` - Manual user sync

---

## Next Steps

1. **Review this plan** and confirm approach is correct
2. **Run Phase 1 verification** to determine current database state
3. **Create migration 006** based on findings
4. **Apply migration** to Supabase
5. **Run tests** to verify correct behavior
6. **Update documentation** to reflect changes
7. **Monitor production** for any issues

---

**Version:** 1.0
**Created:** 2025-10-04
**Author:** Claude Code
**Status:** Ready for Review and Implementation
