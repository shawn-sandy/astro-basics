# Clerk + Supabase Integration Setup Instructions

## Prerequisites Checklist

Before starting the integration:

- [ ] Active Clerk application with valid API keys
- [ ] Active Supabase project with database access
- [ ] Admin access to both Clerk and Supabase dashboards
- [ ] Node.js environment with npm/yarn installed

## Step 1: Supabase Dashboard Configuration

### 1.1 Get Your Supabase JWT Secret

1. Navigate to your Supabase Dashboard
2. Go to **Settings** → **API**
3. Find and copy your **JWT Secret** (under "Config" section)
4. Save this value - you'll need it for Clerk configuration

### 1.2 Configure Custom JWT Provider

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Scroll down to **Custom Providers** section
3. Click **Add Provider**
4. Configure as follows:

```
Provider Name: Clerk
Issuer (iss): https://clerk.com
JWKS Endpoint URL: https://[your-clerk-frontend-api].clerk.accounts.dev/.well-known/jwks.json
```

To find your JWKS URL:

- Go to Clerk Dashboard → **API Keys**
- Copy your **Frontend API URL** (e.g., `https://example-app-123.clerk.accounts.dev`)
- Append `/.well-known/jwks.json`

### 1.3 Configure JWT Claims Mapping

In the same provider configuration, add custom claims:

```json
{
  "provider": "clerk",
  "sub": "$.sub",
  "email": "$.email",
  "name": "$.name",
  "username": "$.username",
  "role": "$.role"
}
```

Click **Save** to apply the configuration.

## Step 2: Clerk Dashboard Configuration

### 2.1 Create Supabase JWT Template

1. Navigate to Clerk Dashboard → **JWT Templates**
2. Click **New Template**
3. Configure the template:

**Template Name**: `supabase`

**Claims** (JSON):

```json
{
  "aud": "${SUPABASE_PROJECT_URL}",
  "iss": "https://clerk.com",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "email_verified": {{user.primary_email_address.verification.status === 'verified'}},
  "name": "{{user.full_name}}",
  "username": "{{user.username}}",
  "role": "authenticated",
  "provider": "clerk",
  "provider_id": "{{user.id}}",
  "user_metadata": {
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}",
    "avatar_url": "{{user.image_url}}"
  },
  "iat": {{time.now}},
  "exp": {{time.future(3600)}}
}
```

**Signing Algorithm**: RS256 (default)

**Lifetime**: 3600 seconds (1 hour)

4. Click **Save Template**

### 2.2 Configure Webhook Endpoint (Optional but Recommended)

1. Go to **Webhooks** → **Add Endpoint**
2. Set endpoint URL: `https://your-domain.com/api/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the **Signing Secret** for your `.env` file

## Step 3: Environment Variables Setup

Update your `.env` file with the following variables:

```env
# Clerk Configuration (existing)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-key
CLERK_SECRET_KEY=sk_test_your-key

# New: Clerk Webhook Secret (from Step 2.2)
CLERK_WEBHOOK_SECRET=whsec_your-webhook-secret

# Supabase Configuration (enhanced)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Public keys for client-side usage
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Where to Find These Keys:

**Supabase Keys**:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Find:
   - `URL`: Your project URL
   - `anon public`: Your anonymous key (safe for client-side)
   - `service_role`: Your service key (server-side only, keep secret!)

## Step 4: Database Schema Setup

### 4.1 Run Migration Script

Create and run the following migration in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  CONSTRAINT users_clerk_id_key UNIQUE (clerk_id)
);

-- Add user relationship to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_clerk_user_id ON public.messages(clerk_user_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.jwt()->>'sub' = clerk_id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.jwt()->>'sub' = clerk_id);

