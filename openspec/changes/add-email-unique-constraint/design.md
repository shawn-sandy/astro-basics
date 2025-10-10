# Design: Email Uniqueness Constraint

## Context

The `users` table currently has a UNIQUE constraint on `clerk_id` but not on `email`. This allows multiple user records with identical email addresses, creating data integrity issues and potential security vulnerabilities. While Clerk's authentication layer prevents duplicate emails during normal sign-up flows, direct database operations, race conditions, or webhook processing errors can bypass this protection.

**Current State:**

- Schema: `email text` (no constraint)
- Sync method: `upsert(..., { onConflict: 'clerk_id' })`
- Duplicate detection: None at database level

**Stakeholders:**

- **Users**: Expect email uniqueness for password reset, notifications
- **Developers**: Need reliable email-based lookups
- **System**: Requires data integrity for audit trails

**Constraints:**

- Must preserve NULL emails (users without email in Clerk)
- Cannot modify existing data during migration (manual admin resolution for duplicates)
- Must maintain backward compatibility with existing webhook and sync code

## Goals / Non-Goals

**Goals:**

1. Enforce email uniqueness at database level using PostgreSQL UNIQUE constraint
2. Allow multiple NULL email values (users without verified emails)
3. Provide graceful error handling when duplicate email attempts occur
4. Create safe rollback path for schema reversion
5. Document duplicate detection and resolution process

**Non-Goals:**

- Automatically merge or delete duplicate email records (manual admin decision required)
- Change how Clerk manages email uniqueness (Clerk remains source of truth)
- Add application-level validation (database constraint is authoritative)
- Modify existing user data during migration

## Decisions

### Decision 1: Partial Unique Constraint (Allows Multiple NULLs)

**What**: Use PostgreSQL partial unique index: `CREATE UNIQUE INDEX ... WHERE email IS NOT NULL`

**Why**:

- Standard UNIQUE constraint treats NULL as a value (only allows one NULL)
- Users without email in Clerk should not conflict with each other
- Partial index ignores NULL values while enforcing uniqueness for non-NULL

**Implementation**:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users(email)
WHERE email IS NOT NULL;
```

**Alternatives Considered:**

1. **Standard UNIQUE Constraint** - Rejected: Would only allow single NULL email
2. **Application-Level Validation** - Rejected: Can be bypassed, not authoritative
3. **Trigger-Based Enforcement** - Rejected: More complex, harder to maintain

### Decision 2: Manual Duplicate Resolution

**What**: Detect existing duplicates with SQL query, require manual admin resolution before migration

**Why**:

- Duplicates may represent legitimate separate accounts with data ownership issues
- Automated merge logic could cause data loss or incorrect associations
- Admin needs to review context (comments, preferences, org memberships) before deciding

**Implementation**:

```sql
-- Detection query (run before migration)
SELECT email, COUNT(*) as count, ARRAY_AGG(clerk_id) as clerk_ids
FROM users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

**Resolution Options for Admins:**

1. Keep newest account, anonymize old accounts
2. Keep account with most data, migrate orphaned data
3. Contact users for clarification

**Alternatives Considered:**

1. **Keep First, Delete Rest** - Rejected: Could delete active account
2. **Keep Last, Delete Rest** - Rejected: Could delete account with data
3. **Merge Accounts Automatically** - Rejected: Complex, high risk of data loss

### Decision 3: Graceful Error Handling in Application

**What**: Catch PostgreSQL unique constraint violation (code `23505`) and return user-friendly error

**Why**:

- Database errors should not cause webhook or API failures
- Users and admins need actionable guidance when conflicts occur
- Logging duplicate attempts helps identify integration issues

**Implementation**:

```typescript
try {
  await supabase.from('users').upsert(userData, { onConflict: 'clerk_id' })
} catch (error) {
  if (error.code === '23505' && error.constraint === 'idx_users_email_unique') {
    logger.error('Duplicate email detected', { email, clerkId })
    return new Response(
      JSON.stringify({
        error: 'Email already exists',
        message: 'This email address is already registered with another account.',
        suggestion: 'Please contact support if you believe this is an error.',
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    )
  }
  throw error // Re-throw other errors
}
```

**Alternatives Considered:**

1. **Silent Failure** - Rejected: Hides problems, makes debugging difficult
2. **Generic Error Message** - Rejected: Doesn't help users resolve issue
3. **Retry Logic** - Rejected: Won't fix duplicate email conflict

### Decision 4: Idempotent Migration with Verification

**What**: Use `IF NOT EXISTS` and include verification queries in migration

**Why**:

- Safe to run migration multiple times without errors
- Self-documenting success/failure status
- Follows existing migration patterns in `001_core_schema.sql`

**Implementation**:

```sql
BEGIN;

-- Add partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users(email)
WHERE email IS NOT NULL;

-- Verify creation
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND indexname = 'idx_users_email_unique'
  ) INTO v_index_exists;

  IF v_index_exists THEN
    RAISE NOTICE 'Email uniqueness constraint successfully created';
  ELSE
    RAISE WARNING 'Email uniqueness constraint was not created';
  END IF;
END$$;

COMMIT;
```

## Risks / Trade-offs

### Risk 1: Existing Duplicates Block Migration

**Description**: If duplicates exist, constraint creation will fail

**Likelihood**: Medium (depends on current data state)

**Impact**: High (blocks deployment)

**Mitigation**:

- Run detection query before migration
- Document manual resolution process
- Include clear error message in migration if constraint creation fails
- Test migration on production database snapshot

### Risk 2: Race Conditions During Webhook Processing

**Description**: Two webhooks for different Clerk users with same email arrive simultaneously

**Likelihood**: Low (Clerk prevents this at auth layer)

**Impact**: Medium (one webhook fails)

**Mitigation**:

