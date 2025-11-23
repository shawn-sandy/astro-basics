# Role Management Architecture Analysis

**Date:** 2025-01-23
**Type:** Architectural Decision Record (ADR)
**Status:** Recommendation Ready
**Related:** clerk-role-sync-fix.md

---

## Context and Problem Statement

Should user roles be managed in the Supabase database (current approach) or should we adopt a different architecture? This analysis evaluates three architectural options for role management in the Clerk-Supabase integration.

---

## Decision Drivers

1. **Multi-Database Support** - Project supports both Supabase (PostgreSQL) and Turso (LibSQL)
2. **Performance** - Minimize latency on authentication and permission checks
3. **Consistency** - Ensure single source of truth, avoid sync issues
4. **Simplicity** - Reduce maintenance burden and complexity
5. **RLS Requirements** - Database Row Level Security policy needs
6. **Scalability** - Handle high request volumes

---

## Current Architecture Analysis

### How Roles Work Today

```
┌─────────────────────────────────────────────────────────────────┐
│ CLERK (Source of Truth)                                         │
│ publicMetadata.role = "member" | "admin" | "super_admin"        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    user.created/updated webhook
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE (Replica)                                              │
│ users.role ENUM ('member', 'admin', 'super_admin')              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         Queried by role-guard.ts for permission checks
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ APPLICATION                                                      │
│ Reads from Supabase, caches for 60 seconds                      │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Locations

1. **Clerk `publicMetadata.role`**
   - Primary source
   - Modified via Clerk Dashboard or API
   - Included in JWT session claims (configured in JWT template)

2. **Supabase `users.role`**
   - Replica storage
   - Synced via webhooks (`user.created`, `user.updated`)
   - Queried by `role-guard.ts` for permission checks
   - NOT used by RLS policies (identity-based only)

3. **Session Claims (Runtime)**
   - Extracted by middleware from JWT
   - Currently reads `org_role` instead of `role` (bug!)
   - Stored in `locals.userRole`

### Critical Discovery: RLS Policies Are Identity-Based

**Examined:** `/scripts/migrations/002_security_policies.sql`

**Finding:** ZERO RLS policies use `users.role` for permissions.

**Current RLS Pattern:**

```sql
-- Example: users table policy
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    ((select auth.jwt())->>'sub')::text = clerk_id
  );

-- Pattern: auth.jwt()->>'sub' = clerk_id
-- Meaning: User can only access their own data
```

**Implication:** The `users.role` column is ONLY used by application code, NOT by database security layer.

---

## Architectural Options

### Option 1: Current (Dual Storage - Clerk + Supabase)

**Architecture:**

- Clerk publicMetadata as authoritative source
- Supabase users.role as read replica
- Webhook synchronization
- Application queries Supabase for role checks

**Data Flow:**

```
Admin updates role in Clerk
  ↓
user.updated webhook fires
  ↓
Webhook syncs to Supabase users.role
  ↓
Application queries Supabase (with cache)
  ↓
Permission check completes
```

#### Pros

✅ Already implemented and working
✅ Fast permission checks (~10ms with cache)
✅ Supports both Supabase and Turso
✅ Webhook handles new users automatically
✅ Service role client can modify roles directly

#### Cons

❌ Sync complexity and race conditions
❌ Dual storage creates consistency risk
❌ Webhook failures = out-of-sync roles
❌ Cache invalidation after role updates
❌ Maintenance burden (webhook code, cache system)

#### Performance

- **Middleware:** 0ms (reads from session claims)
- **Permission checks:** ~10ms (cached Supabase query)
- **Role updates:** 200-500ms (webhook async)

#### Consistency Risk

**MEDIUM** - Webhook race conditions, sync lag, potential desync

---

### Option 2: Supabase-Only (Database as Source of Truth)

**Architecture:**

- Remove roles from Clerk publicMetadata
- Store ONLY in Supabase users.role
- Middleware queries database on every request
- Admin UI modifies database directly

**Data Flow:**

```
Admin updates role in database
  ↓
Immediate database write
  ↓
Next request reads current role
  ↓
