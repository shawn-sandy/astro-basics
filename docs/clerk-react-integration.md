# Clerk React Components Integration in Astro

This guide provides comprehensive documentation for integrating Clerk React authentication components in your Astro project using `@clerk/astro`.

## Overview

This project uses Clerk for user authentication with seamless integration of React components within Astro pages. The setup enables both server-side and client-side authentication patterns while maintaining Astro's performance benefits.

## Prerequisites

- Astro project with React integration (`@astrojs/react`)
- Clerk account with application configured
- Environment variables properly set

## Installation & Setup

### 1. Dependencies

The project includes these key Clerk dependencies:

```json
{
  "@clerk/astro": "^2.10.8",
  "@astrojs/react": "^4.3.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

### 2. Astro Configuration

The Clerk integration is configured in `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import clerk from '@clerk/astro'

export default defineConfig({
  integrations: [
    react(),
    clerk(), // Clerk integration
    // ... other integrations
  ],
  output: 'server', // Required for Clerk middleware
})
```

### 3. Environment Variables

Required environment variables:

```bash
# Public key (accessible on client-side)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Secret key (server-side only)
CLERK_SECRET_KEY=sk_test_...
```

## Middleware Setup

Authentication middleware is configured in `src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)'])

export const onRequest = clerkMiddleware((auth, context, next) => {
  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }
  return next()
})
```

**Key Features:**

- Route-based protection using pattern matching
- Automatic redirect to sign-in for unauthenticated users
- Supports wildcard patterns for nested routes

## Available Clerk React Components

### Core Authentication Components

#### 1. SignedIn Component

Renders content only for authenticated users.

```astro
---
import { SignedIn } from '@clerk/astro/components'
---

<SignedIn>
  <p>This content is only visible to signed-in users</p>
  <a href="/dashboard">Go to Dashboard</a>
</SignedIn>
```

**Props:**

- `isStatic?: boolean` - For static rendering optimization

#### 2. SignedOut Component

Renders content only for unauthenticated users.

```astro
---
import { SignedOut } from '@clerk/astro/components'
---

<SignedOut>
  <p>Please sign in to access exclusive content</p>
  <a href="/sign-in">Sign In</a>
</SignedOut>
```

#### 3. UserButton Component

Displays user avatar with dropdown menu for account management.

```astro
---
import { UserButton } from '@clerk/astro/components'
---

<SignedIn>
  <UserButton />
</SignedIn>
```

**Features:**

- User avatar display
- Account settings dropdown
- Sign out functionality
- Profile management access

#### 4. SignInButton Component

Renders a customizable sign-in button.

```astro
---
import { SignInButton } from '@clerk/astro/components'
---

<SignedOut>
  <SignInButton mode="modal" />
</SignedOut>
```

**Props:**

- `mode?: "redirect" | "modal"` - Sign-in flow mode
- `redirectUrl?: string` - Post-authentication redirect
- `signUpUrl?: string` - Custom sign-up URL

## Implementation Patterns

### 1. Layout Integration

The main layout (`src/layouts/Layout.astro`) demonstrates navigation-level integration:

```astro
---
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/astro/components'
---

<Navigation>
  <div slot="login">
    <SignedIn isStatic={true}>
      <UserButton />
    </SignedIn>
    <SignedOut isStatic={true}>
      <SignInButton mode="modal" />
    </SignedOut>
  </div>
</Navigation>
```

**Best Practices:**

- Use `isStatic={true}` for components in layouts to optimize SSR
- Leverage Astro slots for flexible component placement
- Wrap authentication components in appropriate conditional containers

### 2. Protected Page Pattern

Example from `src/pages/dashboard.astro`:

```astro
---
import Auth from '#/layouts/Auth.astro'
import { SignedIn, SignedOut } from '@clerk/astro/components'
---

<Auth pageTitle="Dashboard - Astro Kit">
  <SignedIn>
    <div class="dashboard-container">
      <!-- Protected dashboard content -->
      <h1>Welcome to your Dashboard</h1>
      <!-- Dashboard functionality -->
    </div>
  </SignedIn>

  <SignedOut>
    <div class="auth-required">
      <h1>Authentication Required</h1>
      <p>Please sign in to access your dashboard.</p>
      <a href="/sign-in" class="sign-in-btn">Sign In</a>
    </div>
  </SignedOut>
</Auth>
```

**Pattern Benefits:**

- Graceful handling of authentication states
- Clear user experience for both authenticated and unauthenticated users
- Consistent layout structure

### 3. Conditional Navigation

Navigation component (`src/components/astro/Navigation.astro`) shows authenticated-only links:

```astro
---
import { SignedIn } from '@clerk/astro/components'
---

