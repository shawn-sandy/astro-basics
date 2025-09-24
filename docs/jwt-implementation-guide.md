# JWT-Based Clerk-Supabase Implementation Guide

Complete step-by-step implementation for secure PII handling with JWT authentication.

## Prerequisites Checklist

- [ ] Clerk account with project created
- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Webhook endpoint accessible (ngrok for local dev)

## Phase 1: Clerk Configuration (30 minutes)

### Step 1: Configure Clerk JWT Template

1. **Login to Clerk Dashboard** → Your Project → JWT Templates
2. **Create New Template**:

   ```json
   {
     "name": "supabase",
     "claims": {
       "aud": "authenticated",
       "exp": "{{session.expire_at}}",
       "iat": "{{session.issued_at}}",
       "iss": "https://your-clerk-frontend-api.clerk.accounts.dev",
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address}}",
       "role": "authenticated"
     }
   }
   ```

3. **Copy the Issuer URL** (needed for Supabase)

### Step 2: Configure Clerk Webhooks

1. **Go to Webhooks** → Create Endpoint
2. **Set Endpoint URL**: `https://your-domain.com/api/webhooks/clerk`
3. **Select Events**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `session.created`
4. **Copy Webhook Secret** → Add to `.env` as `CLERK_WEBHOOK_SECRET`

### Step 3: Update Environment Variables

```env
# Clerk Configuration
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_JWT_ISSUER=https://your-clerk-frontend-api.clerk.accounts.dev
```

## Phase 2: Supabase Configuration (45 minutes)

### Step 4: Configure Supabase JWT Authentication

