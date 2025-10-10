# Product Requirements Document: Clerk + Supabase Integration

## Executive Summary

This PRD outlines the integration of Clerk authentication with Supabase database and backend services for the astro-basics project. The integration will enable secure, user-scoped data access using Clerk's authentication tokens with Supabase's Row Level Security (RLS) policies.

## Project Context

### Current State

- **Authentication**: Clerk is fully integrated for authentication with protected routes
- **Database**: Supabase client initialized but not connected to authentication
- **Existing Infrastructure**:
  - Turso database with messages table
  - Clerk middleware protecting `/dashboard/*`, `/forum/*`, `/organization/*` routes
  - Basic Supabase connection testing endpoint

### Target State

- Seamless authentication flow between Clerk and Supabase
- User data synchronized between systems
- RLS policies enforcing data access based on Clerk user IDs
- Real-time subscriptions with user context
- Webhook-based user profile synchronization

## Technical Requirements

### 1. Environment Configuration

#### Required Environment Variables

```env
# Existing Clerk Configuration
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # New: For webhook verification

# Enhanced Supabase Configuration
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...        # Public anon key
SUPABASE_SERVICE_KEY=eyJ...     # New: Service role key for admin operations
SUPABASE_JWT_SECRET=your-jwt-secret  # New: Must match Supabase dashboard
```

### 2. Supabase Dashboard Configuration

#### JWT Configuration Steps

1. Navigate to Supabase Dashboard → Authentication → Providers
2. Add Custom JWT Provider:

   - **Issuer**: `https://clerk.com`
   - **JWKS URL**: `https://[your-clerk-domain].clerk.accounts.dev/.well-known/jwks.json`
   - **Audience**: Your Supabase project URL
   - **Role Claim Path**: `role` (optional)
   - **Custom Claims Mapping**:

     ```json
     {
       "user_id": "sub",
       "email": "email",
       "name": "name",
       "username": "username"
     }
     ```

#### Clerk JWT Template Configuration

1. In Clerk Dashboard → JWT Templates → New Template
2. Name: `supabase`
3. Claims:

   ```json
   {
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address.email_address}}",
     "name": "{{user.full_name}}",
     "username": "{{user.username}}",
     "iss": "https://clerk.com",
     "aud": "YOUR_SUPABASE_PROJECT_URL",
     "role": "authenticated",
     "iat": "{{current_time}}",
     "exp": "{{expiry_time}}"
   }
   ```

### 3. Database Schema

#### Users Table

```sql
-- Users table synced with Clerk
CREATE TABLE public.users (
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

-- Create indexes for performance
CREATE INDEX idx_users_clerk_id ON public.users(clerk_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_username ON public.users(username) WHERE username IS NOT NULL;

-- Updated messages table with user relationship
ALTER TABLE public.messages
ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN clerk_user_id TEXT;

CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_clerk_user_id ON public.messages(clerk_user_id);
```

#### Row Level Security Policies

```sql
-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (clerk_id = auth.jwt()->>'sub');

-- Messages table policies
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (clerk_user_id = auth.jwt()->>'sub' OR user_id::text = auth.jwt()->>'sub');

CREATE POLICY "Users can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (clerk_user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (clerk_user_id = auth.jwt()->>'sub');

-- Public read policy for anonymous messages (optional)
CREATE POLICY "Anyone can view public messages"
  ON public.messages FOR SELECT
  USING (user_id IS NULL AND is_archived = false);
```

### 4. Server-Side Integration

#### Enhanced Supabase Client (`src/libs/supabase-server.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Creates a Supabase client for server-side operations with Clerk JWT
 */
export function createServerSupabaseClient(clerkToken?: string): SupabaseClient<Database> {
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseKey = clerkToken
    ? import.meta.env.SUPABASE_ANON_KEY
    : import.meta.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
    },
  })
}

/**
 * Get authenticated Supabase client from Astro context
 */
export async function getAuthenticatedSupabase(context: any): Promise<SupabaseClient<Database>> {
  const auth = context.locals.auth()
  const token = await auth.getToken({ template: 'supabase' })
  return createServerSupabaseClient(token)
}
```

### 5. Client-Side Integration

#### React Hook (`src/hooks/useSupabase.tsx`)

```typescript
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#/libs/database.types'

