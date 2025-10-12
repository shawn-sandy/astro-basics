# Environment Configuration Migration Guide

## Overview

This guide helps developers migrate from direct `import.meta.env` access to the unified environment configuration abstraction layer. The migration improves type safety, validation, performance, and testability.

**Target Audience:** Developers working on astro-basics codebase
**Migration Status:** Phase 1 complete (7 files), Phase 2 in progress (8 files remaining)
**Related Issue:** #317
**OpenSpec Proposal:** [complete-env-abstraction-migration](../../openspec/changes/complete-env-abstraction-migration/)

---

## Migration Status

### ✅ Completed (Phase 1 - 7 Files)

These files have been successfully migrated and serve as reference examples:

| File                          | Status      | Pattern Used                   |
| ----------------------------- | ----------- | ------------------------------ |
| `src/libs/database.ts`        | ✅ Migrated | Database provider detection    |
| `src/libs/turso.ts`           | ✅ Migrated | Database client initialization |
| `src/libs/supabase.ts`        | ✅ Migrated | Database client setup          |
| `src/libs/supabase-native.ts` | ✅ Migrated | Native database operations     |
| `src/utils/clerk-config.ts`   | ✅ Migrated | Clerk configuration management |
| `src/utils/logger.ts`         | ✅ Migrated | Axiom logging configuration    |
| `src/utils/env-config.ts`     | ✅ Source   | Abstraction implementation     |

### ⏳ Pending (Phase 2 - 8 Files)

These files still use direct `import.meta.env` access and need migration:

**High Priority (Authentication & Middleware):**

- [ ] `src/middleware.ts`
- [ ] `src/pages/api/webhooks/clerk.ts`
- [ ] `src/libs/supabase-auth.ts`
- [ ] `src/libs/supabase-server.ts`

**Medium Priority (Components & Hooks):**

- [ ] `src/components/astro/RoleGuard.astro`
- [ ] `src/layouts/Base.astro`
- [ ] `src/components/astro/CollectionTagList.astro`
- [ ] `src/hooks/useSupabase.tsx`

---

## Quick Migration Checklist

For each file you migrate:

- [ ] Read current file to understand env variable usage
- [ ] Add import: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] Create instance: `const envConfig = getEnvironmentConfig()`
- [ ] Replace all `import.meta.env` references with `envConfig` methods
- [ ] Use validation helpers (`isClerkConfigured()`, etc.) where appropriate
- [ ] Run type check: `npm run type-check`
- [ ] Run tests if available
- [ ] Manually test the functionality
- [ ] Verify no remaining direct env access: `rg "import\.meta\.env\." [file]`

---

## Standard Migration Pattern

### Step 1: Add Import

**Add at top of file:**

```typescript
import { getEnvironmentConfig } from '#utils/env-config'
```

### Step 2: Create Instance

**Best Practice:** Create at module level for optimal performance:

```typescript
// At module level (top of file, after imports)
const envConfig = getEnvironmentConfig()
```

**Alternative:** Create in function if module-level not appropriate:

```typescript
export function myFunction() {
  const envConfig = getEnvironmentConfig() // Still cached, but less ideal
  // ...
}
```

### Step 3: Replace Direct Access

**Environment Detection:**

```typescript
// Before
const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD

// After
const isDev = envConfig.isDevelopment()
const isProd = envConfig.isProduction()
```

**Clerk Configuration:**

```typescript
// Before
const clerkPublishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY
const clerkSecretKey = import.meta.env.CLERK_SECRET_KEY

// After
const clerkPublishableKey = envConfig.getClerkPublishableKey()
const clerkSecretKey = envConfig.getClerkSecretKey()
```

**Supabase Configuration:**

```typescript
// Before
const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

// After
const supabaseUrl = envConfig.getSupabaseUrl()
const supabaseAnonKey = envConfig.getSupabaseAnonKey()
```

**Turso Configuration:**

