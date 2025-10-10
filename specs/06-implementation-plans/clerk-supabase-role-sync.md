# Implementation Plan: Clerk-Supabase Organization Role Sync

**Status**: Planning
**Priority**: High
**Estimated Effort**: 4-6 hours
**Target Completion**: TBD

---

## Executive Summary

Extend the existing Clerk-Supabase integration to synchronize organization memberships and roles from Clerk to Supabase. This enables role-based database queries, RLS policies, and offline role checking without requiring Clerk API calls.

### Business Value

- **Performance**: Query organization roles directly from Supabase instead of Clerk API
- **Flexibility**: Complex multi-organization queries using SQL
- **Security**: RLS policies based on actual organization membership
- **Audit Trail**: Track role changes over time in database
- **Offline Capability**: Role data available even if Clerk API is temporarily unavailable

---

## Current State Analysis

### ✅ Already Implemented

| Component              | Status        | Location                                                                                                            |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Clerk webhook handler  | ✅ Active     | [src/pages/api/webhooks/clerk.ts](../src/pages/api/webhooks/clerk.ts)                                               |
| User sync webhooks     | ✅ Active     | Handles `user.created`, `user.updated`, `user.deleted`, `session.created`                                           |
| Supabase users table   | ✅ Deployed   | [scripts/supabase-migrations/001_create_users_table.sql](../scripts/supabase-migrations/001_create_users_table.sql) |
| Role utility functions | ✅ Available  | [src/utils/clerk-roles.ts](../src/utils/clerk-roles.ts)                                                             |
| JWT integration        | ✅ Configured | Clerk tokens work with Supabase RLS                                                                                 |

### ❌ Missing Components

| Component             | Impact | Priority |
| --------------------- | ------ | -------- |
| Organizations table   | High   | Critical |
| Memberships table     | High   | Critical |
| Organization webhooks | High   | Critical |
| Role sync utilities   | Medium | High     |
| Organization queries  | Medium | High     |
| RLS policies          | Medium | High     |
| Documentation         | Low    | Medium   |

---

## Architecture Design

### Database Schema

```
┌─────────────────────┐
│    organizations    │
├─────────────────────┤
│ id (PK)            │
│ clerk_org_id (UQ)  │────┐
│ name               │    │
│ slug (UQ)          │    │
│ metadata (JSONB)   │    │
│ created_at         │    │
│ updated_at         │    │
└─────────────────────┘    │
                           │
                           │ FK
                           │
┌─────────────────────┐    │
│ organization_       │    │
│    memberships      │    │
├─────────────────────┤    │
│ id (PK)            │    │
│ organization_id ───┼────┘
│ user_id (FK)       │────┐
│ clerk_membership_id│    │
│ role               │    │
│ created_at         │    │
│ updated_at         │    │
│ UNIQUE(org, user)  │    │
└─────────────────────┘    │
                           │ FK
                           │
┌─────────────────────┐    │
│       users         │    │
├─────────────────────┤    │
│ id (PK)            │◄───┘
│ clerk_id (UQ)      │
│ email (UQ)         │
│ username           │
│ full_name          │
│ avatar_url         │
│ metadata (JSONB)   │
│ created_at         │
│ updated_at         │
│ last_sign_in_at    │
└─────────────────────┘
```

### Webhook Flow

```
┌──────────────┐
│    Clerk     │
│  Dashboard   │
└──────┬───────┘
       │ Event: organizationMembership.created
       │ { organization: {...}, role: "org:admin", user_id: "..." }
       │
       ▼
┌──────────────────────────────────┐
│ POST /api/webhooks/clerk         │
│                                  │
│ 1. Verify signature (Svix)      │
│ 2. Parse event type              │
│ 3. Extract organization data     │
│ 4. Extract membership data       │
│ 5. Sync to Supabase              │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│      Supabase Database           │
│                                  │
│ organizations ← upsert org       │
│ organization_memberships         │
│   ← upsert membership + role     │
└──────────────────────────────────┘
```

### Data Flow

**Scenario: User joins organization as member**

1. **Clerk**: Admin invites user → `organizationMembership.created` webhook
2. **Webhook Handler**:
   - Receives event with `organization` object and `role` field
   - Upserts organization into `organizations` table
   - Inserts membership into `organization_memberships` table with role
3. **Supabase**: RLS policies now grant user access to org resources
4. **Application**: Can query user's role directly from database

**Scenario: User promoted to admin**

