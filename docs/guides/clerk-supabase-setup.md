# Clerk + Supabase Integration Setup Guide

This guide walks you through setting up the Clerk authentication with Supabase database integration for the astro-basics project.

## Prerequisites

- Clerk account with a project created
- Supabase account with a project created
- Node.js 18+ installed
- Git and GitHub CLI configured

## Step 1: Supabase Configuration

### 1.1 Configure JWT Authentication in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Providers**
3. Add a Custom JWT Provider with these settings:

```
Issuer: https://clerk.com
JWKS URL: https://[your-clerk-frontend-api].clerk.accounts.dev/.well-known/jwks.json
Audience: [Your Supabase project URL]
Role Claim Path: role
```

4. Add Custom Claims Mapping:

```json
{
  "user_id": "sub",
  "email": "email",
  "name": "name",
  "username": "username"
}
```

### 1.2 Run Database Migrations

Execute the SQL migrations in your Supabase SQL editor:

1. First, run the users table migration:

```sql
-- Copy contents from scripts/supabase-migrations/001_create_users_table.sql
```

2. Then, run the RLS policies migration:

```sql
-- Copy contents from scripts/supabase-migrations/002_enable_rls_policies.sql
```

## Step 2: Clerk Configuration

### 2.1 Create JWT Template

1. Go to your Clerk Dashboard
2. Navigate to **JWT Templates**
3. Create a new template named `supabase`
4. Add these claims:

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

Replace `YOUR_SUPABASE_PROJECT_URL` with your actual Supabase project URL.

### 2.2 Configure Webhooks

1. In Clerk Dashboard, go to **Webhooks**
2. Create a new webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events to listen for:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `session.created`
3. Copy the webhook secret

## Step 3: Environment Variables

Update your `.env` file with the following variables:

```env
# Clerk Configuration
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_... # From webhook configuration

# Supabase Configuration
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ... # From Supabase project settings
SUPABASE_SERVICE_KEY=eyJ... # Service role key from Supabase
SUPABASE_JWT_SECRET=your-jwt-secret # From Supabase dashboard

# Public Supabase Keys (for client-side)
PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ... # Same as SUPABASE_ANON_KEY
```

## Step 4: Install Dependencies

```bash
npm install
```

The required dependencies (`@supabase/supabase-js` and `svix`) are already included in package.json.

## Step 5: Test the Integration

### 5.1 Start the Development Server

```bash
npm run start
```

### 5.2 Test User Authentication

1. Navigate to `http://localhost:4321`
2. Sign up or sign in using Clerk
3. Check that user is created in Supabase:
   - Go to Supabase Dashboard → Table Editor → users table
   - Verify the user record exists with correct Clerk ID

### 5.3 Test Protected Routes

Visit these protected routes to verify authentication:

- `/dashboard` - User dashboard
- `/forum` - Community forum with messages
- `/organization` - Organization management

### 5.4 Test API Endpoints

You can test the API endpoints using curl or your browser's dev tools:

```bash
# Get user profile (requires authentication)
curl http://localhost:4321/api/user/profile \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Get messages
curl http://localhost:4321/api/messages \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Create a message
curl -X POST http://localhost:4321/api/messages \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello World"}'
```

## Step 6: Production Deployment

### 6.1 Environment Variables

Ensure all environment variables are set in your production environment:

- Netlify: Add via Netlify Dashboard → Site Settings → Environment Variables
- Vercel: Add via Vercel Dashboard → Settings → Environment Variables
- Node.js: Use a `.env` file or system environment variables

### 6.2 Update Webhook URL

Update the Clerk webhook URL to your production domain:

```
https://your-production-domain.com/api/webhooks/clerk
```

### 6.3 CORS Configuration (if needed)

If you're accessing Supabase from a different domain, configure CORS in Supabase:

1. Go to Supabase Dashboard → Settings → API
2. Add your production domain to allowed origins

## Troubleshooting

### Common Issues

#### 1. User not syncing to Supabase

- Check webhook logs in Clerk Dashboard
- Verify `CLERK_WEBHOOK_SECRET` is correct
- Check Supabase service role key permissions

#### 2. RLS policies blocking access

- Ensure JWT token contains correct `sub` claim
- Verify Supabase JWT configuration matches Clerk template
- Check that user exists in users table

#### 3. Real-time subscriptions not working

- Verify Supabase anon key is correct
- Check browser console for WebSocket errors
- Ensure RLS policies allow SELECT operations

#### 4. "Database not configured" errors

- Verify all Supabase environment variables are set
- Check that Supabase project is active (not paused)
- Ensure network connectivity to Supabase

### Debug Mode

To enable debug logging, set these in your `.env`:

```env
DEBUG=true
LOG_LEVEL=debug
```

### Getting Help

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Issues](https://github.com/your-org/astro-basics/issues)

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Rotate keys regularly** - Update webhook secrets and API keys periodically
3. **Use RLS policies** - Always enable Row Level Security on sensitive tables
4. **Validate webhooks** - Always verify webhook signatures
5. **Limit service role usage** - Only use service role for admin operations
6. **Monitor access logs** - Regularly review authentication and database logs

## Next Steps

After completing the setup:

1. Customize RLS policies for your specific use cases
2. Add more user profile fields as needed
3. Implement organization-specific data models
4. Set up monitoring and alerting
5. Configure backup strategies

## API Reference

### Authenticated Endpoints

All endpoints require Clerk authentication token in headers.

#### GET /api/user/profile

Get current user's profile from Supabase

#### PATCH /api/user/profile

Update user profile fields

#### GET /api/messages

Get user's messages (filtered by RLS)

#### POST /api/messages

Create a new message

#### PATCH /api/messages

Update message (mark as read/archived)

#### DELETE /api/messages?id={messageId}

Delete a message

### React Hooks

#### useSupabase()

Returns authenticated Supabase client and connection status

```typescript
const { client, loading, error, isAuthenticated } = useSupabase()
```

#### useSupabaseSubscription(table, filter)

Subscribe to real-time changes in a table

```typescript
const { data, loading, error } = useSupabaseSubscription('messages', `clerk_user_id=eq.${userId}`)
```

## Migration from Turso

If you're migrating from Turso to Supabase:

1. Export data from Turso using the export script
2. Transform data to match Supabase schema
3. Import using Supabase's CSV import or SQL insert statements
4. Update application code to use Supabase client instead of Turso
5. Test thoroughly before switching production traffic
