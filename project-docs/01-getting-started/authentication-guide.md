# Authentication Developer Guide

## Overview

This project uses **Clerk** for authentication in an Astro application with server-side rendering. The implementation provides secure, scalable user authentication with minimal client-side JavaScript and optimal performance.

## Table of Contents

- [Quick Setup](#quick-setup)
- [Architecture Overview](#architecture-overview)
- [Environment Configuration](#environment-configuration)
- [Route Protection](#route-protection)
- [Authentication Components](#authentication-components)
- [Layout Integration](#layout-integration)
- [Protected Pages](#protected-pages)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [API Reference](#api-reference)

## Quick Setup

### Prerequisites

- Node.js 18+ and npm
- Clerk account (free tier available)
- Astro project with SSR enabled

### 1. Install Dependencies

```bash
npm install @clerk/astro @astrojs/react
```

### 2. Environment Configuration

Create `.env` file:

```bash
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
```

### 3. Astro Configuration

Update `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import clerk from '@clerk/astro'

export default defineConfig({
  integrations: [react(), clerk()],
  output: 'server', // Required for authentication middleware
})
```

### 4. Basic Middleware

Create `src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/admin(.*)'])

export const onRequest = clerkMiddleware((auth, context, next) => {
  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }
  return next()
})
```

### 5. Layout Integration

Add to your main layout:

```astro
---
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/astro/components";
---

<nav>
  <SignedIn isStatic={true}>
    <UserButton />
  </SignedIn>
  <SignedOut isStatic={true}>
    <SignInButton mode="modal" />
  </SignedOut>
</nav>
```

## Architecture Overview

### Server-Side Security Model

```
Request → Middleware → Route Protection → Page Rendering → Client
    ↓         ↓              ↓               ↓            ↓
 Check      Verify      Authenticate    Render with   Hydrate
 Route      User        or Redirect     Auth State    Components
```

### Component Architecture

```
Layout.astro
├── Navigation.astro (auth-aware)
├── SignedIn/SignedOut components
├── UserButton component
└── Protected content slots

Protected Pages
├── Dashboard.astro
├── Profile.astro
└── Admin pages
```

### File Structure

```
src/
├── middleware.ts              # Route protection
├── layouts/
│   ├── Layout.astro          # Main layout with auth
│   └── Auth.astro            # Auth-specific layout
├── pages/
│   ├── dashboard.astro       # Protected page
│   └── sign-in.astro         # Sign-in page (optional)
├── components/
│   └── astro/
│       └── Navigation.astro  # Auth-aware navigation
└── utils/
    └── auth.ts              # Auth utilities (optional)
```

## Environment Configuration

### Required Variables

| Variable                       | Type   | Purpose                    | Example             |
| ------------------------------ | ------ | -------------------------- | ------------------- |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Client-side Clerk config   | `pk_test_abc123...` |
| `CLERK_SECRET_KEY`             | Secret | Server-side authentication | `sk_test_xyz789...` |

### Environment Files

#### Development (`.env`)

```bash
# Clerk Test Environment
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_test_key
CLERK_SECRET_KEY=sk_test_your_test_secret
```

#### Production (`.env.production`)

```bash
# Clerk Production Environment
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
CLERK_SECRET_KEY=sk_live_your_production_secret
```

### Clerk Dashboard Setup

1. **Create Application**: Sign up at [clerk.com](https://clerk.com)
2. **Configure Settings**:
   - Set application name
   - Configure sign-in methods (email, social, etc.)
   - Set redirect URLs for your domains
3. **Copy Keys**: Get publishable and secret keys from API Keys section
4. **Set URLs**: Configure allowed origins and redirect URLs

## Route Protection

### Middleware Configuration

The middleware (`src/middleware.ts`) handles server-side route protection:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

// Define protected route patterns
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)', // Dashboard and sub-routes
  '/admin(.*)', // Admin area
  '/profile', // User profile
  '/settings(.*)', // User settings
])

// Optional: Define admin-only routes
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export const onRequest = clerkMiddleware((auth, context, next) => {
  const { userId, user } = auth()

  // Check if route requires authentication
  if (isProtectedRoute(context.request) && !userId) {
    return auth().redirectToSignIn()
  }

  // Check admin access (example role-based protection)
  if (isAdminRoute(context.request)) {
    if (!userId) {
      return auth().redirectToSignIn()
    }
    // Add role checking logic here if needed
    // if (!user?.publicMetadata?.role === 'admin') {
    //   return new Response('Forbidden', { status: 403 });
    // }
  }

  return next()
})
```

### Route Pattern Matching

| Pattern              | Description                  | Examples                                                    |
| -------------------- | ---------------------------- | ----------------------------------------------------------- |
| `/dashboard(.*)`     | Dashboard and all sub-routes | `/dashboard`, `/dashboard/settings`, `/dashboard/analytics` |
| `/admin(.*)`         | Admin area                   | `/admin`, `/admin/users`, `/admin/settings`                 |
| `/profile`           | Exact profile page           | `/profile` only                                             |
| `/api/protected(.*)` | API endpoints                | `/api/protected/users`, `/api/protected/data`               |

### Custom Redirects

```typescript
export const onRequest = clerkMiddleware((auth, context, next) => {
  if (isProtectedRoute(context.request) && !auth().userId) {
    // Custom redirect with return URL
    const returnUrl = context.request.url
    const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`
    return context.redirect(signInUrl)
  }
  return next()
})
```

## Authentication Components

### Core Components

#### SignedIn / SignedOut

Conditional rendering based on authentication status:

```astro
---
import { SignedIn, SignedOut } from "@clerk/astro/components";
---

<SignedIn isStatic={true}>
  <h1>Welcome back!</h1>
  <a href="/dashboard">Go to Dashboard</a>
</SignedIn>

<SignedOut isStatic={true}>
  <h1>Please sign in</h1>
  <a href="/sign-in">Sign In</a>
</SignedOut>
```

#### UserButton

User avatar with dropdown menu:

```astro
---
import { UserButton } from "@clerk/astro/components";
---

<UserButton
  appearance={{
    elements: {
      avatarBox: "w-8 h-8",
    }
  }}
/>
```

#### SignInButton

Customizable sign-in trigger:

```astro
---
import { SignInButton } from "@clerk/astro/components";
---

<!-- Modal sign-in -->
<SignInButton mode="modal">
  <button class="btn-primary">Sign In</button>
</SignInButton>

<!-- Redirect to sign-in page -->
<SignInButton mode="redirect" redirectUrl="/sign-in">
  <button class="btn-secondary">Login</button>
</SignInButton>
```

### Component Properties

#### Common Props

| Prop             | Type      | Default | Description                             |
| ---------------- | --------- | ------- | --------------------------------------- |
| `isStatic`       | boolean   | `false` | Optimizes SSR performance               |
| `client:load`    | directive | -       | Hydrates component on page load         |
| `client:visible` | directive | -       | Hydrates when component becomes visible |

#### UserButton Props

| Prop              | Type                      | Description                        |
| ----------------- | ------------------------- | ---------------------------------- |
| `appearance`      | object                    | Customize styling and layout       |
| `showName`        | boolean                   | Display user's name next to avatar |
| `userProfileMode` | `'modal' \| 'navigation'` | How to open user profile           |

### Performance Optimization

#### Static Rendering

Use `isStatic={true}` for layout components:

```astro
<!-- Optimized for SSR -->
<SignedIn isStatic={true}>
  <UserButton />
</SignedIn>
```

#### Client-Side Hydration

Only hydrate when necessary:

```astro
<!-- Only hydrate if user interaction needed -->
<SignedOut client:visible>
  <SignInButton mode="modal">
    <button>Sign In</button>
  </SignInButton>
</SignedOut>
```

## Layout Integration

### Main Layout Pattern

```astro
---
// src/layouts/Layout.astro
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/astro/components";

export interface Props {
  pageTitle?: string;
  pageDescription?: string;
  hideHeader?: boolean;
}

const { pageTitle = "Default Title", pageDescription, hideHeader = false } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{pageTitle}</title>
  {pageDescription && <meta name="description" content={pageDescription}>}
</head>
<body>
  {!hideHeader && (
    <header>
      <nav>
        <div class="nav-brand">
          <a href="/">Your App</a>
        </div>

        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/about">About</a>

          <!-- Auth-aware navigation -->
          <SignedIn isStatic={true}>
            <a href="/dashboard">Dashboard</a>
          </SignedIn>
        </div>

        <div class="nav-auth">
          <SignedIn isStatic={true}>
            <UserButton />
          </SignedIn>
          <SignedOut isStatic={true}>
            <SignInButton mode="modal">
              <button class="btn-primary">Sign In</button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  )}

  <main>
    <slot />
  </main>

  <footer>
    <!-- Footer content -->
  </footer>
</body>
</html>
```

### Auth-Specific Layout

```astro
---
// src/layouts/Auth.astro
import Layout from "./Layout.astro";

export interface Props {
  pageTitle?: string;
  pageDescription?: string;
}

const { pageTitle = "Authentication", pageDescription = "Sign in to your account" } = Astro.props;
---

<Layout
  pageTitle={pageTitle}
  pageDescription={pageDescription}
  hideHeader={true}
>
  <div class="auth-container">
    <div class="auth-card">
      <slot />
    </div>
  </div>
</Layout>

<style>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}
</style>
```

### Navigation Component

```astro
---
// src/components/astro/Navigation.astro
import { SignedIn, SignedOut } from "@clerk/astro/components";

const currentPath = Astro.url.pathname;
const isActive = (path: string) => currentPath === path ? 'active' : '';
---

<nav class="main-nav">
  <ul class="nav-menu">
    <!-- Public links -->
    <li><a href="/" class={isActive('/')}>Home</a></li>
    <li><a href="/about" class={isActive('/about')}>About</a></li>
    <li><a href="/blog" class={isActive('/blog')}>Blog</a></li>

    <!-- Protected links -->
    <SignedIn isStatic={true}>
      <li><a href="/dashboard" class={isActive('/dashboard')}>Dashboard</a></li>
      <li><a href="/profile" class={isActive('/profile')}>Profile</a></li>
    </SignedIn>
  </ul>

  <!-- Auth slot for login/user button -->
  <slot name="auth" />
</nav>

<style>
.main-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 2rem;
  margin: 0;
  padding: 0;
}

.nav-menu a {
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-menu a:hover,
.nav-menu a.active {
  color: #3b82f6;
}
</style>
```

## Protected Pages

### Dashboard Example

```astro
---
// src/pages/dashboard.astro
import Auth from "#/layouts/Auth.astro";
import { SignedIn, SignedOut } from "@clerk/astro/components";
---

<Auth pageTitle="Dashboard - Your App">
  <SignedIn>
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your personal dashboard</p>
      </header>

      <div class="dashboard-grid">
        <div class="card">
          <h3>Quick Stats</h3>
          <p>Your activity overview</p>
        </div>

        <div class="card">
          <h3>Recent Activity</h3>
          <p>Latest updates and changes</p>
        </div>

        <div class="card">
          <h3>Settings</h3>
          <a href="/settings">Manage your account</a>
        </div>
      </div>
    </div>
  </SignedIn>

  <SignedOut>
    <div class="auth-required">
      <h1>Authentication Required</h1>
      <p>Please sign in to access your dashboard.</p>
      <a href="/sign-in" class="btn-primary">Sign In</a>
    </div>
  </SignedOut>
</Auth>

<style>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #1e293b;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.auth-required {
  text-align: center;
  padding: 3rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  display: inline-block;
  margin-top: 1rem;
}
</style>
```

### API Route Protection

```typescript
// src/pages/api/protected/user.ts
import type { APIRoute } from 'astro'
import { getAuth } from '@clerk/astro/server'

export const GET: APIRoute = async context => {
  const auth = getAuth(context)

  if (!auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch user data
  const userData = {
    id: auth.userId,
    // Add more user data as needed
  }

  return new Response(JSON.stringify(userData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Development Workflow

### Local Development Setup

1. **Start Development Server**:

   ```bash
   npm run dev
   ```

2. **Environment Setup**:

   - Copy `.env.example` to `.env`
   - Add your Clerk test keys
   - Restart dev server

3. **Test Authentication Flow**:
   - Visit protected route (`/dashboard`)
   - Verify redirect to sign-in
   - Complete authentication
   - Verify access to protected content

### Common Development Tasks

#### Adding New Protected Routes

1. **Update Middleware**:

   ```typescript
   const isProtectedRoute = createRouteMatcher([
     '/dashboard(.*)',
     '/new-protected-route(.*)', // Add new route
   ])
   ```

2. **Create Page**:

   ```astro
   <!-- src/pages/new-protected-route.astro -->
   ---
   import Layout from "#/layouts/Layout.astro";
   import { SignedIn, SignedOut } from "@clerk/astro/components";
   ---

   <Layout pageTitle="New Protected Page">
     <SignedIn>
       <!-- Protected content -->
     </SignedIn>
     <SignedOut>
       <!-- Fallback content -->
     </SignedOut>
   </Layout>
   ```

3. **Add Navigation Link**:

   ```astro
   <SignedIn isStatic={true}>
     <a href="/new-protected-route">New Feature</a>
   </SignedIn>
   ```

#### Debugging Authentication Issues

1. **Check Environment Variables**:

   ```bash
   # Verify keys are loaded
   echo $PUBLIC_CLERK_PUBLISHABLE_KEY
   echo $CLERK_SECRET_KEY
   ```

2. **Enable Debug Mode** (development only):

   ```typescript
   // Add to middleware for debugging
   console.log('Auth state:', auth())
   console.log('Request URL:', context.request.url)
   ```

3. **Verify Middleware Execution**:

   ```typescript
   export const onRequest = clerkMiddleware((auth, context, next) => {
     console.log('Middleware executing for:', context.request.url)
     // ... rest of middleware
   })
   ```

### Build and Deployment

#### Pre-deployment Checklist

- [ ] Environment variables configured in production
- [ ] Clerk production app configured
- [ ] Redirect URLs updated for production domain
- [ ] Test authentication flow in staging
- [ ] Verify protected routes work correctly

#### Build Commands

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy (example with Netlify)
npm run build && netlify deploy --prod
```

## Testing

### Unit Testing with Vitest

```typescript
// tests/auth.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('Authentication', () => {
  it('should protect routes correctly', () => {
    // Mock Clerk auth
    const mockAuth = vi.fn()
    // Add test implementation
  })
})
```

### E2E Testing with Playwright

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('authentication flow', async ({ page }) => {
  // Test unauthenticated access
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/sign-in/)

  // Test authentication (requires test user setup)
  // Add sign-in automation

  // Test authenticated access
  await page.goto('/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')
})
```

### Test User Setup

For testing, create test users in your Clerk dashboard or use Clerk's testing features.

## Troubleshooting

### Common Issues

#### 1. "Invalid publishable key" Error

**Symptoms**: Authentication not working, console errors about invalid keys

**Solutions**:

- Verify `.env` file exists and has correct keys
- Check key format (should start with `pk_test_` or `pk_live_`)
- Restart development server after adding environment variables
- Ensure no extra spaces or quotes around keys

#### 2. Middleware Not Executing

**Symptoms**: Protected routes accessible without authentication

**Solutions**:

- Verify `output: "server"` in `astro.config.mjs`
- Check middleware file location (`src/middleware.ts`)
- Ensure middleware is properly exported
- Check route patterns in `createRouteMatcher`

#### 3. Components Not Rendering

**Symptoms**: Auth components don't show/hide correctly

**Solutions**:

- Add `client:load` directive if needed
- Check component import paths
- Verify Clerk integration in Astro config
- Use browser dev tools to check for JavaScript errors

#### 4. Redirect Loops

**Symptoms**: Infinite redirects between sign-in and protected pages

**Solutions**:

- Check redirect URL configuration in Clerk dashboard
- Verify middleware logic doesn't redirect signed-in users
- Check for conflicting redirect rules

#### 5. Session Not Persisting

**Symptoms**: Users get signed out on page refresh

**Solutions**:

- Verify cookies are enabled in browser
- Check domain configuration in Clerk dashboard
- Ensure HTTPS in production
- Check browser's privacy settings

### Debug Mode

Enable verbose logging in development:

```typescript
// src/middleware.ts
export const onRequest = clerkMiddleware((auth, context, next) => {
  if (import.meta.env.DEV) {
    console.log('🔒 Auth Debug:', {
      url: context.request.url,
      userId: auth().userId,
      isProtected: isProtectedRoute(context.request),
    })
  }

  // ... rest of middleware
})
```

### Performance Issues

#### Slow Authentication Checks

- Use `isStatic={true}` for layout components
- Minimize client-side hydration
- Cache user data when possible

#### Large Bundle Size

- Import only needed Clerk components
- Use dynamic imports for heavy authentication features
- Consider code splitting for admin areas

## Security Best Practices

### Environment Security

1. **Key Management**:

   - Never commit `.env` files to version control
   - Use different keys for development/production
   - Rotate keys regularly
   - Use environment-specific key prefixes

2. **Variable Validation**:

   ```typescript
   // src/utils/env.ts
   export function validateAuthEnv() {
     const required = {
       PUBLIC_CLERK_PUBLISHABLE_KEY: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
       CLERK_SECRET_KEY: import.meta.env.CLERK_SECRET_KEY,
     }

     for (const [key, value] of Object.entries(required)) {
       if (!value) {
         throw new Error(`Missing required environment variable: ${key}`)
       }
     }
   }
   ```

### Route Security

1. **Defense in Depth**:

   ```astro
   <!-- Multiple security layers -->
   <SignedIn>
     <div class="admin-only" data-requires-admin="true">
       <!-- Admin content -->
     </div>
   </SignedIn>
   ```

2. **Server-Side Validation**:

   ```typescript
   // Always verify on server side
   export const onRequest = clerkMiddleware((auth, context, next) => {
     const { userId, user } = auth()

     // Server-side role checking
     if (isAdminRoute(context.request)) {
       if (!userId || !isAdmin(user)) {
         return new Response('Forbidden', { status: 403 })
       }
     }

     return next()
   })
   ```

### Content Security

1. **Sensitive Data Protection**:

   ```astro
   ---
   // Never expose sensitive data to client
   const { userId } = auth();
   const userSettings = userId ? await getUserSettings(userId) : null;

   // Only pass necessary data to client
   const publicUserData = userSettings ? {
     displayName: userSettings.displayName,
     avatar: userSettings.avatar
   } : null;
   ---
   ```

2. **XSS Prevention**:
   - Sanitize user inputs
   - Use Astro's built-in escaping
   - Validate data before rendering

### Production Hardening

1. **HTTPS Only**:

   ```javascript
   // astro.config.mjs
   export default defineConfig({
     server: {
       https: true, // Development
     },
   })
   ```

2. **Security Headers**:

   ```typescript
   // src/middleware.ts
   export const onRequest = clerkMiddleware((auth, context, next) => {
     const response = next()

     // Add security headers
     response.headers.set('X-Frame-Options', 'DENY')
     response.headers.set('X-Content-Type-Options', 'nosniff')

     return response
   })
   ```

## API Reference

### Clerk Components

#### `<SignedIn>`

Renders children only when user is authenticated.

```astro
<SignedIn isStatic={true} client:load>
  <!-- Authenticated content -->
</SignedIn>
```

**Props**:

- `isStatic?: boolean` - Optimize for SSR (default: false)

#### `<SignedOut>`

Renders children only when user is not authenticated.

```astro
<SignedOut isStatic={true}>
  <!-- Unauthenticated content -->
</SignedOut>
```

#### `<UserButton>`

User avatar with dropdown menu.

```astro
<UserButton
  appearance={{
    elements: {
      avatarBox: "w-8 h-8"
    }
  }}
  showName={true}
  userProfileMode="modal"
/>
```

**Props**:

- `appearance?: object` - Styling customization
- `showName?: boolean` - Display user name
- `userProfileMode?: 'modal' | 'navigation'` - Profile access method

#### `<SignInButton>`

Trigger sign-in flow.

```astro
<SignInButton mode="modal" redirectUrl="/dashboard">
  <button>Custom Sign In</button>
</SignInButton>
```

**Props**:

- `mode?: 'modal' | 'redirect'` - Sign-in method
- `redirectUrl?: string` - Post-signin destination

### Server Functions

#### `getAuth(context)`

Get authentication state in API routes.

```typescript
import { getAuth } from '@clerk/astro/server'

export const GET: APIRoute = async context => {
  const { userId, user } = getAuth(context)
  // Handle authenticated request
}
```

**Returns**:

- `userId: string | null` - User ID if authenticated
- `user: User | null` - Full user object

#### `clerkMiddleware()`

Create authentication middleware.

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

const isProtected = createRouteMatcher(['/protected(.*)'])

export const onRequest = clerkMiddleware((auth, context, next) => {
  // Middleware logic
})
```

### Utility Functions

#### `createRouteMatcher(patterns)`

Create route pattern matcher.

```typescript
const matcher = createRouteMatcher([
  '/admin(.*)', // Admin routes
  '/dashboard', // Exact match
  '/api/secure(.*)', // API routes
])

const isProtected = matcher(request)
```

**Parameters**:

- `patterns: string[]` - Array of route patterns

**Returns**:

- `(request: Request) => boolean` - Matcher function

---

## Next Steps

1. **Implement Role-Based Access Control**: Add user roles and permissions
2. **Add User Profile Management**: Create profile editing interface
3. **Set Up Testing**: Write comprehensive auth tests
4. **Monitor Usage**: Add analytics for auth events
5. **Customize UI**: Brand authentication components

For more advanced features, see the [Clerk documentation](https://clerk.com/docs) and [Astro authentication guides](https://docs.astro.build/en/guides/authentication/).