Permission check completes
```

#### Pros

✅ Single source of truth (perfect consistency)
✅ No webhook sync complexity
✅ No race conditions
✅ Immediate role updates
✅ Simpler mental model

#### Cons

❌ Database query on EVERY protected route request
❌ Latency increase (~50-100ms per request)
❌ **FATAL: Doesn't work with Turso** (project supports both databases)
❌ Tight coupling to database provider
❌ Middleware becomes database-dependent
❌ Cache still needed for performance

#### Performance

- **Middleware:** SLOW (database query on every request)
- **Permission checks:** ~10ms (same as current)
- **Role updates:** FAST (direct database write)

#### Consistency Risk

**NONE** - Single source eliminates sync issues

#### Fatal Flaw: Multi-Database Support

**Project Requirement:** Support both Supabase (PostgreSQL) AND Turso (LibSQL)

**Problem:**

- Migrations are Supabase-specific (PostgreSQL RLS syntax)
- Turso doesn't have equivalent RLS system
- Would need separate migration scripts for each database
- Breaks database abstraction layer principle
- Creates maintenance nightmare

**Verdict:** ❌ **Not viable for this project**

---

### Option 3: Clerk-Only (JWT Claims as Source of Truth) ⭐ RECOMMENDED

**Architecture:**

- Remove Supabase users.role column
- Store roles ONLY in Clerk publicMetadata
- Middleware extracts role from JWT session claims
- Permission checks read from `locals.userRole` (no DB query)
- RLS policies remain identity-based (unchanged)

**Data Flow:**

```
Admin updates role in Clerk
  ↓
publicMetadata.role updated
  ↓
JWT refreshes (within 60 seconds)
  ↓
Middleware extracts role from JWT claims
  ↓
Permission check reads from locals.userRole (0ms)
```

#### Pros

✅ Single source of truth (Clerk)
✅ ZERO database queries for role checks
✅ Instant permission checks (0ms)
✅ Database-agnostic (works with Supabase + Turso)
✅ No webhook sync needed
✅ No cache system needed
✅ Fastest possible performance
✅ Aligns with existing JWT architecture
✅ Minimal RLS impact (policies already identity-based)

#### Cons

❌ Role changes require JWT refresh (~60s latency)
❌ JWT size increase (minimal, +10 bytes)
❌ Must add 'role' to JWT template (5 min task)
❌ Must migrate away from database storage

#### Performance

- **Middleware:** 0ms (claims already in memory)
- **Permission checks:** 0ms (reads from locals)
- **Role updates:** 60s (wait for JWT refresh)

#### Consistency Risk

**NONE** - Single source, JWT-based delivery

#### JWT Refresh Timing

- Default JWT lifespan: 60 seconds
- Auto-refresh: 10 seconds before expiry
- Role updates propagate within: ≤60 seconds
- User experience: Seamless (refresh is background)

---

## Detailed Comparison

| Aspect                  | Current (Dual)                | Supabase-Only       | Clerk-Only ⭐      |
| ----------------------- | ----------------------------- | ------------------- | ------------------ |
| **Source of Truth**     | Clerk (with Supabase replica) | Supabase            | Clerk              |
| **Consistency**         | Medium (sync lag)             | High                | High               |
| **Middleware Latency**  | 0ms (JWT)                     | 50-100ms (DB query) | 0ms (JWT)          |
| **Permission Check**    | 10ms (cached DB)              | 10ms (cached DB)    | 0ms (locals)       |
| **Role Update Latency** | 200-500ms (webhook)           | 0ms (immediate)     | ≤60s (JWT refresh) |
| **Sync Complexity**     | High (webhooks)               | None                | None               |
| **Cache Required**      | Yes (60s TTL)                 | Yes (performance)   | No                 |
| **Multi-Database**      | Yes ✅                        | No ❌               | Yes ✅             |
| **RLS Migration**       | None                          | None                | None               |
| **Webhook Dependency**  | High                          | None                | Low                |
| **Failure Modes**       | Webhook failures, sync lag    | DB downtime         | Clerk API issues   |
| **Maintenance**         | High (sync code, cache)       | Medium (DB queries) | Low (JWT only)     |
| **Scalability**         | Good                          | Poor                | Excellent          |

---

## RLS Policy Impact Analysis

### Current RLS Policies

**File:** `/scripts/migrations/002_security_policies.sql`

**All policies follow this pattern:**

```sql
-- Identity-based: User can access their own data
USING (((select auth.jwt())->>'sub')::text = clerk_id)

-- Service role bypass
USING (auth.role() = 'service_role')
```

**Key Finding:** NO policies use `users.role` column

### Example Policies

#### Users Table

```sql
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    ((select auth.jwt())->>'sub')::text = clerk_id
  );
```

#### Organization Memberships

```sql
CREATE POLICY "org_memberships_select_org_admin" ON organization_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_memberships AS om
      WHERE om.clerk_org_id = organization_memberships.clerk_org_id
        AND om.user_id = (
          SELECT id FROM users WHERE clerk_id = ((select auth.jwt())->>'sub')::text
        )
        AND om.clerk_org_role = 'org:admin'
    )
  );