```typescript
// Before
const tursoUrl = import.meta.env.TURSO_DATABASE_URL
const tursoToken = import.meta.env.TURSO_AUTH_TOKEN

// After
const tursoUrl = envConfig.getTursoDatabaseUrl()
const tursoToken = envConfig.getTursoAuthToken()
```

### Step 4: Use Validation Helpers

**Replace manual validation with built-in helpers:**

```typescript
// Before
if (!clerkKey || clerkKey === 'YOUR_CLERK_KEY') {
  throw new Error('Clerk not configured')
}

// After
if (!envConfig.isClerkConfigured()) {
  throw new Error('Clerk not configured')
}
```

**Available validation helpers:**

- `isClerkConfigured()` - Validates both Clerk keys present and not placeholders
- `isSupabaseConfigured()` - Validates Supabase URL and anon key
- `isTursoConfigured()` - Validates Turso URL and auth token
- `isAxiomConfigured()` - Validates Axiom token and dataset

### Step 5: Safe Non-Null Assertions

After validation, non-null assertions are safe:

```typescript
if (envConfig.isSupabaseConfigured()) {
  const url = envConfig.getSupabaseUrl()! // Safe: validated above
  const key = envConfig.getSupabaseAnonKey()! // Safe: validated above

  const client = createClient(url, key)
}
```

---

## File-Specific Migration Examples

### Example 1: Middleware (`src/middleware.ts`)

**Before:**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)'])

export const onRequest = clerkMiddleware((auth, context) => {
  const publishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY
  const secretKey = import.meta.env.CLERK_SECRET_KEY

  if (!publishableKey || !secretKey) {
    throw new Error('Clerk keys not configured')
  }

  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }
})
```

**After:**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'
import { getEnvironmentConfig } from '#utils/env-config'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)'])
const envConfig = getEnvironmentConfig() // Module level for performance

export const onRequest = clerkMiddleware((auth, context) => {
  if (!envConfig.isClerkConfigured()) {
    throw new Error('Clerk not configured. Set PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY')
  }

  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }
})
```

**Changes:**

- ✅ Added env-config import
- ✅ Created module-level `envConfig` instance
- ✅ Used `isClerkConfigured()` for validation
- ✅ Improved error message
- ✅ Removed redundant key access (Clerk middleware uses env internally)

---

### Example 2: API Endpoint (`src/pages/api/webhooks/clerk.ts`)

**Before:**

```typescript
import type { APIRoute } from 'astro'
import { Webhook } from 'svix'

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const webhook = new Webhook(webhookSecret)
  // ... verification logic
}
```

**After:**

```typescript
import type { APIRoute } from 'astro'
import { Webhook } from 'svix'
import { getEnvironmentConfig } from '#utils/env-config'

const envConfig = getEnvironmentConfig()

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = envConfig.getClerkWebhookSecret()

  if (!webhookSecret) {
    return new Response('Clerk webhook secret not configured (CLERK_WEBHOOK_SECRET)', {
      status: 500,
    })
  }

  const webhook = new Webhook(webhookSecret)
  // ... verification logic
}
```

**Changes:**

- ✅ Added env-config import
- ✅ Created module-level instance
- ✅ Used `getClerkWebhookSecret()` method
- ✅ More descriptive error message with env var name

---

### Example 3: Database Client (`src/libs/supabase-auth.ts`)

**Before:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration missing')
}

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})
```

**After:**

```typescript
import { createClient } from '@supabase/supabase-js'
import { getEnvironmentConfig } from '#utils/env-config'

const envConfig = getEnvironmentConfig()

if (!envConfig.isSupabaseConfigured()) {
  throw new Error('Supabase not configured. Required: SUPABASE_URL, SUPABASE_ANON_KEY')
}

