# Clerk-Supabase Native Integration Guide (2025)

**Complete step-by-step implementation using the new native third-party authentication method.**

## Prerequisites Checklist

- [ ] Clerk account with project created
- [ ] Supabase project created
- [ ] Basic Astro app with Clerk already installed
- [ ] Admin access to both dashboards

## Phase 1: Clerk Dashboard Configuration (15 minutes)

### Step 1: Access Supabase Integration

1. **Login to Clerk Dashboard** → Your Project
2. **Navigate to Integrations** → Database → Supabase
3. **Click "Configure"** or "Connect with Supabase"

### Step 2: Enable Supabase Integration

1. **Toggle "Enable Supabase Integration"** to ON
2. **Copy your Clerk Domain** (e.g., `your-app.clerk.accounts.dev`)
3. **Note the Integration ID** (you'll need this for Supabase)

### Step 3: Configure Webhooks (Optional but Recommended)

1. **Go to Webhooks** → Create Endpoint
2. **Endpoint URL**: `https://your-domain.com/api/webhooks/clerk`
3. **Select Events**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. **Copy Webhook Secret** → Add to `.env`

## Phase 2: Supabase Dashboard Configuration (20 minutes)

### Step 4: Add Clerk as Third-Party Provider

1. **Login to Supabase Dashboard** → Your Project
2. **Navigate to Authentication** → Providers
3. **Scroll to "Third-party Auth"** section
4. **Click "Add Provider"** → Select "Clerk"

### Step 5: Configure Clerk Provider

1. **Provider Name**: `clerk`
2. **Clerk Domain**: Paste domain from Step 2 (e.g., `your-app.clerk.accounts.dev`)
3. **Enable Provider**: Toggle ON
4. **Click "Save"**

### Step 6: Configure Local Development (if using Supabase CLI)

Add to `supabase/config.toml`:

```toml
[auth.third_party.clerk]
enabled = true
domain = "your-app.clerk.accounts.dev"
```

## Phase 3: Database Schema Setup (30 minutes)

### Step 7: Create User Tables

**Go to Supabase SQL Editor** and run:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main users table
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
  ssn_encrypted text, -- Store encrypted
  emergency_contact jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User preferences/settings
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  notifications jsonb DEFAULT '{"email": true, "push": true}',
  privacy_settings jsonb DEFAULT '{"profile_visible": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_user_pii_user_id ON user_pii(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_pii_updated_at BEFORE UPDATE ON user_pii
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 8: Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pii ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    (select auth.jwt()->>'sub') = clerk_id::text
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    (select auth.jwt()->>'sub') = clerk_id::text
  );

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- PII table policies (more restrictive)
CREATE POLICY "Users can view own PII" ON user_pii
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE (select auth.jwt()->>'sub') = clerk_id::text
    )
  );

CREATE POLICY "Users can update own PII" ON user_pii
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users
      WHERE (select auth.jwt()->>'sub') = clerk_id::text
    )
  );

CREATE POLICY "Service role can manage all PII" ON user_pii
  FOR ALL USING (auth.role() = 'service_role');

-- Preferences table policies
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE (select auth.jwt()->>'sub') = clerk_id::text
    )
  );

CREATE POLICY "Service role can manage all preferences" ON user_preferences
  FOR ALL USING (auth.role() = 'service_role');
```

## Phase 4: Code Implementation (45 minutes)

### Step 9: Update Environment Variables

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

### Step 10: Create Enhanced Supabase Client

Create `src/libs/supabase-native.ts`:

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.SUPABASE_URL!
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client (for webhooks and server operations)
export const supabaseServiceRole = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Client factory with Clerk session token
export function createAuthenticatedSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    accessToken: getToken,
  })
}

// Server-side client factory
export function createServerSupabaseClient(token: string | null): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

### Step 11: Update Middleware for Native Integration

Update `src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'
import type { MiddlewareHandler } from 'astro'
import { sequence } from 'astro:middleware'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)', '/organization(.*)'])

// Enhanced auth middleware with token storage
const enhancedAuthMiddleware = clerkMiddleware(async (auth, context, next) => {
  const { request, locals } = context

  // Check if route is protected
  if (isProtectedRoute(request) && !auth().userId) {
    return auth().redirectToSignIn()
  }

  // Store auth data in locals for server components
  if (auth().userId) {
    locals.userId = auth().userId
    locals.userRole = auth().sessionClaims?.role as string

    // Get Clerk session token for Supabase
    try {
      const token = await auth().getToken()
      locals.clerkToken = token
    } catch (error) {
      console.error('Failed to get Clerk token:', error)
    }
  }

  return next()
})