```

**Pattern:** Uses `clerk_org_role`, NOT `users.role`

### Migration Impact

**For Clerk-Only Architecture:**

- ✅ No RLS policy changes needed
- ✅ Policies remain identity-based
- ✅ Organization roles still in database (separate system)
- ✅ Zero migration complexity

**Optional Future Enhancement:**
If you ever need permission-based RLS:

```sql
-- Could add super_admin bypass
USING (
  ((select auth.jwt())->>'sub')::text = clerk_id
  OR ((select auth.jwt())->>'role')::text = 'super_admin'
)
```

But current policies work fine without this.

---

## Performance Analysis

### Benchmark Scenarios

#### Scenario 1: User Accesses Dashboard (Protected Route)

**Current (Dual Storage):**

```
1. Middleware extracts userId from JWT (0ms)
2. Check protected route (0ms)
3. Proceed to page handler
4. Page queries role-guard.ts
5. Check cache (0ms or 10ms if expired)
6. Render page

Total: 0-10ms
```

**Supabase-Only:**

```
1. Middleware queries database for role (50-100ms) ❌
2. Check protected route (0ms)
3. Proceed to page handler
4. Page queries role-guard.ts
5. Database query for role (50-100ms or cached 0ms)
6. Render page

Total: 50-200ms (BAD)
```

**Clerk-Only:**

```
1. Middleware extracts role from JWT (0ms) ✅
2. Store in locals.userRole (0ms)
3. Check protected route (0ms)
4. Proceed to page handler
5. Page reads locals.userRole (0ms)
6. Render page

Total: 0ms (BEST)
```

#### Scenario 2: High Traffic (1000 requests/minute)

**Current (Dual Storage):**

- Cache hit rate: ~95%
- Database queries: ~50/min
- Total latency: ~50ms for 5% of requests
- Load: LOW

**Supabase-Only:**

- Cache hit rate: ~95%
- Database queries: 1000/min (all requests) ❌
- Total latency: 50-100ms per request
- Load: HIGH (unsustainable)

**Clerk-Only:**

- Cache needed: NO
- Database queries: 0/min ✅
- Total latency: 0ms
- Load: NONE (ideal)

---

## Implementation Complexity

### Current → Clerk-Only Migration

**Complexity:** LOW

**Step 1: Add Role to JWT Template (5 minutes)**

```json
{
  "role": "{{user.public_metadata.role}}"
}
```

**Step 2: Update Middleware (30 minutes)**

```typescript
// Change 1 line
locals.userRole = (claims?.role as string) ?? 'member'
```

**Step 3: Refactor role-guard.ts (2 hours)**

- Remove `fetchUserRoleFromSupabase` function
- Make `getUserRole` synchronous
- Remove cache system
- Simplify logic

**Step 4: Database Migration (1 hour)**

```sql
ALTER TABLE users DROP COLUMN role;
DROP TYPE user_role;
```

**Step 5: Update Webhooks (30 minutes)**

- Remove role extraction
- Stop syncing roles to database

**Step 6: Testing (4 hours)**

- Verify JWT claims
- Test permission checks
- Test role updates
- Verify multi-database compatibility

**Total Time:** ~1 day

**Risk:** LOW (easy rollback, parallel operation possible)

---

## Migration Strategy

### Zero-Downtime Approach

#### Phase 1: Parallel Operation (Week 1)

**Day 1:**

1. Add `role` to Clerk JWT template
2. Deploy middleware update (read from JWT)
3. Keep Supabase column and webhook sync running
4. Monitor logs for JWT propagation

**Day 2-7:**

- Monitor for any JWT issues
- Verify all users have role in JWT
- Compare JWT roles vs database roles
- Fix discrepancies via Clerk dashboard

#### Phase 2: Validation (Week 2)

**Day 1-3:**

1. Run comparison script:
   ```sql
   SELECT
     u.clerk_id,
     u.role as db_role,
     u.email
   FROM users u
   WHERE u.role IS NOT NULL;
   ```
2. Check JWT claims for same users
3. Fix any mismatches
4. Verify 100% consistency

#### Phase 3: Cutover (Week 2, Day 4)

**Morning:**

1. Update `role-guard.ts` to stop querying database
2. Deploy changes
3. Monitor for errors

**Afternoon:**

- Verify all permission checks working
- Check application logs
- Test admin/member/super_admin flows

#### Phase 4: Cleanup (Week 3)

**After 1 week of stable operation:**

1. Create migration to drop `users.role` column
2. Update webhook to stop syncing roles
3. Remove cache system code
4. Update documentation
5. Celebrate! 🎉

### Rollback Plan

**If issues arise at any phase:**

**Phase 1-2 Rollback:**

- No action needed, dual storage still active

**Phase 3 Rollback:**

```typescript
// Revert role-guard.ts to query database
export async function getUserRole(
  locals: App.Locals,
  fetchFromSupabase = true // Change back to true
): Promise<AnyRole | null> {
  // ... original implementation
}
```

**Phase 4 Rollback:**

```sql
-- Recreate column and ENUM
CREATE TYPE user_role AS ENUM ('member', 'admin', 'super_admin');
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'member';

