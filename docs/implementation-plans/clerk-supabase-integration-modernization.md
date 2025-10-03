# Clerk-Supabase Integration Modernization Plan

**Status**: Critical - Current implementation uses deprecated approach
**Priority**: High - Security and performance implications
**Estimated Effort**: 6-8 hours
**Target Completion**: Before implementing organization role sync

---

## Executive Summary

The current Clerk-Supabase integration uses a **deprecated JWT template approach** that both vendors recommend migrating away from as of April 2025. This plan outlines the migration to the modern **native third-party authentication** method, which offers better security, performance, and eliminates the need for JWT templates.

### Critical Findings

| Issue                  | Current State                     | Recommended State          | Impact                    |
| ---------------------- | --------------------------------- | -------------------------- | ------------------------- |
| **Integration Method** | JWT Templates (deprecated)        | Native Third-Party Auth    | High - Security risk      |
| **JWT Secret Sharing** | Supabase secret shared with Clerk | No secret sharing          | High - Security exposure  |
| **Token Management**   | Manual `getToken('supabase')`     | Automatic via `auth.jwt()` | Medium - Complexity       |
| **User Sync**          | Webhook-based (correct)           | Webhook-based (keep)       | Low - No change needed    |
| **Performance**        | New token per request             | Cached session token       | Medium - Performance gain |

---

## Current Implementation Analysis

### What's Working ✅

1. **Webhook-based user sync** ([src/pages/api/webhooks/clerk.ts](../src/pages/api/webhooks/clerk.ts))

   - Correctly syncs user data to Supabase `users` table
   - Handles `user.created`, `user.updated`, `user.deleted`, `session.created`
   - Proper signature verification with Svix
   - Good error handling

2. **Database schema** ([scripts/supabase-migrations/001_create_users_table.sql](../scripts/supabase-migrations/001_create_users_table.sql))

   - Well-structured users table
   - Proper indexes on clerk_id, email, username
   - Auto-updating timestamps

3. **TypeScript types** ([src/libs/database.types.ts](../src/libs/database.types.ts))
   - Type-safe database operations
   - Proper Insert/Update type definitions

### What's Problematic ❌

1. **JWT Template Approach** ([src/hooks/useSupabase.tsx](../src/hooks/useSupabase.tsx))

   ```typescript
   // DEPRECATED: This approach is outdated
   const token = await session.getToken({ template: 'supabase' })
   ```

   **Issues**:

   - Requires creating custom JWT template in Clerk Dashboard
   - Shares Supabase JWT secret with Clerk (security risk)
   - Deprecated as of April 2025
   - More complex setup process
   - Graceful degradation to anonymous access is a workaround for missing config

2. **Server-Side Implementation** ([src/libs/supabase-server.ts](../src/libs/supabase-server.ts))

   ```typescript
   // PROBLEMATIC: Always uses service role, ignoring user context
   export async function getAuthenticatedSupabase(_context) {
     return createServerSupabaseClient() // Uses SERVICE_ROLE_KEY
   }
   ```

   **Issues**:

   - Bypasses RLS policies entirely
   - No user-scoped access control
   - Comment admits: "This provides full access to the database"
   - Defeats the purpose of RLS

3. **Documentation References Deprecated Method** ([docs/integration/clerk-supabase-integration.md](../docs/integration/clerk-supabase-integration.md))
   - Line 98-104: References JWT template configuration
   - Line 32-36: Describes outdated authentication flow

---

## Recommended Modern Approach

### Overview: Native Third-Party Auth

**How it works**:

1. Configure Clerk as third-party auth provider in Supabase Dashboard
2. Supabase automatically trusts Clerk's session tokens
3. Use `auth.jwt()` to get token data (no custom templates needed)
4. Inject token into Supabase client headers
5. RLS policies automatically enforce based on JWT claims

**Key Benefits**:

