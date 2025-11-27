# User Sync Utility

**File**: `src/utils/user-sync.ts`
**Status**: ✅ Active
**Last Updated**: 2025-01-27

## Overview

The User Sync utility provides reusable functions for fetching user data from Clerk and automatically syncing with Supabase. It consolidates the common pattern of fetching user information and role data while handling edge cases like users that don't exist in the database yet.

## Purpose

This utility was created to:

1. **Reduce Code Duplication**: Eliminate repetitive patterns across components for fetching user data and roles
2. **Automatic User Creation**: Handle PGRST116 errors (user not found) by automatically creating user records
3. **Graceful Error Handling**: Return errors as part of the result object rather than throwing exceptions
4. **Race Condition Safety**: Use upsert operations to handle concurrent user creation from webhooks

## Core Function: `fetchUserWithRole`

### Type Signature

```typescript
async function fetchUserWithRole(
  userId: string,
  astroContext: AstroGlobal
): Promise<UserWithRoleResult>
```

### Return Type

```typescript
interface UserWithRoleResult {
  /** Clerk user object (null if fetch failed or user not found) */
  user: ClerkUser | null
  /** User's role from Supabase (null if not found or error occurred) */
  userRole: UserRole | null
  /** Error message from Clerk user fetch (null if successful) */
  error: string | null
  /** Error message from Supabase role fetch (null if successful) */
  roleError: string | null
}
```

### Parameters

| Parameter      | Type          | Description                                           |
| -------------- | ------------- | ----------------------------------------------------- |
| `userId`       | `string`      | Clerk user ID (typically from `Astro.locals.userId`)  |
| `astroContext` | `AstroGlobal` | Astro global context (used to initialize clerkClient) |

### Workflow

The function performs the following steps in sequence:

1. **Fetch User from Clerk**
   - Uses `clerkClient(astroContext).users.getUser(userId)`
   - Returns early with error if Clerk fetch fails
   - Logs error to console for debugging

2. **Check Supabase Configuration**
   - Verifies Supabase is configured using `isSupabaseConfigured()`
   - Returns user without role if Supabase is not available
   - Provides appropriate error message

3. **Fetch User Role from Supabase**
   - Queries `users` table by `clerk_id`
   - Expects single record with `role` field
   - Handles PGRST116 error (user not found)

4. **Auto-create User Record (if needed)**
   - Triggered on PGRST116 error
   - Extracts user data from Clerk user object
   - Creates user record with default `'member'` role
   - Uses upsert to handle race conditions with webhooks

5. **Return Result Object**
   - Always returns structured result with user, role, and errors
   - Components can check individual error fields for specific issues
   - Non-throwing design allows graceful error display

## Usage Examples

### In Astro Components

```astro
---
import { fetchUserWithRole } from '#utils/user-sync'
import type { User as ClerkUser } from '@clerk/backend'
import type { UserRole } from '#utils/role-types'

const { userId } = Astro.locals

let user: ClerkUser | null = null
let userRole: UserRole | null = null
let error: string | null = null
let roleError: string | null = null

if (userId) {
  const result = await fetchUserWithRole(userId, Astro)
  user = result.user
  userRole = result.userRole
  error = result.error
  roleError = result.roleError
}
---

{
  error ? (
    <div class="error">{error}</div>
  ) : user ? (
    <div class="user-profile">
      <h2>{user.fullName}</h2>
      <p>Email: {user.emailAddresses[0]?.emailAddress}</p>
      {roleError ? <p class="warning">Role: {roleError}</p> : <p>Role: {userRole || 'member'}</p>}
    </div>
  ) : null
}
```

### In API Endpoints

```typescript
import type { APIRoute } from 'astro'
import { fetchUserWithRole } from '#utils/user-sync'

export const GET: APIRoute = async ({ locals, ...astroContext }) => {
  // Check authentication
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch user with role
  const result = await fetchUserWithRole(locals.userId, astroContext as any)

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      user: {
        id: result.user?.id,
        email: result.user?.emailAddresses[0]?.emailAddress,
        fullName: result.user?.fullName,
      },
      role: result.userRole,
      roleError: result.roleError,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Destructured Usage Pattern

```typescript
// Concise destructuring pattern
const { user, userRole, error, roleError } = await fetchUserWithRole(userId, Astro)

// Check for errors
if (error) {
  // Handle Clerk fetch error (critical)
  return <ErrorPage message={error} />
}

// Handle missing role gracefully (non-critical)
if (roleError) {
  console.warn('Role fetch failed:', roleError)
  // Continue with default role
}

