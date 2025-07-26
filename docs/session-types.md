# TypeScript Session Types Documentation

This document provides comprehensive documentation for the TypeScript session and authentication types added to support proper type safety with Clerk authentication.

## Overview

The session types provide complete TypeScript support for user authentication, session management, and organization data. All types are designed to be readonly by default to prevent accidental mutations and ensure data integrity.

## Core Types

### UserProfile

Represents a user's profile information from Clerk authentication.

```typescript
interface UserProfile {
  readonly id: string
  readonly username: string | null
  readonly firstName: string | null
  readonly lastName: string | null
  readonly fullName: string | null
  readonly imageUrl: string
  readonly hasImage: boolean
  readonly primaryEmailAddress: {
    readonly emailAddress: string
    readonly id: string
  } | null
  readonly primaryPhoneNumber: {
    readonly phoneNumber: string
    readonly id: string
  } | null
  readonly emailAddresses: ReadonlyArray<{
    readonly id: string
    readonly emailAddress: string
    readonly verification: {
      readonly status: string
      readonly strategy: string
    }
  }>
  readonly externalId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}
```

### UserSession

Represents an active user session with authentication state.

```typescript
interface UserSession {
  readonly id: string
  readonly status: 'active' | 'expired' | 'abandoned' | 'ended' | 'removed' | 'replaced' | 'revoked'
  readonly expireAt: Date
  readonly abandonAt: Date
  readonly lastActiveAt: Date
  readonly lastActiveOrganizationId: string | null
  readonly factorVerificationAge: readonly [number, number] | null
  readonly user: UserProfile
}
```

### AuthState

Complete authentication state combining user, session, and organization data.

```typescript
interface AuthState {
  readonly isLoaded: boolean
  readonly isSignedIn: boolean
  readonly user: UserProfile | null
  readonly session: UserSession | null
  readonly orgId: string | null
  readonly orgRole: string | null
  readonly orgSlug: string | null
  readonly organization: OrganizationProfile | null
}
```

### OrganizationProfile

Represents organization data when user is part of an organization.

```typescript
interface OrganizationProfile {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly imageUrl: string
  readonly hasImage: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly publicMetadata: Record<string, unknown>
  readonly adminDeleteEnabled: boolean
  readonly maxAllowedMemberships: number
  readonly membersCount: number
  readonly pendingInvitationsCount: number
}
```

## Utility Types

### SessionResult<T, E>

A result type for operations that may fail, following the Result pattern instead of throwing errors.

```typescript
type SessionResult<T, E extends Error = Error> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }
```

### AuthEvent

Discriminated union for authentication events.

```typescript
type AuthEvent = 
  | { readonly type: 'session:created'; readonly session: UserSession }
  | { readonly type: 'session:ended'; readonly sessionId: string }
  | { readonly type: 'user:updated'; readonly user: UserProfile }
  | { readonly type: 'organization:switched'; readonly orgId: string | null }
```

## Type Guards

### isAuthenticated()

Type guard to check if a user is authenticated with proper type narrowing.

```typescript
const isAuthenticated = (auth: AuthState): auth is AuthState & { 
  readonly isSignedIn: true
  readonly user: UserProfile
  readonly session: UserSession
} => {
  return auth.isLoaded && auth.isSignedIn && auth.user !== null && auth.session !== null
}

// Usage
if (isAuthenticated(auth)) {
  // TypeScript knows auth.user and auth.session are not null
  console.log(auth.user.id)
  console.log(auth.session.id)
}
```

### hasOrganization()

Type guard to check if a user has organization membership.

```typescript
const hasOrganization = (auth: AuthState): auth is AuthState & {
  readonly organization: OrganizationProfile
  readonly orgId: string
} => {
  return auth.organization !== null && auth.orgId !== null
}
```

## Safe Accessors

### safeGetUser()

Safely access user data with undefined fallback.

```typescript
const safeGetUser = (auth: AuthState): UserProfile | undefined => {
  return isAuthenticated(auth) ? auth.user : undefined
}

// Usage
const user = safeGetUser(auth)
if (user) {
  console.log(user.fullName)
}
```

### safeGetSession()

Safely access session data with undefined fallback.

```typescript
const safeGetSession = (auth: AuthState): UserSession | undefined => {
  return isAuthenticated(auth) ? auth.session : undefined
}
```

## React Hooks

### useTypedAuth()

Custom hook that provides typed authentication state in React components.

```typescript
import { useTypedAuth } from '#utils/useTypedAuth'

function MyComponent() {
  const auth = useTypedAuth()
  
  if (!auth.isLoaded) {
    return <div>Loading...</div>
  }
  
  if (!isAuthenticated(auth)) {
    return <div>Please sign in</div>
  }
  
  return <div>Welcome, {auth.user.fullName}!</div>
}
```

### useSafeUser()

Hook to safely get user data with type guards.