1. **Go to Supabase Dashboard** → Authentication → Settings
2. **JWT Settings**:
   - **JWT Secret**: Use your existing secret (don't change)
   - **Site URL**: `https://your-domain.com`
   - **Additional URLs**: Add localhost for development

### Step 5: Add Clerk as External Provider

1. **Authentication** → Providers → Add Provider
2. **Custom OAuth Provider**:

   ```json
   {
     "enabled": true,
     "client_id": "your-clerk-publishable-key",
     "secret": "your-clerk-secret-key",
     "issuer": "https://your-clerk-frontend-api.clerk.accounts.dev",
     "authorization_url": "https://your-clerk-frontend-api.clerk.accounts.dev/oauth/authorize",
     "token_url": "https://your-clerk-frontend-api.clerk.accounts.dev/oauth/token",
     "user_info_url": "https://your-clerk-frontend-api.clerk.accounts.dev/oauth/userinfo"
   }
   ```

### Step 6: Create Database Schema

1. **Go to SQL Editor** in Supabase
2. **Run this schema**:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with PII separation
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id text UNIQUE NOT NULL,
  email text,
  username text,
  full_name text,
  avatar_url text,
  metadata jsonb DEFAULT '{}',
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Separate PII table for sensitive data
CREATE TABLE user_pii (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  phone text,
  address jsonb,
  date_of_birth date,
  encrypted_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pii ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for PII table (more restrictive)
CREATE POLICY "Users can view own PII" ON user_pii
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update own PII" ON user_pii
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role can manage all PII" ON user_pii
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_user_pii_user_id ON user_pii(user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_pii_updated_at BEFORE UPDATE ON user_pii
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 7: Configure JWT Validation Function

```sql
-- Function to validate Clerk JWTs
CREATE OR REPLACE FUNCTION auth.clerk_jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true),
    '{}'::text
  )::jsonb
$$;
```

## Phase 3: Code Implementation (2-3 hours)

### Step 8: Enhance Supabase Client

Create `src/libs/supabase-auth.ts`:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.SUPABASE_URL!
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client for webhooks
export const supabaseServiceRole = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Authenticated client factory
export function createSupabaseClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, import.meta.env.SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

// Helper to get user from Clerk JWT
export async function getUserFromClerk(clerkToken: string) {
  try {
    const response = await fetch('https://api.clerk.dev/v1/users', {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch user from Clerk:', error)
    return null
  }
}
```

### Step 9: Create JWT Middleware

Update `src/middleware.ts` to include JWT validation:

```typescript
import { auth } from '@clerk/astro/server'

const jwtMiddleware: MiddlewareHandler = async (context, next) => {
  const { request, locals } = context

  // Only process authenticated requests
  const authData = auth()
  if (authData.userId) {
    try {
      // Get JWT token from Clerk
      const token = await authData.getToken({ template: 'supabase' })
      if (token) {
        locals.supabaseToken = token
        locals.userId = authData.userId
      }
    } catch (error) {
      console.error('JWT middleware error:', error)
    }
  }

  return next()
}

// Update the middleware sequence
export const onRequest = hasValidClerkKeys
  ? sequence(rateLimitMiddleware, csrfMiddleware, authMiddleware, jwtMiddleware)
  : sequence(rateLimitMiddleware, csrfMiddleware)
```

### Step 10: Create User Profile API

Create `src/pages/api/user/profile.ts`:

```typescript
import type { APIRoute } from 'astro'
import { createSupabaseClient } from '#libs/supabase-auth'

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.supabaseToken || !locals.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createSupabaseClient(locals.supabaseToken)

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', locals.userId)
      .single()

    if (error) {
      return new Response(`Database error: ${error.message}`, { status: 500 })
    }

    return new Response(JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response('Internal server error', { status: 500 })
  }
}

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.supabaseToken || !locals.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const updates = await request.json()
    const supabase = createSupabaseClient(locals.supabaseToken)

    // Sanitize allowed fields
    const allowedFields = ['username', 'full_name', 'avatar_url', 'metadata']
    const sanitizedUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {})

    const { data, error } = await supabase
      .from('users')
      .update(sanitizedUpdates)
      .eq('clerk_id', locals.userId)
      .select()
      .single()

    if (error) {
      return new Response(`Update failed: ${error.message}`, { status: 500 })
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response('Internal server error', { status: 500 })
  }
}
```

### Step 11: Update Dashboard Components

Update `src/components/dashboard/DashboardLayout.astro`:

```astro
---
import { auth } from '@clerk/astro/server'

// Get user data server-side
const authData = auth()
if (!authData.userId) {
  return Astro.redirect('/login')
}

// Get JWT token for Supabase
let userData = null
try {
  const token = await authData.getToken({ template: 'supabase' })
  if (token) {
    const response = await fetch(`${Astro.url.origin}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) {
      userData = await response.json()
    }
  }
} catch (error) {
  console.error('Failed to fetch user data:', error)
}
---

<div class="dashboard-layout">
  <header>
    <h1>Welcome, {userData?.full_name || userData?.username || 'User'}!</h1>
    <img src={userData?.avatar_url} alt="Avatar" />
  </header>

  <main>
    <slot />
  </main>
</div>
```

## Phase 4: Testing & Validation (1 hour)

### Step 12: Test Authentication Flow

1. **Start development server**: `npm run dev`
2. **Test protected routes**: Visit `/dashboard`
3. **Verify JWT generation**: Check browser dev tools → Application → Local Storage
4. **Test API endpoints**: Use browser dev tools → Network tab

### Step 13: Security Validation

1. **Test RLS policies**:

   ```sql
   -- This should fail (different user's data)
   SELECT * FROM users WHERE clerk_id != auth.jwt() ->> 'sub';
   ```

2. **Validate JWT claims**: Check that tokens contain correct user ID and expiration

3. **Test webhook sync**: Create/update user in Clerk, verify Supabase sync

### Step 14: Environment Variables Checklist

```env
# Required for JWT implementation
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_JWT_ISSUER=https://your-clerk-frontend-api.clerk.accounts.dev
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Phase 5: Production Deployment

### Step 15: Security Hardening

- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up rate limiting for API routes
- [ ] Enable Supabase audit logging
- [ ] Configure webhook signature verification
- [ ] Set up monitoring and alerts

### Step 16: Performance Optimization

- [ ] Database indexes on frequently queried columns
- [ ] Connection pooling for high traffic
- [ ] Caching strategy for user data
- [ ] JWT token caching client-side

## Troubleshooting

### Common Issues

1. **JWT Token Invalid**: Check Clerk JWT template configuration
2. **RLS Policy Denies Access**: Verify JWT sub claim matches clerk_id
3. **Webhook Not Working**: Check endpoint URL and signature verification
4. **CORS Errors**: Configure allowed origins in Supabase

### Debug Tools

- Supabase logs: Dashboard → Logs
- Clerk logs: Dashboard → Logs
- Network requests in browser dev tools
- Server-side console logging

---

**Total Implementation Time: 4-6 hours**
**Security Level: Production-ready with PII protection**
**Maintenance: Low (mostly automated sync)**
