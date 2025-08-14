# Clerk + Supabase Integration Setup Instructions

## Overview

This guide establishes JWT-based authentication between Clerk and Supabase, enabling secure user authentication and basic user information tracking (name, email, last login timestamp).

## Prerequisites

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

### 2.2 Configure Webhook for User Sync

1. Go to **Webhooks** → **Add Endpoint**
2. Set endpoint URL: `https://your-domain.com/api/webhooks/clerk`
3. Select events:
   - `user.created` - Create user record
   - `user.updated` - Update name/email
   - `session.created` - Track last login
4. Copy the **Signing Secret** for your `.env` file

## Step 3: Environment Variables

Add these variables to your `.env` file:

```env
# Clerk Configuration
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-key
CLERK_SECRET_KEY=sk_test_your-key
CLERK_WEBHOOK_SECRET=whsec_your-webhook-secret

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Finding Your Keys**:

- **Clerk**: Dashboard → API Keys
- **Supabase**: Settings → API (use `anon` key for client, `service_role` for server)

## Step 4: Database Schema

Run this migration in Supabase SQL Editor:

```sql
-- Create minimal users table for login tracking
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own record
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.jwt()->>'sub' = clerk_id);
```

## Step 5: Code Implementation

### 5.1 Supabase Server Client

Create `src/libs/supabase-server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient(clerkToken?: string) {
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

### 5.2 Webhook Handler for User Sync

Create `src/pages/api/webhooks/clerk.ts`:

```typescript
import type { APIRoute } from 'astro'
import { Webhook } from 'svix'
import { createServerSupabaseClient } from '#libs/supabase-server'

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Verify webhook signature
  const svix_id = request.headers.get('svix-id')
  const svix_timestamp = request.headers.get('svix-timestamp')
  const svix_signature = request.headers.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing webhook headers', { status: 400 })
  }

  const body = await request.text()
  const wh = new Webhook(webhookSecret)

  let evt
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Handle different event types
  switch (evt.type) {
    case 'user.created':
    case 'user.updated':
      await supabase.from('users').upsert({
        clerk_id: evt.data.id,
        email: evt.data.email_addresses[0]?.email_address,
        name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim(),
      })
      break

    case 'session.created':
      await supabase
        .from('users')
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq('clerk_id', evt.data.user_id)
      break
  }

  return new Response('Webhook processed', { status: 200 })
}
```

### 5.3 Example Protected API Route

```typescript
// src/pages/api/user-profile.ts
import type { APIRoute } from 'astro'
import { createServerSupabaseClient } from '#libs/supabase-server'

export const GET: APIRoute = async context => {
  const auth = context.locals.auth()
  if (!auth.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get Clerk JWT token for Supabase
  const token = await auth.getToken({ template: 'supabase' })
  const supabase = createServerSupabaseClient(token)

  const { data, error } = await supabase.from('users').select('*').single()

  if (error) {
    return new Response('Failed to fetch profile', { status: 500 })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Step 6: Verification

### Quick Test Checklist

1. **Test Authentication Flow**:

   - Sign in with Clerk
   - Check webhook logs in Clerk dashboard
   - Verify user record created in Supabase

2. **Test API Access**:

   ```bash
   # Test the user profile endpoint
   curl https://your-domain.com/api/user-profile \
     -H "Cookie: __session=your-clerk-session"
   ```

3. **Verify Database**:
   - Check Supabase dashboard for user records
   - Confirm `last_sign_in_at` updates on login

### Common Issues

| Issue               | Solution                                                          |
| ------------------- | ----------------------------------------------------------------- |
| Invalid JWT error   | Verify JWKS URL in Supabase matches your Clerk instance           |
| Webhook not working | Check webhook secret and ensure endpoint is publicly accessible   |
| RLS blocking access | Ensure JWT token contains correct `sub` claim matching `clerk_id` |

## Additional Resources

- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Supabase Custom JWT](https://supabase.com/docs/guides/auth/jwt)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

_Setup Time: ~30 minutes_  
_Last Updated: January 2025_
