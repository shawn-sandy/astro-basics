# Clerk Roles Reset Guide

**Quick Reference**: Reset your Clerk organization roles to defaults in 3 steps. No code changes required.

## TL;DR - Reset Steps

| Step | Action                          | Location                                                                         |
| ---- | ------------------------------- | -------------------------------------------------------------------------------- |
| 1    | Navigate to Roles & Permissions | Clerk Dashboard → Your Application → Organization Settings → Roles & Permissions |
| 2    | Remove custom roles             | Delete any roles beyond `org:admin` and `org:member`                             |
| 3    | Reassign members                | Assign members to `org:admin` or `org:member`                                    |

**Result**: Your organization will use Clerk's default two-role system.

---

## Default Role Reference

### Role Comparison Matrix

| Capability      | `org:admin` | `org:member` |
| --------------- | ----------- | ------------ |
| Manage settings | ✅          | ❌           |
| Invite members  | ✅          | ❌           |
| Remove members  | ✅          | ❌           |
| Assign roles    | ✅          | ❌           |
| Manage billing  | ✅          | ❌           |
| View members    | ✅          | ✅           |
| View billing    | ✅          | ✅           |

### In This Codebase

The application uses role-based UI controls:

- **Middleware** ([src/middleware.ts:272](../src/middleware.ts#L272)) - Stores role in `locals.userRole`
- **Role Utility** ([src/utils/clerk-roles.ts](../src/utils/clerk-roles.ts)) - Permission checking functions
- **Organization Page** ([src/pages/organization/index.astro](../src/pages/organization/index.astro)) - Conditional action cards based on permissions

**Admin users see**: Members, Settings, Billing, Integrations action cards
**Member users see**: Members (view only), Billing (view only) action cards

---

## Step-by-Step Reset Process

### Step 1: Access Clerk Dashboard

1. Sign in to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to: **Organization Settings** → **Roles & Permissions**

### Step 2: Inventory Current Roles

Document any custom roles before deletion:

- Role name
- Permission set
- Number of members assigned
- Business purpose (for future reference)

### Step 3: Remove Custom Roles

For each custom role:

1. Click the role name to view details
2. Click **Delete Role** button
3. Confirm deletion

**Warning**: Members assigned to deleted roles will lose their current role assignment.

### Step 4: Verify Default Roles Exist

Ensure these two roles are present:

#### `org:admin`

- **All permissions enabled** (8 checkboxes checked)
- Default role for organization creators

#### `org:member`

- **Limited permissions**: Only "Read members" and "Read billing" enabled
- Default role for invited members

If permissions were modified, reset them to match above.

### Step 5: Reassign Members

1. Go to **Organization Settings** → **Members**
2. For each member previously assigned to custom roles:
   - Click member name
   - Change role to `org:admin` or `org:member`
   - Save changes

**Guideline**:

- Assign `org:admin` to: Organization owners, technical leads, administrators
- Assign `org:member` to: Regular team members, contributors

### Step 6: Force Session Refresh

Users may need to re-login to receive updated role claims:

1. Ask affected users to sign out and sign back in
2. Alternatively, wait for session token expiration (typically 1 hour)
3. Verify role badge appears correctly on organization page

---

## Testing Role-Based Access

After resetting roles, verify the implementation works:

### Test as Admin (`org:admin`)

1. Sign in with admin credentials
2. Navigate to `/organization`
3. **Expected behavior**:
   - Role badge shows "Administrator" in green
   - See 4 action cards: Members, Settings, Billing, Integrations
   - Card descriptions show "Manage" wording
   - Full access to organization management

### Test as Member (`org:member`)

1. Sign in with member credentials
2. Navigate to `/organization`
3. **Expected behavior**:
   - Role badge shows "Member" in blue
   - See 2 action cards: Members, Billing
   - Card descriptions show "View" wording
   - Limited read-only access

### Test Edge Cases

- **No organization**: Should show "Create Organization" prompt
- **No role assigned**: Should default to member-level permissions
- **Multiple organizations**: Role badge updates when switching orgs

---

## Code Implementation Reference

The codebase implements role-based access control through a utility module:

### Role Checking Functions

```typescript
import { isOrgAdmin, hasPermission, formatRoleLabel } from '#utils/clerk-roles'

// Check if user is admin
const isAdmin = isOrgAdmin(Astro.locals.userRole)

// Check specific permission
const canInvite = hasPermission(Astro.locals.userRole, 'canInviteMembers')

// Format role for display
const label = formatRoleLabel(Astro.locals.userRole) // "Administrator" or "Member"
```

### Component Usage Example

```astro
---
import { hasPermission } from '#utils/clerk-roles'

const userRole = Astro.locals.userRole
const canManageSettings = hasPermission(userRole, 'canManageSettings')
---

{
  canManageSettings && (
    <a href="/organization/settings" class="action-card">
      <h3>Settings</h3>
      <p>Configure organization settings</p>
    </a>
  )
}
```

**Key Pattern**: Permission checks happen at compile time (Astro components) or request time (middleware), ensuring role logic is enforced server-side.

---

## Troubleshooting

### Issue: Role badge not appearing

**Cause**: User not assigned to an organization role

**Solution**:

1. Verify user is organization member in Clerk Dashboard
2. Assign role (`org:admin` or `org:member`)
3. Have user sign out and sign back in

### Issue: Wrong action cards showing

**Cause**: Stale session token with old role claim

**Solution**:

1. Clear browser cookies
2. Sign out and sign back in
3. Wait for token expiration (1 hour) and refresh page

### Issue: Permission denied errors

**Cause**: Role permissions were modified from defaults

**Solution**:

1. Go to Roles & Permissions in Clerk Dashboard
2. Reset `org:admin` to have all permissions
3. Reset `org:member` to have only "Read members" and "Read billing"

### Issue: Custom role still referenced in code

**Cause**: Hardcoded role checks in codebase (not expected)

**Solution**:

1. Search codebase: `grep -r "role === 'custom_role'" src/`
2. Replace with permission-based checks using utility functions
3. Use `hasPermission()` instead of direct role comparison

---

## Migration Checklist

Use this checklist when resetting roles:

- [ ] Document all custom roles and their purposes
- [ ] Record member assignments to custom roles
- [ ] Delete custom roles in Clerk Dashboard
- [ ] Verify `org:admin` has all permissions enabled
- [ ] Verify `org:member` has only read permissions enabled
- [ ] Reassign all members to default roles
- [ ] Test admin access to organization page
- [ ] Test member access to organization page
- [ ] Verify role badge displays correctly
- [ ] Confirm action cards appear based on role
- [ ] Check server logs for role-related errors
- [ ] Update internal documentation about roles

---

## When to Use Custom Roles

**Current system is sufficient if you need**:

- Two permission levels (admin vs member)
- Simple organization hierarchy
- Standard access patterns

**Consider custom roles only if you need**:

- More than two permission tiers
- Industry-specific role names (e.g., "moderator", "editor")
- Granular permission combinations not covered by defaults

**Best Practice**: Start with default roles. Add custom roles only when business requirements clearly justify the added complexity.

---

## Related Documentation

- [Clerk Official Docs - Roles & Permissions](https://clerk.com/docs/organizations/roles-permissions)
- [Role Utility API Reference](../src/utils/clerk-roles.ts) - JSDoc documentation
- [Authentication Developer Guide](./AUTHENTICATION_DEVELOPER_GUIDE.md)
- [Clerk Configuration Utility](./utilities/clerk-configuration-utility.md)

## Support Resources

**Internal**:

- Middleware: [src/middleware.ts](../src/middleware.ts)
- Role utilities: [src/utils/clerk-roles.ts](../src/utils/clerk-roles.ts)
- Organization page: [src/pages/organization/index.astro](../src/pages/organization/index.astro)

**External**:

- [Clerk Support](https://clerk.com/support)
- [Clerk Community Discord](https://clerk.com/discord)

---

**Last Updated**: 2025-10-02
**Guide Version**: 2.0 (Simplified with role-based UI implementation)
