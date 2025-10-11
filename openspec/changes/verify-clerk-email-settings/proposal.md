# Verify Clerk Email Settings and Add Database Protection

## Why

Clerk natively prevents duplicate email addresses at the authentication layer, but the Supabase `users` table currently lacks a database-level UNIQUE constraint on the `email` column. This creates a potential vulnerability where direct database operations, race conditions, or webhook processing errors could bypass Clerk's protection and create duplicate email records.

This lightweight proposal leverages Clerk's existing duplicate prevention while adding minimal database-level protection as a defense-in-depth measure. Unlike the comprehensive `add-email-unique-constraint` proposal, this approach prioritizes simplicity and relies primarily on Clerk's proven authentication layer.

## What Changes

**Clerk Dashboard Configuration:**

- Verify email uniqueness is enforced (enabled by default)
- Enable "Block email subaddresses" to prevent `email+tag@example.com` abuse
- Enable "Block disposable emails" to prevent spam accounts

See [Clerk Dashboard Configuration Guide](#clerk-dashboard-configuration-guide) below for detailed setup instructions.

**Database Schema:**

- Add simple UNIQUE constraint to `users.email` column (allows multiple NULLs)
- Single idempotent migration with rollback script

**Webhook Error Handling:**

- Update `src/pages/api/webhooks/clerk.ts` to catch PostgreSQL error code `23505`
- Return 409 Conflict response with clear error message
- Log duplicate email attempts for monitoring

**Documentation:**

- Update `CLAUDE.md` to document Clerk as source of truth for email uniqueness
- Document database constraint as defense-in-depth measure

**Breaking Change:** ❌ None - This enforces existing Clerk behavior at database level

## Impact

### Affected Specs

- **user-sync** (existing capability) - Add basic email uniqueness enforcement requirements

### Affected Code

**Database:**

- `scripts/migrations/003_clerk_email_verification.sql` (new) - Simple unique constraint
- `scripts/migrations/rollback_003_clerk_email_verification.sql` (new) - Rollback script

**API Endpoints:**

- `src/pages/api/webhooks/clerk.ts` - Add error handling for duplicate emails (lines 154-166)

**Documentation:**

- `CLAUDE.md` - Update database section with email uniqueness notes

### Migration Strategy

**Pre-Migration:** Check for existing duplicate emails in production database

**Migration Execution:** Apply partial unique index that allows multiple NULL emails but enforces uniqueness for non-NULL values

**Post-Migration:** Webhook will return 409 error if duplicate email detected (should never happen with Clerk)

### Risk Assessment

**Very Low Risk** - This change:

- Does NOT modify existing data (only adds constraint)
- Relies on Clerk's proven duplicate prevention
- Has clear rollback path (drop constraint)
- Minimal code changes (< 30 lines)
- No new dependencies or infrastructure

### Comparison to add-email-unique-constraint

| Feature              | This Proposal          | add-email-unique-constraint      |
| -------------------- | ---------------------- | -------------------------------- |
| Database constraint  | ✅ Simple unique index | ✅ Partial unique index          |
| Audit table          | ❌ No                  | ✅ user_sync_audit table         |
| Database triggers    | ❌ No                  | ✅ log_duplicate_email_attempt() |
| Dashboard alerts     | ❌ No                  | ✅ SyncStatusAlert component     |
| Admin notifications  | ❌ Basic logging       | ✅ Structured notifications      |
| Migration complexity | Low                    | High                             |
| Implementation time  | ~30 minutes            | ~2-3 hours                       |
| Maintenance burden   | Low                    | Medium                           |

**Recommendation:** Use this proposal if you trust Clerk's authentication layer and prefer simplicity. Use `add-email-unique-constraint` if you need comprehensive audit trails and monitoring.

---

## Clerk Dashboard Configuration Guide

This section provides step-by-step instructions for configuring Clerk's email restriction settings to maximize duplicate email prevention and reduce spam signups.

### Prerequisites

- Admin access to your Clerk Dashboard at https://dashboard.clerk.com
- Your application must be using Clerk for authentication
- Environment variables `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` must be configured

### Configuration Steps

#### Step 1: Access Restrictions Settings

1. **Log into Clerk Dashboard**
   - Navigate to https://dashboard.clerk.com
   - Select your application from the dashboard

2. **Navigate to Restrictions**
   - Click **"Settings"** in the left sidebar
   - Select **"Restrictions"** from the settings menu
   - You should see the Restrictions configuration page

#### Step 2: Verify Email Uniqueness (Default Setting)

**What it does:** Clerk automatically enforces that each email address can only be associated with one user account. This prevents users from creating multiple accounts with the same email.

**Status:** ✅ **Enabled by default** - No action needed

**How to verify:**

1. In the Restrictions page, look for the email settings section
2. Confirm that email is listed as a valid identifier
3. Clerk enforces uniqueness automatically for all email identifiers

**Testing:**

- Try to create two user accounts with the same email in your application
- The second signup attempt should fail with error: "That email address is taken. Please try another."

#### Step 3: Enable "Block Email Subaddresses"

**What it does:** Prevents users from bypassing email uniqueness by using email subaddresses (also called "plus addressing"). For example, if `user@example.com` is registered, this blocks:

- `user+1@example.com`
- `user+test@example.com`
- `user+anything@example.com`

**Why enable it:** Malicious users often exploit subaddressing to create multiple accounts, abuse free trials, or manipulate voting/rating systems.

**How to enable:**

1. In the **Restrictions** page, locate the **"Email Restrictions"** section
2. Find the toggle for **"Block email subaddresses"**
3. Click to **enable** the toggle (it should turn blue/green)
4. Changes are applied immediately - no save button needed

**Behavior:**

- ✅ **Allowed:** First signup with `user+tag@example.com`
- ❌ **Blocked:** Subsequent signups with `user+different@example.com` after first subaddress is used
- 📝 **Note:** The first email with a subaddress will be allowed, but additional subaddresses are blocked

#### Step 4: Enable "Block Disposable Emails"

**What it does:** Prevents signups from temporary/disposable email services like:

- Mailinator, TempMail, Guerrilla Mail, 10MinuteMail
- Over 1000+ known disposable email domains maintained by Clerk

**Why enable it:** Disposable emails are commonly used for:

- Creating spam accounts
- Abusing free trials
- Avoiding accountability
- Testing/attacking your application

**How to enable:**

1. In the **Restrictions** page, find **"Block disposable email addresses"**
2. Click the toggle to **enable** it
3. Changes take effect immediately

**Behavior:**

- ❌ **Blocked:** Signups from domains like `@mailinator.com`, `@10minutemail.com`
- ✅ **Allowed:** Standard email providers (Gmail, Outlook, Yahoo, corporate domains)
- 🔄 **Updated:** Clerk maintains the disposable domain list automatically

#### Step 5: Optional - Configure Sign-up Mode

**Available modes:**

- **Public** (default) - Anyone can sign up
- **Restricted** - Only invited users can sign up
- **Waitlist** - Users request access, admin approves

**When to use Restricted mode:**

1. **Private beta or invite-only applications**
2. **Internal/enterprise applications**
3. **After launch to prevent new signups temporarily**

**How to configure:**

1. In the Restrictions page, find **"Sign-up mode"**
2. Select your preferred mode from the dropdown
3. If choosing **Restricted**, you'll need to:
   - Create invitation codes
   - Manually add allowed email addresses
   - Send invites through Clerk Dashboard

**⚠️ Warning:** Changing to Restricted mode will prevent all new signups until you create invitations.

### Verification Checklist

After completing the configuration, verify your settings:

- [ ] **Email uniqueness** - ✅ Enforced by default (no toggle needed)
- [ ] **Block email subaddresses** - Toggle is **enabled** (blue/green)
- [ ] **Block disposable emails** - Toggle is **enabled** (blue/green)
- [ ] **Sign-up mode** - Set to **Public** (or your preference)
- [ ] **Test duplicate email** - Attempt to create account with existing email (should fail)
- [ ] **Test subaddress** - Try `user+test@example.com` after `user@example.com` exists (should fail)
- [ ] **Test disposable** - Try `test@mailinator.com` (should fail)

### Troubleshooting

**Problem:** Can't find Restrictions page

- **Solution:** Ensure you have admin access to your Clerk application
- **Alternative path:** Settings → Security → Restrictions

**Problem:** Toggles are grayed out

- **Solution:** Your Clerk plan may not support this feature. Check your plan limits at Settings → Billing
- **Free tier:** All restriction features are available
- **Contact support:** If features should be available but aren't visible

**Problem:** Users report they can't sign up

- **Check:** Sign-up mode isn't set to "Restricted" accidentally
- **Check:** User isn't using a disposable email domain
- **Check:** User isn't trying to use a subaddress of an existing account

**Problem:** Duplicate emails still getting through

- **Cause:** This would indicate a database-level bypass (not Clerk)
- **Solution:** Apply the database migration from this proposal
- **Investigation:** Check webhook logs for constraint violations

### Environment Variables

After configuring Clerk Dashboard, ensure your application has the correct environment variables:

```env
# Required for Clerk authentication
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # For webhook verification
```

**Where to find these:**

1. Clerk Dashboard → **API Keys** in left sidebar
2. Copy the keys for your environment (Development/Staging/Production)
3. Add to your `.env` file
4. Restart your development server

### Dashboard Screenshots Reference

**Note:** Clerk's dashboard UI may change. If these instructions don't match your dashboard:

1. Use the search bar in Clerk Dashboard: Type "restrictions" or "email blocking"
2. Check Clerk documentation: https://clerk.com/docs/guides/secure/restricting-access
3. Contact Clerk support through the dashboard help icon

### Next Steps After Configuration

Once Clerk Dashboard is configured:

1. ✅ **Verify settings** using the checklist above
2. ✅ **Test restrictions** in your application's sign-up flow
3. ✅ **Proceed to database migration** (see tasks.md Phase 2)
4. ✅ **Update webhook handler** for database constraint errors (see tasks.md Phase 3)
5. ✅ **Monitor logs** for 48 hours after deployment

### Related Documentation

- Clerk Restrictions: https://clerk.com/docs/guides/secure/restricting-access
- Clerk Email Settings: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options
- Troubleshooting Email Deliverability: https://clerk.com/docs/troubleshooting/email-deliverability
