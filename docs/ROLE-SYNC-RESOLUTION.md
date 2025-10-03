# Role Synchronization Issue - Resolution

**Date:** 2025-10-03
**Issue:** Users syncing to Supabase with "volunteer" role instead of default "member" role
**Status:** ✅ Resolved (Pending Manual Migration)

---

## Problem Summary

Users were being synced from Clerk to Supabase with the "volunteer" role, but the expectation was for them to have the default "member" role. Investigation revealed:

1. **Role column exists** in the `users` table (already created)
2. **ENUM type mismatch**: Database uses `user_role` ENUM type that includes:
   - ✅ `volunteer`
   - ✅ `coordinator`
   - ✅ `super_admin`
   - ❌ `member` (missing)
   - ❌ `admin` (missing)
3. **Code was correct**: Webhook and sync endpoints properly extract role from Clerk
4. **Clerk metadata**: User had "volunteer" set in `publicMetadata.role`

---

## Solution Implemented

### Step 1: Updated Clerk User Role ✅

Changed user role from "volunteer" to "member" in Clerk's publicMetadata:

```bash
node scripts/update-user-roles.js
```

**Result:**

- ✅ 1 user updated in Clerk
- Role changed from "volunteer" → "member"

### Step 2: Database ENUM Update (Required)

The database `user_role` ENUM needs to include "member" and "admin" values.

**Migration File:** [`scripts/migrations/004_add_member_to_role_enum.sql`](../scripts/migrations/004_add_member_to_role_enum.sql)

**How to Apply:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the migration SQL:

```sql
-- Add 'member' value to user_role ENUM
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'member'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'member';
    END IF;
END$$;

-- Add 'admin' value to user_role ENUM
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
END$$;

-- Update any NULL roles to 'member'
UPDATE users
SET role = 'member'
WHERE role IS NULL;
```

3. Execute in SQL Editor
4. Verify with:

```sql
SELECT enumlabel as role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;
```

### Step 3: Sync Users from Clerk to Supabase

After the ENUM migration, run:

```bash
node scripts/trigger-user-sync.js
```

This will sync all users from Clerk to Supabase with the correct "member" role.

---

## Code Changes Made

### 1. User Utility Function