```typescript
import { useSafeUser } from '#utils/useTypedAuth'

function UserInfo() {
  const { user, isAuthenticated } = useSafeUser()
  
  if (!isAuthenticated || !user) {
    return <div>Not authenticated</div>
  }
  
  return <div>Hello, {user.firstName}!</div>
}
```

### useUserProfile()

Hook to get user profile with error handling using Result type.

```typescript
import { useUserProfile } from '#utils/useTypedAuth'

function ProfileCard() {
  const userResult = useUserProfile()
  
  if (!userResult.ok) {
    return <div>Error: {userResult.error.message}</div>
  }
  
  const user = userResult.value
  return <div>{user.fullName}</div>
}
```

## Server-Side Utilities

### getAuthState()

Get authentication state in Astro API routes.

```typescript
import type { APIRoute } from 'astro'
import { getAuthState, handleAuthError } from '#utils/serverAuth'

export const GET: APIRoute = async (context) => {
  const authResult = await getAuthState(context)
  
  if (!authResult.ok) {
    return handleAuthError(authResult.error)
  }
  
  const auth = authResult.value
  
  return new Response(JSON.stringify({
    isSignedIn: auth.isSignedIn,
    userId: auth.user?.id,
  }))
}
```

### requireAuth()

Utility to protect API routes requiring authentication.

```typescript
import { requireAuth, handleAuthError } from '#utils/serverAuth'

export const POST: APIRoute = async (context) => {
  const authResult = await requireAuth(context)
  
  if (!authResult.ok) {
    return handleAuthError(authResult.error)
  }
  
  // User is authenticated, proceed with protected logic
  const { user } = authResult.value
  
  return new Response(JSON.stringify({ success: true }))
}
```

## Transform Functions

### transformClerkUser()

Convert Clerk UserResource to typed UserProfile.

```typescript
import { transformClerkUser } from '#types'

const userProfile = transformClerkUser(clerkUser)
```

### transformClerkSession()

Convert Clerk SessionResource to typed UserSession.

```typescript
import { transformClerkSession } from '#types'

const session = transformClerkSession(clerkSession, userProfile)
```

## Example Components

### UserProfileCard

React component demonstrating proper type usage.

```typescript
import type { UserProfileCardProps } from '#components/react/UserProfile'
import { UserProfileCard } from '#components/react/UserProfile'

function App() {
  return (
    <UserProfileCard 
      showEmail={true}
      showLoginTime={true}
      className="my-profile-card"
    />
  )
}
```

### SessionStatus

Component showing session information with types.

```typescript
import { SessionStatus } from '#components/react/UserProfile'

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <SessionStatus />
    </div>
  )
}
```

## Best Practices

### 1. Use Type Guards

Always use type guards to safely access authentication data:

```typescript
// Good
if (isAuthenticated(auth)) {
  console.log(auth.user.id)
}

// Avoid
if (auth.user) {
  console.log(auth.user.id) // Could be null
}
```

### 2. Handle Results Properly

Use the SessionResult type for operations that may fail:

```typescript
// Good
const userResult = await getUserProfile(context)
if (!userResult.ok) {
  return handleAuthError(userResult.error)
}
const user = userResult.value

// Avoid throwing errors
try {
  const user = await getUserProfile(context)
} catch (error) {
  // Less predictable error handling
}
```

### 3. Use Safe Accessors

Prefer safe accessors over direct property access:

```typescript
// Good
const user = safeGetUser(auth)
if (user) {
  console.log(user.fullName)
}

// Less safe
if (auth.isSignedIn && auth.user) {
  console.log(auth.user.fullName)
}
```

### 4. Leverage Readonly Properties

All types use readonly properties to prevent accidental mutations:

```typescript
// This will cause a TypeScript error
user.id = 'different-id' // Error: Cannot assign to 'id' because it is a read-only property
```

## Testing

The types include comprehensive test coverage demonstrating proper usage:

```typescript
import { describe, it, expect } from 'vitest'
import { isAuthenticated, safeGetUser } from '#types'

describe('Session Types', () => {
  it('should correctly identify authenticated users', () => {
    const auth = createMockAuthState()
    expect(isAuthenticated(auth)).toBe(true)
  })
})
```

Run tests with:

```bash
npm test
```

## Migration Guide

If you have existing code using Clerk without types:

### Before
```typescript
function MyComponent() {
  const { user, isSignedIn } = useUser()
  
  if (isSignedIn && user) {
    return <div>{user.fullName}</div>
  }
  
  return <div>Please sign in</div>
}
```

### After
```typescript
import { useTypedAuth } from '#utils/useTypedAuth'
import { isAuthenticated } from '#types'

function MyComponent() {
  const auth = useTypedAuth()
  
  if (!auth.isLoaded) {
    return <div>Loading...</div>
  }
  
  if (!isAuthenticated(auth)) {
    return <div>Please sign in</div>
  }
  
  return <div>{auth.user.fullName}</div>
}
```

This provides better type safety, clearer loading states, and more predictable code paths.