const supabaseUrl = envConfig.getSupabaseUrl()!
const supabaseAnonKey = envConfig.getSupabaseAnonKey()!

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})
```

**Changes:**

- ✅ Added env-config import
- ✅ Created module-level instance
- ✅ Used `isSupabaseConfigured()` validation
- ✅ Safe non-null assertions after validation
- ✅ More descriptive error with required vars

---

### Example 4: Astro Component (`src/components/astro/RoleGuard.astro`)

**Before:**

```typescript
---
import type { Props } from './types'

const { requiredRole, children } = Astro.props
const isDevelopment = import.meta.env.DEV

// Component logic...
---

<div>
  {isDevelopment && <div class="debug-info">Development Mode</div>}
  <slot />
</div>
```

**After:**

```typescript
---
import type { Props } from './types'
import { getEnvironmentConfig } from '#utils/env-config'

const { requiredRole, children } = Astro.props
const envConfig = getEnvironmentConfig()
const isDevelopment = envConfig.isDevelopment()

// Component logic...
---

<div>
  {isDevelopment && <div class="debug-info">Development Mode</div>}
  <slot />
</div>
```

**Changes:**

- ✅ Added env-config import in frontmatter
- ✅ Created component-scoped instance
- ✅ Used `isDevelopment()` method

---

### Example 5: React Hook (`src/hooks/useSupabase.tsx`)

**Before:**

```typescript
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export function useSupabase() {
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    const supabaseUrl = import.meta.env.SUPABASE_URL
    const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      setClient(supabase)
    }
  }, [])

  return client
}
```

**After:**

```typescript
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { getEnvironmentConfig } from '#utils/env-config'

export function useSupabase() {
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    const envConfig = getEnvironmentConfig()

    if (envConfig.isSupabaseConfigured()) {
      const supabaseUrl = envConfig.getSupabaseUrl()!
      const supabaseAnonKey = envConfig.getSupabaseAnonKey()!

      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      setClient(supabase)
    }
  }, [])

  return client
}
```

**Changes:**

- ✅ Added env-config import
- ✅ Created instance inside useEffect (appropriate for React)
- ✅ Used `isSupabaseConfigured()` validation
- ✅ Safe non-null assertions after validation

---

## Common Migration Pitfalls

### ❌ Pitfall 1: Skipping Validation

```typescript
// BAD: No validation before non-null assertion
const key = envConfig.getClerkPublishableKey()! // Could be null!

// GOOD: Validate first
if (envConfig.isClerkConfigured()) {
  const key = envConfig.getClerkPublishableKey()! // Safe
}
```

### ❌ Pitfall 2: Creating Multiple Instances

```typescript
// BAD: Creates new instance on every call (slower)
function myFunction() {
  const envConfig = getEnvironmentConfig()
  return envConfig.isDevelopment()
}

// GOOD: Module-level instance (cached, faster)
const envConfig = getEnvironmentConfig()

function myFunction() {
  return envConfig.isDevelopment()
}
```

### ❌ Pitfall 3: Missing Import Path Alias

```typescript
// BAD: Relative import (fragile)
import { getEnvironmentConfig } from '../../../utils/env-config'

// GOOD: Path alias (robust)
import { getEnvironmentConfig } from '#utils/env-config'
```

### ❌ Pitfall 4: Forgetting Type Imports

```typescript
// For type-only imports, use import type
import type { EnvironmentConfig } from '#utils/env-config'
```

---

## Validation Commands

After migration, verify your changes:

### 1. Type Checking

```bash
npm run type-check
```

Expected: No TypeScript errors

### 2. Search for Remaining Direct Access

```bash
# Should only return env-config.ts itself
rg "import\.meta\.env\." src/ --type ts --type tsx --type astro
```

Expected output:

```
src/utils/env-config.ts
  148:      DEV: import.meta.env.DEV ?? false,
  149:      PROD: import.meta.env.PROD ?? false,
  ...