1. **Clerk**: Admin changes role → `organizationMembership.updated` webhook
2. **Webhook Handler**:
   - Receives event with updated `role` field
   - Updates `role` column in `organization_memberships` table
3. **Application**: User immediately sees admin-level UI based on database role

---

## Implementation Plan

### Phase 1: Database Migration (Estimated: 1 hour)

**File**: `scripts/supabase-migrations/003_create_organization_tables.sql`

**Tasks**:

1. Create `organizations` table with proper indexes
2. Create `organization_memberships` table with composite unique constraint
3. Add foreign key relationships
4. Create RLS policies for secure access
5. Add trigger for `updated_at` auto-update
6. Create helpful indexes for common queries

**Schema Details**:

```sql
-- Organizations Table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Memberships Table
CREATE TABLE public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  clerk_membership_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL, -- org:admin, org:member, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

**RLS Policies**:

- Users can view organizations they're members of
- Users can view their own memberships
- Service role has full access for webhook operations

**Verification**:

- [ ] Tables created successfully
- [ ] Indexes exist on foreign keys
- [ ] RLS policies active
- [ ] Triggers work for `updated_at`
- [ ] Can insert sample data

---

### Phase 2: TypeScript Types (Estimated: 30 minutes)

**File**: `src/libs/database.types.ts`

**Tasks**:

1. Add `organizations` table types (Row, Insert, Update)
2. Add `organization_memberships` table types
3. Ensure proper TypeScript strict mode compatibility

**Type Structure**:

```typescript
export type Database = {
  public: {
    Tables: {
      // ... existing users, messages tables
      organizations: {
        Row: {
          id: string
          clerk_org_id: string
          name: string
          slug: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['organizations']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      organization_memberships: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          clerk_membership_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['organization_memberships']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['organization_memberships']['Insert']>
      }
    }
  }
}
```

**Verification**:

- [ ] Types compile without errors
- [ ] Autocomplete works in IDE
- [ ] Strict mode compatibility maintained

---

### Phase 3: Webhook Handler Extension (Estimated: 1.5 hours)

**File**: `src/pages/api/webhooks/clerk.ts`

**New Event Handlers**:

1. **`organization.created`**

   - Extract: `id`, `name`, `slug`, `public_metadata`
   - Action: Insert into `organizations` table
   - Error handling: Handle duplicate `clerk_org_id`

2. **`organization.updated`**

   - Extract: `id`, `name`, `slug`, `public_metadata`
   - Action: Update `organizations` table by `clerk_org_id`
   - Error handling: Warn if organization doesn't exist

3. **`organization.deleted`**

   - Extract: `id`
   - Action: Delete from `organizations` table (cascade to memberships)
   - Error handling: Log successful deletion

4. **`organizationMembership.created`**

   - Extract: `organization.id`, `public_user_data.user_id`, `role`, `id`
   - Action:
     - Upsert organization
     - Insert membership with role
   - Error handling: Handle missing user, duplicate membership

5. **`organizationMembership.updated`**

   - Extract: `id`, `role` (only field that can be updated)
   - Action: Update `role` in `organization_memberships`
   - Error handling: Warn if membership doesn't exist

6. **`organizationMembership.deleted`**
   - Extract: `id`
   - Action: Delete membership from `organization_memberships`
   - Error handling: Log successful removal

**Webhook Payload Structure**:

```typescript
interface OrganizationMembershipEvent {
  type:
    | 'organizationMembership.created'
    | 'organizationMembership.updated'
    | 'organizationMembership.deleted'
  data: {
    id: string // membership ID
    organization: {
      id: string // clerk org ID
      name: string
      slug: string
      public_metadata?: Record<string, unknown>
    }
    public_user_data: {
      user_id: string // clerk user ID
      first_name?: string
      last_name?: string
    }
    role: string // "org:admin", "org:member", etc.
    created_at: number
    updated_at: number
  }
}
```

**Error Handling Strategy**:

- Invalid signature → 400 Bad Request
- Missing user → 400 with descriptive error
- Database error → 500 with logged details
- Successful sync → 200 OK

**Verification**:

- [ ] All 6 event types handled
- [ ] Proper error responses
- [ ] Database operations succeed
- [ ] Logging captures all events
- [ ] Idempotent operations (can replay safely)

---

### Phase 4: Role Sync Utility (Estimated: 1 hour)

**File**: `src/utils/sync-clerk-roles.ts`

**Functions**:

```typescript
/**
 * Syncs organization from Clerk webhook to Supabase
 */
export async function syncOrganization(
  supabase: SupabaseClient,
  orgData: {
    clerk_org_id: string
    name: string
    slug?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<{ success: boolean; error?: string }>

/**
 * Syncs organization membership with role
 */
export async function syncOrganizationMembership(
  supabase: SupabaseClient,
  membershipData: {
    clerk_membership_id: string
    organization_id: string
    user_id: string
    role: string
  }
): Promise<{ success: boolean; error?: string }>

/**
 * Updates membership role
 */
export async function updateMembershipRole(
  supabase: SupabaseClient,
  clerkMembershipId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }>

/**
 * Validates Clerk role format
 */
export function isValidClerkRole(role: string): boolean

/**
 * Maps Clerk organization data to Supabase format
 */
export function mapClerkOrgToSupabase(clerkOrg: ClerkOrganization): OrganizationInsert
```

**Validation Rules**:

- Role must start with `org:` prefix
- Organization clerk_id must be valid
- User must exist in `users` table before membership sync
- Metadata must be valid JSON

**Verification**:

- [ ] All functions have JSDoc
- [ ] Input validation comprehensive
- [ ] Error messages descriptive
- [ ] Type-safe with strict mode
- [ ] Unit tests pass

---

### Phase 5: Organization Query Utilities (Estimated: 1.5 hours)

**File**: `src/utils/organization-queries.ts`

**Query Functions**:

```typescript
/**
 * Get all organizations a user belongs to with their roles
 */
export async function getUserOrganizations(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<{ organization: Organization; role: string }>>

/**
 * Get user's role in a specific organization
 */
export async function getUserRoleInOrganization(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<string | null>

/**
 * Get all members of an organization with roles
 */
export async function getOrganizationMembers(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Array<{ user: User; role: string; joined_at: string }>>

/**
 * Check if user is admin of organization
 */
export async function isUserOrgAdmin(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean>

/**
 * Get organizations where user is admin
 */
export async function getUserAdminOrganizations(
  supabase: SupabaseClient,
  userId: string
): Promise<Organization[]>

/**
 * Get organization by Clerk ID
 */
export async function getOrganizationByClerkId(
  supabase: SupabaseClient,
  clerkOrgId: string
): Promise<Organization | null>
```

**Performance Considerations**:

- Use proper indexes on foreign keys
- Minimize JOIN operations where possible
- Cache frequently accessed data
- Use `select` to limit returned columns

**Verification**:

- [ ] All queries optimized
- [ ] Proper error handling
- [ ] TypeScript types correct
- [ ] JSDoc documentation complete
- [ ] Integration tests pass

---

### Phase 6: Testing (Estimated: 1.5 hours)

**File**: `tests/organization-sync.test.ts`

**Test Coverage**:

```typescript
describe('Organization Sync', () => {
  describe('Database Migration', () => {
    test('organizations table exists')
    test('organization_memberships table exists')
    test('foreign keys enforced')
    test('RLS policies active')
    test('unique constraints work')
  })

  describe('Webhook Handlers', () => {
    test('organization.created inserts org')
    test('organization.updated updates org')
    test('organization.deleted removes org')
    test('organizationMembership.created creates membership')
    test('organizationMembership.updated changes role')
    test('organizationMembership.deleted removes membership')
    test('handles missing user gracefully')
    test('handles duplicate org gracefully')
  })

  describe('Sync Utilities', () => {
    test('syncOrganization validates input')
    test('syncOrganizationMembership validates role')
    test('updateMembershipRole handles non-existent membership')
    test('isValidClerkRole accepts valid roles')
    test('isValidClerkRole rejects invalid roles')
  })

  describe('Query Utilities', () => {
    test('getUserOrganizations returns all memberships')
    test('getUserRoleInOrganization returns correct role')
    test('getOrganizationMembers returns all members')
    test('isUserOrgAdmin identifies admins')
    test('getUserAdminOrganizations filters by role')
  })

  describe('Integration Tests', () => {
    test('full webhook flow: create org + membership')
    test('role update flow updates database')
    test('user deletion cascades to memberships')
    test('organization deletion cascades to memberships')
  })
})
```

**Test Environment**:

- Use Supabase local development instance
- Mock Clerk webhook payloads
- Seed test data for consistent results
- Clean up database after tests

**Verification**:

- [ ] All tests passing
- [ ] > 80% code coverage
- [ ] Edge cases covered
- [ ] Integration tests verify end-to-end flow

---

### Phase 7: Documentation (Estimated: 30 minutes)

**Files to Update**:

1. **`docs/integration/clerk-supabase-integration.md`**

   - Add organization sync section
   - Document webhook event types
   - Add schema diagrams
   - Include query examples

2. **`docs/clerk-roles-reset-guide.md`**

   - Add section on Supabase role sync
   - Explain how roles propagate to database
   - Troubleshooting for sync issues

3. **`README.md`** (if applicable)
   - Mention organization role sync capability
   - Link to integration docs

**Documentation Checklist**:

- [ ] Architecture diagram updated
- [ ] Webhook events documented
- [ ] Query examples provided
- [ ] Migration instructions clear
- [ ] Troubleshooting guide complete

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Database migration tested locally
- [ ] Webhook handler tested with mock payloads
- [ ] Code reviewed by team
- [ ] Documentation complete

### Deployment Steps

1. **Database Migration**

   ```bash
   # Apply migration to Supabase
   npm run db:migrate
   # Or manually via Supabase Dashboard SQL Editor
   ```

2. **Configure Clerk Webhooks**

   - Go to Clerk Dashboard → Webhooks
   - Add/update webhook endpoint: `https://yourdomain.com/api/webhooks/clerk`
   - Subscribe to new events:
     - `organization.created`
     - `organization.updated`
     - `organization.deleted`
     - `organizationMembership.created`
     - `organizationMembership.updated`
     - `organizationMembership.deleted`

3. **Deploy Application Code**

   ```bash
   npm run build
   npm run preview # Test production build
   # Deploy to hosting platform
   ```

4. **Verify Webhook Delivery**
   - Check Clerk Dashboard → Webhooks → Recent Deliveries
   - Verify 200 OK responses
   - Check Supabase database for synced data

### Rollback Plan

If issues occur:

1. **Disable new webhook events** in Clerk Dashboard (keep existing user events)
2. **Revert database migration** (if data corruption):

   ```sql
   DROP TABLE IF EXISTS organization_memberships CASCADE;
   DROP TABLE IF EXISTS organizations CASCADE;
   ```

3. **Redeploy previous application version**
4. **Investigate issues** in staging environment

---

## Risk Assessment

| Risk                                | Impact | Probability | Mitigation                                      |
| ----------------------------------- | ------ | ----------- | ----------------------------------------------- |
| Webhook delivery failures           | High   | Medium      | Retry logic, idempotent operations, monitoring  |
| Database migration errors           | High   | Low         | Test thoroughly locally, backup before deploy   |
| Missing user during membership sync | Medium | Medium      | Graceful error handling, user creation fallback |
| Performance degradation from JOINs  | Medium | Low         | Proper indexing, query optimization             |
| Clerk API changes                   | Medium | Low         | Monitor Clerk changelog, version webhooks       |
| Data inconsistency                  | High   | Low         | Atomic transactions, validation logic           |

---

## Success Metrics

### Technical Metrics

- [ ] **100% webhook delivery success rate** (Clerk Dashboard)
- [ ] **<100ms database query latency** for role lookups
- [ ] **Zero data sync errors** in production logs
- [ ] **All tests passing** with >80% coverage

### Business Metrics

- [ ] **Reduced Clerk API calls** by 50%+ for role checks
- [ ] **Faster page loads** for organization pages
- [ ] **Audit trail available** for compliance
- [ ] **Complex queries possible** (multi-org reports)

---

## Next Steps After Implementation

1. **Monitor Performance**

   - Track webhook delivery latency
   - Monitor database query performance
   - Set up alerts for sync failures

2. **Extend Functionality**

   - Add organization invitations sync
   - Sync organization domains
   - Track role change history
   - Build admin dashboard for org management

3. **Optimize Queries**

   - Add materialized views for complex reports
   - Implement caching for frequently accessed data
   - Consider read replicas for high-traffic apps

4. **Documentation**
   - Create video tutorial for setup
   - Add Storybook stories for org components
   - Document common query patterns

---

## References

- [Clerk Webhooks Documentation](https://clerk.com/docs/webhooks/overview)
- [Clerk Organizations Overview](https://clerk.com/docs/organizations/overview)
- [Clerk Organization Membership Reference](https://clerk.com/docs/references/javascript/types/organization-membership)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Existing Clerk-Supabase Integration](./integration/clerk-supabase-integration.md)
- [Clerk Roles Utility](../src/utils/clerk-roles.ts)

---

**Last Updated**: 2025-10-03
**Document Version**: 1.0
**Owner**: Development Team
**Status**: Ready for Implementation
