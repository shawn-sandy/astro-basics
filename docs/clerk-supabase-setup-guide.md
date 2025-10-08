# Clerk-Supabase Integration Setup Guide

**Quick start guide for implementing the Clerk-Supabase role management integration.**

## Prerequisites

- ✅ Clerk account with project created
- ✅ Supabase project created
- ✅ Node.js 18+ installed
- ✅ Git repository access

## Step 1: Database Setup (15 minutes)

### Option A: Automated Migration (Recommended for Development)

```bash
# Ensure environment variables are set
cp .env.example .env
# Edit .env and add:
#   SUPABASE_URL=https://xxx.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Run migrations
node scripts/run-clerk-supabase-migrations.js
```

### Option B: Manual Migration (Recommended for Production)

1. **Go to Supabase Dashboard** → Your Project → SQL Editor
2. **Run Migration 001**:

   - Open `scripts/migrations/001_create_users_with_roles.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

3. **Run Migration 002**:

   - Open `scripts/migrations/002_create_rls_policies.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

4. **Verify Tables Created**:

   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('users', 'organization_memberships', 'user_preferences');
   ```

   You should see all three tables listed.

---

## Step 2: Clerk Configuration (10 minutes)

### A. Add Custom Session Claims

1. **Navigate to**: Clerk Dashboard → Your App → Sessions → Customize session token
2. **Add custom claims**:

```json
{
  "role": "authenticated",
  "org_role": "{{user.organization_memberships.0.role}}",
  "org_id": "{{user.organization_memberships.0.id}}"
}
```

3. **Save changes**

**Why?** These claims enable Supabase RLS policies to identify users and their roles.

### B. Configure Webhooks

1. **Navigate to**: Clerk Dashboard → Your App → Webhooks
2. **Click**: "Add Endpoint"
3. **Endpoint URL**: `https://your-domain.com/api/webhooks/clerk`

   - For local dev: Use ngrok or similar tunneling service
   - For production: Use your actual domain

4. **Subscribe to Events**:

   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
   - ✅ `organizationMembership.created`
   - ✅ `organizationMembership.updated`
   - ✅ `organizationMembership.deleted`
   - ✅ `session.created` (optional - for last sign-in tracking)

5. **Copy Webhook Secret** → Add to `.env`:

   ```env
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

---

## Step 3: Environment Variables (5 minutes)

Update your `.env` file with all required variables:

```env
# Clerk Configuration
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Security Note:** Never commit `.env` files to version control!

---

## Step 4: Code Integration (Already Complete ✅)

The following files have been created/updated:

### Database Layer

- ✅ `src/libs/supabase-auth.ts` - Enhanced Supabase client factories
- ✅ `src/utils/clerk-roles.ts` - Role utilities with hierarchy support

### API Endpoints

- ✅ `src/pages/api/webhooks/clerk.ts` - Webhook handler for user sync
- ✅ `src/pages/api/user/profile-with-org.ts` - Profile API with org context

### Middleware

- ✅ `src/middleware.ts` - Enhanced with org role extraction
- ✅ `src/env.d.ts` - TypeScript types for locals

### Database

- ✅ `scripts/migrations/001_create_users_with_roles.sql`
- ✅ `scripts/migrations/002_create_rls_policies.sql`

---

## Step 5: Testing the Integration (10 minutes)

### A. Test User Synchronization

1. **Start your development server**:

   ```bash
   npm run dev
   ```

2. **Sign up a new user** via your application
3. **Check Supabase** → Table Editor → `users` table
4. **Verify** the new user appears with correct data

### B. Test Organization Membership

1. **Create an organization** in Clerk Dashboard or via your app
2. **Add a user** to the organization
3. **Check Supabase** → Table Editor → `organization_memberships`
4. **Verify** the membership record exists with correct role

### C. Test RLS Policies

Run this SQL in Supabase to test RLS:

```sql
-- This should return no rows (RLS enforced)
SET ROLE anon;
SELECT * FROM users;

-- This should return all rows (service role bypasses RLS)
SET ROLE service_role;
SELECT * FROM users;
```

### D. Test API Endpoints

```bash
# Get user profile (requires authentication)
curl -X GET http://localhost:4321/api/user/profile-with-org \
  -H "Cookie: __session=your-session-cookie"

# Update user profile
curl -X PATCH http://localhost:4321/api/user/profile-with-org \
  -H "Cookie: __session=your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newusername",
    "preferences": {
      "theme": "dark",
      "notifications_email": false
    }
  }'
```

---

## Step 6: Production Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured in hosting provider
- [ ] Webhook endpoint accessible via HTTPS
- [ ] Webhook secret configured and verified
- [ ] Database migrations applied to production Supabase
- [ ] RLS policies tested and verified
- [ ] Clerk session token customization applied
- [ ] Test user sign-up and organization creation
- [ ] Monitor webhook delivery in Clerk Dashboard
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)

---

## Common Issues & Solutions