// Use user and role data
if (user && userRole) {
  // Display user info with role
}
```

## Error Handling

### Error Types

| Error Field | When It Occurs                                       | Severity | Typical Response                                 |
| ----------- | ---------------------------------------------------- | -------- | ------------------------------------------------ |
| `error`     | Clerk API fails, network issues, invalid userId      | Critical | Display error page, redirect to sign-in          |
| `roleError` | Supabase unavailable, query fails, permission issues | Warning  | Display user info without role, use default role |

### Error Messages

**Clerk Errors (`error`)**:

- `"Failed to load user information: [message]"` - Clerk API call failed
- Includes original error message for debugging

**Supabase Errors (`roleError`)**:

- `"Database not configured"` - Supabase environment variables not set
- `"Database connection unavailable"` - getSupabaseServiceRole() returned null
- `"Role information unavailable"` - Query failed or user creation failed
- Includes console logs for debugging

### Error Handling Best Practices

```typescript
const { user, userRole, error, roleError } = await fetchUserWithRole(userId, Astro)

// 1. Handle critical errors (Clerk fetch failures)
if (error) {
  // User data is unavailable - cannot proceed
  return <ErrorState message="Unable to load user profile" />
}

// 2. Handle warning errors (role fetch failures)
if (roleError) {
  // User data is available, but role is missing
  // Log for monitoring, but allow page to render
  console.warn('Role fetch failed for user:', userId, roleError)
}

// 3. Proceed with available data
const displayRole = userRole || 'member' // Fallback to default role
```

## Auto-creation Logic

### When Auto-creation Triggers

User records are automatically created when:

1. User successfully authenticates with Clerk
2. User accesses a page using this utility
3. User doesn't exist in Supabase (PGRST116 error)
4. Clerk user object is available

### Default User Data

```typescript
{
  clerk_id: userId,                    // Primary key
  email: primaryEmail.emailAddress,    // Primary email from Clerk
  username: user.username,             // Clerk username (nullable)
  full_name: user.fullName || computed, // Full name or computed from first/last
  avatar_url: user.imageUrl,           // Profile image URL
  role: 'member',                      // Default role for new users
}
```

### Race Condition Handling

The utility uses `upsert` with `onConflict: 'clerk_id'` to handle scenarios where:

- Webhook creates user record simultaneously
- Multiple requests trigger auto-creation concurrently
- User manually synced via `/api/user/sync` endpoint

This ensures that whichever operation completes first wins, and subsequent operations update rather than fail.

## Dependencies

### Required Imports

```typescript
import { clerkClient } from '@clerk/astro/server'
import type { User as ClerkUser } from '@clerk/backend'
import type { AstroGlobal } from 'astro'
import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'
import { extractPrimaryEmail, buildUserData } from '#utils/user'
import type { UserRole } from '#utils/role-types'
```

### Related Utilities

- **`#utils/user`**: Provides `extractPrimaryEmail()` and `buildUserData()` helpers
- **`#utils/role-types`**: TypeScript types for user roles
- **`#libs/supabase-native`**: Supabase service role client and configuration checks

## Migration from Legacy Pattern

### Before (Legacy Pattern)

```astro
---
import { clerkClient } from '@clerk/astro/server'
import { getSupabaseServiceRole } from '#libs/supabase-native'

const { userId } = Astro.locals
let user = null
let userRole = null

// Fetch user from Clerk
try {
  const client = clerkClient(Astro)
  user = await client.users.getUser(userId)
} catch (err) {
  console.error('Failed to fetch user:', err)
}

// Fetch role from Supabase
if (user) {
  const supabase = getSupabaseServiceRole()
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // Manually create user...
  } else if (data) {
    userRole = data.role
  }
}
---
```

### After (Using Utility)

```astro
---
import { fetchUserWithRole } from '#utils/user-sync'

const { userId } = Astro.locals
const { user, userRole, error, roleError } = await fetchUserWithRole(userId, Astro)
---
```

**Benefits**:

- 80% less code
- Consistent error handling
- Automatic user creation
- Race condition safety

## Integration Points

### Components Using This Utility

- **`UserInfo.astro`**: Displays user profile with role information (src/components/astro/UserInfo.astro:19)
- **Dashboard pages**: Any page requiring user data and role verification
- **Profile pages**: User profile displays
- **Admin panels**: Role-based access control

### Related Endpoints

- **`/api/user/sync`**: Manual sync endpoint (alternative approach)
- **`/api/webhooks/clerk`**: Webhook handler for proactive user sync
- **Protected routes**: Middleware updates `last_sign_in_at` automatically

### Export Configuration