```

### 3. Run Tests

```bash
npm test
```

Expected: All tests passing (or same failures as before migration)

### 4. Run Build

```bash
npm run build
```

Expected: Build completes successfully

### 5. Manual Testing

```bash
npm run dev
```

Test the functionality you migrated (authentication, database access, etc.)

---

## Migration Workflow

### Phase-by-Phase Approach

**Phase 1: Prepare**

1. Read the file to understand current env usage
2. Identify all `import.meta.env` references
3. Plan which `envConfig` methods to use
4. Check reference implementations for similar patterns

**Phase 2: Migrate**

1. Add env-config import
2. Create `envConfig` instance
3. Replace all direct env access
4. Add validation helpers
5. Update error messages

**Phase 3: Validate**

1. Run type check
2. Search for remaining direct access
3. Run tests
4. Build production
5. Manual testing

**Phase 4: Commit**

1. Review git diff
2. Ensure no unintended changes
3. Commit with descriptive message
4. Reference issue #317

### Example Commit Message

```
refactor(middleware): migrate to environment config abstraction

- Replace import.meta.env access with getEnvironmentConfig()
- Use isClerkConfigured() validation helper
- Improve error messages with specific env var names
- Add module-level envConfig instance for performance

Related: #317
```

---

## Testing Your Migration

### Unit Tests

If the file you migrated has tests, they should continue passing. If tests fail, update mocks:

```typescript
vi.mock('#utils/env-config', () => ({
  getEnvironmentConfig: vi.fn(() => ({
    isClerkConfigured: () => true,
    getClerkPublishableKey: () => 'test_key',
    getClerkSecretKey: () => 'test_secret',
    isDevelopment: () => true,
  })),
}))
```

### Manual Testing Checklist

- [ ] Application starts without errors
- [ ] Authentication works (sign in/out)
- [ ] Protected routes accessible with auth
- [ ] Database operations work
- [ ] API endpoints respond correctly
- [ ] No console errors related to configuration

---

## Getting Help

### Resources

1. **Reference Documentation:** [project-docs/11-reference/environment-configuration.md](../11-reference/environment-configuration.md)
2. **Starlight Guide:** [/guide/environment-configuration](/guide/environment-configuration)
3. **OpenSpec Proposal:** [openspec/changes/complete-env-abstraction-migration/](../../openspec/changes/complete-env-abstraction-migration/)
4. **Source Code:** [src/utils/env-config.ts](../../src/utils/env-config.ts)

### Already Migrated Files (Reference Examples)

Review these successfully migrated files for patterns:

- **Database:** `src/libs/database.ts`, `src/libs/turso.ts`, `src/libs/supabase.ts`
- **Auth:** `src/utils/clerk-config.ts`
- **Logging:** `src/utils/logger.ts`

### Configuration Status

To check current configuration state:

```typescript
import { getEnvironmentStatus } from '#utils/env-config'
console.log(getEnvironmentStatus())
```

---

## FAQ

**Q: Why migrate if direct access works?**

A: The abstraction provides:

- Type safety (catch errors at compile time)
- Validation (detect placeholder values)
- Performance (caching)
- Testability (easy mocking)
- Consistency (single pattern across codebase)

**Q: Does this break existing functionality?**

A: No, the migration is backward compatible. Existing functionality continues to work identically.

**Q: What about performance overhead?**

A: There's no overhead - actually a performance _improvement_ due to caching. First access is ~0.1ms slower, subsequent access is ~0.05ms _faster_.

**Q: Can I access `import.meta.env` directly anywhere?**

A: Only in `src/utils/env-config.ts` itself (the source layer). All application code should use `getEnvironmentConfig()`.

**Q: What if I need a new environment variable?**

A: Add it to `src/utils/env-config.ts` following the existing patterns, then use it via the abstraction.

---

**Last Updated:** October 2025
**Migration Status:** Phase 1 complete (7/15 files), Phase 2 in progress
**Related Issue:** #317
**OpenSpec Proposal:** [complete-env-abstraction-migration](../../openspec/changes/complete-env-abstraction-migration/)