export function useSupabase() {
  const { getToken } = useAuth()
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initClient() {
      try {
        const token = await getToken({ template: 'supabase' })

        const supabaseClient = createClient<Database>(
          import.meta.env.PUBLIC_SUPABASE_URL!,
          import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: token ? `Bearer ${token}` : '',
              },
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        )

        setClient(supabaseClient)
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error)
      } finally {
        setLoading(false)
      }
    }

    initClient()
  }, [getToken])

  return { client, loading }
}
```

### 6. Webhook Integration

#### User Sync Webhook (`src/pages/api/webhooks/clerk.ts`)

```typescript
import type { APIRoute } from 'astro'
import { Webhook } from 'svix'
import { createServerSupabaseClient } from '#/libs/supabase-server'

const webhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET

export const POST: APIRoute = async ({ request }) => {
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Verify webhook signature
  const headers = {
    'svix-id': request.headers.get('svix-id')!,
    'svix-timestamp': request.headers.get('svix-timestamp')!,
    'svix-signature': request.headers.get('svix-signature')!,
  }

  const payload = await request.text()
  const wh = new Webhook(webhookSecret)

  let evt: any
  try {
    evt = wh.verify(payload, headers)
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle different event types
  const supabase = createServerSupabaseClient()

  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const { id, email_addresses, username, first_name, last_name, image_url } = evt.data

      const userData = {
        clerk_id: id,
        email: email_addresses[0]?.email_address,
        username,
        full_name: `${first_name || ''} ${last_name || ''}`.trim(),
        avatar_url: image_url,
        metadata: evt.data.public_metadata || {},
        last_sign_in_at: evt.data.last_sign_in_at ? new Date(evt.data.last_sign_in_at) : null,
      }

      const { error } = await supabase.from('users').upsert(userData, { onConflict: 'clerk_id' })

      if (error) {
        console.error('Failed to sync user:', error)
        return new Response('Failed to sync user', { status: 500 })
      }
      break
    }

    case 'user.deleted': {
      const { error } = await supabase.from('users').delete().eq('clerk_id', evt.data.id)

      if (error) {
        console.error('Failed to delete user:', error)
        return new Response('Failed to delete user', { status: 500 })
      }
      break
    }
  }

  return new Response('Webhook processed', { status: 200 })
}
```

### 7. Protected API Routes

#### Example: User Messages API (`src/pages/api/messages.ts`)

```typescript
import type { APIRoute } from 'astro'
import { getAuthenticatedSupabase } from '#/libs/supabase-server'

