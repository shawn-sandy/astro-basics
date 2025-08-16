# Clerk User Profile Implementation - Critical Fixes & Improvements

This document provides comprehensive fixes for all issues identified in the code review of the `feat/clerk-user-info` branch. Issues are organized by priority level with complete implementation guides.

## Table of Contents

1. [Critical Issues (Must Fix Before Merge)](#critical-issues-must-fix-before-merge)
2. [Warning Level Issues (Should Fix)](#warning-level-issues-should-fix)
3. [Suggestions (Consider Improving)](#suggestions-consider-improving)
4. [Testing Requirements](#testing-requirements)
5. [Implementation Checklist](#implementation-checklist)

---

## Critical Issues (Must Fix Before Merge)

### 1. Security Vulnerability - Metadata Sanitization

**Issue**: User metadata displayed without sanitization could expose sensitive information or enable XSS attacks.

**Location**: `src/components/astro/UserInfo.astro:131`

**Current Code**:
```astro
{JSON.stringify(user.publicMetadata, null, 2)}
```

**Fix**: Create sanitization utility and implement secure metadata display.

#### Step 1: Create Sanitization Utility

Create `src/utils/sanitize.ts`:

```typescript
/**
 * Sanitizes user metadata by removing potentially dangerous fields
 * and escaping HTML entities
 */
export interface SanitizedMetadata {
  [key: string]: string | number | boolean | null
}

const DANGEROUS_FIELDS = [
  'password', 'token', 'secret', 'key', 'private',
  'internal', 'admin', 'auth', 'session', 'csrf'
]

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
}

/**
 * Escapes HTML entities in string values
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Checks if a field name is potentially dangerous
 */
function isDangerousField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase()
  return DANGEROUS_FIELDS.some(dangerous => lowerField.includes(dangerous))
}

/**
 * Recursively sanitizes metadata object
 */
export function sanitizeMetadata(metadata: unknown): SanitizedMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }

  const sanitized: SanitizedMetadata = {}
  const obj = metadata as Record<string, unknown>

  for (const [key, value] of Object.entries(obj)) {
    // Skip dangerous field names
    if (isDangerousField(key)) {
      continue
    }

    // Handle different value types
    if (value === null || value === undefined) {
      sanitized[key] = null
    } else if (typeof value === 'string') {
      // Escape HTML and limit length
      const sanitizedValue = escapeHtml(value)
      sanitized[key] = sanitizedValue.length > 500 ? 
        sanitizedValue.substring(0, 500) + '...' : sanitizedValue
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects (limit depth)
      const nestedSanitized = sanitizeMetadata(value)
      if (Object.keys(nestedSanitized).length > 0) {
        sanitized[key] = JSON.stringify(nestedSanitized)
      }
    }
    // Skip arrays and functions for security
  }

  return sanitized
}

/**
 * Formats sanitized metadata for display
 */
export function formatMetadataForDisplay(metadata: unknown): string {
  const sanitized = sanitizeMetadata(metadata)
  
  if (Object.keys(sanitized).length === 0) {
    return 'No displayable metadata'
  }

  return JSON.stringify(sanitized, null, 2)
}
```

#### Step 2: Update UserInfo Component

Update `src/components/astro/UserInfo.astro`:

```astro
---
import { clerkClient } from '@clerk/astro/server'
import type { User } from '@clerk/backend'
import { formatMetadataForDisplay } from '#utils/sanitize'

// ... existing code ...

// Add error boundary for metadata display
let sanitizedMetadata = ''
let metadataError = false

if (user?.publicMetadata) {
  try {
    sanitizedMetadata = formatMetadataForDisplay(user.publicMetadata)
  } catch (error) {
    console.error('Failed to sanitize metadata:', error)
    metadataError = true
  }
}
---

<!-- Replace metadata display section -->
{user.publicMetadata && Object.keys(user.publicMetadata).length > 0 && (
  <div class="user-info__row">
    <span class="user-info__label">Metadata:</span>
    {metadataError ? (
      <span class="user-info__value user-info__value--error">
        Metadata temporarily unavailable
      </span>
    ) : (
      <pre class="user-info__value user-info__value--code" aria-label="User metadata">
        {sanitizedMetadata}
      </pre>
    )}
  </div>
)}

<style>
  /* ... existing styles ... */
  
  .user-info__value--error {
    color: #dc2626;
    font-style: italic;
  }
</style>
```

### 2. API Error Handling Vulnerability

**Issue**: React component shows stale data when API calls fail and doesn't differentiate between error types.

**Location**: `src/components/react/UserProfile.tsx:38-67`

**Fix**: Implement comprehensive error handling with proper state management.

#### Updated UserProfile Component

```typescript
import { $authStore } from '@clerk/astro/client'
import { useStore } from '@nanostores/react'
import React from 'react'

// Improved type definitions
interface ClerkUserData {
  id: string
  emailAddresses: Array<{ emailAddress: string; id: string }>
  username?: string
  fullName?: string
  imageUrl?: string
  createdAt: number
}

interface DatabaseUserData {
  clerk_id?: string
  email?: string
  username?: string
  full_name?: string
  avatar_url?: string
  created_at?: string
  user_preferences?: UserPreferences[]
}

interface UserPreferences {
  theme?: string
  notifications?: boolean
  [key: string]: unknown
}

interface ApiResponse {
  user?: DatabaseUserData | null
  success?: boolean
  message?: string
  error?: string
  details?: string
}

interface UserProfileState {
  data: ApiResponse | null
  isLoading: boolean
  error: {
    type: 'network' | 'auth' | 'server' | 'unknown' | null
    message: string
    retryable: boolean
  }
  retryCount: number
}

export function UserProfile() {
  const { userId } = useStore($authStore)
  const [state, setState] = React.useState<UserProfileState>({
    data: null,
    isLoading: true,
    error: { type: null, message: '', retryable: false },
    retryCount: 0
  })

  const fetchUser = React.useCallback(async (retryAttempt = 0) => {
    if (!userId) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: { type: null, message: '', retryable: false }
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch('/api/user/profile', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      clearTimeout(timeoutId)

      let data: ApiResponse
      try {
        data = await response.json()
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${response.status}`)
      }

      if (response.ok) {
        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: { type: null, message: '', retryable: false },
          retryCount: 0
        }))
      } else {
        // Handle different HTTP error codes
        let errorType: UserProfileState['error']['type'] = 'server'
        let errorMessage = data.error || `HTTP ${response.status}`
        let retryable = false

        switch (response.status) {
          case 401:
            errorType = 'auth'
            errorMessage = 'Authentication required. Please sign in again.'
            retryable = false
            break
          case 403:
            errorType = 'auth'
            errorMessage = 'Access denied. Insufficient permissions.'
            retryable = false
            break
          case 404:
            errorType = 'server'
            errorMessage = 'Profile service not found.'
            retryable = true
            break
          case 429:
            errorType = 'network'
            errorMessage = 'Too many requests. Please try again later.'
            retryable = true
            break
          case 500:
          case 502:
          case 503:
          case 504:
            errorType = 'server'
            errorMessage = 'Server error. Please try again.'
            retryable = true
            break
          default:
            errorType = 'unknown'
            retryable = response.status < 500
        }

        setState(prev => ({
          ...prev,
          data: null,
          isLoading: false,
          error: { type: errorType, message: errorMessage, retryable },
          retryCount: retryAttempt
        }))
      }
    } catch (error) {
      let errorType: UserProfileState['error']['type'] = 'network'
      let errorMessage = 'Network error occurred'
      let retryable = true

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection.'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.'
        } else {
          errorMessage = error.message
          errorType = 'unknown'
        }
      }

      setState(prev => ({
        ...prev,
        data: null,
        isLoading: false,
        error: { type: errorType, message: errorMessage, retryable },
        retryCount: retryAttempt
      }))
    }
  }, [userId])

  const handleRetry = React.useCallback(() => {
    if (state.retryCount < 3) { // Max 3 retries
      fetchUser(state.retryCount + 1)
    }
  }, [fetchUser, state.retryCount])

  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Loading state
  if (state.isLoading) {
    return (
      <div className="user-profile user-profile--loading">
        <div className="user-profile__skeleton" role="status" aria-label="Loading profile">
          <div className="skeleton-avatar" />
          <div className="skeleton-text" />
          <div className="skeleton-text" />
        </div>
      </div>
    )
  }

  // Not signed in
  if (!userId) {
    return (
      <div className="user-profile user-profile--signed-out">
        <p>Please sign in to view your profile</p>
      </div>
    )
  }

  // Error state
  if (state.error.type) {
    return (
      <div className="user-profile user-profile--error">
        <div className="error-content">
          <h3>Unable to Load Profile</h3>
          <p>{state.error.message}</p>
          {state.error.retryable && state.retryCount < 3 && (
            <button 
              onClick={handleRetry}
              className="retry-button"
              type="button"
            >
              Try Again ({3 - state.retryCount} attempts left)
            </button>
          )}
          {state.error.type === 'auth' && (
            <a href="/sign-in" className="auth-link">
              Sign In Again
            </a>
          )}
        </div>
      </div>
    )
  }

  const user = state.data?.user

  return (
    <div className="user-profile">
      {/* ... rest of component with improved accessibility ... */}
      <div className="user-profile__header">
        {user?.avatar_url && (
          <img
            src={user.avatar_url}
            alt={`${user.full_name || user.username || 'User'} avatar`}
            className="user-profile__avatar"
            loading="lazy"
            onError={(e) => {
              // Handle broken image
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
        <div className="user-profile__info">
          <h2 className="user-profile__name" id="user-profile-name">
            {user?.full_name || user?.username || 'User'}
          </h2>
          {user?.username && (
            <p className="user-profile__username" aria-describedby="user-profile-name">
              @{user.username}
            </p>
          )}
        </div>
      </div>
      {/* ... rest of component ... */}
    </div>
  )
}
```

### 3. TypeScript Type Safety Issues

**Issue**: Interface definitions don't match actual Clerk user data structure.

**Fix**: Create proper type definitions in a dedicated types file.

#### Create `src/types/clerk.ts`

```typescript
// Clerk user types based on actual API responses
export interface ClerkEmailAddress {
  id: string
  emailAddress: string
  verification: {
    status: 'verified' | 'unverified' | 'pending'
    strategy: string
  }
}

export interface ClerkPhoneNumber {
  id: string
  phoneNumber: string
  verification: {
    status: 'verified' | 'unverified' | 'pending'
    strategy: string
  }
}

export interface ClerkUser {
  id: string
  emailAddresses: ClerkEmailAddress[]
  phoneNumbers?: ClerkPhoneNumber[]
  primaryEmailAddressId?: string
  primaryPhoneNumberId?: string
  username?: string
  firstName?: string
  lastName?: string
  fullName?: string
  imageUrl?: string
  createdAt: number
  updatedAt: number
  lastSignInAt?: number
  twoFactorEnabled?: boolean
  publicMetadata: Record<string, unknown>
  privateMetadata: Record<string, unknown>
  unsafeMetadata: Record<string, unknown>
}

// Database user types
export interface DatabaseUser {
  id?: number
  clerk_id: string
  email?: string
  username?: string
  full_name?: string
  avatar_url?: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface UserPreferences {
  id?: number
  user_id: number
  theme?: 'light' | 'dark' | 'system'
  notifications?: boolean
  language?: string
  timezone?: string
  [key: string]: unknown
}

// API response types
export interface UserProfileApiResponse {
  user?: DatabaseUser & {
    user_preferences?: UserPreferences[]
  }
  success?: boolean
  message?: string
  error?: string
  details?: string
}

// Component prop types
export interface UserInfoProps {
  user?: ClerkUser | null
  error?: string | null
}

export interface UserProfileProps {
  className?: string
  showPreferences?: boolean
}

// Error types
export interface ApiError {
  type: 'network' | 'auth' | 'server' | 'validation' | 'unknown'
  message: string
  code?: string | number
  retryable: boolean
  timestamp: number
}
```

---

## Warning Level Issues (Should Fix)

### 4. Performance Issues - Server-Side API Calls

**Issue**: Server-side API calls to Clerk on every page load without caching.

**Location**: `src/components/astro/UserInfo.astro:14-16`

**Fix**: Implement caching strategy for Clerk API calls.

#### Create `src/utils/cache.ts`

```typescript
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const userCache = new MemoryCache()

// Clerk user cache utilities
export async function getCachedUser(
  userId: string,
  clerkClient: any,
  ttl = 5 * 60 * 1000 // 5 minutes
) {
  const cacheKey = `user:${userId}`
  
  // Try cache first
  const cached = userCache.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Fetch fresh data
    const user = await clerkClient.users.getUser(userId)
    
    // Cache the result
    userCache.set(cacheKey, user, ttl)
    
    return user
  } catch (error) {
    // If we have stale cache data, return it
    const stale = userCache.get(cacheKey)
    if (stale) {
      console.warn('Returning stale user data due to API error:', error)
      return stale
    }
    
    throw error
  }
}

export function invalidateUserCache(userId: string): void {
  userCache.delete(`user:${userId}`)
}

// Auto-cleanup every 10 minutes
setInterval(() => userCache.cleanup(), 10 * 60 * 1000)
```

#### Update UserInfo Component with Caching

```astro
---
import { clerkClient } from '@clerk/astro/server'
import type { User } from '@clerk/backend'
import { getCachedUser } from '#utils/cache'
import { formatMetadataForDisplay } from '#utils/sanitize'

// Get the current user's auth info
const auth = Astro.locals.auth()
const { userId } = auth

let user: User | null = null
let error: string | null = null
let fromCache = false

if (userId) {
  try {
    // Use cached version with fallback
    const client = clerkClient(Astro)
    const result = await getCachedUser(userId, client)
    user = result
    // You could add a header to indicate cache status
    fromCache = true // This would need cache hit detection
  } catch (err) {
    console.error('Failed to fetch user data:', err)
    error = `Failed to load user information: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

// ... rest of component logic ...
---
```

### 5. Navigation Link Issues

**Issue**: Hard-coded links to non-existent routes result in 404 errors.

**Location**: `src/pages/profile/index.astro:29-40`

**Fix**: Create route validation and conditional rendering.

#### Create `src/utils/routes.ts`

```typescript
// Available routes in the application
export const AVAILABLE_ROUTES = {
  '/dashboard': true,
  '/profile': true,
  '/forum': true,
  '/organization': true,
  // Add routes as they're implemented
  '/settings': false,
  '/security': false,
  '/preferences': false,
  '/support': false
} as const

export type RouteKey = keyof typeof AVAILABLE_ROUTES

export function isRouteAvailable(route: RouteKey): boolean {
  return AVAILABLE_ROUTES[route] === true
}

export interface NavigationLink {
  href: string
  label: string
  icon: string
  available: boolean
  description?: string
  comingSoon?: boolean
}

export const PROFILE_NAVIGATION: NavigationLink[] = [
  {
    href: '/dashboard',
    label: 'Back to Dashboard',
    icon: '📊',
    available: true,
    description: 'Return to main dashboard'
  },
  {
    href: '/settings',
    label: 'Account Settings',
    icon: '⚙️',
    available: false,
    comingSoon: true,
    description: 'Manage account preferences and configuration'
  },
  {
    href: '/security',
    label: 'Security Settings',
    icon: '🔒',
    available: false,
    comingSoon: true,
    description: 'Two-factor authentication and security options'
  },
  {
    href: '/preferences',
    label: 'Preferences',
    icon: '🎨',
    available: false,
    comingSoon: true,
    description: 'Customize your experience'
  },
  {
    href: '/support',
    label: 'Contact Support',
    icon: '💬',
    available: false,
    comingSoon: true,
    description: 'Get help with your account'
  }
]
```

#### Update Profile Page

```astro
---
import Auth from '#/layouts/Auth.astro'
import { SignedIn, SignedOut } from '@clerk/astro/components'
import UserInfo from '#/components/astro/UserInfo.astro'
import SignedOutMessage from '#/components/astro/SignedOutMessage.astro'
import { PROFILE_NAVIGATION } from '#utils/routes'
---

<Auth pageTitle="My Profile - Astro Kit" pageDescription="User profile and account settings">
  <SignedIn>
    <div class="profile-page">
      <div class="profile-header">
        <h1>My Profile</h1>
        <p class="profile-subtitle">Manage your account information and settings</p>
      </div>

      <div class="profile-content">
        <div class="profile-main">
          <UserInfo />
        </div>

        <div class="profile-sidebar">
          <div class="profile-actions">
            <h3>Account Actions</h3>
            <div class="action-links">
              {PROFILE_NAVIGATION.map(link => 
                link.available ? (
                  <a href={link.href} class="action-link" title={link.description}>
                    <span class="action-icon">{link.icon}</span>
                    {link.label}
                  </a>
                ) : (
                  <div class="action-link action-link--disabled" title={link.description}>
                    <span class="action-icon">{link.icon}</span>
                    {link.label}
                    {link.comingSoon && <span class="coming-soon-badge">Coming Soon</span>}
                  </div>
                )
              )}
            </div>
          </div>
          
          <!-- ... rest of sidebar ... -->
        </div>
      </div>
    </div>
  </SignedIn>

  <SignedOut>
    <SignedOutMessage />
  </SignedOut>
</Auth>

<style>
  /* ... existing styles ... */
  
  .action-link--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    color: var(--color-text-disabled, #9ca3af);
  }

  .action-link--disabled:hover {
    background: none;
    color: var(--color-text-disabled, #9ca3af);
  }

  .coming-soon-badge {
    font-size: 0.625rem;
    background: var(--color-accent, #f59e0b);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    margin-left: auto;
    font-weight: 500;
  }
</style>
```

---

## Suggestions (Consider Improving)

### 6. Accessibility Improvements

**Multiple Issues**: Missing ARIA attributes, loading states, and semantic HTML.

**Fix**: Implement comprehensive accessibility features.

#### Enhanced Accessibility Updates

Add to `src/components/astro/UserInfo.astro`:

```astro
<div class="user-info" role="region" aria-labelledby="user-info-heading">
  <h2 id="user-info-heading" class="sr-only">User Profile Information</h2>
  
  {!userId ? (
    <div class="user-info__signed-out" role="status">
      <p>Please sign in to view your profile</p>
    </div>
  ) : error ? (
    <div class="user-info__error" role="alert" aria-live="polite">
      <p>{error}</p>
    </div>
  ) : user ? (
    <>
      <div class="user-info__header">
        {user.imageUrl && (
          <img
            src={user.imageUrl}
            alt={`${user.fullName || user.username || 'User'} profile picture`}
            class="user-info__avatar"
            loading="lazy"
            role="img"
            aria-describedby="user-info-name"
          />
        )}
        <div class="user-info__details">
          <h3 class="user-info__name" id="user-info-name">
            {user.fullName || (user.firstName && user.lastName)
              ? `${user.firstName} ${user.lastName}`
              : user.username || 'User'}
          </h3>
          {user.username && (
            <p class="user-info__username" aria-label={`Username: ${user.username}`}>
              @{user.username}
            </p>
          )}
        </div>
      </div>

      <div class="user-info__content">
        <dl class="user-info__details-list">
          <div class="user-info__row">
            <dt class="user-info__label">Email:</dt>
            <dd class="user-info__value">
              {primaryEmail?.emailAddress || user.emailAddresses?.[0]?.emailAddress || 'No email'}
              {primaryEmail?.verification?.status === 'verified' && (
                <span 
                  class="user-info__badge user-info__badge--verified"
                  aria-label="Email verified"
                  role="img"
                >
                  ✓ Verified
                </span>
              )}
            </dd>
          </div>
          
          <!-- Convert other rows to dl/dt/dd structure for better accessibility -->
        </dl>
      </div>
    </>
  ) : (
    <div class="user-info__loading" role="status" aria-live="polite">
      <p>Loading user information...</p>
      <div class="loading-spinner" aria-hidden="true"></div>
    </div>
  )}
</div>

<style>
  /* ... existing styles ... */
  
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .user-info__details-list {
    margin: 0;
    padding: 0;
  }

  .user-info__row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .user-info__row:last-child {
    margin-bottom: 0;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border, #e5e7eb);
    border-top: 2px solid var(--color-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Focus management */
  .action-link:focus,
  .help-link:focus {
    outline: 2px solid var(--color-primary, #3b82f6);
    outline-offset: 2px;
  }

  /* Reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .loading-spinner {
      animation: none;
    }
    
    .skeleton-avatar,
    .skeleton-text {
      animation: none;
    }
  }
</style>
```

### 7. SCSS Browser Compatibility

**Issue**: Modern CSS syntax in SCSS may not be supported in older browsers.

**Location**: `src/styles/components/_user-profile.scss:136`

**Fix**: Use compatible media query syntax.

```scss
// Replace line 136
// @media (width <= 640px) {
@media (max-width: 640px) {
  .user-profile {
    padding: 1rem;

    &__header {
      flex-direction: column;
      text-align: center;
    }

    &__detail {
      flex-direction: column;
      gap: 0.25rem;
    }

    &__label {
      min-width: auto;
    }
  }
}
```

---

## Testing Requirements

### Unit Tests Needed

#### 1. `tests/components/UserInfo.test.ts`

```typescript
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import UserInfo from '#components/astro/UserInfo.astro'

describe('UserInfo Component', () => {
  let container: AstroContainer
  
  beforeEach(async () => {
    container = await AstroContainer.create()
  })

  test('renders signed out state when no userId', async () => {
    const result = await container.renderToString(UserInfo, {
      locals: { auth: () => ({ userId: null }) }
    })
    
    expect(result).toContain('Please sign in to view your profile')
  })

  test('sanitizes metadata display', async () => {
    const mockUser = {
      id: 'user_123',
      publicMetadata: {
        theme: 'dark',
        secret_key: 'should_not_display',
        '<script>alert("xss")</script>': 'malicious'
      }
    }

    // Mock clerkClient
    const mockClerkClient = {
      users: {
        getUser: vi.fn().mockResolvedValue(mockUser)
      }
    }

    const result = await container.renderToString(UserInfo, {
      locals: { auth: () => ({ userId: 'user_123' }) }
    })

    expect(result).toContain('dark')
    expect(result).not.toContain('secret_key')
    expect(result).not.toContain('<script>')
  })

  test('handles API errors gracefully', async () => {
    const mockClerkClient = {
      users: {
        getUser: vi.fn().mockRejectedValue(new Error('API Error'))
      }
    }

    const result = await container.renderToString(UserInfo, {
      locals: { auth: () => ({ userId: 'user_123' }) }
    })

    expect(result).toContain('Failed to load user information')
  })
})
```

#### 2. `tests/components/UserProfile.test.tsx`

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { UserProfile } from '#components/react/UserProfile'

// Mock the auth store
vi.mock('@clerk/astro/client', () => ({
  $authStore: {
    get: () => ({ userId: 'user_123' })
  }
}))

vi.mock('@nanostores/react', () => ({
  useStore: vi.fn(() => ({ userId: 'user_123' }))
}))

describe('UserProfile Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    vi.clearAllMocks()
  })

  test('renders loading state initially', () => {
    render(<UserProfile />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  test('handles successful API response', async () => {
    const mockUser = {
      user: {
        clerk_id: 'user_123',
        email: 'test@example.com',
        full_name: 'Test User'
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser)
    })

    render(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  test('handles API errors with retry functionality', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to Load Profile/)).toBeInTheDocument()
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })

    const retryButton = screen.getByText(/Try Again/)
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  test('handles authentication errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' })
    })

    render(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText(/Authentication required/)).toBeInTheDocument()
      expect(screen.getByText(/Sign In Again/)).toBeInTheDocument()
    })
  })

  test('enforces retry limits', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<UserProfile />)

    await waitFor(() => {
      expect(screen.getByText(/Try Again/)).toBeInTheDocument()
    })

    // Click retry 3 times
    const retryButton = screen.getByText(/Try Again/)
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
    })
  })
})
```

#### 3. `tests/api/user-profile.test.ts`

```typescript
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '#pages/api/user/profile.ts'

