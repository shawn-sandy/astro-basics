# ngrok Webhook Testing Guide for Clerk-Supabase Integration

This guide provides comprehensive instructions for using ngrok to test Clerk webhooks with your local Astro development server, enabling real-time user synchronization between Clerk and Supabase during development.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Setting Up the Tunnel](#setting-up-the-tunnel)
- [Configuring Clerk Webhooks](#configuring-clerk-webhooks)
- [Testing Webhook Events](#testing-webhook-events)
- [Monitoring and Debugging](#monitoring-and-debugging)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Quick Reference](#quick-reference)

## Overview

ngrok creates a secure tunnel from the public internet to your local development server, allowing external services like Clerk to send webhooks to your local environment. This is essential for testing the Clerk-Supabase user synchronization without deploying to production.

### Why Use ngrok?

- **Local Testing**: Test webhooks without deploying code
- **Real-time Debugging**: See webhook payloads and responses immediately
- **Rapid Development**: Iterate quickly on webhook handlers
- **Production Parity**: Test with actual Clerk webhook events

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Astro development server running (`npm run dev`)
- [ ] Clerk account with a project configured
- [ ] Supabase project with users table created
- [ ] Environment variables configured in `.env`:
  ```env
  PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  CLERK_WEBHOOK_SECRET=whsec_... # Will be updated after webhook creation
  SUPABASE_URL=https://...
  SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  ```

## Installation

### Option 1: Install via Homebrew (macOS)

```bash
brew install ngrok/ngrok/ngrok
```

### Option 2: Install via npm

```bash
npm install -g ngrok
```

### Option 3: Download from ngrok.com

1. Visit [ngrok.com/download](https://ngrok.com/download)
2. Download the appropriate version for your OS
3. Extract and add to your PATH

### Verify Installation

```bash
ngrok version
# Expected output: ngrok version 3.x.x
```

## Configuration

### Step 1: Create an ngrok Account (Free)

1. Sign up at [ngrok.com](https://ngrok.com)
2. Navigate to Your Authtoken section
3. Copy your authtoken

### Step 2: Authenticate ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 3: (Optional) Configure ngrok.yml

Create or edit `~/.ngrok2/ngrok.yml` for persistent configuration:

```yaml
version: '2'
authtoken: YOUR_AUTH_TOKEN
tunnels:
  astro-dev:
    proto: http
    addr: 4321
    inspect: true
    host_header: 'localhost:4321'
```

## Setting Up the Tunnel

### Basic Setup

1. **Start your Astro development server**:

   ```bash
   npm run dev
   # Server starts on http://localhost:4321
   ```

2. **In a new terminal, start ngrok tunnel**:

   ```bash
   ngrok http 4321
   ```

3. **ngrok will display**:

   ```
   Session Status                online
   Account                       your-email@example.com (Plan: Free)
   Version                       3.x.x
   Region                        United States (us)
   Latency                       50ms
   Web Interface                 http://127.0.0.1:4040
   Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:4321
   ```

4. **Copy the HTTPS forwarding URL** (e.g., `https://abc123def456.ngrok-free.app`)

### Advanced Options

```bash
# Custom subdomain (requires paid plan)
ngrok http 4321 --domain=your-custom-domain.ngrok.io

# Basic authentication
ngrok http 4321 --auth="username:password"

# Request inspection
ngrok http 4321 --inspect=true

# Specific region
ngrok http 4321 --region=eu
```

## Configuring Clerk Webhooks

### Step 1: Access Clerk Dashboard

1. Log in to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your project
3. Navigate to **Webhooks** in the left sidebar

### Step 2: Create Webhook Endpoint

1. Click **Create Endpoint**
2. Enter your ngrok URL with the webhook path:

   ```
   https://abc123def456.ngrok-free.app/api/webhooks/clerk
   ```

3. Select the following events:

   - [x] `user.created`
   - [x] `user.updated`
   - [x] `user.deleted`
   - [x] `session.created`
   - [x] `session.ended` (optional)
   - [x] `session.removed` (optional)

4. Click **Create**

### Step 3: Copy Webhook Secret

1. After creation, click on the webhook endpoint
2. Copy the **Signing Secret** (starts with `whsec_`)
3. Update your `.env` file:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET
   ```
4. Restart your Astro dev server to load the new environment variable

## Testing Webhook Events

### Test User Creation

1. **Create a new user in Clerk**:

   - Use Clerk's hosted sign-up page
   - Or create via Clerk Dashboard → Users → Create User

2. **Monitor ngrok inspector**:

   - Open http://127.0.0.1:4040 in your browser
   - View incoming webhook requests
   - Check response status (should be 200)

3. **Verify in Supabase**:
   ```sql
   SELECT * FROM public.users
   WHERE email = 'test@example.com'
   ORDER BY created_at DESC;
   ```

### Test User Update

1. **Update user in Clerk Dashboard**:

   - Change name, username, or metadata
   - Save changes

2. **Check webhook delivery**:

   - Clerk Dashboard → Webhooks → View endpoint → Message Attempts
   - Should show successful delivery (200 status)

3. **Verify update in Supabase**:
   ```sql
   SELECT clerk_id, email, username, full_name, updated_at
   FROM public.users
   WHERE clerk_id = 'user_...'
   ORDER BY updated_at DESC;
   ```

### Test Session Creation

1. **Sign in to your application**:

   ```
   https://abc123def456.ngrok-free.app/sign-in
   ```

2. **Check last_sign_in_at update**:
   ```sql
   SELECT clerk_id, email, last_sign_in_at
   FROM public.users
   WHERE clerk_id = 'user_...'
   ORDER BY last_sign_in_at DESC;
   ```

### Test Manual Sync Endpoint

```bash
# Get a valid session token from your browser
curl -X POST https://abc123def456.ngrok-free.app/api/user/sync \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

## Monitoring and Debugging

### ngrok Web Interface

Access the inspector at http://127.0.0.1:4040 to:

- View all HTTP requests and responses
- Inspect request headers and bodies
- Replay requests for debugging
- Check response times and status codes

### Webhook Request Structure

Example webhook payload from Clerk:

```json
{
  "data": {
    "id": "user_2abc123def456",
    "email_addresses": [
      {
        "email_address": "user@example.com",
        "id": "emailaddr_2abc123"
      }
    ],
    "primary_email_address_id": "emailaddr_2abc123",
    "username": "testuser",
    "first_name": "Test",
    "last_name": "User",
    "image_url": "https://img.clerk.com/...",
    "created_at": 1234567890000,
    "updated_at": 1234567890000
  },
  "object": "event",
  "type": "user.created"
}
```

### Logging Webhook Events

Add detailed logging to your webhook handler (`src/pages/api/webhooks/clerk.ts`):

```typescript
// Add at the beginning of the handler
console.log('Webhook received:', {
  type: evt.type,
  userId: evt.data.id,
  timestamp: new Date().toISOString(),
})

// Log successful operations
console.log(`✅ User ${evt.type}: ${evt.data.id}`)

// Log errors with context
console.error('❌ Webhook processing failed:', {
  type: evt.type,
  userId: evt.data.id,
  error: error.message,
})
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "Invalid signature" Error

**Problem**: Webhook verification fails with 400 status

**Solutions**:

- Verify `CLERK_WEBHOOK_SECRET` matches the signing secret in Clerk Dashboard
- Ensure you've restarted the dev server after updating `.env`
- Check that the webhook secret doesn't contain extra spaces or quotes

#### 2. ngrok Session Timeout

**Problem**: ngrok tunnel closes after 2 hours (free plan)

**Solutions**:

- Restart ngrok when needed: `ngrok http 4321`
- Update webhook URL in Clerk Dashboard with new ngrok URL
- Consider ngrok paid plan for stable URLs

#### 3. "Webhook secret not configured" Error

**Problem**: 500 error with message about missing webhook secret

**Solutions**:

```bash
# Check environment variable is set
echo $CLERK_WEBHOOK_SECRET

# Ensure .env file is properly formatted
cat .env | grep CLERK_WEBHOOK_SECRET

# Restart dev server
npm run dev
```

#### 4. Webhooks Not Arriving

**Problem**: No webhooks appearing in ngrok inspector

**Solutions**:

- Verify webhook is enabled in Clerk Dashboard
- Check webhook URL matches current ngrok tunnel
- Ensure selected events are correct
- Test with Clerk Dashboard → Webhooks → Send test

#### 5. Database Sync Failures

**Problem**: Users not appearing in Supabase

**Solutions**:

- Check Supabase service role key is configured
- Verify database connection:
  ```typescript
  const { data, error } = await supabase.from('users').select('count')
  console.log('Connection test:', { data, error })
  ```
- Check RLS policies allow service role operations

### Debug Checklist

- [ ] Astro dev server running on port 4321
- [ ] ngrok tunnel active and showing online status
- [ ] Webhook URL in Clerk matches current ngrok URL
- [ ] CLERK_WEBHOOK_SECRET in .env matches Clerk Dashboard
- [ ] Dev server restarted after .env changes
- [ ] Supabase connection configured correctly
- [ ] Database migrations applied
- [ ] RLS policies configured for service role

## Security Considerations

### Development Best Practices

1. **Never commit ngrok URLs**:

   ```gitignore
   # .gitignore
   ngrok.yml
   *.ngrok.io
   ```

2. **Use test/development data only**:

   - Create separate Clerk development project
   - Use Supabase branch or development project
   - Never use production credentials locally

3. **Rotate webhook secrets regularly**:

   - Regenerate webhook secrets after testing
   - Use different secrets for dev/staging/production

4. **Monitor webhook attempts**:

   - Check Clerk Dashboard for failed deliveries
   - Review ngrok inspector for suspicious requests

5. **Secure ngrok tunnels** (paid features):

   ```bash
   # IP restrictions
   ngrok http 4321 --cidr-allow 1.2.3.4/32

   # OAuth authentication
   ngrok http 4321 --oauth google
   ```

### Production Migration

When moving from ngrok testing to production:

1. **Update webhook URL** to production domain
2. **Generate new webhook secret** for production
3. **Test with production test mode** first
4. **Enable webhook retry logic** for resilience
5. **Implement webhook signature verification**
6. **Add rate limiting** to webhook endpoint
7. **Set up monitoring and alerting**

## Quick Reference

### Essential Commands

```bash
# Start development server
npm run dev

# Start ngrok tunnel
ngrok http 4321

# View ngrok inspector
open http://127.0.0.1:4040

# Test webhook endpoint
curl -X POST http://localhost:4321/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'

# Check Supabase sync
psql $DATABASE_URL -c "SELECT * FROM users ORDER BY updated_at DESC LIMIT 5;"
```

### Environment Variables

```env
# Required for webhook testing
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # From Clerk webhook settings
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Required for webhook operations
```

### Webhook Event Types

| Event             | Description          | Supabase Action          |
| ----------------- | -------------------- | ------------------------ |
| `user.created`    | New user signs up    | Insert user record       |
| `user.updated`    | User profile changes | Update user record       |
| `user.deleted`    | User account deleted | Delete user record       |
| `session.created` | User signs in        | Update last_sign_in_at   |
| `session.ended`   | User signs out       | Optional: track activity |
| `session.removed` | Session revoked      | Optional: security audit |

### Useful Links

- [ngrok Documentation](https://ngrok.com/docs)
- [Clerk Webhooks Guide](https://clerk.com/docs/integrations/webhooks)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Astro API Routes](https://docs.astro.build/en/core-concepts/endpoints/)

## Summary

Using ngrok for local webhook testing streamlines the development of Clerk-Supabase integration by:

1. Enabling real-time testing without deployment
2. Providing immediate feedback on webhook processing
3. Allowing rapid iteration on webhook handlers
4. Facilitating debugging with request inspection

Remember to transition to production webhook URLs and secrets when deploying to ensure security and reliability.
