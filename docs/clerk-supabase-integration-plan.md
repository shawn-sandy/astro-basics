# Clerk-Supabase Integration Plan: Role Management & User Sync

**Project:** astro-basics
**Created:** 2025-10-03
**Status:** Implementation Ready
**Integration Method:** Native Third-Party Auth (2025 Standard)

## Executive Summary

This plan implements production-ready Clerk-Supabase integration for the astro-basics project, focusing on:

- **User Management** - Webhook-based synchronization between Clerk and Supabase
- **Role-Based Access Control** - Organization-aware permissions with RLS policies
- **Performance** - Cached organization data to minimize API calls
- **Security** - Defense-in-depth with JWT-based RLS and service role isolation

### Key Architecture Decisions

1. **Native Token Flow** - Leverages Clerk's session tokens directly with Supabase RLS, eliminating custom JWT templates (deprecated April 2025)
2. **Lightweight User Sync** - Only syncs essential data via webhooks, avoiding duplicate storage of Clerk-managed data
3. **RLS-First Security** - Clerk's JWT claims drive Supabase Row Level Security, creating defense-in-depth

## Current State Analysis

### Already Implemented ✅

- `src/libs/supabase-native.ts` - Service role and authenticated client factories
- `src/middleware.ts:261-303` - Token passing via `locals.clerkToken`
- `src/utils/clerk-roles.ts` - Organization role utilities (admin/member)
- Basic user sync in middleware (last_sign_in_at updates)

### Missing Components ❌

- Comprehensive user table with proper RLS policies
- Webhook-based user synchronization
- Role claim injection in JWT
- Organization-level database access control
- User preferences and metadata management

---

## Phase 1: Database Schema Enhancement

### Design Philosophy

Store only what Clerk doesn't manage (preferences, app-specific metadata), reference Clerk as source of truth.

### 1.1 User Tables with Role Support

**File:** `scripts/migrations/001_create_users_with_roles.sql`

```sql
-- Main users table (lightweight sync from Clerk)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,

  -- Cached from Clerk for performance (updated via webhooks)
  email text,
  username text,
  full_name text,
  avatar_url text,

  -- App-specific metadata
  app_metadata jsonb DEFAULT '{}',
  last_sign_in_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization memberships (synced from Clerk organizations)
CREATE TABLE organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  clerk_org_id text NOT NULL,
  clerk_org_role text NOT NULL, -- 'org:admin' or 'org:member'

  -- Cached organization data
  org_name text,
  org_slug text,

  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, clerk_org_id)
);

-- User preferences (app-specific, not in Clerk)
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notifications_email boolean DEFAULT true,
  notifications_push boolean DEFAULT true,
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON organization_memberships(clerk_org_id);
CREATE INDEX idx_org_memberships_role ON organization_memberships(clerk_org_role);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER org_memberships_updated_at BEFORE UPDATE ON organization_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Schema Design Rationale:**

1. **Denormalization Strategy** - Caches email/username from Clerk for query performance, updated via webhooks
2. **Organization Table** - Tracks org memberships for multi-tenant RLS policies without extra Clerk API calls
3. **Separate Preferences** - Isolates frequently-updated settings from core user data (better cache performance)

### 1.2 Row Level Security Policies

**File:** `scripts/migrations/002_create_rls_policies.sql`

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING ((auth.jwt()->>'sub')::text = clerk_id);

-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING ((auth.jwt()->>'sub')::text = clerk_id)
  WITH CHECK ((auth.jwt()->>'sub')::text = clerk_id);

-- Service role full access (for webhooks)
CREATE POLICY "users_service_all" ON users
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ORGANIZATION MEMBERSHIPS POLICIES
-- ============================================

-- Users can view their own organization memberships
CREATE POLICY "org_memberships_select_own" ON organization_memberships
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')::text
    )
  );

-- Admins can view all members in their organizations
CREATE POLICY "org_memberships_select_org_admin" ON organization_memberships
  FOR SELECT
  USING (
    clerk_org_id IN (
      SELECT clerk_org_id FROM organization_memberships
      WHERE user_id IN (
        SELECT id FROM users WHERE clerk_id = (auth.jwt()->>'sub')::text
      )
      AND clerk_org_role = 'org:admin'
    )
  );

-- Service role full access
CREATE POLICY "org_memberships_service_all" ON organization_memberships
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- USER PREFERENCES POLICIES
-- ============================================

-- Users can fully manage their own preferences
CREATE POLICY "user_prefs_all_own" ON user_preferences
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')::text
    )
  );

-- Service role full access
CREATE POLICY "user_prefs_service_all" ON user_preferences
  FOR ALL
  USING (auth.role() = 'service_role');
```

