# Authentication Guide

## Quick Start

### Option 1: Without Authentication (Fastest)
```bash
git clone <repository>
npm install
npm run dev
```
The application works immediately with helpful messages where auth is needed.

### Option 2: With Authentication
```bash
git clone <repository>
npm install
cp .env.example .env
# Edit .env with your Clerk keys:
# PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
# CLERK_SECRET_KEY=sk_test_your_key_here
npm run dev
```

## Understanding the System

### When Authentication is **Enabled**
- ✅ Full user registration, login, and profile management
- ✅ Protected dashboard and admin areas work
- ✅ User-specific API endpoints function
- ✅ Organization and team features available

### When Authentication is **Disabled**
- ✅ Application builds and runs without errors
- ✅ Public pages work normally (home, about, blog, docs)
- ✅ Protected routes show "authentication required" messages
- ✅ API endpoints return helpful 503 responses
- ✅ Status banners guide users to enable auth if needed

## Environment Configuration

### Valid Configuration Examples

**Test Environment (Recommended for Development)**:
```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abcd1234567890abcd1234567890abcd1234567890
CLERK_SECRET_KEY=sk_test_abcd1234567890abcd1234567890abcd1234567890abcd12
CLERK_WEBHOOK_SECRET=whsec_abcd1234567890abcd1234567890abcd12
```

**Production Environment**:
```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_abcd1234567890abcd1234567890abcd1234567890
CLERK_SECRET_KEY=sk_live_abcd1234567890abcd1234567890abcd1234567890abcd12
CLERK_WEBHOOK_SECRET=whsec_abcd1234567890abcd1234567890abcd12
```

**Disabled Configuration**:
```env
# PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
# CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY
# CLERK_WEBHOOK_SECRET=YOUR_CLERK_WEBHOOK_SECRET
```

### Key Validation Rules

The system validates keys as follows:
- ✅ **Valid**: Real keys starting with `pk_test_`, `sk_test_`, `pk_live_`, `sk_live_`
- ❌ **Invalid**: Placeholder values like `YOUR_CLERK_PUBLISHABLE_KEY`
- ❌ **Invalid**: Empty strings or undefined values
- ❌ **Invalid**: Keys shorter than 10 characters

## Component Usage

### Using Auth Components

**✅ Recommended - Use Wrapper Components**:
```astro
---
import { OptionalSignedIn, OptionalSignedOut } from '#components/astro/auth'
---

<OptionalSignedIn>
  <p>Welcome back, user!</p>
  <a href="/dashboard">Go to Dashboard</a>
</OptionalSignedIn>

<OptionalSignedOut>
  <p>Please sign in to access your account.</p>
  <OptionalSignInButton />
</OptionalSignedOut>
```

**❌ Avoid - Direct Clerk Imports**:
```astro
---
// Don't do this - breaks when auth is disabled
import { SignedIn, SignedOut } from '@clerk/astro/components'
---
```

### Available Wrapper Components

| Component | Purpose | Fallback Behavior |
|-----------|---------|-------------------|
| `OptionalSignedIn` | Content for authenticated users | Hidden when auth disabled |
| `OptionalSignedOut` | Content for unauthenticated users | Shown when auth disabled |
| `OptionalUserButton` | User menu/profile button | Simple menu links |
| `OptionalSignInButton` | Sign-in button | Link to /login page |
| `AuthStatusBanner` | Authentication status indicator | Shown when auth disabled |

## API Development

### Adding Auth-Protected Endpoints

```typescript
// src/pages/api/example.ts
import type { APIRoute } from 'astro'
import { isClerkEnabled } from '#utils/clerk-config'

export const GET: APIRoute = async ({ locals }) => {
  // Always check if auth is enabled first
  if (!isClerkEnabled) {
    return new Response(
      JSON.stringify({
        error: 'Authentication not configured',
        message: 'This endpoint requires Clerk authentication to be enabled',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Then check if user is authenticated
  if (!locals.userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Proceed with authenticated logic
  return new Response(
    JSON.stringify({ message: 'Success', userId: locals.userId }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
```

## Troubleshooting

### Common Issues

**"Authentication required but not configured" on protected routes**
- This is expected when auth is disabled
- Add Clerk keys to `.env` to enable authentication
- Restart dev server after adding keys

**API endpoints returning 503 errors**
- Check that your `.env` file contains valid Clerk keys
- Ensure keys are not placeholder values
- Verify keys have proper prefixes (`pk_test_`, `sk_test_`, etc.)

**Build failures**
- Should not happen with this implementation
- If you see build failures, check for direct Clerk imports in components
- Use wrapper components instead

### Getting Clerk Keys

1. Visit [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or select existing one
3. Go to **API Keys** section
4. Copy the **Publishable Key** and **Secret Key**
5. Add them to your `.env` file

### Testing Both Modes

To test the application in both authentication modes:

```bash
# Test with auth disabled
mv .env .env.backup
npm run dev  # Should work with helpful messages

# Test with auth enabled  
mv .env.backup .env
npm run dev  # Should work with full auth features
```

## Best Practices

### For New Features
1. Always use wrapper components for auth-dependent UI
2. Check `isClerkEnabled` in server-side code
3. Provide meaningful fallbacks when auth is disabled
4. Add proper guards to API endpoints
5. Include helpful error messages

### For Deployment
1. **Demo/Preview**: Comment out Clerk keys for public demos
2. **Staging**: Use Clerk test keys for testing
3. **Production**: Use Clerk live keys for real users

### For Development
1. Start without auth for fastest setup
2. Add auth keys when working on user features
3. Test both modes before committing changes
4. Document auth requirements in component comments

## Architecture Overview

The authentication system uses a **progressive enhancement pattern**:

```
Base Application (Always Works)
    ↓
+ Authentication Layer (When Enabled)
    ↓
= Full Featured App
```

This ensures the core application never breaks due to authentication configuration, while providing a rich authenticated experience when properly configured.