<nav>
  <ul>
    <!-- Public navigation items -->
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>

  <ul>
    <SignedIn>
      <li><a href="/events">Events</a></li>
      <li><a href="/dashboard">Dashboard</a></li>
    </SignedIn>
    <li>
      <slot name="login" />
    </li>
  </ul>
</nav>
```

## Advanced Configuration

### 1. Static Rendering Optimization

For better performance in SSR contexts, use the `isStatic` prop:

```astro
<SignedIn isStatic={true}>
  <!-- Content that doesn't need real-time auth state -->
</SignedIn>
```

### 2. Custom Styling

Clerk components can be styled using CSS classes and custom themes:

```css
/* Target Clerk component containers */
.cl-userButton {
  /* Custom styling for UserButton */
}

.cl-signInButton {
  /* Custom styling for SignInButton */
}
```

### 3. Error Handling

Implement error boundaries for authentication failures:

```astro
---
import { SignedIn, SignedOut } from '@clerk/astro/components'
---

<SignedIn>
  <!-- Protected content -->
</SignedIn>

<SignedOut>
  <div class="auth-error">
    <h2>Access Denied</h2>
    <p>Authentication is required to view this content.</p>
  </div>
</SignedOut>
```

## Integration with React Components

### Using Clerk in React Components

For React components that need authentication context:

```tsx
// src/components/react/ProtectedComponent.tsx
import { useUser } from '@clerk/astro/react'

export default function ProtectedComponent() {
  const { user, isLoaded, isSignedIn } = useUser()

  if (!isLoaded) return <div>Loading...</div>
  if (!isSignedIn) return <div>Please sign in</div>

  return (
    <div>
      <h2>Welcome, {user.firstName}!</h2>
      {/* Protected React component content */}
    </div>
  )
}
```

### Client-Side Hydration

When using Clerk components in React components that need client-side interactivity:

```astro
---
import ProtectedComponent from '#components/react/ProtectedComponent.tsx'
---

<ProtectedComponent client:load />
```

## Project Structure Examples

### File Organization

```
src/
├── layouts/
│   ├── Layout.astro          # Main layout with auth
│   └── Auth.astro           # Auth-specific layout
├── components/
│   ├── astro/
│   │   └── Navigation.astro  # Navigation with auth states
│   └── react/
│       └── ProtectedComponent.tsx
├── pages/
│   ├── dashboard.astro      # Protected page example
│   └── sign-in.astro       # Sign-in page
├── middleware.ts            # Route protection
└── env.d.ts                # Type definitions
```

### Route Protection Strategy

- **Public Routes**: `/`, `/about`, `/contact`, `/posts/*`, `/content/*`
- **Protected Routes**: `/dashboard/*`, `/forum/*`, `/admin/*`
- **Auth Routes**: `/sign-in`, `/sign-up`, `/sign-out`

## Best Practices

### 1. Performance Optimization

- Use `isStatic={true}` for layout-level components
- Implement proper loading states
- Leverage Astro's partial hydration with `client:` directives

### 2. User Experience

- Provide clear authentication state feedback
- Implement graceful fallbacks for unauthenticated users
- Use consistent styling across authentication components

### 3. Security

- Always validate authentication on the server-side
- Use middleware for route protection
- Keep secret keys secure and never expose them client-side

### 4. Development

- Use separate Clerk environments for development/production
- Test authentication flows thoroughly
- Monitor authentication errors and user experience

## Troubleshooting

### Common Issues

1. **Components not rendering**: Ensure React integration is properly configured
2. **Authentication loops**: Check middleware configuration and route patterns
3. **Environment variables**: Verify all required Clerk keys are set
4. **Static rendering issues**: Use `isStatic={true}` for SSR optimization

### Debug Tips

- Enable Clerk debugging in development
- Check browser console for authentication errors
- Verify middleware execution with console logging
- Test with different user states (signed in/out)

## Resources

- [Clerk Astro Documentation](https://clerk.com/docs/references/astro/overview)
- [Clerk React Components](https://clerk.com/docs/components/overview)
- [Astro React Integration](https://docs.astro.build/en/guides/integrations-guide/react/)

## Environment-Specific Notes

### Development

- Uses test Clerk environment
- Enhanced debugging and logging
- Hot reload support for auth components

### Production

- Requires live Clerk application
- Optimized static rendering
- Production-ready error handling

This documentation provides a comprehensive guide for integrating Clerk React components in your Astro project, ensuring secure authentication with optimal performance.