**RLS Security Model:**

1. **JWT 'sub' Claim** - Clerk user ID becomes the primary identifier, no session storage needed
2. **Multi-Level Policies** - Users see own data, org admins see org data, service role sees all
3. **Subquery Pattern** - Joins users table to resolve clerk_id → uuid for foreign key relationships

---

## Phase 2: Clerk Configuration Enhancements

### 2.1 Session Token Customization (Add Role Claim)

**Location:** Clerk Dashboard → Sessions → Customize session token

Add custom claim for Supabase RLS:

```json
{
  "role": "authenticated",
  "org_role": "{{user.organization_memberships.0.role}}",
  "org_id": "{{user.organization_memberships.0.id}}"
}
```

**Why this matters:** Supabase RLS policies need the `role` claim to recognize authenticated users. The org claims enable organization-scoped queries.

### 2.2 Webhook Configuration

**Create webhook endpoint:** `https://yourdomain.com/api/webhooks/clerk`

**Subscribe to events:**

- `user.created` - Initial user sync
- `user.updated` - Update cached data
- `user.deleted` - Soft delete or anonymize
- `organizationMembership.created` - Track org joins
- `organizationMembership.updated` - Role changes
- `organizationMembership.deleted` - Track org exits

**Environment variables required:**

```env
CLERK_WEBHOOK_SECRET=whsec_...
```

---

## Phase 3: Enhanced Integration Utilities

### 3.1 Advanced Supabase Client Factory

**File:** `src/libs/supabase-auth.ts`

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.SUPABASE_URL!
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY!

/**
 * Creates authenticated Supabase client with Clerk JWT token
 *
 * Uses Clerk's session token as access token for Supabase RLS.
 * Token is automatically refreshed by Clerk SDK, passed to Supabase
 * via the accessToken callback pattern.
 *
 * @param getToken - Async function returning current Clerk session token
 * @returns Supabase client configured for RLS with Clerk authentication
 *
 * @example
 * // React component with Clerk hook
 * const { getToken } = useAuth()
 * const supabase = createClerkSupabaseClient(getToken)
 *
 * // Server-side with stored token
 * const supabase = createClerkSupabaseClient(async () => locals.clerkToken)
 */
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        // Fallback to anon key if no token (public access)
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // Critical: This enables Clerk token → Supabase RLS flow
    accessToken: getToken,
  })
}

/**
 * Creates server-side Supabase client with pre-fetched Clerk token
 *
 * Optimized for Astro server components where token is already
 * available in locals. Avoids additional async token fetching.
 *
 * @param token - Clerk session token from middleware (locals.clerkToken)
 * @returns Supabase client with user authentication or anon access
 *
 * @example
 * // In Astro component
 * const supabase = createServerClerkSupabaseClient(Astro.locals.clerkToken)
 * const { data } = await supabase.from('users').select('*')
 */
