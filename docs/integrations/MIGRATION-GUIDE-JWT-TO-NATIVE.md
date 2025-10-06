# Migration Guide: JWT Templates → Native Integration

**Quick migration guide for projects using the deprecated Clerk JWT template method with Supabase.**

## Why Migrate?

As of **April 1st, 2025**, Clerk's Supabase JWT template is **deprecated**. The new native third-party auth integration offers:

✅ **Simpler setup** - No JWT template configuration
✅ **Better performance** - Automatic token refresh
✅ **Reduced complexity** - Fewer environment variables
✅ **Official support** - Recommended by both Clerk and Supabase

## Quick Assessment

### Are you using JWT templates?

Check your code for these patterns:

```typescript
// ❌ OLD METHOD - You need to migrate
const token = await auth().getToken({ template: 'supabase' })

// ✅ NEW METHOD - Already using native integration
const token = await auth().getToken()
```

Check your environment variables:

```env
# ❌ OLD METHOD - You have this variable
SUPABASE_JWT_SECRET=your-secret

# ✅ NEW METHOD - You don't need this variable
# (removed)
```

## Migration Steps

### Step 1: Clerk Dashboard (5 minutes)

1. **Enable Native Integration**

   - Go to **Integrations** → **Supabase**
   - Click **"Enable Supabase Integration"**
   - Copy your Clerk domain (e.g., `my-app.clerk.accounts.dev`)

