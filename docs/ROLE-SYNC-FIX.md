# User Role Synchronization Fix

**Issue:** Users syncing to Supabase were missing their role from Clerk's `publicMetadata.role`

**Fixed:** 2025-10-03

## Changes Made

### 1. Database Migration

**File:** [scripts/migrations/003_add_user_role_column.sql](../scripts/migrations/003_add_user_role_column.sql)

Added `role` column to the `users` table:

- Default value: `'member'`
- Constraint: Only allows valid roles (`member`, `volunteer`, `coordinator`, `admin`, `super_admin`)
- Indexed for performance on role-based queries

### 2. Code Updates

#### User Utility Function

**File:** [src/utils/user.ts](../src/utils/user.ts)

Updated `buildUserData()` to extract role from Clerk's `publicMetadata.role`:

```typescript
const role = (user.publicMetadata?.role as string) || 'member'
```

#### Webhook Handler

**File:** [src/pages/api/webhooks/clerk.ts](../src/pages/api/webhooks/clerk.ts)

Updated both `user.created` and `user.updated` event handlers to sync role from Clerk.

#### Manual Sync Endpoint

**File:** [src/pages/api/user/sync.ts](../src/pages/api/user/sync.ts)

Automatically fixed - uses `buildUserData()` utility which now includes role extraction.

## How to Apply

### Step 1: Run Database Migration

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/migrations/003_add_user_role_column.sql`
3. Paste and execute

**Option B: Via Command Line**

```bash
# Using psql (requires Supabase connection string)
psql $SUPABASE_URL -f scripts/migrations/003_add_user_role_column.sql
```

### Step 2: Configure Clerk Session Claims

1. Go to Clerk Dashboard → Your App → Sessions → Customize session token
2. Update session claims to include role:

```json
{
  "role": "{{user.public_metadata.role}}",
  "org_role": "{{user.organization_memberships.0.role}}",
  "org_id": "{{user.organization_memberships.0.id}}"
}
```

**Important:** The `role` claim now pulls from `publicMetadata.role` instead of being hardcoded to `"authenticated"`.

### Step 3: Set User Roles in Clerk (If Needed)

If your users don't have roles set in their `publicMetadata`, you'll need to set them:

**Via Clerk Dashboard:**

1. Go to Users → Select User
2. Click "Metadata" tab
3. Add to Public Metadata:

```json
{
  "role": "volunteer"
}
```

**Via Clerk Backend API:**

```typescript
import { clerkClient } from '@clerk/astro/server'

await clerkClient.users.updateUser('user_xxx', {
  publicMetadata: {
    role: 'volunteer',
  },
})
```

### Step 4: Trigger User Sync

**Option A: Automatic (via Webhook)**

- Webhook will automatically sync on next `user.updated` event
- Or manually update user in Clerk Dashboard to trigger webhook

**Option B: Manual Sync API**

```bash
# Authenticated users can sync themselves
curl -X POST https://your-domain.com/api/user/sync \
  -H "Cookie: __session=your-session-cookie"
```

## Verification

### Check Database

```sql
-- View user roles
SELECT clerk_id, email, role, username
FROM users
ORDER BY created_at DESC;

-- Count users by role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

### Test Role-Based Access

```typescript
// In Astro component
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('clerk_id', Astro.locals.userId)
  .single()

console.log('User role:', user.role) // Should show actual role, not undefined
```

## Default Role Strategy

- **New users without explicit role:** `'member'`
- **Organization roles:** Use `clerk_org_role` from `organization_memberships` table
- **User-level roles:** Use `role` from `users` table

## Valid Roles

The database constraint allows these roles:

- `member` (default)
- `volunteer`
- `coordinator`
- `admin`
- `super_admin`

To add more roles, update the constraint in migration 003 or create a new migration.

## Troubleshooting

### Issue: Users still showing 'member' instead of 'volunteer'

**Cause:** Role not set in Clerk `publicMetadata`

**Solution:**

1. Check Clerk Dashboard → User → Metadata
2. Ensure `publicMetadata.role` is set
3. Trigger resync via webhook or manual sync API

### Issue: Database error "invalid role"

**Cause:** Trying to set a role not in the CHECK constraint

**Solution:**

1. Either change user role to valid value
2. Or update constraint to allow new role:

```sql
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('member', 'volunteer', 'coordinator', 'admin', 'super_admin', 'your_new_role'));
```

### Issue: Session claims don't include role

**Cause:** Clerk session token customization not applied

**Solution:**

1. Verify session claims configuration in Clerk Dashboard
2. Sign out and sign back in to get new session token
3. Check token claims: `console.log(Astro.locals.auth().sessionClaims)`

## Related Documentation

- [Clerk-Supabase Setup Guide](./clerk-supabase-setup-guide.md)
- [Clerk Roles Utility](../src/utils/clerk-roles.ts)
- [User Utility Functions](../src/utils/user.ts)

---

**Version:** 1.0
**Last Updated:** 2025-10-03
**Maintainer:** astro-basics team
