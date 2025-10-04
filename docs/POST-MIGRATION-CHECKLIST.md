# Post-Migration Checklist: Migration 006

**Migration:** 006_complete_member_migration.sql
**Purpose:** Fix default role to 'member' instead of 'volunteer'
**Date:** 2025-10-04

---

## Quick Verification (2 minutes)

After executing migration 006 in Supabase SQL Editor, run these quick checks:

### ✅ Step 1: Run Automated Verification

```bash
node scripts/verify-role-schema.js
```

**Expected Output:**

```
✅ Insert without role SUCCEEDED
   Assigned role: 'member'
   ✅ DEFAULT is correctly set to "member"

✓ Verification:
  - Users with NULL role: ✅ NONE
  - Users with 'volunteer' role: ✅ NONE
```

**If you see this ✅** → Migration successful! Continue to Step 2.

**If you see errors ❌** → See [Troubleshooting](#troubleshooting) section below.

---

### ✅ Step 2: Run Integration Tests

```bash
npm test tests/integration/default-role-assignment.test.ts
```

**Expected Output:**

```
✓ Default Role Assignment - Post Migration 006
  ✓ DEFAULT constraint behavior
    ✓ should assign "member" role when role is not specified
    ✓ should assign "member" role when role is explicitly null
  ✓ Explicit role assignment
    ✓ should allow explicit "member" role assignment
    ✓ should allow "coordinator" role assignment
    ✓ should allow "admin" role assignment
    ✓ should allow "super_admin" role assignment
  ✓ ENUM constraint validation
    ✓ should reject "volunteer" role (removed by migration 006)
    ✓ should reject invalid role values
  ✓ Webhook simulation - buildUserData pattern
    ✓ should handle webhook pattern with missing role metadata
    ✓ should handle webhook pattern with explicit role metadata
  ✓ Role update operations
    ✓ should allow updating role from member to admin
    ✓ should reject updating role to invalid value
  ✓ Migration 006 verification
    ✓ should confirm no users have volunteer role
    ✓ should confirm all users have valid roles

Test Files  1 passed (1)
     Tests  15 passed (15)
```

**If all tests pass ✅** → Migration fully verified! Continue to Step 3.

**If tests fail ❌** → See [Troubleshooting](#troubleshooting) section below.

---

### ✅ Step 3: Manual Database Verification

Run these queries in **Supabase SQL Editor** to double-check:

#### Check ENUM Values

```sql
SELECT enumlabel as role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;
```

**Expected Result:**
| role_value |
|---------------|
| member |
| coordinator |
| admin |
| super_admin |

**Verify:**

- ✅ Contains 'member'
- ✅ Contains 'admin'
- ✅ Does NOT contain 'volunteer'

---

#### Check DEFAULT Constraint

```sql
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'role';
```

**Expected Result:**
| column_name | column_default |
|-------------|-------------------------|
| role | 'member'::user_role |

**Verify:**

- ✅ DEFAULT is `'member'::user_role`

---

#### Check User Data

```sql
SELECT
  role,
  COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY role;
```

**Expected Result:**
| role | user_count |
|--------|-----------|
| member | 1 (or more) |

**Verify:**

- ✅ No users with 'volunteer' role
- ✅ No users with NULL role
- ✅ All users have valid roles

---

### ✅ Step 4: Test User Creation

#### Test via Direct Insert

```sql
-- Create test user without specifying role
INSERT INTO users (clerk_id, email, username, full_name)
VALUES (
  'test_migration_006_' || gen_random_uuid()::text,
  'test_migration_006@example.com',
  'test_migration_user',
  'Test Migration User'
)
RETURNING clerk_id, email, role;
```

**Expected Result:**
| clerk*id | email | role |
|----------|-------|------|
| test_migration_006*... | test_migration_006@example.com | member |

**Verify:**

- ✅ Role is 'member' (from DEFAULT)

**Cleanup:**

```sql
DELETE FROM users WHERE email = 'test_migration_006@example.com';
```

---

#### Test via Webhook (Optional)

If you have Clerk configured, create a test user:

1. Go to **Clerk Dashboard** → **Users**
2. Click **Create User**
3. Fill in email: `test-migration-006@example.com`
4. Submit

Then check in Supabase:

```sql
SELECT clerk_id, email, role
FROM users
WHERE email = 'test-migration-006@example.com';
```

**Expected:** Role should be 'member'

**Cleanup in Clerk Dashboard:** Delete the test user

---

## Comprehensive Verification (10 minutes)

For thorough validation, complete all sections:

### Database Schema Validation

#### 1. Verify ENUM Type Definition

```sql
SELECT
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as allowed_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'user_role'
GROUP BY t.typname;
```

**Expected:**

- enum_name: `user_role`
- allowed_values: `{member,coordinator,admin,super_admin}`

---

#### 2. Verify Column Constraints

```sql
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.column_default,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'users'
  AND c.column_name = 'role';
```

**Expected:**

- column_name: `role`
- data_type: `USER-DEFINED`
- udt_name: `user_role`
- column_default: `'member'::user_role`
- is_nullable: `YES` or `NO` (depends on your schema)

---

#### 3. Check for Orphaned ENUM Types

```sql
SELECT typname
FROM pg_type
WHERE typname LIKE 'user_role%'
ORDER BY typname;
```

**Expected:**

- Only `user_role` should exist
- `user_role_new` should NOT exist (it's a temporary type during migration)

**If `user_role_new` exists:**

```sql
DROP TYPE user_role_new;
```

---

### Data Validation

#### 4. Role Distribution Analysis

```sql
SELECT
  role,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM users
GROUP BY role
ORDER BY count DESC;
```

**Verify:**

- All roles are valid (member, coordinator, admin, super_admin)
- No 'volunteer' role appears

---

#### 5. Check for Data Anomalies

```sql
-- Check for NULL roles
SELECT COUNT(*) as null_role_count
FROM users
WHERE role IS NULL;

-- Check for invalid metadata
SELECT
  clerk_id,
  email,
  role,
  app_metadata
FROM users
WHERE app_metadata IS NULL
   OR app_metadata::text = '{}'
LIMIT 5;
```

**Expected:**

- null_role_count: `0`
- app_metadata can be `{}` (empty object) - that's fine

---

### Functional Validation

#### 6. Test All Role Assignments

```sql
BEGIN;

-- Test each valid role
INSERT INTO users (clerk_id, email, username, role) VALUES
  ('test_member_' || gen_random_uuid(), 'test_member@example.com', 'test_member', 'member'),
  ('test_coordinator_' || gen_random_uuid(), 'test_coordinator@example.com', 'test_coordinator', 'coordinator'),
  ('test_admin_' || gen_random_uuid(), 'test_admin@example.com', 'test_admin', 'admin'),
  ('test_super_admin_' || gen_random_uuid(), 'test_super_admin@example.com', 'test_super_admin', 'super_admin')
RETURNING email, role;

-- Verify all were created
SELECT role, COUNT(*) as count
FROM users
WHERE email LIKE 'test_%@example.com'
GROUP BY role
ORDER BY role;

-- Cleanup
DELETE FROM users WHERE email LIKE 'test_%@example.com';

ROLLBACK;
```

**Expected:**

- All 4 inserts succeed
- Counts: member=1, coordinator=1, admin=1, super_admin=1

---

#### 7. Test Invalid Role Rejection

```sql
-- This should FAIL
INSERT INTO users (clerk_id, email, username, role)
VALUES (
  'test_invalid_' || gen_random_uuid(),
  'test_invalid@example.com',
  'test_invalid',
  'volunteer'  -- Should be rejected
);
```

**Expected Error:**

```
ERROR:  invalid input value for enum user_role: "volunteer"
```

**Verify:**

- ✅ Error message mentions 'volunteer'
- ✅ Insert was rejected

---

### Webhook Integration Validation

#### 8. Test Webhook Handler Pattern

Create a test script to simulate webhook behavior:

**File:** `scripts/test-webhook-pattern.js`

```javascript
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Simulate webhook handler from src/pages/api/webhooks/clerk.ts:126
const publicMetadata = {} // No role specified
const role = (publicMetadata?.role as string) || 'member'

console.log('Testing webhook pattern...')
console.log('publicMetadata:', publicMetadata)
console.log('Extracted role:', role)
console.log('Expected role: member\n')

const testClerkId = `webhook_test_${Date.now()}`

const { data, error } = await supabase
  .from('users')
  .insert({
    clerk_id: testClerkId,
    email: `webhook_test_${Date.now()}@example.com`,
    username: 'webhook_test',
    role, // Should be 'member'
  })
  .select('role')
  .single()

if (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

console.log('✅ Success! Role assigned:', data.role)
console.log(data.role === 'member' ? '✅ PASS' : '❌ FAIL')

// Cleanup
await supabase.from('users').delete().eq('clerk_id', testClerkId)
```

**Run:**

```bash
node scripts/test-webhook-pattern.js
```

**Expected:**

```
Testing webhook pattern...
publicMetadata: {}
Extracted role: member
Expected role: member

✅ Success! Role assigned: member
✅ PASS
```

---

## Sign-Off Checklist

Complete this checklist and initial each item:

### Automated Checks

- [ ] ✅ `node scripts/verify-role-schema.js` passes
- [ ] ✅ `npm test tests/integration/default-role-assignment.test.ts` passes
- [ ] ✅ No errors in migration output messages

### Manual SQL Checks

- [ ] ✅ ENUM contains: member, coordinator, admin, super_admin
- [ ] ✅ ENUM excludes: volunteer
- [ ] ✅ DEFAULT is 'member'::user_role
- [ ] ✅ No users have 'volunteer' role
- [ ] ✅ No users have NULL role

### Functional Tests

- [ ] ✅ Direct insert without role gets 'member'
- [ ] ✅ Insert with 'volunteer' is rejected
- [ ] ✅ All valid roles can be assigned
- [ ] ✅ Webhook pattern works correctly

### Cleanup

- [ ] ✅ Removed all test users created during verification
- [ ] ✅ No orphaned ENUM types (user_role_new)
- [ ] ✅ Database is in clean state

---

## Troubleshooting

### Issue: Verification Script Shows 'volunteer' as DEFAULT

**Symptoms:**

```
⚠️ DEFAULT is "volunteer" - expected "member"
```

**Cause:** Migration step 4 didn't execute or failed

**Fix:**

```sql
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'member'::user_role;
```

Then re-run verification.

---

### Issue: ENUM Still Contains 'volunteer'

**Symptoms:**

```
Current roles in use: [ 'volunteer', 'member' ]
```

**Cause:** Migration step 3 didn't execute completely

**Fix:** Re-run the entire migration 006. It's idempotent and safe to re-run.

---

### Issue: Tests Fail with "invalid input value for enum"

**Symptoms:**

```
Error: invalid input value for enum user_role: "member"
```

**Cause:** ENUM doesn't contain 'member'

**Fix:**

```sql
ALTER TYPE user_role ADD VALUE 'member';
ALTER TYPE user_role ADD VALUE 'admin';
```

Then re-run tests.

---

### Issue: User Still Has 'volunteer' Role

**Symptoms:**

```
❌ 1 user(s) with 'volunteer' role
```

**Cause:** Migration step 2 didn't execute

**Fix:**

```sql
UPDATE users
SET role = 'member'
WHERE role = 'volunteer';
```

Then verify no volunteer users remain.

---

### Issue: user_role_new Type Exists

**Symptoms:**

```
SELECT typname FROM pg_type WHERE typname LIKE 'user_role%';

typname
---------
user_role
user_role_new
```

**Cause:** Migration step 3 was interrupted

**Fix:**

```sql
DROP TYPE user_role_new CASCADE;
```

Then re-run migration 006.

---

## Success Confirmation

When ALL of the following are true, migration 006 is confirmed successful:

✅ **Automated verification passes**
✅ **All integration tests pass**
✅ **ENUM contains correct values**
✅ **DEFAULT is 'member'::user_role**
✅ **No users with 'volunteer' or NULL roles**
✅ **Test user creation assigns 'member'**
✅ **Webhook pattern works correctly**

**Status:** [ ] Migration 006 Verified and Complete

**Signed:** **********\_********** **Date:** **********\_**********

---

## Next Steps After Verification

1. **Commit changes to git:**

   ```bash
   git add scripts/migrations/006_complete_member_migration.sql
   git add scripts/*.js
   git add tests/integration/default-role-assignment.test.ts
   git add docs/*.md
   git commit -m "feat: implement default member role fix (migration 006)"
   ```

2. **Monitor production:**

   - Watch for new user sign-ups
   - Check webhook logs for any errors
   - Verify new users get 'member' role

3. **Update team documentation:**

   - Share migration success with team
   - Document new role system expectations
   - Archive old migration scripts (004, 005)

4. **Optional cleanup:**
   - Archive old documentation about 'volunteer' role
   - Update README if it mentions roles
   - Clean up any deprecated scripts

---

**Checklist Version:** 1.0
**Last Updated:** 2025-10-04
**Prepared By:** Claude Code