2. **Keep JWT Template** (for now - we'll remove it later)
   - Leave existing template in place during migration
   - This ensures zero downtime

### Step 2: Supabase Dashboard (10 minutes)

1. **Add Clerk as Third-Party Provider**

   - Go to **Authentication** → **Providers**
   - Scroll to **"Third-party Auth"** section
   - Click **"Add Provider"** → Select **"Clerk"**
   - Enter your Clerk domain from Step 1
   - Toggle **"Enable"** → Save

2. **Test Configuration**
   - Supabase will verify the JWKS endpoint
   - Should see green checkmark if successful

### Step 3: Update Code (15 minutes)

**Update Supabase client creation:**

```typescript
// Before (JWT template method)
import { createClient } from '@supabase/supabase-js'

export function createAuthenticatedClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: async () => {
        const token = await getToken({ template: 'supabase' }) // ❌ Remove this
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    },
  })
}

// After (native integration)
export function createAuthenticatedClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: getToken, // ✅ Use this instead
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

**Update all `getToken()` calls:**

```typescript
// Find and replace across your codebase
// ❌ OLD
await auth().getToken({ template: 'supabase' })

// ✅ NEW
await auth().getToken()
```

### Step 4: Update Environment Variables

**Remove deprecated variables:**

```env
# ❌ Remove this line
SUPABASE_JWT_SECRET=your-jwt-secret

# ✅ Rename if using old naming
SUPABASE_SERVICE_KEY=xxx  # OLD
SUPABASE_SERVICE_ROLE_KEY=xxx  # NEW (more accurate name)
```

**Update `.env.example`:**

```diff
- SUPABASE_JWT_SECRET=YOUR_SUPABASE_JWT_SECRET
+ # Note: SUPABASE_JWT_SECRET not needed for native Clerk integration (2025)
```

### Step 5: Test Integration (10 minutes)

**Test Checklist:**

1. **Sign in flow**

   ```bash
   npm run dev
   # Visit app → Sign in with Clerk → Should work normally
   ```

2. **API endpoints**

   ```bash
   # Test authenticated endpoint
   curl http://localhost:4321/api/user/profile \
     -H "Cookie: your-session-cookie"
   ```

3. **RLS policies**

   ```sql
   -- Run in Supabase SQL Editor
   SELECT
     (select auth.jwt()->>'sub') as jwt_sub,
     clerk_id,
     *
   FROM users
   LIMIT 5;
   ```

4. **Real-time subscriptions** (if used)
   ```typescript
   // Should continue working without changes
   const subscription = supabase
     .channel('user-changes')
     .on('postgres_changes', { event: '*', table: 'users' }, callback)
     .subscribe()
   ```

### Step 6: Cleanup (5 minutes)

Once everything is tested and working:

1. **Remove JWT template from Clerk**

   - Clerk Dashboard → JWT Templates
   - Delete "supabase" template

2. **Remove Supabase custom JWT provider** (if you had one)

   - Supabase Dashboard → Authentication → Providers
   - Remove any "Custom JWT" providers

3. **Update documentation**
   - Add migration notes to your project README
   - Update team documentation

## Rollback Plan

If you encounter issues, you can rollback:

1. **Re-enable JWT template in Clerk**

   - Recreate the template with your previous configuration

2. **Revert code changes**

   ```bash
   git revert <commit-hash>
   ```

3. **Restore environment variables**
   ```env
   SUPABASE_JWT_SECRET=your-jwt-secret
   ```

## Common Issues

### Issue 1: "JWT verification failed"

**Symptom:** Queries return empty results after migration.

**Solution:**

- Verify Clerk domain is **exact match** in Supabase config
- Check that native integration is enabled in Clerk
- Ensure JWT contains `role: "authenticated"` claim

**Debug:**

```typescript
const token = await auth().getToken()
const claims = JSON.parse(atob(token.split('.')[1]))
console.log('Token claims:', claims)
// Should see: { ..., role: "authenticated", sub: "user_xxx" }
```

### Issue 2: "RLS policies denying access"

**Symptom:** Users can't access their own data.

**Solution:**

- RLS policies should already be using `auth.jwt()->>'sub'`
- If using `auth.uid()`, update to `auth.jwt()->>'sub'`

**Migration:**

```sql
-- ❌ OLD (won't work with Clerk)
USING (auth.uid() = user_id)

-- ✅ NEW (correct for Clerk)
USING (((select auth.jwt())->>'sub')::text = clerk_id)
```

### Issue 3: "Token refresh not working"

**Symptom:** Sessions expire after 5-10 minutes.

**Solution:**

- Ensure `accessToken` callback is used (not manual headers)
- Verify Clerk session is active

**Check implementation:**

```typescript
// ✅ CORRECT - Automatic refresh
createClient(url, key, {
  accessToken: getToken,
})

// ❌ INCORRECT - Manual headers
createClient(url, key, {
  global: {
    headers: { Authorization: `Bearer ${token}` },
  },
})
```

## Verification Checklist

After migration, verify:

- [ ] Users can sign in successfully
- [ ] API endpoints return correct data
- [ ] RLS policies work as expected
- [ ] Real-time subscriptions work (if used)
- [ ] Webhooks sync users correctly (if configured)
- [ ] No JWT template exists in Clerk dashboard
- [ ] `SUPABASE_JWT_SECRET` removed from environment
- [ ] Team documentation updated

## Performance Improvements

After migration, you should see:

📈 **Faster authentication**

- No additional token fetch required
- Single Clerk session token used for both services

📈 **Simpler token refresh**

- Automatic via `accessToken` callback
- No manual refresh logic needed

📈 **Reduced latency**

- Direct JWKS verification by Supabase
- No intermediate token generation

## Additional Resources

- **[Complete Integration Guide](./clerk-supabase-integration-2025.md)** - Full setup documentation
- **[Starlight User Guide](/src/content/docs/guide/integrations/clerk-supabase.mdx)** - User-facing documentation
- **[Clerk Official Docs](https://clerk.com/docs/integrations/databases/supabase)** - Clerk's integration guide
- **[Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party/clerk)** - Supabase's integration guide

## Support

Need help with migration?

1. **Review troubleshooting** in this guide
2. **Check integration guide** for detailed setup steps
3. **Create an issue** on GitHub with migration logs
4. **Contact support** - Clerk and Supabase both support native integration

---

**Migration Time Estimate:** 45 minutes
**Recommended Downtime:** 0 minutes (can migrate with overlap)
**Risk Level:** Low (rollback available, backward compatible)
**Last Updated:** 2025-10-06
