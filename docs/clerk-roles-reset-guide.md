# Clerk Roles Reset Guide

## Overview

This guide provides instructions for resetting Clerk organization roles to their default configuration. Your codebase is already compatible with Clerk's default roles - no code changes are required.

## Current State Analysis

### ✅ Code Compatibility

Your codebase uses Clerk's standard role system correctly:

- **Middleware**: [src/middleware.ts:271](../src/middleware.ts#L271) - Extracts role from session claims generically
- **TypeScript**: [src/env.d.ts:10](../src/env.d.ts#L10) - Flexible type definition for userRole
- **Components**: [src/pages/organization/index.astro](../src/pages/organization/index.astro) - Uses Clerk's built-in `<OrganizationProfile>` component

**Key Finding**: Your application doesn't hardcode any custom role checks. All role logic is handled by Clerk's built-in components and session claims.

## Clerk Default Roles

Clerk provides two default organization roles out of the box:

### 1. `org:admin`

- **Permissions**: Full access to organization resources
- **Capabilities**:
  - Manage organization settings
  - Invite/remove members
  - Assign roles to members
  - Manage billing
  - Full CRUD on organization resources

### 2. `org:member`

- **Permissions**: Limited access to organization resources
- **Capabilities**:
  - Read member list
  - Read billing information
  - Access organization resources (based on your app's logic)
  - **Cannot**: Manage organization, invite members, or change settings

**Note**: For applications created before December 2023, the roles were named `admin` and `basic_member`.

## Reset Process

### Phase 1: Clerk Dashboard Configuration (Required)

**You must perform these steps in the Clerk Dashboard:**

1. **Navigate to Role Settings**

   ```
   Clerk Dashboard → Your Application → Organization Settings → Roles & Permissions
   ```

2. **Identify Custom Roles**

   - Review the list of roles
   - Note any roles beyond `org:admin` and `org:member`

3. **Remove Custom Roles**

   - Delete each custom role you've created
   - **Warning**: This will affect existing members assigned to these roles
   - Members with custom roles will need to be reassigned to default roles

4. **Verify Default Roles**

   - Confirm `org:admin` exists with full permissions
   - Confirm `org:member` exists with limited permissions (read members, read billing)

5. **Reset Modified Permissions** (if applicable)

   - If you've modified the default role permissions, reset them to:
     - **`org:admin`**: All permissions enabled
     - **`org:member`**: Only "Read members" and "Read billing" enabled

6. **Reassign Members**
   - Review organization members
   - Reassign anyone with custom roles to either:
     - `org:admin` for administrators
     - `org:member` for regular users

### Phase 2: Code Verification (Optional)

**No code changes are needed**, but you can verify compatibility:

#### Middleware Compatibility Check

Your middleware already handles roles generically:

```typescript
// src/middleware.ts:271
locals.userRole = auth().sessionClaims?.role as string
```

This works with any role name, including the defaults.

#### Component Compatibility Check

Your organization page uses Clerk's built-in components:

```astro
<OrganizationProfile client:load />
```

These components automatically adapt to your role configuration in Clerk Dashboard.

#### TypeScript Type Safety

Your type definitions are flexible:

```typescript
// src/env.d.ts
interface Locals {
  userId?: string | null
  userRole?: string // ✅ Accepts any role string
  clerkToken?: string | null
}
```

### Phase 3: Testing

After resetting roles in Clerk Dashboard:

1. **Test Admin Access**

   - Sign in as an organization admin
   - Verify access to `/organization` page
   - Confirm ability to manage members via `<OrganizationProfile>`

2. **Test Member Access**

   - Sign in as an organization member
   - Verify limited access to organization features
   - Confirm inability to manage organization settings

3. **Test Role Display**
   - Check that `locals.userRole` contains correct values
   - Verify role is properly extracted from session claims

## Migration Considerations

### If You Had Custom Roles

**Before deletion, document:**

- Custom role names
- Custom permissions assigned to each role
- Number of users assigned to each custom role
- Business logic that may depend on custom roles

**After deletion:**

- Map custom roles to default roles:
  - High-privilege custom roles → `org:admin`
  - Low-privilege custom roles → `org:member`
- Communicate role changes to affected users
- Update any external documentation referencing custom roles

### Impact on Existing Members

- Members will retain organization membership
- Members will need new role assignments
- No data loss occurs
- Session tokens may need refresh (users may need to re-login)

## Role-Based Access Control in Your App

Your application uses Clerk's role system in these areas:

### 1. Middleware Role Storage

```typescript
// src/middleware.ts
if (auth().userId) {
  locals.userId = auth().userId
  locals.userRole = auth().sessionClaims?.role as string
}
```

**Usage**: Stores role in request context for server-side access control.

### 2. Component-Level Access

```astro
<!-- src/pages/organization/index.astro -->
<OrganizationProfile client:load />
```

**Usage**: Clerk components automatically enforce role-based permissions.

### 3. Protected Routes

```typescript
// src/middleware.ts
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)', '/organization(.*)'])
```

**Usage**: Routes are protected by authentication, not specific roles. This means both `org:admin` and `org:member` can access these routes (role-specific restrictions are handled within components).

## Best Practices

### 1. Use Default Roles When Possible

- Default roles cover most use cases
- Easier to maintain and understand
- Better compatibility with Clerk's built-in components
- Reduced complexity in codebase

### 2. When to Consider Custom Roles

Only create custom roles if you need:

- More than two permission levels
- Granular permissions beyond admin/member
- Industry-specific role names (e.g., "moderator", "editor")

### 3. Role Naming Conventions

If you add custom roles in the future:

- Use the `org:` prefix: `org:moderator`
- Use lowercase with underscores: `org:content_editor`
- Be descriptive but concise
- Document permissions clearly

### 4. Permission Management

- Keep permissions as simple as possible
- Avoid overlapping permission sets
- Document why each permission exists
- Review permissions quarterly

## Troubleshooting

### Issue: Role Not Appearing in Session Claims

**Symptoms**: `locals.userRole` is undefined or null

**Solutions**:

1. Check user is actually a member of an organization
2. Verify user has been assigned a role in Clerk Dashboard
3. Clear session and re-login to get fresh token
4. Check Clerk Dashboard → Sessions → Session Tokens to verify role claim exists

### Issue: Permission Denied After Role Reset

**Symptoms**: Users can't access previously available features

**Solutions**:

1. Verify user's new role assignment in Clerk Dashboard
2. Check if role has required permissions enabled
3. Ensure user has re-logged in to refresh session token
4. Review your app's permission checks (if any)

### Issue: "Unknown Role" Errors

**Symptoms**: Application logs show unrecognized role values

**Solutions**:

1. This shouldn't happen with generic role handling
2. Check for hardcoded role checks in your codebase (use grep):
   ```bash
   grep -r "role === 'custom_role'" src/
   ```
3. Review any third-party integrations expecting specific role names

## Verification Checklist

After resetting to default roles, verify:

- [ ] Only `org:admin` and `org:member` roles exist in Clerk Dashboard
- [ ] All organization members have been reassigned to default roles
- [ ] Admins can access full organization management features
- [ ] Members have appropriate limited access
- [ ] No console errors related to roles appear
- [ ] `locals.userRole` correctly reflects assigned role
- [ ] Organization pages load without errors
- [ ] Role-based UI elements display correctly

## Related Documentation

- [Clerk Official Docs - Roles & Permissions](https://clerk.com/docs/organizations/roles-permissions)
- [Authentication Developer Guide](./AUTHENTICATION_DEVELOPER_GUIDE.md)
- [Clerk Configuration Utility](./utilities/clerk-configuration-utility.md)
- [Clerk-Supabase Integration](./integration/clerk-supabase-integration.md)

## Support

### Internal Resources

- Middleware implementation: [src/middleware.ts](../src/middleware.ts)
- Organization page: [src/pages/organization/index.astro](../src/pages/organization/index.astro)
- TypeScript types: [src/env.d.ts](../src/env.d.ts)

### External Resources

- [Clerk Support](https://clerk.com/support)
- [Clerk Community Discord](https://clerk.com/discord)
- [Clerk Documentation](https://clerk.com/docs)

## Changelog

- **2025-10-02**: Initial guide created for resetting roles to Clerk defaults