export const GET: APIRoute = async context => {
  const auth = context.locals.auth()

  if (!auth.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = await getAuthenticatedSupabase(context)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify({ messages: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export const POST: APIRoute = async context => {
  const auth = context.locals.auth()

  if (!auth.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const body = await context.request.json()
    const supabase = await getAuthenticatedSupabase(context)

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', auth.userId)
      .single()

    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...body,
        user_id: user?.id,
        clerk_user_id: auth.userId,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ message: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Failed to create message:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
```

### 8. Real-time Subscriptions

#### React Component with Real-time (`src/components/react/MessagesList.tsx`)

```typescript
import { useEffect, useState } from 'react'
import { useSupabase } from '#/hooks/useSupabase'
import { useUser } from '@clerk/clerk-react'

export function MessagesList() {
  const { user } = useUser()
  const { client, loading } = useSupabase()
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    if (!client || !user) return

    // Initial fetch
    async function fetchMessages() {
      const { data } = await client
        .from('messages')
        .select('*')
        .eq('clerk_user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setMessages(data)
    }

    fetchMessages()

    // Real-time subscription
    const subscription = client
      .channel('user-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `clerk_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? payload.new : msg
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [client, user])

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please sign in</div>

  return (
    <div>
      <h2>Your Messages</h2>
      {messages.map((message) => (
        <div key={message.id}>
          <h3>{message.subject}</h3>
          <p>{message.message}</p>
          <time>{new Date(message.created_at).toLocaleString()}</time>
        </div>
      ))}
    </div>
  )
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Configure Supabase JWT settings in dashboard
- [ ] Create Clerk JWT template for Supabase
- [ ] Update environment variables
- [ ] Create database migration scripts

### Phase 2: Database Setup (Week 1)

- [ ] Create users table with Clerk ID mapping
- [ ] Update messages table with user relationships
- [ ] Implement RLS policies
- [ ] Test policies with sample data

### Phase 3: Server Integration (Week 2)

- [ ] Create authenticated Supabase client utilities
- [ ] Update existing API routes with authentication
- [ ] Create webhook endpoint for user sync
- [ ] Test server-side authentication flow

### Phase 4: Client Integration (Week 2)

- [ ] Create useSupabase React hook
- [ ] Build authenticated components
- [ ] Implement real-time subscriptions
- [ ] Test client-side authentication flow

### Phase 5: Testing & Documentation (Week 3)

- [ ] Unit tests for authentication utilities
- [ ] Integration tests for API routes
- [ ] E2E tests for user flows
- [ ] Create developer documentation
- [ ] Update README with setup instructions

## Security Considerations

### Data Protection

- All user data must be protected by RLS policies
- Service role key should only be used for admin operations
- JWT tokens must be validated on every request
- Implement rate limiting on sensitive endpoints

### Compliance

- Ensure GDPR compliance for user data
- Implement data deletion on user request
- Audit log for sensitive operations
- Regular security reviews

## Success Metrics

### Technical Metrics

- Zero authentication-related security incidents
- < 100ms authentication overhead per request
- 99.9% uptime for authentication services
- 100% test coverage for auth utilities

### User Experience Metrics

- Seamless authentication flow
- No additional login steps required
- Real-time data updates working consistently
- Clear error messages for auth failures

## Risks and Mitigations

### Risk 1: JWT Token Expiration

**Mitigation**: Implement automatic token refresh in client hooks

### Risk 2: Webhook Reliability

**Mitigation**: Implement retry logic and dead letter queue

### Risk 3: RLS Policy Complexity

**Mitigation**: Thorough testing and documentation of policies

### Risk 4: Performance Impact

**Mitigation**: Implement caching and optimize database queries

## Dependencies

### External Services

- Clerk Authentication Platform
- Supabase Database & Backend
- Svix for webhook verification

### Internal Dependencies

- Existing Clerk middleware
- Current routing structure
- Database migration system

## Testing Strategy

### Unit Tests

```typescript
// Example test for authenticated Supabase client
describe('Authenticated Supabase Client', () => {
  it('should create client with Clerk token', async () => {
    const mockToken = 'mock-jwt-token'
    const client = createServerSupabaseClient(mockToken)
    expect(client).toBeDefined()
    expect(client.auth.getSession).toBeDefined()
  })

  it('should handle missing token gracefully', () => {
    const client = createServerSupabaseClient()
    expect(client).toBeDefined()
  })
})
```

### Integration Tests

- Test user creation via webhook
- Test RLS policies with different user contexts
- Test real-time subscriptions
- Test API route authentication

### E2E Tests

- Complete user registration flow
- Create and view user-specific data
- Test unauthorized access attempts
- Verify data isolation between users

## Documentation Requirements

### Developer Documentation

- Setup guide for new developers
- API reference for auth utilities
- Examples of common patterns
- Troubleshooting guide

### User Documentation

- Privacy policy updates
- Data handling explanation
- Account management guide

## Maintenance Plan

### Regular Tasks

- Weekly: Review authentication logs
- Monthly: Update dependencies
- Quarterly: Security audit
- Annually: Full integration review

### Monitoring

- Authentication success/failure rates
- API response times
- Database query performance
- Webhook delivery success

## Conclusion

This integration will provide a robust, secure, and scalable authentication and data access layer for the astro-basics project. By leveraging Clerk's authentication with Supabase's database features, we can deliver a superior user experience while maintaining high security standards.

## Appendix

### A. Database Type Definitions

```typescript
// src/libs/database.types.ts
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          metadata: Record<string, any>
          created_at: string
          updated_at: string
          last_sign_in_at: string | null
        }
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Insert>
      }
      messages: {
        Row: {
          id: number
          user_id: string | null
          clerk_user_id: string | null
          name: string
          email: string
          subject: string | null
          message: string
          is_read: boolean
          is_archived: boolean
          ip_address: string | null
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Insert>
      }
    }
  }
}
```

### B. Environment Template

```env
# Clerk Configuration
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase Configuration
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret-from-dashboard

# Public Supabase Keys (for client-side)
PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### C. Migration Script

```javascript
// scripts/migrate-to-supabase.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function migrate() {
  // Create tables
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      -- Users table
      CREATE TABLE IF NOT EXISTS public.users ...
      
      -- Update messages table
      ALTER TABLE public.messages ...
      
      -- Enable RLS
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      CREATE POLICY ...
    `,
  })

  if (tableError) {
    console.error('Migration failed:', tableError)
    process.exit(1)
  }

  console.log('Migration completed successfully')
}

migrate()
```

---

_Document Version: 1.0_  
_Last Updated: 2025-01-13_  
_Author: Development Team_  
_Status: Ready for Implementation_