describe('/api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET endpoint', () => {
    test('returns 401 when not authenticated', async () => {
      const request = new Request('http://localhost/api/user/profile')
      const locals = { userId: null, clerkToken: null }

      const response = await GET({ request, locals } as any)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('returns user data when authenticated', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { clerk_id: 'user_123', email: 'test@example.com' },
          error: null
        })
      }

      vi.mock('#libs/supabase-native', () => ({
        createServerSupabaseClient: () => mockSupabase,
        isSupabaseConfigured: () => true
      }))

      const request = new Request('http://localhost/api/user/profile')
      const locals = { userId: 'user_123', clerkToken: 'token_123' }

      const response = await GET({ request, locals } as any)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.user.clerk_id).toBe('user_123')
    })
  })

  describe('PATCH endpoint', () => {
    test('validates allowed fields only', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { clerk_id: 'user_123' },
          error: null
        })
      }

      const request = new Request('http://localhost/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          username: 'newusername',
          admin: true, // Should be filtered out
          secret: 'should_not_update'
        })
      })

      const locals = { userId: 'user_123', clerkToken: 'token_123' }

      const response = await PATCH({ request, locals } as any)

      expect(mockSupabase.update).toHaveBeenCalledWith({
        username: 'newusername'
        // admin and secret should not be included
      })
    })
  })
})
```

### Integration Tests

#### E2E Test for Profile Flow

Create `e2e/profile.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/user/profile', (route) => {
      route.fulfill({
        json: {
          user: {
            clerk_id: 'user_123',
            email: 'test@example.com',
            username: 'testuser',
            full_name: 'Test User'
          }
        }
      })
    })
  })

  test('displays user profile information', async ({ page }) => {
    await page.goto('/profile')
    
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible()
    await expect(page.getByText('Test User')).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('handles loading states', async ({ page }) => {
    // Delay the API response
    await page.route('**/api/user/profile', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.fulfill({
        json: { user: null, message: 'Loading...' }
      })
    })

    await page.goto('/profile')
    await expect(page.getByRole('status')).toBeVisible()
  })

  test('accessible navigation', async ({ page }) => {
    await page.goto('/profile')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Back to Dashboard' })).toBeFocused()
    
    // Test ARIA labels
    await expect(page.getByRole('region', { name: /User Profile Information/ })).toBeVisible()
  })
})
```

---

## Implementation Checklist

### Critical Security Fixes
- [ ] Implement metadata sanitization utility (`src/utils/sanitize.ts`)
- [ ] Update UserInfo component with sanitized metadata display
- [ ] Add comprehensive error handling to UserProfile component
- [ ] Create proper TypeScript types (`src/types/clerk.ts`)
- [ ] Add input validation to API endpoints

### Performance Optimizations
- [ ] Implement caching utility (`src/utils/cache.ts`)
- [ ] Add caching to UserInfo server-side component
- [ ] Optimize API response sizes
- [ ] Add request timeouts and retry logic

### User Experience Improvements
- [ ] Fix navigation links with route validation
- [ ] Add loading states and error boundaries
- [ ] Implement accessibility improvements
- [ ] Add proper ARIA labels and semantic HTML

### Testing Coverage
- [ ] Create unit tests for all components
- [ ] Add API endpoint integration tests
- [ ] Implement E2E tests for user flows
- [ ] Test accessibility compliance

### Browser Compatibility
- [ ] Update SCSS media queries for older browsers
- [ ] Test CSS custom properties fallbacks
- [ ] Verify JavaScript compatibility

### Documentation
- [ ] Update component documentation
- [ ] Add API endpoint documentation
- [ ] Create troubleshooting guide
- [ ] Document security considerations

### Deployment Preparation
- [ ] Review all console.log statements for production
- [ ] Implement proper logging strategy
- [ ] Add monitoring and alerting
- [ ] Performance testing under load

This comprehensive fix documentation addresses all critical security vulnerabilities, performance issues, and user experience problems identified in the code review. Implement these fixes in order of priority, with security fixes taking precedence.