// Keep existing middleware
export const onRequest = sequence(rateLimitMiddleware, csrfMiddleware, enhancedAuthMiddleware)
```

### Step 12: Create User Profile API with Native Integration

Create `src/pages/api/user/profile.ts`:

```typescript
import type { APIRoute } from 'astro'
import { createServerSupabaseClient } from '#libs/supabase-native'

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.userId || !locals.clerkToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createServerSupabaseClient(locals.clerkToken)

    // Fetch user with preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        `
        *,
        user_preferences (*)
      `
      )
      .eq('clerk_id', locals.userId)
      .single()

    if (userError) {
      console.error('User fetch error:', userError)
      return new Response(`Database error: ${userError.message}`, {
        status: 500,
      })
    }

    return new Response(JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Profile API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.userId || !locals.clerkToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const updates = await request.json()
    const supabase = createServerSupabaseClient(locals.clerkToken)

    // Separate profile updates from preferences
    const { preferences, ...profileUpdates } = updates

    // Allowed profile fields
    const allowedProfileFields = ['username', 'full_name', 'avatar_url', 'metadata']

    const sanitizedProfileUpdates = Object.keys(profileUpdates)
      .filter(key => allowedProfileFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = profileUpdates[key]
        return obj
      }, {})

    // Update user profile
    let userData = null
    if (Object.keys(sanitizedProfileUpdates).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update(sanitizedProfileUpdates)
        .eq('clerk_id', locals.userId)
        .select()
        .single()

      if (error) {
        return new Response(`Profile update failed: ${error.message}`, {
          status: 500,
        })
      }
      userData = data
    }

    // Update preferences if provided
    if (preferences) {
      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userData?.id,
          ...preferences,
        })
        .eq('user_id', userData?.id)

      if (prefError) {
        console.error('Preferences update error:', prefError)
      }
    }

    return new Response(
      JSON.stringify({
        user: userData,
        message: 'Profile updated successfully',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Profile update error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
```

### Step 13: Create React Component with Native Client

Create `src/components/react/UserProfileEditor.tsx`:

```tsx
import { useAuth } from '@clerk/astro/react'
import { useState, useEffect } from 'react'
import { createAuthenticatedSupabaseClient } from '#libs/supabase-native'

interface UserProfile {
  id: string
  clerk_id: string
  email: string
  username: string
  full_name: string
  avatar_url: string
  user_preferences?: {
    theme: string
    notifications: object
  }[]
}

export function UserProfileEditor() {
  const { getToken, userId } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Create Supabase client with Clerk token
  const supabase = createAuthenticatedSupabaseClient(getToken)

  useEffect(() => {
    if (userId) {
      fetchProfile()
    }
  }, [userId])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          *,
          user_preferences (*)
        `
        )
        .eq('clerk_id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('users').update(updates).eq('clerk_id', userId)

      if (error) throw error

      // Refresh profile data
      await fetchProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading profile...</div>

  if (!profile) return <div>Profile not found</div>

  return (
    <div className="profile-editor">
      <h2>Edit Profile</h2>

      <form
        onSubmit={e => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          updateProfile({
            username: formData.get('username') as string,
            full_name: formData.get('full_name') as string,
          })
        }}
      >
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            defaultValue={profile.username || ''}
            required
          />
        </div>

        <div>
          <label htmlFor="full_name">Full Name:</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name || ''}
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Update Profile'}
        </button>
      </form>
    </div>
  )
}
```

### Step 14: Update Dashboard with Server-Side Data

Update `src/pages/dashboard/index.astro`:

```astro
---
import { auth } from '@clerk/astro/server'
import { createServerSupabaseClient } from '#libs/supabase-native'
import DashboardLayout from '#components/dashboard/DashboardLayout.astro'

// Check authentication
const authData = auth()
if (!authData.userId) {
  return Astro.redirect('/login')
}

// Get Clerk session token and fetch user data
let userData = null
let error = null

try {
  const token = await authData.getToken()
  if (token) {
    const supabase = createServerSupabaseClient(token)

    const { data, error: dbError } = await supabase
      .from('users')
      .select(
        `
        *,
        user_preferences (*)
      `
      )
      .eq('clerk_id', authData.userId)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      error = dbError.message
    } else {
      userData = data
    }
  }
} catch (err) {
  console.error('Auth error:', err)
  error = 'Authentication failed'
}
---