- ✅ **No JWT secret sharing** - Better security
- ✅ **No JWT template setup** - Simpler configuration
- ✅ **Automatic role claim** - `"role": "authenticated"` added automatically
- ✅ **Better performance** - Single session token reused
- ✅ **Future-proof** - Official supported method going forward

---

## Migration Strategy

### Phase 1: Supabase Configuration (30 minutes)

**Steps**:

1. **Add Third-Party Auth Provider in Supabase**

   - Navigate to: Supabase Dashboard → Authentication → Providers
   - Click "Third-Party Auth Providers"
   - Add new provider with:
     - **Provider Name**: `clerk`
     - **Issuer**: Visit Clerk's "Connect with Supabase" page for auto-config
     - **JWKS URL**: Automatically filled from issuer

2. **Verify Configuration**

   - Test connection shows success
   - Role claim defaults to `authenticated`

3. **Update RLS Policies** (if needed)
   - Policies should reference `auth.uid()` for user ID
   - Can access additional claims like `user_metadata`, `organization_id`

**Verification**:

- [ ] Third-party provider shows as active
- [ ] Test token validates successfully
- [ ] RLS policies reference correct claims

---

### Phase 2: Update Client-Side Hook (1.5 hours)

**File**: `src/hooks/useSupabase.tsx`

**Changes Required**:

```typescript
// BEFORE (deprecated):
const token = await session.getToken({ template: 'supabase' })

// AFTER (modern):
const tokenData = await session.getToken()
```

**New Implementation Strategy**:

```typescript
/**
 * Modern Clerk-Supabase integration using native third-party auth.
 *
 * As of April 2025, Clerk session tokens automatically include:
 * - `role: "authenticated"` claim for Supabase RLS
 * - `sub` claim mapped to auth.uid()
 * - No JWT template configuration needed
 *
 * @see https://clerk.com/docs/guides/development/integrations/databases/supabase
 * @see https://supabase.com/docs/guides/auth/third-party/clerk
 */
export function useSupabase() {
  // ... existing state

  const initClient = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing')
      }

      // Modern approach: Get token data directly
      const tokenData = session ? await session.getToken() : null

      // Create client with Clerk token in Authorization header
      const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: tokenData
            ? {
                Authorization: `Bearer ${tokenData}`,
              }
            : {},
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })

      setClient(supabaseClient)
      tokenRef.current = tokenData
    } catch (err) {
      console.error('Supabase client initialization failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [session, isLoaded, userId])

  // ... rest of hook
}
```

**Key Changes**:

1. Remove JWT template logic entirely
2. Use `session.getToken()` without parameters
3. Remove "graceful degradation" workarounds
4. Simplify error handling (no template-missing detection)
5. Update JSDoc comments to reflect modern approach

**Verification**:

- [ ] Hook initializes without JWT template errors
- [ ] Authenticated queries work with RLS
- [ ] Token automatically includes `role: authenticated`
- [ ] No console warnings about missing templates

---

### Phase 3: Update Server-Side Client (1 hour)

**File**: `src/libs/supabase-server.ts`

**Current Problem**:

```typescript
// WRONG: Bypasses RLS entirely
export async function getAuthenticatedSupabase(_context) {
  return createServerSupabaseClient() // Uses SERVICE_ROLE_KEY
}
```

**Modern Solution**:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AstroGlobal } from 'astro'

import type { Database } from './database.types'

/**
 * Creates user-scoped Supabase client for server-side operations.
 *
 * Uses Clerk session token to enforce RLS policies. For admin operations
 * that bypass RLS, use `createServiceRoleClient()` instead.
 *
 * @param context - Astro context with Clerk token in locals
 * @returns User-scoped Supabase client or null if not authenticated
 *
 * @example
 * // In Astro page/API route
 * const supabase = await getAuthenticatedSupabase(Astro)
 * if (!supabase) return new Response('Unauthorized', { status: 401 })
 *
 * const { data } = await supabase.from('messages').select('*')
 * // RLS automatically filters to user's data
 */
