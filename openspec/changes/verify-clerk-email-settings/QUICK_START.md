# Quick Start: Clerk Email Verification Setup

> **⏱️ Total Time:** 15-20 minutes
> **✅ Validation:** OpenSpec strict mode passed
> **📋 Prerequisites:** Admin access to Clerk Dashboard

## Overview

This guide walks you through configuring Clerk's duplicate email prevention settings and adding database-level protection. Follow these steps in order for best results.

---

## Phase 1: Clerk Dashboard (5 minutes)

### Access Dashboard

1. Go to <https://dashboard.clerk.com>
2. Select your application
3. Navigate to: **Settings → Restrictions**

### Configure Settings

#### ✅ Email Uniqueness (Default - No Action)

- Clerk enforces this automatically
- Each email can only be used once

#### 🔧 Enable "Block Email Subaddresses"

- **Location:** Restrictions → Email Restrictions
- **Toggle:** Enable (blue/green)
- **Prevents:** `user+1@example.com`, `user+test@example.com` abuse

#### 🔧 Enable "Block Disposable Emails"

- **Location:** Restrictions → Email Restrictions
- **Toggle:** Enable (blue/green)
- **Blocks:** Mailinator, TempMail, 10MinuteMail, etc.

### Quick Test

```bash
# Test 1: Try duplicate email signup (should fail)
# Test 2: Try disposable email like test@mailinator.com (should fail)
# Test 3: Try user+test@example.com after user@example.com exists (should fail)
```

---

## Phase 2: Database Migration (5 minutes)

### Check for Duplicates

```sql
SELECT email, COUNT(*) as count
FROM users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

If duplicates exist, resolve manually before proceeding.

### Apply Migration

```bash
# Migration will be created in tasks.md Phase 2
npm run db:migrate -- 003_clerk_email_verification.sql
```

### Verify

```sql
-- Should see idx_users_email_unique constraint
\d users
```

---

## Phase 3: Webhook Error Handling (10 minutes)

### Update Webhook Handler

Edit `src/pages/api/webhooks/clerk.ts` at line 154 (user.created handler):

```typescript
// Add this error handling wrapper
const { data: user, error: userError } = await supabase
  .from('users')
  .upsert(userData, { onConflict: 'clerk_id' })
  .select()
  .single()

if (userError) {
  // Check for duplicate email constraint violation
  if (userError.code === '23505' && userError.message?.includes('idx_users_email_unique')) {
    logger.error('Duplicate email detected', {
      userId: id,
      email: validEmail,
      clerkId: id,
    })
    return new Response(
      JSON.stringify({
        error: 'Email already exists',
        message: 'This email address is already registered with another account.',
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Re-throw other errors
  logger.error('Failed to sync user', { userId: id, error: userError.message })
  return new Response(`Failed to sync user: ${userError.message}`, { status: 500 })
}
```

Repeat for `user.updated` handler at line 223.

---

## Phase 4: Testing (5 minutes)

### Test Checklist

- [ ] Clerk prevents duplicate email signup
- [ ] Database constraint blocks duplicate SQL insert
- [ ] Webhook returns 409 on duplicate email
- [ ] Logs show structured error messages
- [ ] NULL emails are allowed (multiple NULLs)

### Test Commands

```bash
# 1. Test database constraint
psql -d your_database -c "INSERT INTO users (clerk_id, email) VALUES ('test123', 'existing@example.com');"
# Expected: ERROR duplicate key value violates unique constraint "idx_users_email_unique"

# 2. Test webhook (requires Clerk event)
# Trigger user.created event from Clerk Dashboard
# Check logs for 409 response
```

---

## Rollback (If Needed)

```bash
# Remove database constraint
npm run db:migrate -- rollback_003_clerk_email_verification.sql

# Revert webhook handler changes
git checkout src/pages/api/webhooks/clerk.ts
```

---

## Configuration Summary

| Setting             | Status     | Impact                     |
| ------------------- | ---------- | -------------------------- |
| Email uniqueness    | ✅ Default | Prevents duplicate signups |
| Block subaddresses  | 🔧 Enable  | Prevents `user+tag` abuse  |
| Block disposable    | 🔧 Enable  | Blocks temp emails         |
| Database constraint | 📝 New     | Defense-in-depth           |
| Webhook handler     | 📝 Update  | Graceful error handling    |

---

## Common Issues

**"Can't find Restrictions page"**

- Check you're logged in as admin
- Try: Settings → Security → Restrictions

**"Toggles grayed out"**

- Free tier includes all features
- Contact Clerk support if issue persists

**"Duplicate emails still getting through"**

- Verify Clerk settings are enabled
- Check database constraint exists: `\d users`
- Review webhook logs for errors

---

## Next Steps

1. ✅ Complete Clerk Dashboard configuration
2. ✅ Apply database migration
3. ✅ Update webhook handler
4. ✅ Test all scenarios
5. 📋 Follow full [tasks.md](tasks.md) for production deployment

---

**Need Help?**

- Full proposal: [proposal.md](proposal.md)
- Detailed tasks: [tasks.md](tasks.md)
- Technical specs: [specs/user-sync/spec.md](specs/user-sync/spec.md)
- Clerk docs: <https://clerk.com/docs/guides/secure/restricting-access>