<DashboardLayout>
  <div class="dashboard-home">
    {
      error ? (
        <div class="error">
          <p>Error loading profile: {error}</p>
        </div>
      ) : userData ? (
        <div class="profile-summary">
          <h1>Welcome, {userData.full_name || userData.username || 'User'}!</h1>
          <div class="user-info">
            {userData.avatar_url && <img src={userData.avatar_url} alt="Profile" class="avatar" />}
            <div class="details">
              <p>
                <strong>Email:</strong> {userData.email}
              </p>
              <p>
                <strong>Username:</strong> {userData.username}
              </p>
              <p>
                <strong>Last Sign In:</strong>{' '}
                {userData.last_sign_in_at
                  ? new Date(userData.last_sign_in_at).toLocaleDateString()
                  : 'Never'}
              </p>
              <p>
                <strong>Theme:</strong> {userData.user_preferences?.[0]?.theme || 'Default'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div class="loading">
          <p>Loading profile...</p>
        </div>
      )
    }

    <div class="dashboard-actions">
      <a href="/dashboard/profile">Edit Profile</a>
      <a href="/dashboard/settings">Settings</a>
      <a href="/dashboard/messages">Messages</a>
    </div>
  </div>
</DashboardLayout>

<style>
  .dashboard-home {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .profile-summary {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .user-info {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
  }

  .details p {
    margin: 0.5rem 0;
  }

  .dashboard-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .dashboard-actions a {
    display: block;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    text-decoration: none;
    text-align: center;
    border: 1px solid #e9ecef;
    transition: background-color 0.2s;
  }

  .dashboard-actions a:hover {
    background: #e9ecef;
  }

  .error {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 1rem;
    border-radius: 4px;
  }
</style>
```

## Phase 5: Testing & Validation (30 minutes)

### Step 15: Test Native Integration

1. **Start development server**: `npm run dev`
2. **Test authentication flow**:

   - Visit `/dashboard`
   - Sign in with Clerk
   - Verify dashboard loads with user data

3. **Test API endpoints**:

   ```bash
   # Test profile fetch (while signed in)
   curl -H "Cookie: your-session-cookie" http://localhost:4321/api/user/profile
   ```

4. **Test RLS policies**:
   - Go to Supabase → SQL Editor
   - Run: `SELECT * FROM users;` (should be empty without auth)
   - Test with authenticated requests

### Step 16: Verify Security

1. **Test unauthorized access**:

   - Try accessing API endpoints without authentication
   - Should return 401 Unauthorized

2. **Test RLS policies**:

   - Create test user
   - Verify they can only see their own data

3. **Test token refresh**:
   - Long-running sessions should automatically refresh tokens

### Step 17: Production Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Security audit completed

## Phase 6: Optional Enhancements

### Step 18: Real-time Features (Optional)

```typescript
// Add real-time subscriptions to user data changes
const subscription = supabase
  .channel('user-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'users',
      filter: `clerk_id=eq.${userId}`,
    },
    payload => {
      console.log('User data changed:', payload)
      // Update UI accordingly
    }
  )
  .subscribe()
```

### Step 19: Enhanced PII Encryption

```sql
-- Add encrypted PII storage
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to encrypt PII
CREATE OR REPLACE FUNCTION encrypt_pii(data text, key text)
RETURNS text AS $$
BEGIN
  RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql;
```

## Troubleshooting

### Common Issues:

1. **"Invalid JWT" errors**:

   - Check Clerk domain configuration in Supabase
   - Verify third-party auth is enabled

2. **RLS policy denies access**:

   - Check that `auth.jwt()->>'sub'` matches `clerk_id`
   - Verify user exists in database

3. **Token not refreshing**:
   - Check Clerk session configuration
   - Verify `accessToken` function in Supabase client

### Debug Steps:

```javascript
// Debug JWT claims
console.log('JWT claims:', await auth().getToken())

// Debug Supabase auth
const { data: user } = await supabase.auth.getUser()
console.log('Supabase user:', user)
```

---

**Total Implementation Time: 2-3 hours**
**Security Level: Production-ready with native integration**
**Maintenance: Minimal (automatic updates from both platforms)**

This guide implements the latest 2025 native integration method, eliminating the deprecated JWT template approach while maintaining high security standards for PII data.