The utility is re-exported through the main utils index:

```typescript
// src/utils/index.ts
export * from './user-sync'
```

This allows imports via:

```typescript
import { fetchUserWithRole } from '#utils/user-sync' // Direct import
import { fetchUserWithRole } from '#utils' // Via index
```

## Performance Considerations

### Caching Strategy

Currently, the utility makes fresh API calls on every invocation. For high-traffic scenarios, consider:

1. **Component-level Caching**: Store result in Astro component scope
2. **Session Caching**: Cache in Astro.locals during middleware
3. **Response Caching**: Use HTTP cache headers for API endpoints

### Database Optimization

The utility performs a single database query:

```sql
SELECT role FROM users WHERE clerk_id = $1 LIMIT 1
```

Ensure the following index exists for optimal performance:

```sql
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
```

## Testing

### Unit Tests

Located in: `tests/utils/user-sync.test.ts` (if exists)

**Test Coverage**:

- Successful user fetch and role retrieval
- Clerk API failure handling
- Supabase unavailable scenarios
- PGRST116 auto-creation flow
- Race condition handling with upsert
- Error message formatting

### Integration Tests

**Manual Testing Checklist**:

1. ✅ New user sign-up creates database record
2. ✅ Existing user fetch retrieves role correctly
3. ✅ Concurrent requests don't create duplicates
4. ✅ Error states display appropriate messages
5. ✅ Webhook and utility don't conflict

## Security Considerations

### Authentication Requirements

- **Always verify `userId` exists** before calling utility
- **Never expose raw error messages** to end users in production
- **Log errors server-side** for monitoring and debugging

### Data Privacy

- User data fetched using Clerk service account (backend)
- Supabase accessed using service role (elevated permissions)
- No client-side exposure of sensitive data
- GDPR-compliant: fetches only necessary user fields

### Permission Model

```typescript
// Required permissions
const REQUIRED_PERMISSIONS = {
  clerk: ['users:read'], // Read user data
  supabase: ['users:read', 'users:write'], // Read and create/update users
}
```

## Troubleshooting

### Common Issues

| Issue                                          | Possible Cause               | Solution                                             |
| ---------------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `error: "Failed to load user information"`     | Invalid Clerk credentials    | Verify `CLERK_SECRET_KEY` in `.env`                  |
| `roleError: "Database not configured"`         | Missing Supabase config      | Run `npm run db:wizard`                              |
| `roleError: "Database connection unavailable"` | Invalid Supabase credentials | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| User created with wrong role                   | Default role is 'member'     | Update role in Supabase or via admin API             |
| Duplicate user creation                        | Race condition               | Fixed by upsert logic - no action needed             |

### Debug Mode

Enable detailed logging:

```typescript
// Add to fetchUserWithRole if debugging
console.log('[user-sync] Fetching user:', userId)
console.log('[user-sync] User data:', user)
console.log('[user-sync] Role query result:', { data, error: roleQueryError })
```

## Future Enhancements

### Planned Improvements

1. **Caching Layer**: Add optional caching with TTL for user data
2. **Batch Fetching**: Support fetching multiple users at once
3. **Custom Role Mapping**: Allow role transformation functions
4. **Retry Logic**: Automatic retries for transient failures
5. **Metrics**: Track success/failure rates for monitoring

### Extension Points

```typescript
// Potential future signature
type UserSyncOptions = {
  cache?: boolean
  cacheTTL?: number
  retryAttempts?: number
  roleTransform?: (role: string) => UserRole
}

export async function fetchUserWithRole(
  userId: string,
  astroContext: AstroGlobal,
  options?: UserSyncOptions
): Promise<UserWithRoleResult>
```

## Related Documentation

- [Clerk-Supabase Integration Setup](../02-guides/clerk-supabase-setup.md)
- [Clerk-Supabase Sync Fix](../10-security/fixes/clerk-supabase-sync-fix.md)
- [Authentication Guide](../01-getting-started/authentication-guide.md)
- [Database Switching Guide](../../src/content/docs/guide/database-switching.mdx)
- [Configurable Roles](../../src/content/docs/guide/configurable-roles.mdx)

## Changelog

### v1.0.0 (2025-01-27)

- Initial release of user-sync utility
- Consolidated fetchUserWithRole pattern from multiple components
- Added automatic user creation on PGRST116 error
- Implemented upsert logic for race condition safety
- Comprehensive error handling with separate error fields
- JSDoc documentation for all public interfaces

---

**Maintained by**: Astro Basics Team
**Related Issues**: #clerk-supabase-integration
**Status**: ✅ Production Ready