export async function getAuthenticatedSupabase(
  context: Pick<AstroGlobal, 'locals'>
): Promise<SupabaseClient<Database> | null> {
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase configuration missing')
    return null
  }

  // Get Clerk token from middleware (already fetched via auth().getToken())
  const clerkToken = context.locals.clerkToken

  if (!clerkToken) {
    console.warn('No Clerk token available - user may not be authenticated')
    return null
  }

  // Create user-scoped client with Clerk token
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Creates service role Supabase client for admin operations.
 *
 * ⚠️ WARNING: Bypasses ALL RLS policies. Use only for:
 * - Webhook handlers
 * - Admin operations
 * - Background jobs
 *
 * NEVER expose this client to user-facing code.
 *
 * @returns Service role client with full database access
 */
export function createServiceRoleClient(): SupabaseClient<Database> | null {
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase service role configuration missing')
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Validate Supabase configuration
 */
export function validateSupabaseConfig(): {
  hasUserAccess: boolean
  hasAdminAccess: boolean
} {
  const hasUserAccess = !!(import.meta.env.SUPABASE_URL && import.meta.env.SUPABASE_ANON_KEY)
  const hasAdminAccess = !!(
    import.meta.env.SUPABASE_URL && import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  )

  return { hasUserAccess, hasAdminAccess }
}
```

**Key Changes**:

1. **User-scoped operations** use `getAuthenticatedSupabase()` with Clerk token
2. **Admin operations** explicitly use `createServiceRoleClient()`
3. Clear separation of concerns with warnings
4. Proper TypeScript typing

**Usage Pattern Update**:

```typescript
// BEFORE (wrong - always admin access):
const supabase = await getAuthenticatedSupabase(Astro) // Bypassed RLS!

// AFTER (correct - user-scoped):
const supabase = await getAuthenticatedSupabase(Astro)
if (!supabase) return new Response('Unauthorized', { status: 401 })
// RLS now enforces based on JWT claims

// For admin operations (webhooks, background jobs):
const supabase = createServiceRoleClient()
```

**Verification**:

- [ ] User queries enforce RLS
- [ ] Service role explicitly used only in webhooks
- [ ] Unauthenticated requests return null client
- [ ] Token correctly passed from middleware

---

### Phase 4: Update Middleware (30 minutes)

**File**: `src/middleware.ts`

**Current State** (Line 276):

```typescript
const token = await auth().getToken()
locals.clerkToken = token
```

**Recommended Enhancement**:

```typescript
// Store token for Supabase client creation
const token = await auth().getToken()
locals.clerkToken = token

// Also extract user ID from token for RLS policies
// The token's 'sub' claim is used by Supabase as auth.uid()
if (token) {
  try {
    // Token is already validated by Clerk
    // We just need to ensure it's available for Supabase
    logger.debug('Clerk token available for Supabase RLS', {
      userId: auth().userId,
    })
  } catch (error) {
    logger.warn('Token extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}
```

**Key Points**:

- Middleware already correctly fetches token
- Token's `sub` claim automatically maps to Supabase `auth.uid()`
- No changes needed if using native integration

**Verification**:

- [ ] Token available in `locals.clerkToken`
- [ ] Token includes `sub` claim matching Clerk user ID
- [ ] Token includes `role: "authenticated"` claim

---

### Phase 5: Update RLS Policies (1 hour)

**File**: `scripts/supabase-migrations/002_enable_rls_policies.sql` (create if doesn't exist)

**Modern RLS Policy Pattern**:

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users Table Policies
-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (clerk_id = auth.jwt()->>'sub');

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (clerk_id = auth.jwt()->>'sub')
  WITH CHECK (clerk_id = auth.jwt()->>'sub');

-- Messages Table Policies
-- Policy: Users can view their own messages
CREATE POLICY "Users can view own messages"
  ON public.messages
  FOR SELECT
  USING (clerk_user_id = auth.jwt()->>'sub');

-- Policy: Users can create messages
CREATE POLICY "Users can create messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt()->>'sub');

-- Policy: Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON public.messages
  FOR UPDATE
  USING (clerk_user_id = auth.jwt()->>'sub')
  WITH CHECK (clerk_user_id = auth.jwt()->>'sub');

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.messages
  FOR DELETE
  USING (clerk_user_id = auth.jwt()->>'sub');

-- Service role bypass (for webhooks and admin operations)
-- Policies automatically allow service role key to bypass RLS
```

**Key RLS Concepts**:

1. **`auth.jwt()`** - Accesses the JWT token claims
2. **`auth.jwt()->>'sub'`** - Extracts the `sub` claim (Clerk user ID)
3. **`USING` clause** - Determines which rows are visible/modifiable
4. **`WITH CHECK` clause** - Validates new/updated data

**Advanced Policies for Organization Roles**:

These policies integrate with the role-based access control system ([src/utils/clerk-roles.ts](../../src/utils/clerk-roles.ts)) to provide both application-level and database-level permission enforcement.

```sql
-- ============================================================================
-- ORGANIZATION-LEVEL RLS POLICIES
-- ============================================================================
-- These policies work in conjunction with organization role sync to provide
-- granular access control based on Clerk organization memberships and roles.
-- Requires organization_memberships table from clerk-supabase-role-sync.md
-- ============================================================================

-- Helper function: Get user's database ID from Clerk JWT
CREATE OR REPLACE FUNCTION auth.get_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE clerk_id = auth.jwt()->>'sub'
$$ LANGUAGE SQL STABLE;

-- Helper function: Check if user is org admin
CREATE OR REPLACE FUNCTION auth.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = auth.get_user_id()
      AND om.organization_id = org_id
      AND om.role = 'org:admin'
  )
$$ LANGUAGE SQL STABLE;

-- Helper function: Check if user is org member (any role)
CREATE OR REPLACE FUNCTION auth.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = auth.get_user_id()
      AND om.organization_id = org_id
  )
$$ LANGUAGE SQL STABLE;

-- Helper function: Get user's role in organization
CREATE OR REPLACE FUNCTION auth.get_org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT om.role
  FROM public.organization_memberships om
  WHERE om.user_id = auth.get_user_id()
    AND om.organization_id = org_id
  LIMIT 1
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- EXAMPLE: Organization-scoped content table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID REFERENCES public.users(id),
  is_internal BOOLEAN DEFAULT false, -- Only admins can see internal content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organization_content ENABLE ROW LEVEL SECURITY;

-- Policy: All members can view public content
CREATE POLICY "Members can view org content"
  ON public.organization_content
  FOR SELECT
  USING (
    auth.is_org_member(organization_id)
    AND (
      is_internal = false
      OR auth.is_org_admin(organization_id) -- Admins can see internal content
    )
  );

-- Policy: Members can create content
CREATE POLICY "Members can create content"
  ON public.organization_content
  FOR INSERT
  WITH CHECK (
    auth.is_org_member(organization_id)
    AND created_by = auth.get_user_id()
  );

-- Policy: Authors and admins can update
CREATE POLICY "Authors and admins can update content"
  ON public.organization_content
  FOR UPDATE
  USING (
    auth.is_org_member(organization_id)
    AND (
      created_by = auth.get_user_id() -- Authors can edit own content
      OR auth.is_org_admin(organization_id) -- Admins can edit all
    )
  )
  WITH CHECK (
    auth.is_org_member(organization_id)
    AND (
      created_by = auth.get_user_id()
      OR auth.is_org_admin(organization_id)
    )
  );

-- Policy: Only admins can delete
CREATE POLICY "Only admins can delete content"
  ON public.organization_content
  FOR DELETE
  USING (auth.is_org_admin(organization_id));

-- ============================================================================
-- EXAMPLE: Organization settings (admin-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins have full control, members read-only
CREATE POLICY "Admins manage settings, members view"
  ON public.organization_settings
  FOR ALL
  USING (
    auth.is_org_member(organization_id)
  )
  WITH CHECK (
    auth.is_org_admin(organization_id)
  );

-- ============================================================================
-- EXAMPLE: Permission-based policies using role checks
-- ============================================================================

-- Policy: Permission-based content management
-- This mirrors the frontend permissions from clerk-roles.ts:
--   - canManageSettings → org:admin only
--   - canViewMembers → all members
--   - canManageRoles → org:admin only

CREATE POLICY "Permission-based org management"
  ON public.organization_settings
  FOR ALL
  USING (
    CASE auth.get_org_role(organization_id)
      WHEN 'org:admin' THEN true  -- Full access
      WHEN 'org:member' THEN (SELECT TRUE) -- Read-only check in WITH CHECK
      ELSE false
    END
  )
  WITH CHECK (
    auth.get_org_role(organization_id) = 'org:admin'
  );

-- ============================================================================
-- EXAMPLE: Multi-organization user dashboard
-- ============================================================================

-- View: User's organizations with their roles (denormalized for performance)
CREATE OR REPLACE VIEW public.user_organizations_view AS
SELECT
  u.id as user_id,
  u.clerk_id,
  o.id as organization_id,
  o.clerk_org_id,
  o.name as organization_name,
  o.slug as organization_slug,
  om.role,
  om.created_at as joined_at,
  -- Computed permission flags (matches clerk-roles.ts)
  CASE
    WHEN om.role = 'org:admin' THEN jsonb_build_object(
      'canManageSettings', true,
      'canInviteMembers', true,
      'canRemoveMembers', true,
      'canManageRoles', true,
      'canManageBilling', true,
      'canViewMembers', true,
      'canViewBilling', true
    )
    WHEN om.role = 'org:member' THEN jsonb_build_object(
      'canManageSettings', false,
      'canInviteMembers', false,
      'canRemoveMembers', false,
      'canManageRoles', false,
      'canManageBilling', false,
      'canViewMembers', true,
      'canViewBilling', true
    )
    ELSE jsonb_build_object(
      'canManageSettings', false,
      'canInviteMembers', false,
      'canRemoveMembers', false,
      'canManageRoles', false,
      'canManageBilling', false,
      'canViewMembers', false,
      'canViewBilling', false
    )
  END as permissions
FROM public.users u
JOIN public.organization_memberships om ON om.user_id = u.id
JOIN public.organizations o ON o.id = om.organization_id;

-- RLS on view: Users can only see their own organizations
ALTER VIEW public.user_organizations_view SET (security_invoker = on);

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================

-- Test as authenticated user (replace with actual Clerk user ID)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user_2abc123xyz"}';

-- Should only return user's own organizations
SELECT * FROM public.user_organizations_view;

-- Should only return content from user's organizations
SELECT * FROM public.organization_content;

-- Reset
RESET ROLE;
```

**Integration with Application-Level Permissions**:

The RLS policies work in tandem with the application-level role checking utilities:

1. **Frontend** ([src/utils/clerk-roles.ts](../../src/utils/clerk-roles.ts)):

   - `hasPermission(userRole, 'canManageSettings')` → UI conditional rendering
   - Prevents UI elements from showing unauthorized actions

2. **Database** (RLS Policies above):
   - Enforces permissions at data layer
   - Prevents unauthorized queries even if UI is bypassed
   - Double-layer security: app + database

**Example Full-Stack Permission Flow**:

```typescript
// Frontend (Astro component)
import { hasPermission } from '#utils/clerk-roles'

const userRole = Astro.locals.userRole

// Only show settings button to admins
{hasPermission(userRole, 'canManageSettings') && (
  <a href="/organization/settings">Settings</a>
)}

// Backend (API endpoint)
const supabase = await getAuthenticatedSupabase(Astro)

// RLS automatically enforces - this query will:
// - Return data if user is org:admin (canManageSettings = true)
// - Fail if user is org:member (canManageSettings = false)
const { data, error } = await supabase
  .from('organization_settings')
  .update({ settings: newSettings })
  .eq('organization_id', orgId)

// Result: Double-layer protection
// - UI doesn't show button if not admin
// - Database blocks query if not admin
```

**Verification**:

- [ ] RLS enabled on all tables
- [ ] User can only query their own data
- [ ] Service role bypasses RLS in webhooks
- [ ] Test with multiple users to verify isolation

---

### Phase 5.5: Role Data Strategy - Official Approach (Understanding, not implementation)

**Official Clerk + Supabase Approach** (per documentation):

The JWT token contains **only authentication claims** - NOT organization data:

- `sub`: Clerk user ID
- `role`: `"authenticated"`
- `email`: User's email

**For organization roles**: Use webhooks to sync data to database, then RLS queries the database.

This is the **correct** approach according to both vendors' documentation.

**How It Works** (Official Method):

```
┌─────────────┐
│   Clerk     │ JWT with basic claims (sub, role, email)
│   Auth      │ ─────────────────────────────────────────┐
└─────────────┘                                          │
      │                                                  ▼
      │ Webhook: organizationMembership.created    ┌──────────────┐
      │         (includes role data)               │  Supabase    │
      └──────────────────────────────────────────> │  Database    │
                                                    │              │
                                                    │  - users     │
                                                    │  - orgs      │
                                                    │  - memberships (with roles)
                                                    └──────────────┘
                                                          │
                                                          ▼
                                                    RLS queries
                                                    synced role data
```

**In Practice**:

1. **Clerk sends webhook** when user joins organization with role
2. **Your webhook handler** syncs to `organization_memberships` table
3. **RLS policies** query the synced data:

```sql
-- RLS policy checks role from DATABASE, not JWT
CREATE POLICY "Org admins can manage"
  ON public.organization_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      JOIN public.users u ON u.id = om.user_id
      WHERE u.clerk_id = auth.jwt()->>'sub'  -- Only JWT claim used
        AND om.organization_id = organization_settings.organization_id
        AND om.role = 'org:admin'  -- Role from database
    )
  );
```

**Why This Approach**:

- ✅ **Official**: Recommended by both Clerk and Supabase docs
- ✅ **Secure**: Role changes immediately reflected (no token refresh needed)
- ✅ **Simple**: No JWT template configuration
- ✅ **Accurate**: Database is source of truth

**What NOT To Do**:

- ❌ Don't add custom JWT claims for roles (old approach)
- ❌ Don't create JWT templates (deprecated)
- ❌ Don't try to embed all data in tokens

---

### Phase 6: Update Documentation (1 hour)

**File**: `docs/integration/clerk-supabase-integration.md`

**Major Updates Needed**:

1. **Remove JWT Template References** (Lines 96-104)

   - Delete section on creating JWT template
   - Remove `CLERK_WEBHOOK_SECRET` from env vars (keep for webhooks, but clarify it's unrelated to JWT)

2. **Add Native Integration Section**:

````markdown
## Modern Integration Approach (April 2025+)

This project uses Clerk's **native third-party authentication** with Supabase,
which is the recommended approach as of April 2025. This replaces the previous
JWT template method.

### Benefits

- ✅ No JWT secret sharing required
- ✅ Simpler setup (no custom templates)
- ✅ Better performance (token caching)
- ✅ Automatic `role: authenticated` claim
- ✅ Future-proof official integration

### Configuration Steps

1. **Configure Supabase**

   - Go to Supabase Dashboard → Authentication → Providers
   - Add "Third-Party Auth Provider"
   - Name: `clerk`
   - Visit Clerk's "Connect with Supabase" page to auto-configure
   - Issuer and JWKS URL are automatically filled

2. **No Clerk Template Needed**

   - Unlike the old approach, no JWT template configuration required
   - Clerk session tokens automatically include Supabase-compatible claims

3. **Environment Variables**

   ```env
   # Clerk Configuration
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...  # For webhook signature verification only

   # Supabase Configuration
   SUPABASE_URL=https://[project].supabase.co
   SUPABASE_ANON_KEY=eyJ...           # For user-scoped operations
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # For admin/webhook operations

   # Public (client-side) Supabase config
   PUBLIC_SUPABASE_URL=https://[project].supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
````

4. **Token Claims**
   - Automatic claims in Clerk session token:
     - `sub`: Clerk user ID (maps to `auth.uid()`)
     - `role`: `"authenticated"` (for RLS policies)
     - `email`: User's email
     - Additional custom claims can be added

### RLS Policy Examples

```sql
-- Access user ID from token
auth.jwt()->>'sub'

-- Check if user is authenticated
auth.jwt()->>'role' = 'authenticated'

-- Access organization ID (if included in claims)
auth.jwt()->>'organization_id'
```

````

3. **Update Authentication Flow Diagram**:

```markdown
## Updated Authentication Flow

1. User signs in via Clerk
2. Clerk issues session token with automatic claims:
   - `sub`: User ID
   - `role`: "authenticated"
   - `email`: User email
3. Client/server gets token via `auth.getToken()` or `auth().getToken()`
4. Token passed to Supabase in `Authorization` header
5. Supabase validates token against Clerk's public keys (JWKS)
6. RLS policies enforce based on JWT claims
````

4. **Migration Guide for Existing Implementations**:

```markdown
## Migrating from JWT Templates

If you have an existing implementation using JWT templates:

1. **Remove JWT Template** from Clerk Dashboard
2. **Configure Third-Party Auth** in Supabase (steps above)
3. **Update Code**:
   - Change: `session.getToken({ template: 'supabase' })`
   - To: `session.getToken()`
4. **Update RLS Policies** to use `auth.jwt()->>'sub'`
5. **Test Thoroughly** with real users before deploying

### Backward Compatibility

The new approach is NOT backward compatible with JWT templates.
Plan for a maintenance window to migrate.
```

**Verification**:

- [ ] Documentation reflects modern approach
- [ ] Old JWT template references removed
- [ ] Clear migration path documented
- [ ] Examples use correct API calls

---

### Phase 7: Update Implementation Plan (30 minutes)

**File**: `docs/implementation-plans/clerk-supabase-role-sync.md`

**Updates Required**:

1. **Add Prerequisite Section**:

```markdown
## Prerequisites

Before implementing organization role sync, complete the integration modernization:

- [ ] Migrate from JWT templates to native third-party auth
- [ ] Update RLS policies to use `auth.jwt()`
- [ ] Verify user-scoped queries work correctly
- [ ] Test with multiple users and organizations

**Why this matters**: The modern integration provides the foundation for
organization-level JWT claims that will be used for role-based access control.

See: [Clerk-Supabase Integration Modernization](./clerk-supabase-integration-modernization.md)
```

2. **Update JWT Claims Section**:

````markdown
### Expected JWT Claims (Modern Integration)

With native third-party auth, Clerk tokens automatically include:

```json
{
  "sub": "user_2abc123...", // Clerk user ID
  "email": "user@example.com",
  "role": "authenticated", // Supabase RLS role
  "organization_id": "org_abc123...", // Current active org (if multi-org)
  "metadata": {
    "org_role": "org:admin" // Can be added via custom claims
  }
}
```
````

For organization role sync, we'll leverage custom claims to include
organization membership data directly in the JWT.

````

3. **Adjust RLS Policy Examples**:

Update all RLS policy examples to use `auth.jwt()->>'sub'` instead of custom user ID extraction.

---

## Testing Strategy

### Phase 1: Integration Tests

**File**: `tests/integration/clerk-supabase-modern.test.ts`

```typescript
describe('Modern Clerk-Supabase Integration', () => {
  describe('Client-Side Hook', () => {
    test('initializes without JWT template')
    test('includes role: authenticated claim')
    test('token sub claim matches Clerk user ID')
    test('unauthenticated users get null client')
  })

  describe('Server-Side Client', () => {
    test('user-scoped client enforces RLS')
    test('service role client bypasses RLS')
    test('missing token returns null client')
  })

  describe('RLS Policies', () => {
    test('users can only see own data')
    test('users cannot access other users data')
    test('service role can access all data')
  })
})
````

### Phase 2: Manual Testing Checklist

- [ ] Create new user via Clerk
- [ ] Verify user synced to Supabase via webhook
- [ ] Query user data from client (should see own data only)
- [ ] Query user data from server (should see own data only)
- [ ] Query with service role (should see all data)
- [ ] Attempt to access another user's data (should fail with RLS)
- [ ] Check browser console for JWT template errors (should have none)
- [ ] Verify token includes `role: authenticated` (check Network tab)

---

## Migration Timeline

### Recommended Sequence

1. **Week 1: Preparation**

   - Review documentation
   - Backup current database
   - Set up staging environment
   - Test native integration on staging

2. **Week 2: Implementation**

   - Day 1-2: Supabase configuration + client-side updates
   - Day 3-4: Server-side updates + RLS policies
   - Day 5: Testing and bug fixes

3. **Week 3: Deployment**
   - Deploy to staging
   - User acceptance testing
   - Deploy to production
   - Monitor for issues

### Rollback Strategy

If critical issues arise:

1. **Immediate**: Re-enable JWT template in Clerk Dashboard
2. **Code Rollback**: Git revert to previous working version
3. **Database**: RLS policies remain compatible (no rollback needed)
4. **Communication**: Notify users of temporary authentication issues

---

## Risk Assessment

| Risk                         | Probability | Impact | Mitigation                                      |
| ---------------------------- | ----------- | ------ | ----------------------------------------------- |
| RLS blocks legitimate access | Medium      | High   | Comprehensive testing, gradual rollout          |
| Token format changes         | Low         | High   | Follow official docs, version lock dependencies |
| Performance degradation      | Low         | Medium | Monitor query times, add indexes as needed      |
| User experience disruption   | Medium      | High   | Staging testing, communication plan             |
| JWT claim mapping errors     | Medium      | High   | Validate claims in tests, log tokens in dev     |

---

## Success Metrics

### Technical

- [ ] Zero JWT template errors in logs
- [ ] All RLS policies enforcing correctly
- [ ] Query performance <100ms for user-scoped data
- [ ] Token validation success rate >99.9%

### Business

- [ ] No user-reported authentication issues
- [ ] Reduced complexity (no JWT template management)
- [ ] Better security posture (no secret sharing)
- [ ] Foundation ready for organization role sync

---

## Post-Migration Tasks

1. **Remove Old Configuration**

   - Delete JWT template from Clerk Dashboard
   - Remove template-related error handling code
   - Update team documentation

2. **Monitor Production**

   - Set up alerts for RLS policy violations
   - Track token validation failures
   - Monitor query performance

3. **Proceed with Organization Sync**
   - Now safe to implement organization role sync
   - JWT can include organization claims
   - RLS ready for multi-tenant policies

---

## References

- **Official Docs**:

  - [Clerk: Supabase Integration](https://clerk.com/docs/guides/development/integrations/databases/supabase) ⭐ Primary reference
  - [Supabase: Clerk Integration](https://supabase.com/docs/guides/auth/third-party/clerk) ⭐ Primary reference
  - [Clerk: JWT Templates (Deprecated)](https://clerk.com/docs/backend-requests/resources/jwt-templates)

- **Internal Docs**:
  - [Current Integration Docs](./integration/clerk-supabase-integration.md)
  - [Organization Role Sync Plan](./clerk-supabase-role-sync.md)

---

**Last Updated**: 2025-10-03
**Document Version**: 1.0
**Status**: Ready for Implementation
**Blocks**: Organization role sync implementation
