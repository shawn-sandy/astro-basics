# Clerk + Supabase Integration Guide (2025)

**Complete production-ready integration using Clerk's native third-party authentication with Supabase.**

> **Important:** As of April 1st, 2025, the JWT template method is **deprecated**. This guide uses the recommended **native third-party auth integration**.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
- [Implementation Details](#implementation-details)
- [Security & RLS Policies](#security--rls-policies)
- [Troubleshooting](#troubleshooting)
- [Migration from JWT Templates](#migration-from-jwt-templates)

---

## Overview

### How It Works

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│   Browser   │ ──1──>  │    Clerk     │         │   Supabase     │
│             │         │ (Auth)       │         │   (Database)   │
│  Sign In    │ <──2──  │              │         │                │
└─────────────┘         └──────────────┘         └────────────────┘
       │                       │                         │
       │         3. Get Session Token                    │
       └────────────────────>  │                         │
                               │                         │
       ┌───────────────────────┘                         │
       │  4. Pass token via accessToken callback         │
       └─────────────────────────────────────────────>   │
                                                          │
                               5. RLS policies check      │
                                  auth.jwt()->>'sub'      │
                                  for user access         │
```

**Key Benefits of Native Integration:**

- ✅ **No JWT templates** - Use Clerk session tokens directly
- ✅ **Automatic token refresh** - Handled by Supabase client
- ✅ **No shared secrets** - Clerk verifies tokens via JWKS
- ✅ **Simpler setup** - Less configuration, fewer steps
- ✅ **Better performance** - One token for both services

---

## Prerequisites

- [x] **Clerk account** with project created ([clerk.com](https://clerk.com))
- [x] **Supabase project** created ([supabase.com](https://supabase.com))
- [x] **Admin access** to both dashboards
- [x] **Node.js 18+** installed locally
- [x] **Environment variables** access (`.env` file)

---

## Setup Guide

### Phase 1: Clerk Configuration (5 minutes)

#### Step 1: Enable Supabase Integration

1. Go to **Clerk Dashboard** → Your Project
2. Navigate to **Integrations** → **Supabase**
3. Click **"Enable Supabase Integration"**
4. Copy your **Clerk Domain** (e.g., `my-app.clerk.accounts.dev`)

**What this does:**

- Adds `role: "authenticated"` claim to all Clerk JWTs
- Configures Clerk to work with Supabase RLS policies
- Enables automatic JWKS endpoint for token verification

#### Step 2: Configure Webhooks (Optional - Recommended)

Webhooks sync user data to Supabase when users sign up or update profiles.

1. Go to **Webhooks** → **Create Endpoint**
2. **Endpoint URL**: `https://your-domain.com/api/webhooks/clerk`
3. **Events to subscribe**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. **Copy webhook secret** → Save for `.env` file

---

### Phase 2: Supabase Configuration (10 minutes)

#### Step 3: Add Clerk as Third-Party Provider

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Providers**
3. Scroll to **"Third-party Auth"** section
4. Click **"Add Provider"** → Select **"Clerk"**
5. Enter your **Clerk Domain** from Step 1
6. Toggle **"Enable"** → Click **"Save"**

**What this does:**

- Configures Supabase to accept Clerk-signed JWTs
- Sets up JWKS URL for automatic token verification
- Enables `auth.jwt()` function in RLS policies

#### Step 4: Apply Database Migrations

Run the consolidated migration files in Supabase SQL Editor:

**Migration 001: Core Schema**

```bash
# Copy and paste contents from:
scripts/migrations/001_core_schema.sql
```

This creates:

- `users` table with Clerk ID mapping
- `organization_memberships` for multi-tenant support
- `user_preferences` for app-specific settings
- Indexes, triggers, and constraints

**Migration 002: Security Policies**

```bash
# Copy and paste contents from:
scripts/migrations/002_security_policies.sql
```

This enables:

- Row Level Security (RLS) on all tables
- User-level access policies using `auth.jwt()->>'sub'`
- Organization admin policies for member management
- Service role access for webhooks

---

### Phase 3: Environment Variables (5 minutes)

#### Step 5: Update `.env` File

```env
# ============================================================================
# Clerk Configuration
# ============================================================================
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx  # From Clerk Dashboard
CLERK_SECRET_KEY=sk_live_xxxxx              # From Clerk Dashboard
CLERK_WEBHOOK_SECRET=whsec_xxxxx            # From webhook setup (Step 2)

# ============================================================================
# Supabase Configuration
# ============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Public keys (for client-side usage)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find keys:**

- **Clerk**: Dashboard → API Keys
- **Supabase**: Dashboard → Settings → API
  - `SUPABASE_ANON_KEY` = "anon public" key
  - `SUPABASE_SERVICE_ROLE_KEY` = "service_role" key (keep secret!)

> **Note:** No `SUPABASE_JWT_SECRET` needed for native integration!

---

## Implementation Details

### Architecture Overview

The integration uses **3 different Supabase client patterns** depending on context:

#### 1. Server-Side Client (API Routes)

Used in API endpoints where you have Clerk token from middleware:

```typescript
// src/libs/supabase-native.ts
export function createServerSupabaseClient(token: string | null): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

**Usage in API routes:**

```typescript
// src/pages/api/user/profile.ts
export const GET: APIRoute = async ({ locals }) => {
  const { clerkToken } = locals // From middleware

  const supabase = createServerSupabaseClient(clerkToken)

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', locals.userId)
    .single()

  return new Response(JSON.stringify(data))
}
```

#### 2. Authenticated Client (React Components)

Used in client-side React components with live auth state:

```typescript
// src/libs/supabase-native.ts
export function createAuthenticatedSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database> | null {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    accessToken: getToken, // ← Automatically called before each request
  })
}
```

**Usage in React:**

```typescript
// src/hooks/useSupabase.tsx
import { useAuth } from '@clerk/astro/react'
import { createAuthenticatedSupabaseClient } from '#libs/supabase-native'

export function useSupabase() {
  const { getToken, userId, isLoaded } = useAuth()

  const supabase = useMemo(() => createAuthenticatedSupabaseClient(getToken), [getToken])

  return { supabase, userId, isLoaded }
}
```

#### 3. Service Role Client (Webhooks & Admin)

Used for operations that bypass RLS (user creation, admin tasks):

```typescript
// src/libs/supabase-native.ts
export function getSupabaseServiceRole(): SupabaseClient<Database> | null {
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}
```

**Usage in webhooks:**

```typescript
// src/pages/api/webhooks/clerk.ts
export const POST: APIRoute = async ({ request }) => {
  const supabase = getSupabaseServiceRole()

  // Service role bypasses RLS - can create/update any user
  const { error } = await supabase.from('users').upsert({
    clerk_id: evt.data.id,
    email: evt.data.email_addresses[0].email_address,
    // ...
  })
}
```

---

### Middleware Configuration

The middleware extracts Clerk's session token and makes it available to all server components and API routes:

```typescript
// src/middleware.ts (simplified)
const authMiddleware = clerkMiddleware(async (auth, context, next) => {
  const { locals } = context

  if (auth().userId) {
    locals.userId = auth().userId

    // Get Clerk session token for Supabase
    const token = await auth().getToken()
    locals.clerkToken = token // ← Available in all API routes

    // Extract org context from JWT claims
    const claims = auth().sessionClaims
    locals.userRole = claims?.org_role
    locals.orgId = claims?.org_id
  }

  return next()
})
```

**Available in all routes:**

```typescript
export const GET: APIRoute = async ({ locals }) => {
  const { userId, clerkToken, userRole, orgId } = locals
  // Use these for authenticated Supabase queries
}
```

---

## Security & RLS Policies

### Understanding RLS with Clerk JWTs

Supabase RLS policies use `auth.jwt()` to access Clerk's JWT claims:

```sql
-- Get Clerk user ID from JWT
(select auth.jwt()->>'sub')::text

-- Get organization ID
(select auth.jwt()->>'org_id')::text

-- Get organization role
(select auth.jwt()->>'org_role')::text
```

### Common RLS Policy Patterns

#### 1. Users Can Only See Their Own Data

```sql
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (((select auth.jwt())->>'sub')::text = clerk_id);
```

**How it works:**

1. User makes query: `SELECT * FROM users`
2. Supabase extracts `sub` claim from JWT (Clerk user ID)
3. Only returns rows where `clerk_id` matches JWT `sub`
4. User sees only their own data

#### 2. Organization Admins See All Org Members

```sql
CREATE POLICY "org_memberships_select_org_admin" ON organization_memberships
    FOR SELECT
    USING (
        clerk_org_id IN (
            SELECT clerk_org_id FROM organization_memberships
            WHERE user_id IN (
                SELECT id FROM users
                WHERE clerk_id = ((select auth.jwt())->>'sub')::text
            )
            AND clerk_org_role = 'org:admin'
        )
    );
```

**How it works:**

1. Finds user's ID from JWT `sub` claim
2. Checks if user is `org:admin` in any organization
3. Returns all memberships for those organizations
4. Regular members only see their own membership

#### 3. Service Role Bypasses All RLS

```sql
CREATE POLICY "users_service_all" ON users
    FOR ALL
    USING ((select auth.role()) = 'service_role');
```

**When to use:**

- Webhook handlers (creating users)
- Admin operations (data exports)
- Background jobs (cleanup tasks)

### Performance Optimization

**Always use `SELECT` wrapper** for `auth.jwt()` and `auth.role()`:

```sql
-- ❌ BAD - Evaluated for every row
USING (auth.jwt()->>'sub' = clerk_id)

-- ✅ GOOD - Evaluated once per query
USING (((select auth.jwt())->>'sub')::text = clerk_id)
```

**Why:** The `SELECT` wrapper ensures the function is called once and cached, rather than re-evaluated for each row.

---

## Troubleshooting

### Common Issues

#### 1. "JWT verification failed"

**Symptoms:**

- Queries return empty results despite data existing
- Console errors about invalid JWTs

**Solutions:**

- ✅ Verify Clerk domain is correct in Supabase third-party auth settings
- ✅ Check that Supabase integration is enabled in Clerk dashboard
- ✅ Ensure `role: "authenticated"` claim exists in JWT

**Debug:**

```typescript
// Check JWT claims
const token = await auth().getToken()
console.log('Token:', token)

// Decode (use jwt.io or jwt-decode library)
const claims = JSON.parse(atob(token.split('.')[1]))
console.log('Claims:', claims)
```

#### 2. "RLS policy denies access"

**Symptoms:**

- Authenticated users can't access their own data
- `401 Unauthorized` or empty results

**Solutions:**

- ✅ Verify RLS policies use `auth.jwt()->>'sub'` (not `auth.uid()`)
- ✅ Check that user exists in `users` table
- ✅ Ensure `clerk_id` column matches JWT `sub` claim

**Debug in Supabase SQL Editor:**

```sql
-- Test RLS policy manually
SELECT
    (select auth.jwt()->>'sub') as jwt_sub,
    clerk_id,
    clerk_id = (select auth.jwt()->>'sub')::text as matches
FROM users;
```

#### 3. "Token not refreshing"

**Symptoms:**

- Queries fail after 5-10 minutes
- Token expiration errors

**Solutions:**

- ✅ Ensure `accessToken` callback is used in client creation
- ✅ Verify Clerk session is active (check `useAuth().isLoaded`)
- ✅ Check browser console for Clerk session errors

**Debug:**

```typescript
const { getToken } = useAuth()

// Test token refresh
setInterval(async () => {
  const token = await getToken()
  console.log('Token refreshed at:', new Date().toISOString())
}, 60000) // Every minute
```

#### 4. "Webhook user sync not working"

**Symptoms:**

- Users sign up but don't appear in Supabase `users` table
- Webhook endpoint returns errors

**Solutions:**

- ✅ Verify webhook secret matches `.env` value
- ✅ Check webhook endpoint is publicly accessible
- ✅ Ensure service role key has correct permissions
- ✅ Review webhook logs in Clerk dashboard

**Test webhook locally:**

```bash
# Use ngrok for local testing
ngrok http 4321

# Update Clerk webhook URL to ngrok URL
https://abc123.ngrok.io/api/webhooks/clerk
```

---

## Migration from JWT Templates

If you're currently using the **deprecated JWT template method**, follow these steps:

### Step 1: Verify Current Method

Check if you're using JWT templates:

```typescript
// ❌ OLD METHOD - JWT template
const token = await auth().getToken({ template: 'supabase' })

// ✅ NEW METHOD - Native integration
const token = await auth().getToken()
```

### Step 2: Update Clerk Configuration

1. **Remove JWT template** (if exists)

   - Clerk Dashboard → JWT Templates → Delete "supabase" template

2. **Enable native integration**
   - Clerk Dashboard → Integrations → Supabase → Enable

### Step 3: Update Supabase Configuration

1. **Remove custom JWT provider** (if configured)

   - Supabase Dashboard → Authentication → Providers
   - Remove any "Custom JWT" providers

2. **Add Clerk third-party auth**
   - Authentication → Providers → Third-party Auth
   - Add Clerk with your domain

### Step 4: Update Code

**Remove template parameter:**

```typescript
// Before
const token = await auth().getToken({ template: 'supabase' })

// After
const token = await auth().getToken()
```

**Update environment variables:**

```diff
- SUPABASE_JWT_SECRET=your-secret  # Remove this
```

### Step 5: Test Integration

1. Sign in with Clerk
2. Verify JWT contains `role: "authenticated"` claim
3. Test RLS policies work correctly
4. Confirm webhooks still sync users

---

## Best Practices

### 1. Token Management

✅ **DO:**

- Use `accessToken` callback for automatic refresh
- Cache Supabase client instances
- Let Clerk handle token expiration

❌ **DON'T:**

- Store tokens in localStorage
- Manually refresh tokens
- Fetch new tokens on every request

### 2. RLS Policies

✅ **DO:**

- Test policies with real user accounts
- Use `SELECT` wrapper for `auth.jwt()`
- Document policy logic in COMMENT statements

❌ **DON'T:**

- Bypass RLS in client code
- Use service role in client components
- Trust client-side filtering

### 3. Webhook Security

✅ **DO:**

- Verify webhook signatures (use Svix)
- Use service role for webhook operations
- Log webhook events for debugging

❌ **DON'T:**

- Skip signature verification
- Expose webhook endpoints without auth
- Process untrusted webhook data

### 4. Error Handling

✅ **DO:**

- Handle null returns from client factories
- Log errors with context (user ID, table)
- Provide user-friendly error messages

❌ **DON'T:**

- Expose database errors to users
- Ignore authentication errors
- Assume tokens are always valid

---

## Additional Resources

### Documentation

- [Clerk Official Docs](https://clerk.com/docs)
- [Supabase Third-Party Auth Docs](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk-Supabase Integration Blog Post](https://clerk.com/blog/how-clerk-integrates-with-supabase-auth)

### Project Files

- [Migration 001: Core Schema](../../scripts/migrations/001_core_schema.sql)
- [Migration 002: Security Policies](../../scripts/migrations/002_security_policies.sql)
- [Supabase Client Utilities](../../src/libs/supabase-native.ts)
- [Authentication Middleware](../../src/middleware.ts)
- [Webhook Handler](../../src/pages/api/webhooks/clerk.ts)

### Related Guides

- [Database Refactor Documentation](../database/supabase-migration-refactor-plan.md)
- [Multi-Database Support](../guides/database-troubleshooting-guide.md)

---

## Support

If you encounter issues:

1. **Check Clerk Dashboard** → Webhook logs for sync errors
2. **Check Supabase Dashboard** → Logs for query errors
3. **Review this guide** → Troubleshooting section
4. **Create an issue** → [GitHub Issues](https://github.com/your-org/astro-basics/issues)

---

**Last Updated:** 2025-10-06
**Integration Method:** Native Third-Party Auth (2025)
**Deprecated Method:** JWT Templates (before April 2025)