### Issue: "User not found" after sign-up

**Cause:** Webhook hasn't fired or failed to process

**Solutions:**

1. Check Clerk Dashboard → Webhooks → Recent Deliveries
2. Verify webhook secret matches `.env`
3. Check server logs for webhook processing errors
4. Manually trigger webhook retry in Clerk Dashboard

---

### Issue: "Invalid signature" webhook errors

**Cause:** Incorrect webhook secret or payload verification

**Solutions:**

1. Verify `CLERK_WEBHOOK_SECRET` in `.env` matches Clerk Dashboard
2. Ensure webhook endpoint accepts POST requests
3. Check for middleware that might modify request body

---

### Issue: RLS policies denying access

**Cause:** Session claims not properly configured

**Solutions:**

1. Verify custom claims in Clerk session token
2. Check `auth.jwt()->>'sub'` matches `clerk_id` in database
3. Use Supabase SQL Editor to test queries with `SET ROLE anon`
4. Verify user exists in `users` table

---

### Issue: Organization role not syncing

**Cause:** Webhook events not subscribed or failing

**Solutions:**

1. Verify organization membership events are subscribed in Clerk
2. Check webhook logs for `organizationMembership.*` events
3. Ensure user exists in `users` table before org membership creation

---

## Usage Examples

### Check User's Organization Role (Server-Side)

```typescript
// In Astro component
---
import { isOrgAdmin, hasRequiredRole, ClerkRole } from '#utils/clerk-roles'

const isAdmin = isOrgAdmin(Astro.locals.userRole)
const canManage = hasRequiredRole(Astro.locals.userRole, ClerkRole.ADMIN)
---

{isAdmin && (
  <button>Admin Settings</button>
)}
```

### Query User's Organizations

```typescript
import { createServerClerkSupabaseClient, getUserOrganizations } from '#libs/supabase-auth'

const supabase = createServerClerkSupabaseClient(Astro.locals.clerkToken)
const orgs = await getUserOrganizations(supabase, Astro.locals.userId)

orgs.forEach(org => {
  console.log(`${org.org_name} - Role: ${org.clerk_org_role}`)
})
```

### React Component with User Profile

```tsx
import { useAuth } from '@clerk/astro/react'
import { createClerkSupabaseClient } from '#libs/supabase-auth'

export function UserProfile() {
  const { getToken, userId } = useAuth()
  const supabase = createClerkSupabaseClient(getToken)

  const { data: profile } = await supabase
    .from('users')
    .select(
      `
      *,
      user_preferences (*),
      organization_memberships (*)
    `
    )
    .eq('clerk_id', userId)
    .single()

  return <div>{profile.full_name}</div>
}
```

---

## Performance Tips

1. **Cache User Data**: Profile data changes infrequently, cache for 1-5 minutes
2. **Index Foreign Keys**: Already done in migrations, but verify with `EXPLAIN ANALYZE`
3. **Limit JOIN Depth**: Only fetch necessary related data
4. **Use Connection Pooling**: Supabase handles this automatically
5. **Monitor Webhook Latency**: Should be <100ms average

---

## Security Best Practices

1. **Never expose service role key** to client-side code
2. **Validate webhook signatures** before processing (already implemented)
3. **Use RLS policies** instead of manual authorization checks
4. **Sanitize user inputs** before database updates (implemented in API)
5. **Audit log sensitive operations** (consider adding audit trail)
6. **Rotate secrets regularly** (Clerk and Supabase keys)

---

## Monitoring & Observability

### Key Metrics to Track

1. **Webhook Success Rate**: Should be >99%
2. **User Sync Latency**: Time from user.created to database record
3. **API Response Times**: Profile endpoint should be <100ms
4. **RLS Policy Performance**: Monitor slow queries
5. **Failed Auth Attempts**: Track unauthorized access

### Logging

The integration uses structured logging via `#utils/logger`:

```typescript
logger.info('User profile updated', {
  userId: locals.userId,
  fieldsUpdated: ['username', 'theme'],
})
```

Configure log levels in production:

- `DEBUG`: Development only
- `INFO`: Standard operations
- `WARN`: Recoverable errors
- `ERROR`: Critical failures

---

## Next Steps

1. **Implement Organization Switcher** - Allow users to switch between orgs
2. **Add Custom Roles** - Extend beyond org:admin/org:member
3. **Build Admin Dashboard** - Manage users and organizations
4. **Add Audit Logging** - Track all data modifications
5. **Implement Real-time Features** - Supabase subscriptions for live updates

---

## Support & Resources

- **Integration Plan**: `docs/clerk-supabase-integration-plan.md`
- **Clerk Documentation**: <https://clerk.com/docs>
- **Supabase Documentation**: <https://supabase.com/docs>
- **Project Issues**: Create GitHub issue for bugs or questions

---

**Last Updated:** 2025-10-03
**Version:** 1.0
**Maintainer:** astro-basics team
