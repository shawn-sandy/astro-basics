# Clerk-Supabase Integration Sync Fix

## Issue Summary

The Supabase-Clerk integration was not properly syncing user data, specifically the `last_sign_in_at` timestamp was not being updated when users signed in.

## Root Cause

1. **Webhook Configuration**: The `CLERK_WEBHOOK_SECRET` was set to a dummy value (`whsec_1234567890abcdef`)
2. **Missing Webhook Setup**: Clerk webhooks were not configured to send events to the application
3. **No Automatic Sync**: Users signing in weren't triggering any user data synchronization

## Solutions Implemented

### 1. Enhanced Auth Middleware ✅

**File**: `src/middleware.ts`

Added automatic `last_sign_in_at` timestamp updates when users access protected routes:

```typescript
// Update last sign in timestamp (async, don't block request)
if (isProtectedRoute(context.request)) {
  updateUserLastSignIn(locals.userId).catch(error => {
    console.warn('Background user sync failed:', error)
  })
}
```

**Result**: Users now have their `last_sign_in_at` timestamp updated automatically when accessing `/dashboard/*`, `/forum/*`, or `/organization/*` routes.

### 2. Manual User Sync Endpoint ✅

**File**: `src/pages/api/user/sync.ts`

Created a manual sync endpoint that can be called to sync user data from Clerk to Supabase:

- Fetches current user data from Clerk
- Updates/creates user record in Supabase
- Handles authentication and error cases

### 3. Database Verification ✅

Confirmed the user sync is working:

```sql
SELECT clerk_id, email, last_sign_in_at, updated_at
FROM public.users
WHERE clerk_id = 'user_3064gM5fPfTgXeJ7RPMiqzDbXnE';

-- Result: last_sign_in_at is now being updated properly
-- last_sign_in_at: "2025-08-15 21:18:26.528+00"
-- updated_at: "2025-08-15 21:18:27.635657+00"
```

## Required Next Steps

### 1. Configure Clerk Webhooks (Manual Setup Required)

To complete the integration, you need to configure webhooks in the Clerk Dashboard:

1. **Access Clerk Dashboard**
   - Go to your Clerk project dashboard
   - Navigate to "Webhooks" section

2. **Create Webhook Endpoint**
   - URL: `https://your-domain.com/api/webhooks/clerk` (or for development: use ngrok/similar)
   - Events to subscribe to:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `session.created`

3. **Copy Webhook Secret**
   - Copy the webhook secret from Clerk Dashboard
   - Update `.env` file:

     ```env
     CLERK_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
     ```

### 2. Development Testing with ngrok (Optional)

For local development webhook testing:

```bash
# Install ngrok if not already installed
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, expose local server
ngrok http 4321

# Use the ngrok URL for webhook endpoint in Clerk Dashboard
# Example: https://abc123.ngrok.io/api/webhooks/clerk
```

## Current Status

- ✅ **Last Sign-In Tracking**: Working automatically via middleware
- ✅ **Manual Sync Endpoint**: Available at `/api/user/sync`
- ✅ **Database Schema**: Properly configured with users table
- ⚠️ **Webhook Integration**: Requires manual Clerk Dashboard configuration
- ⚠️ **Real-time Sync**: Limited to protected route access until webhooks are configured

## Testing

1. **Test Automatic Sync**:
   - Sign in to your application
   - Visit a protected route like `/dashboard/messages`
   - Check database: `last_sign_in_at` should be updated

2. **Test Manual Sync**:
   - Call `/api/user/sync` POST endpoint (requires authentication)
   - User data should be synced from Clerk to Supabase

3. **Test Webhook** (after configuration):
   - Trigger user events in Clerk (sign up, profile update, etc.)
   - Check webhook logs in Clerk Dashboard
   - Verify user data updates in Supabase

## Files Modified

- `src/middleware.ts` - Added automatic user sync on protected routes
- `src/pages/api/user/sync.ts` - Manual sync endpoint
- `src/pages/api/webhooks/clerk.ts` - Existing webhook handler (ready for use)

The integration is now working for basic user tracking, with webhooks remaining as the final step for complete real-time synchronization.

## Related Utilities (Added 2025-01-27)

### User Sync Utility

For component-level user fetching and syncing, use the **User Sync Utility** which consolidates the pattern of fetching user data from Clerk and syncing with Supabase:

**File**: `src/utils/user-sync.ts`

**Quick Example**:

```astro
---
import { fetchUserWithRole } from '#utils/user-sync'

const { userId } = Astro.locals
const { user, userRole, error, roleError } = await fetchUserWithRole(userId, Astro)
---
```

**Benefits over manual sync**:

- ✅ 80% less code (1 line vs 40+ lines)
- ✅ Automatic user creation on PGRST116 error
- ✅ Consistent error handling
- ✅ Race condition safety with upsert

**Documentation**:

- Utility Reference: [project-docs/12-utilities/user-sync-utility.md](../12-utilities/user-sync-utility.md)
- Developer Guide: [User Sync Guide](/guide/utilities/user-sync)

### When to Use Each Approach

| Approach                               | Use Case                                           | Timing                  |
| -------------------------------------- | -------------------------------------------------- | ----------------------- |
| **Middleware Sync** (this doc)         | Update `last_sign_in_at` on protected route access | Automatic, background   |
| **User Sync Utility**                  | Fetch user + role in components                    | On-demand, foreground   |
| **Manual Sync API** (`/api/user/sync`) | Client-side data fetching, manual triggers         | On-demand, API call     |
| **Webhooks**                           | Proactive sync on Clerk events                     | Real-time, event-driven |

**Best Practice**: Use all four approaches together for complete coverage:

- Webhooks: Proactive user creation and updates
- Middleware: Automatic timestamp tracking
- User Sync Utility: Component-level data fetching with safety nets
- Manual API: Client-side operations and troubleshooting