export function createServerClerkSupabaseClient(token: string | null): SupabaseClient<Database> {
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

/**
 * Type-safe helper to get authenticated user's database ID
 *
 * Resolves Clerk user ID to internal UUID, required for foreign
 * key relationships. Handles cases where user doesn't exist yet.
 *
 * @param supabase - Authenticated Supabase client
 * @param clerkId - Clerk user ID from auth context
 * @returns User's database UUID or null if not found
 */
export async function getUserIdFromClerkId(
  supabase: SupabaseClient<Database>,
  clerkId: string
): Promise<string | null> {
  const { data, error } = await supabase.from('users').select('id').eq('clerk_id', clerkId).single()

  if (error || !data) return null
  return data.id
}
```

### 3.2 Role Management Utilities Enhancement

**File:** `src/utils/clerk-roles.ts` (additions)

```typescript
// Add to existing file

/**
 * Organization role hierarchy for permission comparison
 * Higher number = more permissions
 */
const ROLE_HIERARCHY = {
  'org:admin': 100,
  'org:member': 10,
} as const

/**
 * Checks if user role has equal or higher permissions than required role
 *
 * Useful for middleware authorization checks and UI conditional rendering.
 *
 * @param userRole - Current user's role from session
 * @param requiredRole - Minimum required role for access
 * @returns True if user meets or exceeds permission level
 *
 * @example
 * // Middleware protection
 * if (!hasRequiredRole(locals.userRole, ClerkRole.ADMIN)) {
 *   return new Response('Forbidden', { status: 403 })
 * }
 */
export function hasRequiredRole(
  userRole: string | null | undefined,
  requiredRole: ClerkRoleType
): boolean {
  if (!userRole) return false

  const userLevel = ROLE_HIERARCHY[userRole as ClerkRoleType] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0

  return userLevel >= requiredLevel
}

/**
 * Extracts organization ID from Clerk session claims
 *
 * @param sessionClaims - Clerk session claims object
 * @returns Organization ID or null if not in org context
 */
export function getOrgIdFromClaims(
  sessionClaims: Record<string, unknown> | undefined
): string | null {
  return (sessionClaims?.org_id as string) ?? null
}
```

---

## Phase 4: Webhook Implementation

### 4.1 Clerk Webhook Handler

**File:** `src/pages/api/webhooks/clerk.ts`

Processes Clerk events to maintain user data in Supabase. Uses service role client to bypass RLS policies.

**Supported events:**

- `user.created`: Create user record + default preferences
- `user.updated`: Update cached user data
- `user.deleted`: Soft delete user
- `organizationMembership.created`: Sync org membership
- `organizationMembership.updated`: Update role changes
- `organizationMembership.deleted`: Remove org membership

**Security features:**

- Webhook signature verification via Svix
- Service role isolation (bypasses RLS)
- Graceful error handling with logging
- Idempotent operations (safe to retry)

---

## Phase 5: Middleware Enhancements

### 5.1 Enhanced Authentication Middleware

**File:** `src/middleware.ts` (update existing authMiddleware)

**New features:**

1. Extract organization role from session claims (`locals.userRole`)
2. Extract organization ID from session claims (`locals.orgId`)
3. Enhanced logging with org context
4. Async user sync remains non-blocking

**Changes to locals object:**

```typescript
declare global {
  namespace App {
    interface Locals {
      userId: string | null
      userRole: string | null // NEW: 'org:admin' | 'org:member'
      orgId: string | null // NEW: Clerk organization ID
      clerkToken: string | null
      csrfToken: string | undefined
    }
  }
}
```

---

## Phase 6: API Endpoints for Role Management

### 6.1 User Profile with Organization Context

**File:** `src/pages/api/user/profile-with-org.ts`

**Endpoint:** `GET /api/user/profile-with-org`

**Returns:**

- User profile data
- User preferences
- Organization memberships (filtered by RLS)
- Organization roles

**Security:**

- Requires authentication (`locals.userId` + `locals.clerkToken`)
- RLS automatically filters accessible organizations
- No manual permission checks needed (handled by policies)

### 6.2 Organization Members List (Admin Only)

**File:** `src/pages/api/organization/[orgId]/members.ts`

**Endpoint:** `GET /api/organization/{orgId}/members`

**Authorization:**

- Requires `org:admin` role in target organization
- RLS policy ensures admins only see their org's members

---

## Phase 7: Testing & Validation

### 7.1 Integration Tests

**File:** `tests/integration/clerk-supabase-integration.test.ts`

**Test coverage:**

1. RLS enforcement without authentication
2. Service role can query all data
3. User can only see own profile
4. Admin can see org members
5. Member cannot see other members
6. Webhook handlers process events correctly

### 7.2 Manual Testing Checklist

- [ ] User sign-up triggers webhook → user created in Supabase
- [ ] User profile update syncs to Supabase
- [ ] Organization join adds membership record
- [ ] Role change updates membership
- [ ] RLS prevents cross-user data access
- [ ] Admin can view organization members
- [ ] Member cannot access admin-only data
- [ ] Token refresh works seamlessly

---

## Implementation Timeline

| Phase     | Tasks                          | Estimated Time |
| --------- | ------------------------------ | -------------- |
| 1         | Database schema + RLS policies | 1-2 hours      |
| 2         | Clerk configuration            | 30 minutes     |
| 3         | Integration utilities          | 1 hour         |
| 4         | Webhook implementation         | 2 hours        |
| 5         | Middleware updates             | 1 hour         |
| 6         | API endpoints                  | 2 hours        |
| 7         | Testing & validation           | 2 hours        |
| **Total** |                                | **9-10 hours** |

---

## Performance Optimizations

1. **Cached Organization Data** - Reduces Clerk API calls by storing org info in Supabase
2. **Lazy User Sync** - Middleware only updates last_sign_in_at, full sync via webhooks
3. **RLS Subquery Pattern** - Postgres query planner caches clerk_id → uuid lookups
4. **Index Coverage** - All foreign keys and frequently queried columns indexed
5. **Minimal JWT Claims** - Only essential data in token (role, org_id)

---

## Security Hardening

1. **Service Role Isolation** - Webhooks use service_role, user requests use anon+JWT
2. **Multi-Tier RLS** - User-level + org-level policies prevent lateral movement
3. **Webhook Signature Verification** - Svix library validates all incoming events
4. **Soft Deletes** - User deletion anonymizes data instead of hard delete
5. **Read-Only Caching** - Cached Clerk data is updated only via webhooks

---

## Monitoring & Observability

### Key Metrics to Track

1. **Webhook Processing Time** - Should be < 100ms per event
2. **User Sync Failures** - Alert if > 1% failure rate
3. **RLS Policy Performance** - Monitor slow queries with pg_stat_statements
4. **Token Refresh Rate** - Track Clerk token refresh frequency
5. **Organization Query Latency** - Baseline < 50ms for member lists

### Logging Strategy

- **Webhook events**: Log event type, user ID, success/failure
- **RLS denials**: Log attempted unauthorized access
- **Token errors**: Log token fetch failures with context
- **Sync failures**: Log webhook processing errors with retry logic

---

## Rollback Plan

If issues arise during implementation:

1. **Database rollback**: Keep migration scripts numbered, use `DROP TABLE IF EXISTS`
2. **Webhook disable**: Remove webhook URL from Clerk dashboard
3. **Middleware rollback**: Git revert to previous authMiddleware version
4. **Feature flags**: Use environment variable to toggle new integration

---

## Future Enhancements

1. **Real-time Subscriptions** - Listen to Supabase changes for live updates
2. **Custom Roles** - Extend beyond org:admin/org:member
3. **Fine-Grained Permissions** - Resource-level access control
4. **Audit Logging** - Track all data modifications
5. **Multi-Organization Support** - User can belong to multiple orgs

---

## References

- [Clerk Supabase Integration Guide](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk Organizations Documentation](https://clerk.com/docs/organizations/overview)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-03
**Maintainer:** astro-basics team