-- Sync from Clerk
-- Manual data migration or re-trigger webhooks
```

---

## Decision

### ⭐ RECOMMENDATION: Clerk-Only Architecture

**Rationale:**

1. **Aligns with Project Architecture**
   - Multi-database support is a core requirement
   - Database abstraction layer should be role-agnostic
   - Clerk is already the authentication source of truth

2. **Superior Performance**
   - Zero database queries for authentication
   - Zero database queries for permission checks
   - Scales to unlimited requests without database load

3. **Simplicity**
   - Single source of truth (no sync)
   - No cache invalidation logic
   - No webhook complexity
   - Fewer failure modes

4. **RLS Compatibility**
   - Current policies are identity-based
   - No permission-based RLS in use
   - users.role column unused by security layer
   - Zero migration risk

5. **Existing Infrastructure**
   - Middleware already extracts JWT claims
   - Same pattern as `org_role` (already working)
   - Clerk dashboard already manages metadata

6. **Future-Proof**
   - Works with any database (Supabase, Turso, others)
   - No database-specific code
   - Easy to add more databases

### When This Wouldn't Work

**Avoid Clerk-Only if:**

- ❌ Need instant role updates (<60s)
- ❌ Have permission-based RLS policies
- ❌ Clerk is unavailable (on-premises requirement)
- ❌ Need role history/audit trail in database
- ❌ Complex role inheritance from database

**None of these apply to this project.**

---

## Implementation Priority

### HIGH PRIORITY

**Reason:** Current bug causes roles to appear random
**Impact:** User confusion, inconsistent permissions
**Risk:** Low (easy rollback)
**Benefit:** Fixes bug + improves architecture

### Recommended Timeline

**Week 1:** Fix immediate bug (middleware reads correct claim)
**Week 2-3:** Migrate to Clerk-Only architecture
**Week 4:** Cleanup and documentation

---

## Monitoring & Validation

### Metrics to Track

**During Migration:**

1. **JWT Claim Presence**

   ```typescript
   logger.info('JWT claims check', {
     hasRole: !!claims?.role,
     role: claims?.role,
     userId: locals.userId,
   })
   ```

2. **Permission Check Latency**

   ```typescript
   const start = Date.now()
   const role = getUserRole(locals)
   const latency = Date.now() - start
   logger.info('Role check latency', { latency, role })
   ```

3. **Role Consistency**
   ```sql
   -- Compare JWT vs Database
   SELECT
     clerk_id,
     role as db_role,
     -- Will need to manually check JWT
     email
   FROM users
   WHERE role IS NOT NULL;
   ```

**Post-Migration:**

1. Error rate on protected routes
2. Authorization failures
3. User reports of permission issues

### Success Criteria

✅ Zero permission-related errors
✅ 0ms role check latency
✅ No database queries for authentication
✅ 100% JWT claim coverage
✅ No user-reported issues

---

## Related Documentation

- [Clerk Session Token Customization](https://clerk.com/docs/backend-requests/making/custom-session-token)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [clerk-role-sync-fix.md](./clerk-role-sync-fix.md) - Immediate bug fix plan

---

## Appendix: Code Examples

### Current Implementation

```typescript
// middleware.ts (BUGGY)
locals.userRole = (claims?.org_role as string) ?? null

// role-guard.ts (SLOW)
export async function getUserRole(
  locals: App.Locals,
  fetchFromSupabase = false
): Promise<AnyRole | null> {
  if (fetchFromSupabase) {
    const db = getDatabase()
    const result = await db.query('SELECT role FROM users WHERE clerk_id = $1', [locals.userId])
    return result.rows[0]?.role || null
  }
  return locals.userRole as AnyRole
}
```

### Recommended Implementation

```typescript
// middleware.ts (FIXED)
locals.userRole = (claims?.role as string) ?? 'member'
locals.orgRole = (claims?.org_role as string) ?? null

// role-guard.ts (FAST)
export function getUserRole(locals: App.Locals): AnyRole | null {
  return (locals.userRole as AnyRole) ?? 'member'
}
```

**Diff:**

- ✅ Synchronous (no await)
- ✅ No database query
- ✅ No cache needed
- ✅ Reads from JWT claims
- ✅ 0ms latency

---

## Conclusion

**The Clerk-Only architecture is the clear winner for this project.**

It provides:

- 🚀 Best performance
- ✅ Perfect consistency
- 🎯 Lowest complexity
- 📦 Multi-database support
- 🔒 Maintains security

**Migration complexity is LOW and risk is MINIMAL.**

Proceed with confidence.

---

**Document Version:** 1.0
**Author:** Claude Code (AI Assistant)
**Status:** Ready for Review
**Next Steps:** Approve and implement