- Graceful error handling returns 409 Conflict
- Webhook retry logic in Clerk will handle transient failures
- Log all conflicts for investigation

### Risk 3: Performance Impact on User Table Queries

**Description**: Additional index may slow down writes

**Likelihood**: Low (email index already exists for reads)

**Impact**: Low (<5ms additional latency per write)

**Mitigation**:

- Email already has non-unique index (`idx_users_email`)
- Unique index replaces non-unique index (no additional index)
- PostgreSQL partial indexes are highly efficient

### Trade-off: Manual vs Automated Duplicate Resolution

**Trade-off**: Manual resolution requires admin intervention but prevents data loss

**Decision**: Favor safety over automation

**Justification**:

- Duplicate emails indicate serious data integrity issue
- Context needed to determine correct resolution
- One-time operation, not ongoing maintenance burden

## Migration Plan

### Phase 1: Detection and Communication (Pre-Migration)

1. Run duplicate detection query on production database
2. Document findings and resolution options
3. Communicate upcoming schema change to team
4. Backup production database

### Phase 2: Duplicate Resolution (If Needed)

1. Review each duplicate email case
2. Determine appropriate resolution (keep/merge/delete)
3. Execute resolution manually via Supabase dashboard or SQL
4. Verify no duplicates remain

### Phase 3: Migration Execution

1. Apply `003_add_email_unique_constraint.sql` to production
2. Verify constraint creation via `\d users` or migration verification query
3. Test user sync flow end-to-end
4. Monitor error logs for unique constraint violations

### Phase 4: Validation and Monitoring

1. Attempt to create duplicate email via manual sync (should fail with 409)
2. Monitor webhook error rates for 24-48 hours
3. Confirm no unexpected failures
4. Update runbook with email conflict resolution steps

### Rollback Plan

**Scenario**: Migration causes unexpected issues or constraint needs removal

**Steps**:

1. Run `rollback_003_add_email_unique_constraint.sql`
2. Verify constraint dropped via `\d users`
3. Confirm user sync operations succeed
4. Investigate root cause before re-attempting

**Rollback SQL**:

```sql
DROP INDEX IF EXISTS idx_users_email_unique;
```

**Rollback Safety**: High - Only removes constraint, does not modify data

### Decision 5: Database Trigger for Audit Logging

**What**: Create PostgreSQL trigger to log all duplicate email attempts to `user_sync_audit` table

**Why**:

- Provides complete audit trail independent of application logging
- Captures attempts even if application error handling fails
- Enables admin investigation of patterns and integration issues
- Survives application restarts and log rotation
- Database-level guarantee that no duplicate attempts go unrecorded

**Implementation**:

```sql
-- Audit log table
CREATE TABLE IF NOT EXISTS user_sync_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  clerk_id text,
  email text,
  error_code text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Trigger function
CREATE OR REPLACE FUNCTION log_duplicate_email_attempt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM users
    WHERE email = NEW.email
    AND clerk_id != NEW.clerk_id
  ) THEN
    INSERT INTO user_sync_audit (
      event_type,
      clerk_id,
      email,
      error_code,
      error_message,
      metadata
    ) VALUES (
      'duplicate_email_attempt',
      NEW.clerk_id,
      NEW.email,
      '23505',
      'Attempted to insert duplicate email',
      jsonb_build_object(
        'attempted_at', now(),
        'operation', TG_OP,
        'table', TG_TABLE_NAME
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER log_user_email_duplicates
  BEFORE INSERT OR UPDATE OF email ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_duplicate_email_attempt();
```

**Alternatives Considered:**

1. **Application-Only Logging** - Rejected: Can be bypassed, doesn't survive restarts
2. **PostgreSQL Logging (pg_log)** - Rejected: Too verbose, harder to query
3. **External Monitoring Service** - Rejected: Adds complexity, additional dependency

### Decision 6: Multi-Channel User Notification

**What**: Implement three-tier notification system for email conflicts:

1. **Immediate API Response** (409 status with actionable message)
2. **Dashboard Alert** (visible to user on next login)
3. **Admin Notification** (structured logging for investigation)

**Why**:

- Users need immediate feedback during manual sync
- Webhook failures are async - user needs dashboard alert
- Admins need to investigate and resolve conflicts proactively
- Multi-channel approach ensures no conflicts go unnoticed

**Implementation**:

```typescript
// 1. Immediate API Response (already in Decision 3)

// 2. Dashboard Alert Component
async function checkUserSyncStatus(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('email, created_at, updated_at')
    .eq('clerk_id', userId)
    .single()

  return {
    synced: !!data,
    lastSync: data?.updated_at,
    message: !data ? 'Profile sync incomplete. Contact support.' : null,
  }
}

// 3. Admin Notification
async function notifyAdminOfDuplicateEmail(details: {
  clerkId: string
  email: string
  timestamp: Date
}) {
  logger.error('Admin Action Required: Duplicate Email', {
    severity: 'high',
    category: 'user_sync',
    ...details,
  })
}
```

**Alternatives Considered:**

1. **Email-Only Notification** - Rejected: Users may not check email immediately
2. **No Dashboard Alert** - Rejected: Users have no visibility into sync status
3. **Automatic Retry** - Rejected: Won't fix duplicate email conflict

## Open Questions

**Q1**: Should we implement email/Slack notifications for admins immediately?

**A1**: Start with structured logging and dashboard audit view. Add email/Slack in Phase 2 if duplicate rate is high.

**Q2**: What happens to users who change their email to one that already exists?

**A2**: Clerk prevents this at authentication layer. Database constraint is defense-in-depth. Dashboard will show sync failure alert.

**Q3**: Should we auto-merge accounts with duplicate emails?

**A3**: No - too risky without understanding data ownership. Manual admin resolution required.