-- Create RLS policies for messages table
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    auth.jwt()->>'sub' = clerk_user_id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = messages.user_id
      AND users.clerk_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Users can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.jwt()->>'sub' = clerk_user_id);

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (auth.jwt()->>'sub' = clerk_user_id);

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (auth.jwt()->>'sub' = clerk_user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Verify RLS Policies

Test your RLS policies in Supabase SQL Editor:

```sql
-- Test as authenticated user (will fail without proper JWT)
SET request.jwt.claim.sub = 'user_123';

-- This should return empty (no matching user)
SELECT * FROM public.users;

-- Reset to default
RESET request.jwt.claim.sub;
```

## Step 5: Code Implementation

### 5.1 Create Server-Side Supabase Client

Create `src/libs/supabase-server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createServerSupabaseClient(clerkToken?: string): SupabaseClient {
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseKey = clerkToken
    ? import.meta.env.SUPABASE_ANON_KEY
    : import.meta.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
    },
  })
}
```

### 5.2 Update API Routes

Example protected API route:

```typescript
// src/pages/api/user-messages.ts
import type { APIRoute } from 'astro'
import { createServerSupabaseClient } from '#/libs/supabase-server'

export const GET: APIRoute = async context => {
  const auth = context.locals.auth()

  if (!auth.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get Clerk JWT token for Supabase
  const token = await auth.getToken({ template: 'supabase' })
  const supabase = createServerSupabaseClient(token)

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    return new Response('Failed to fetch messages', { status: 500 })
  }

  return new Response(JSON.stringify({ messages: data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Step 6: Testing the Integration

### 6.1 Test Authentication Flow

1. Start your development server: `npm run dev`
2. Sign in with Clerk
3. Check browser DevTools Network tab for API calls
4. Verify JWT token is being sent to Supabase

### 6.2 Test Database Access

Create a test page to verify the integration:

```astro
---
// src/pages/test-integration.astro
import Layout from '#/layouts/Base.astro'

const auth = Astro.locals.auth()
if (!auth.userId) {
  return Astro.redirect('/login')
}

const token = await auth.getToken({ template: 'supabase' })
console.log('Clerk token generated:', !!token)
---

<Layout title="Integration Test">
  <h1>Clerk + Supabase Integration Test</h1>
  <p>User ID: {auth.userId}</p>
  <p>Token Generated: {token ? 'Yes' : 'No'}</p>
</Layout>
```

### 6.3 Verify RLS Policies

Test that users can only see their own data:

```typescript
// Test in browser console or API route
const response = await fetch('/api/user-messages')
const data = await response.json()
console.log('User messages:', data)
```

## Step 7: Troubleshooting

### Common Issues and Solutions

#### Issue: "Invalid JWT" error from Supabase

**Solution**:

- Verify JWKS URL is correct in Supabase provider settings
- Check that Clerk JWT template name matches in code
- Ensure JWT claims are properly configured

#### Issue: RLS policies blocking all access

**Solution**:

- Verify `auth.jwt()->>'sub'` matches `clerk_id` in users table
- Check that JWT token is being sent in Authorization header
- Test with service role key to bypass RLS for debugging

#### Issue: Webhook not syncing users

**Solution**:

- Verify webhook secret in environment variables
- Check webhook logs in Clerk dashboard
- Ensure webhook endpoint is publicly accessible

### Debug Checklist

1. [ ] Clerk authentication working (can sign in/out)
2. [ ] JWT template created in Clerk dashboard
3. [ ] Custom provider configured in Supabase
4. [ ] Environment variables correctly set
5. [ ] Database schema and RLS policies created
6. [ ] Server-side token generation working
7. [ ] Supabase client receiving JWT token
8. [ ] RLS policies allowing appropriate access

## Step 8: Production Deployment

### Pre-deployment Checklist

1. [ ] All environment variables set in production
2. [ ] Database migrations run in production
3. [ ] Webhook endpoint configured for production URL
4. [ ] SSL certificate valid for webhook endpoint
5. [ ] Rate limiting configured for API endpoints
6. [ ] Error monitoring set up (Sentry, etc.)
7. [ ] Database backups configured
8. [ ] Security headers configured

### Deployment Steps

1. **Set Production Environment Variables**

   ```bash
   # On Vercel, Netlify, or your hosting provider
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   CLERK_WEBHOOK_SECRET=whsec_...
   SUPABASE_URL=https://prod-project.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_KEY=...
   ```

2. **Run Database Migrations**

   - Execute migration SQL in Supabase production dashboard
   - Verify tables and RLS policies created

3. **Update Webhook URL**

   - In Clerk Dashboard, update webhook to production URL
   - Test webhook with Clerk's webhook tester

4. **Deploy Application**

   ```bash
   npm run build
   npm run deploy  # or git push for auto-deploy
   ```

5. **Post-deployment Verification**
   - Test user sign-up flow
   - Verify user data syncs to Supabase
   - Check RLS policies work correctly
   - Monitor error logs for issues

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT.io Debugger](https://jwt.io/) - For debugging JWT tokens
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Support Contacts

For integration issues:

- Clerk Support: support@clerk.com
- Supabase Support: support@supabase.com
- Project Team: [Your contact info]

---

_Setup Guide Version: 1.0_  
_Last Updated: 2025-01-13_  
_Estimated Setup Time: 30-45 minutes_
