# Clerk-Supabase Integration

## Overview

This integration connects Clerk authentication with Supabase database, providing secure, user-scoped data access using Clerk's JWT tokens with Supabase's Row Level Security (RLS) policies.

## Architecture

```
┌─────────────┐     JWT Token      ┌──────────────┐
│    Clerk    │ ─────────────────> │   Supabase   │
│    Auth     │                    │   Database   │
└─────────────┘                    └──────────────┘
      │                                    │
      │ Webhook                           │ RLS
      ▼                                    ▼
┌─────────────┐                    ┌──────────────┐
│  User Sync  │                    │ Protected    │
│  Endpoint   │                    │    Data      │
└─────────────┘                    └──────────────┘
```

## Key Components

### 1. Database Schema

- **Users Table**: Synced with Clerk user data
- **Automatic Sync**: Webhook-based user profile synchronization

### 2. Authentication Flow

1. User authenticates with Clerk
2. Clerk generates JWT token with Supabase template
3. Token passed to Supabase with API requests
4. RLS policies enforce data access based on user ID

### 3. Server-Side Integration

- `supabase-native.ts`: Server-side Supabase client factories (`getSupabaseServiceRole`, `createServerSupabaseClient`)
- JWT token validation and attachment
- Service role for admin operations

### 4. Client-Side Integration

- No client-side Supabase client ships; React components get data from API routes or props

### 5. API Endpoints

#### Protected Endpoints

- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update profile

#### Webhook Endpoint

- `POST /api/webhooks/clerk` - User sync webhook

## File Structure

```
src/
├── libs/
│   ├── supabase-native.ts    # Server-side Supabase clients
│   └── database.types.ts     # TypeScript types for database
├── pages/
│   ├── api/
│   │   ├── user/
│   │   │   └── profile.ts     # User profile API
│   │   └── webhooks/
│   │       └── clerk.ts       # Clerk webhook handler
│   └── organization/
│       └── index.astro        # Organization management
scripts/
└── supabase-migrations/       # SQL migration files
    ├── 001_create_users_table.sql
    └── 002_enable_rls_policies.sql
```

## Quick Start

1. **Configure Supabase JWT**:
   - Add custom JWT provider in Supabase Dashboard
   - Set issuer to `https://clerk.com`

2. **Create Clerk JWT Template**:
   - Name: `supabase`
   - Include user claims (sub, email, username)

3. **Set Environment Variables**:

   ```env
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   SUPABASE_URL=https://[project].supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   PUBLIC_SUPABASE_URL=https://[project].supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. **Run Migrations**:
   - Execute SQL files in Supabase SQL editor

5. **Configure Webhook**:
   - Point Clerk webhook to `/api/webhooks/clerk`
   - Listen for user events

## Usage Examples

### Server-Side (Astro Page)

```typescript
import { createServerSupabaseClient } from '#libs/supabase-native'

const supabase = createServerSupabaseClient(Astro.locals.clerkToken) // null if not configured
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('clerk_id', Astro.locals.userId)
  .single()
```

## Security

### Row Level Security

All tables have RLS enabled with policies:

- Users can only view/edit their own data
- Service role has full access for admin operations

### Best Practices

1. Never expose service role key to client
2. Always verify webhook signatures
3. Use RLS policies for all sensitive tables
4. Validate JWT tokens on every request
5. Implement rate limiting on API endpoints

## Troubleshooting

### Common Issues

1. **User not syncing**: Check webhook logs and secret
2. **RLS blocking access**: Verify JWT claims match policies
3. **Real-time not working**: Check WebSocket connectivity
4. **Token expiration**: Implement automatic refresh

### Debug Tips

- Check Supabase logs for RLS policy violations
- Verify JWT token contents at jwt.io
- Monitor webhook delivery in Clerk Dashboard
- Use browser DevTools for WebSocket debugging

## Testing

Run integration tests:

```bash
npm test tests/integration/clerk-supabase.test.ts
```

## Next Steps

- Implement organization-scoped data models
- Add file storage with user permissions
- Set up monitoring and alerting
- Configure data backup strategies

## Support

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Issues](https://github.com/your-org/astro-basics/issues)