**File:** [`src/utils/user.ts`](../src/utils/user.ts#L94-108)

```typescript
export function buildUserData(user: ClerkUser, email: string) {
  // Extract role from publicMetadata, default to 'member' if not set
  const role = (user.publicMetadata?.role as string) || 'member'

  return {
    clerk_id: user.id,
    email,
    username: user.username,
    full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
    avatar_url: user.imageUrl,
    role, // User-level role from Clerk
    metadata: user.publicMetadata || {},
    last_sign_in_at: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
  }
}
```

### 2. Webhook Handler

**File:** [`src/pages/api/webhooks/clerk.ts`](../src/pages/api/webhooks/clerk.ts)

Updated both `user.created` (lines 125-137) and `user.updated` (lines 195-206) to extract and sync role:

```typescript
// Extract role from public metadata, default to 'member'
const role = (public_metadata?.role as string) || 'member'

const userData = {
  clerk_id: id,
  email: validEmail,
  username,
  full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
  avatar_url: image_url,
  role, // User-level role from Clerk
  app_metadata: public_metadata || {},
  last_sign_in_at: last_sign_in_at ? new Date(last_sign_in_at).toISOString() : null,
}
```

### 3. Manual Sync Endpoint

**File:** [`src/pages/api/user/sync.ts`](../src/pages/api/user/sync.ts#L90-91)

Already uses `buildUserData()` utility, so automatically includes role extraction.

---

## Scripts Created

### Utility Scripts

1. **`scripts/check-users-table.js`**

   - Checks if role column exists
   - Displays current user roles
   - Shows total user count

2. **`scripts/check-role-enum.js`**

   - Checks what role values are allowed in ENUM
   - Tests each role value

3. **`scripts/update-user-roles.js`**

   - Updates user roles in Clerk publicMetadata
   - Changes from any role to "member"

4. **`scripts/trigger-user-sync.js`**
   - Manually syncs all users from Clerk to Supabase
   - Bypasses webhooks for immediate sync

### Migration Scripts

1. **`scripts/migrations/003_add_user_role_column.sql`**

   - Adds role column with CHECK constraint
   - (Not needed - column already exists as ENUM)

2. **`scripts/migrations/004_add_member_to_role_enum.sql`**

   - Adds "member" and "admin" to user_role ENUM
   - **Required - run this manually in Supabase Dashboard**

3. **`scripts/run-enum-migration.js`**
   - Displays migration SQL with instructions
   - Helper script for manual execution

---

## Verification Steps

### 1. Check Clerk Roles

```bash
node scripts/update-user-roles.js
```

**Expected output:**

- All users should have role: "member" (or their designated role)

### 2. Check Database ENUM (After Migration)

```bash
node scripts/check-role-enum.js
```

**Expected output:**

```
Testing role values:
  ✓ member - allowed
  ✓ coordinator - allowed
  ✓ admin - allowed
  ✓ super_admin - allowed
```

### 3. Check Users in Supabase (After Sync)

```bash
node scripts/check-users-table.js
```

**Expected output:**

- All users should show role: "member"

### 4. Query Database Directly

```sql
SELECT clerk_id, email, role, created_at
FROM users
ORDER BY created_at DESC;
```

---

## Current Role System

### User-Level Roles (users.role)

Stored in `users` table, synced from Clerk `publicMetadata.role`:

- **member** (default) - Regular user
- **coordinator** - Coordinator user
- **admin** - Administrator
- **super_admin** - Super administrator

### Organization Roles (organization_memberships.clerk_org_role)

Stored in `organization_memberships` table, synced from Clerk organizations:

- **org:admin** - Organization administrator
- **org:member** - Organization member

---

## Configuration Requirements

### Clerk Session Claims

Update Clerk session token customization to include user role:

**Clerk Dashboard → Sessions → Customize session token:**

```json
{
  "role": "{{user.public_metadata.role}}",
  "org_role": "{{user.organization_memberships.0.role}}",
  "org_id": "{{user.organization_memberships.0.id}}"
}
```

**Important:** Change from hardcoded `"role": "authenticated"` to dynamic value.

---

## Default Role Strategy

- **New users without explicit role:** `'member'`
- **Clerk publicMetadata.role not set:** Defaults to `'member'`
- **Organization roles:** Separate from user roles, stored in `organization_memberships` table
- **RLS policies:** Use both user role and organization role for access control

---

## Troubleshooting

### Issue: "invalid input value for enum user_role: member"

**Cause:** Database ENUM doesn't include "member"

**Solution:**

1. Run migration 004 in Supabase SQL Editor
2. Verify ENUM includes "member": `node scripts/check-role-enum.js`
3. Re-sync users: `node scripts/trigger-user-sync.js`

### Issue: Users still showing "volunteer"

**Cause:** Either:

- Clerk still has "volunteer" in publicMetadata
- Sync hasn't been triggered

**Solution:**

1. Update Clerk: `node scripts/update-user-roles.js`
2. Trigger sync: `node scripts/trigger-user-sync.js`
3. Verify: `node scripts/check-users-table.js`

### Issue: Webhook not syncing roles

**Cause:** Session claims not updated in Clerk

**Solution:**

1. Update Clerk session claims (see Configuration Requirements above)
2. Sign out and sign back in to get new token
3. Verify role in session: `console.log(Astro.locals.auth().sessionClaims)`

---

## Related Documentation

- [Clerk-Supabase Setup Guide](./clerk-supabase-setup-guide.md)
- [Role Sync Fix (Original)](./ROLE-SYNC-FIX.md)
- [Clerk Roles Utility](../src/utils/clerk-roles.ts)
- [User Utility Functions](../src/utils/user.ts)

---

**Version:** 1.0
**Last Updated:** 2025-10-03
**Maintainer:** astro-basics team
