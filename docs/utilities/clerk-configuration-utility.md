# Clerk Configuration Utility

## Overview

The Clerk Configuration Utility (`src/utils/clerk-config.ts`) provides a centralized way to check if Clerk authentication is properly configured in your Astro application. It validates environment variables and provides detailed status information for debugging and conditional feature enablement.

## Table of Contents

- [Installation](#installation)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [TypeScript Types](#typescript-types)
- [Security Features](#security-features)
- [Integration Patterns](#integration-patterns)
- [Troubleshooting](#troubleshooting)

## Installation

The utility is already included in the project. Import it using the path alias:

```typescript
import { isClerkConfigured, getClerkConfigStatus, hasValidClerkWebhook } from '#utils/clerk-config'
```

## API Reference

### Functions

#### `isClerkConfigured(): boolean`

**Purpose**: Quick boolean check for basic Clerk authentication setup.

**Returns**: `true` if both required keys are present and valid, `false` otherwise.

**Required Environment Variables**:

- `PUBLIC_CLERK_PUBLISHABLE_KEY` (must not be placeholder)
- `CLERK_SECRET_KEY` (must not be placeholder)

```typescript
// Simple conditional authentication
if (isClerkConfigured()) {
  // Enable protected routes
  console.log('Clerk authentication is ready')
}
```

#### `hasValidClerkWebhook(): boolean`

**Purpose**: Check if Clerk webhook endpoint is properly configured.

**Returns**: `true` if webhook secret exists and is not a placeholder.

**Required Environment Variables**:

- `CLERK_WEBHOOK_SECRET` (must not be placeholder)

```typescript
// Enable webhook-dependent features
if (hasValidClerkWebhook()) {
  // Setup webhook endpoints
  console.log('Webhook configuration is valid')
}
```

#### `getClerkConfigStatus(): ClerkConfigStatus`

**Purpose**: Get comprehensive configuration status for debugging and detailed checks.

**Returns**: Detailed status object with individual key validation.

```typescript
const status = getClerkConfigStatus()

// Check specific keys
if (status.publishableKey.isValid) {
  // Client-side features available
}

if (status.secretKey.isValid) {
  // Server-side features available
}

// Overall status
console.log('Basic config:', status.hasBasicConfig)
console.log('Fully configured:', status.isFullyConfigured)
```

## Usage Examples

### Basic Authentication Check

```typescript
// middleware.ts or layout components
import { isClerkConfigured } from '#utils/clerk-config'

const authEnabled = isClerkConfigured()

export const onRequest = authEnabled
  ? sequence(rateLimitMiddleware, csrfMiddleware, authMiddleware)
  : sequence(rateLimitMiddleware, csrfMiddleware)
```

### Conditional Feature Rendering

```typescript
// In Astro components
---
import { isClerkConfigured } from '#utils/clerk-config'

const showAuthFeatures = isClerkConfigured()
---

{showAuthFeatures ? (
  <SignedIn>
    <UserButton />
  </SignedIn>
) : (
  <p>Authentication not configured</p>
)}
```

### Development Environment Detection

```typescript
import { getClerkConfigStatus } from '#utils/clerk-config'

const status = getClerkConfigStatus()

// Warn developers about configuration issues
if (!status.hasBasicConfig) {
  console.warn('Clerk not configured. Copy .env.example to .env and add your keys.')
}

// Show detailed status in development
if (import.meta.env.DEV) {
  console.table({
    'Publishable Key': status.publishableKey.isValid ? '✓' : '✗',
    'Secret Key': status.secretKey.isValid ? '✓' : '✗',
    'Webhook Secret': status.webhookSecret.isValid ? '✓' : '✗',
  })
}
```

### API Route Protection

```typescript
// src/pages/api/protected-endpoint.ts
import type { APIRoute } from 'astro'
import { isClerkConfigured } from '#utils/clerk-config'

export const POST: APIRoute = async ({ request, locals }) => {
  // Early return if authentication isn't configured
  if (!isClerkConfigured()) {
    return new Response(JSON.stringify({ error: 'Authentication not configured' }), { status: 503 })
  }

  // Proceed with authenticated logic
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Handle authenticated request
}
```

## TypeScript Types

### `ClerkConfigStatus`

```typescript
export type ClerkConfigStatus = {
  publishableKey: {
    exists: boolean
    isValid: boolean
    value?: string // Optional - only present if exists
  }
  secretKey: {
    exists: boolean
    isValid: boolean
    value?: string // Optional - redacted if valid
  }
  webhookSecret: {
    exists: boolean
    isValid: boolean
    value?: string // Optional - redacted if valid
  }
  isFullyConfigured: boolean // All three keys valid
  hasBasicConfig: boolean // Publishable + secret keys valid
}
```

## Security Features

### Secret Redaction

The utility automatically redacts sensitive values in status output:

```typescript
const status = getClerkConfigStatus()

// Safe to log - secrets are redacted
console.log(status.secretKey.value) // "***REDACTED***"
console.log(status.webhookSecret.value) // "***REDACTED***"
console.log(status.publishableKey.value) // "pk_test_abc..." (public key - safe to show)
```

### Placeholder Detection

Identifies common placeholder values that indicate incomplete setup:

- `YOUR_CLERK_PUBLISHABLE_KEY`
- `YOUR_CLERK_SECRET_KEY`
- `YOUR_CLERK_WEBHOOK_SECRET`

```typescript
// These will return isValid: false
PUBLIC_CLERK_PUBLISHABLE_KEY = YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY = YOUR_CLERK_SECRET_KEY
```

## Integration Patterns

### With Existing Middleware

Replace the inline validation in `src/middleware.ts`:

```typescript
// Before (inline validation)
const hasValidClerkKeys =
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY &&
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY !== 'YOUR_CLERK_PUBLISHABLE_KEY' &&
  import.meta.env.CLERK_SECRET_KEY &&
  import.meta.env.CLERK_SECRET_KEY !== 'YOUR_CLERK_SECRET_KEY'

// After (using utility)
import { isClerkConfigured } from '#utils/clerk-config'

const hasValidClerkKeys = isClerkConfigured()
```

### Component Configuration Checks

```typescript
// Dashboard layout component
---
import { isClerkConfigured } from '#utils/clerk-config'
import type { Props } from './types'

export type Props = {
  title: string
}

const { title } = Astro.props
const authConfigured = isClerkConfigured()
---

<Layout title={title}>
  {authConfigured ? (
    <AuthenticatedDashboard />
  ) : (
    <AuthSetupInstructions />
  )}
</Layout>
```

### Testing Integration

```typescript
// In test files
import { describe, it, expect, vi } from 'vitest'

// Mock environment for testing
vi.mock('astro:env/server', () => ({
  PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_valid_key',
  CLERK_SECRET_KEY: 'sk_test_valid_key',
}))

describe('Clerk Configuration', () => {
  it('should detect valid configuration', async () => {
    const { isClerkConfigured } = await import('#utils/clerk-config')
    expect(isClerkConfigured()).toBe(true)
  })
})
```

## Troubleshooting

### Common Issues

#### 1. "Authentication not configured" in Production

**Problem**: `isClerkConfigured()` returns `false` in production.

**Solution**:

- Verify environment variables are set in your deployment platform
- Check for typos in variable names
- Ensure values are not placeholder strings

```bash
# Verify deployment environment
echo $PUBLIC_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY
```

#### 2. TypeScript Errors with Optional Properties

**Problem**: Type errors when accessing `value` property.

**Solution**: Use optional chaining or check existence first.

```typescript
const status = getClerkConfigStatus()

// Safe access
const pubKey = status.publishableKey.value ?? 'Not configured'

// Or check existence
if (status.publishableKey.exists) {
  console.log(status.publishableKey.value)
}
```

#### 3. Import.meta.env Not Available

**Problem**: Environment variables not accessible during build.

**Solution**: Ensure variables are properly prefixed and configured.

```typescript
// Public variables need PUBLIC_ prefix
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

// Private variables work without prefix
CLERK_SECRET_KEY=sk_test_...
```

### Debug Mode

Use detailed status for troubleshooting:

```typescript
import { getClerkConfigStatus } from '#utils/clerk-config'

// Development debugging
if (import.meta.env.DEV) {
  const status = getClerkConfigStatus()
  console.group('Clerk Configuration Status')
  console.log('Basic config:', status.hasBasicConfig)
  console.log('Fully configured:', status.isFullyConfigured)
  console.table({
    Key: 'Status',
    'Publishable Key': status.publishableKey.exists
      ? status.publishableKey.isValid
        ? 'Valid'
        : 'Placeholder'
      : 'Missing',
    'Secret Key': status.secretKey.exists
      ? status.secretKey.isValid
        ? 'Valid'
        : 'Placeholder'
      : 'Missing',
    'Webhook Secret': status.webhookSecret.exists
      ? status.webhookSecret.isValid
        ? 'Valid'
        : 'Placeholder'
      : 'Missing',
  })
  console.groupEnd()
}
```

## Related Documentation

- [Authentication Developer Guide](../AUTHENTICATION_DEVELOPER_GUIDE.md)
- [Clerk-Supabase Integration](../integration/clerk-supabase-integration.md)
- [Environment Configuration Guide](../../CLAUDE.md#environment-configuration)
- [Security Best Practices](../SECURITY.md)
