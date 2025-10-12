# CLAUDE-PATTERNS.md

**Mandatory Application Patterns for astro-basics Project**

This file contains enforceable architectural patterns that MUST be followed when working on this project. These patterns ensure consistency, maintainability, and adherence to established conventions.

---

## Table of Contents

1. [Import Patterns](#import-patterns)
2. [Component Patterns](#component-patterns)
3. [Props Typing Patterns](#props-typing-patterns)
4. [API Endpoint Patterns](#api-endpoint-patterns)
5. [Database Access Patterns](#database-access-patterns)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Security Patterns](#security-patterns)
8. [Testing Patterns](#testing-patterns)
9. [File Organization Matrix](#file-organization-matrix)
10. [Code Comment Patterns](#code-comment-patterns)

---

## Import Patterns

### MANDATORY: Use Path Aliases for All Internal Imports

**Rule:** ALWAYS use the `#` prefix for internal imports. NEVER use relative paths.

```typescript
// ✅ CORRECT
import Header from '#components/astro/Header.astro'
import { SITE_TITLE } from '#utils/site-config'
import { getDatabase } from '#libs/database'
import type { Message } from '#libs/database-types'

// ❌ INCORRECT - NEVER DO THIS
import Header from '../components/astro/Header.astro'
import { SITE_TITLE } from '../../utils/site-config'
import { getDatabase } from './libs/database'
```

### Type-Only Imports

**Rule:** Use `import type` for type-only imports to enable proper tree-shaking.

```typescript
// ✅ CORRECT
import type { APIRoute } from 'astro'
import type { Props } from './types'
import type { Database } from '#libs/database-types'

// ❌ INCORRECT
import { APIRoute } from 'astro' // Runtime import for type-only usage
import { Props } from './types' // Missing 'type' keyword
```

### Import Order Convention

**Rule:** Group imports in the following order:

1. External packages (React, Astro, etc.)
2. Internal components (with `#components/`)
3. Internal utilities (with `#utils/`, `#libs/`, `#constants/`)
4. Type imports (with `import type`)
5. Local relative imports (styles, assets - only when necessary)

```typescript
// ✅ CORRECT ORDER
import React, { useState } from 'react'
import { clerkClient } from '@clerk/astro/server'

import Header from '#components/astro/Header.astro'
import Alert from '#components/react/Alert'

import { SITE_TITLE } from '#utils/site-config'
import { getDatabase } from '#libs/database'
import { FORM_ERROR_MESSAGES } from '#constants/formErrors'

import type { APIRoute } from 'astro'
import type { Message } from '#libs/database-types'

import './styles.css'
```

---

## Component Patterns

### Component Directory Structure

**Rule:** Components MUST be placed in the correct directory based on their rendering strategy and purpose.

```
src/components/
├── astro/          # Server-rendered Astro components (.astro)
├── react/          # Client-side React components (.tsx)
└── dashboard/      # Protected dashboard components (.astro or .tsx)
```

### Astro Component Structure

**MANDATORY Template:**

```astro
---
/**
 * Component description explaining purpose and usage.
 * @component ComponentName
 */

// REQUIRED: Type definition at the top
export type Props = {
  title: string
  description: string | undefined // Explicit over optional
  count?: number // Only use ? for truly optional with default
}

// REQUIRED: Path alias imports
import Component from '#components/astro/Component.astro'
import { SITE_CONFIG } from '#utils/site-config'

// REQUIRED: Type imports
import type { User } from '#types/user'

// Props destructuring
const { title, description, count = 0 } = Astro.props

// Server-side logic here
const data = await fetchData()
---

<!-- Component markup -->
<section>
  <h1>{title}</h1>
  {description && <p>{description}</p>}
  <slot />
</section>

<style>
  /* Component-specific styles */
</style>
```

### React Component Structure

**MANDATORY Template:**

```tsx
/**
 * Component description explaining purpose and usage.
 * @component ComponentName
 */
import React, { useState } from 'react'

// REQUIRED: Path alias imports
import Alert from '#components/react/Alert'
import { CONSTANTS } from '#utils/config'

// REQUIRED: Type imports
import type { User } from '#types/user'

/**
 * Component props interface
 */
export type Props = {
  /** Prop description */
  title: string
  /** Optional description */
  description: string | undefined
  /** Callback handler */
  onSubmit?: (data: FormData) => void
}

/**
 * ComponentName - Brief description
 */
export const ComponentName: React.FC<Props> = ({ title, description, onSubmit }) => {
  const [state, setState] = useState<string>('')

  return (
    <section>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </section>
  )
}

export default ComponentName
```

### Dashboard Component Pattern

**Rule:** Dashboard components MUST handle authentication state and protected access.

```astro
---
import { clerkClient } from '@clerk/astro/server'
import DashboardLayout from '#components/dashboard/DashboardLayout.astro'

// REQUIRED: Authentication check
const { userId } = Astro.locals.auth()
if (!userId) {
  return Astro.redirect('/sign-in')
}

// Fetch user-specific data
const user = await clerkClient.users.getUser(userId)
---

<DashboardLayout>
  <!-- Protected content -->
</DashboardLayout>
```

---

## Props Typing Patterns

### MANDATORY: Explicit Over Optional

**Rule:** Use `string | undefined` instead of `string?` for nullable props. Reserve `?` only for truly optional props with default values.

```typescript
// ✅ CORRECT
export type Props = {
  title: string // Required
  description: string | undefined // Can be undefined, must be passed
  count?: number // Optional with default value
  items?: string[] // Optional with default value
}

const { title, description, count = 0, items = [] } = Astro.props

// ❌ INCORRECT
export type Props = {
  title: string
  description?: string // Ambiguous: undefined or not passed?
  count: number | undefined // Should be optional with default
}
```

### Why This Pattern?

This pattern enforces clarity in the component API:

- `string | undefined` = "You must pass this prop, but it can be undefined"
- `string?` = "This prop is optional, has a default value"
- Prevents accidental omission of required props
- Makes component contracts explicit
- Aligns with TypeScript strict mode (`exactOptionalPropertyTypes`)

### Component Props Naming

**Rule:** Export props type as `Props` for consistency across all components.

```typescript
// ✅ CORRECT
export type Props = {
  /* ... */
}

// ❌ INCORRECT
export type ComponentNameProps = {
  /* ... */
}
export interface IProps {
  /* ... */
}
```

---

## API Endpoint Patterns

### MANDATORY: API Endpoint Structure

**Rule:** ALL API endpoints MUST follow this structure in order:

1. Authentication check
2. Input validation
3. Database access via abstraction layer
4. Business logic
5. Consistent error handling
6. Consistent success response

**MANDATORY Template:**

```typescript
import type { APIRoute } from 'astro'
import { getDatabase } from '#libs/database'
import { validateInput } from '#utils/validation'

/**
 * API endpoint description
 * @route GET /api/resource
 */
export const GET: APIRoute = async ({ locals, request, params }) => {
  // ────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION CHECK (REQUIRED for protected endpoints)
  // ────────────────────────────────────────────────────────────
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // ────────────────────────────────────────────────────────────
    // 2. INPUT VALIDATION (REQUIRED)
    // ────────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Missing required parameter: id',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // ────────────────────────────────────────────────────────────
    // 3. DATABASE ACCESS (REQUIRED: Use abstraction layer)
    // ────────────────────────────────────────────────────────────
    const db = getDatabase()
    const resource = await db.getResourceById(Number(id))

    if (!resource) {
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ────────────────────────────────────────────────────────────
    // 4. BUSINESS LOGIC
    // ────────────────────────────────────────────────────────────
    // Process data as needed

    // ────────────────────────────────────────────────────────────
    // 5. SUCCESS RESPONSE (REQUIRED: Consistent format)
    // ────────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        data: resource,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    // ────────────────────────────────────────────────────────────
    // 6. ERROR HANDLING (REQUIRED: Consistent format)
    // ────────────────────────────────────────────────────────────
    console.error('API Error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
```

### POST Request Pattern

```typescript
export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Authentication check
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 2. Parse and validate body
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'email', 'message']
    const missingFields = requiredFields.filter(field => !body[field])

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          fields: missingFields,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. Database operation via abstraction layer
    const db = getDatabase()
    const result = await db.insertResource(body)

    // 4. Success response
    return new Response(
      JSON.stringify({
        data: result,
        success: true,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('POST Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
```

### HTTP Status Code Standards

**Rule:** Use consistent HTTP status codes:

- `200` - OK (successful GET, PATCH, PUT)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)
- `400` - Bad Request (validation error, missing params)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (authenticated but not authorized)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate, constraint violation)
- `500` - Internal Server Error (unexpected error)

---

## Database Access Patterns

### MANDATORY: Use Database Abstraction Layer

**Rule:** NEVER access database providers directly. ALWAYS use the unified database interface.

```typescript
// ✅ CORRECT - Use abstraction layer
import { getDatabase, getDatabaseStatus } from '#libs/database'
import type { Message, MessageData } from '#libs/database-types'

const db = getDatabase()
const messages = await db.getMessages({ limit: 10 })

// Check database status
const status = getDatabaseStatus()
console.log(`Using: ${status.provider_name}`)

// ❌ INCORRECT - Direct provider access
import { createClient } from '@supabase/supabase-js'
import { createClient as createTursoClient } from '@libsql/client'

const supabase = createClient(url, key) // NEVER do this
const turso = createTursoClient({ url }) // NEVER do this
```

### Database Operation Patterns

**Message Operations:**

```typescript
import { getDatabase } from '#libs/database'
import type { MessageData, MessageQueryOptions } from '#libs/database-types'

const db = getDatabase()

// Create message
const messageData: MessageData = {
  name: 'John Doe',
  email: 'john@example.com',
  subject: 'Inquiry',
  message: 'Hello!',
  phone: '+1234567890',
}
const messageId = await db.insertMessage(messageData)

// Query messages
const options: MessageQueryOptions = {
  limit: 10,
  offset: 0,
  isRead: false,
  isArchived: false,
}
const messages = await db.getMessages(options)

// Get single message
const message = await db.getMessageById(messageId)

// Update message status
await db.markMessageAsRead(messageId)

// Archive message (soft delete)
await db.archiveMessage(messageId)
```

### Error Handling for Database Operations

```typescript
try {
  const db = getDatabase()
  const result = await db.someOperation()

  if (!result) {
    // Handle not found case
    return new Response(JSON.stringify({ error: 'Resource not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Success case
  return new Response(JSON.stringify({ data: result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
} catch (error) {
  console.error('Database operation failed:', error)

  return new Response(
    JSON.stringify({
      error: 'Database operation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

---

## Error Handling Patterns

### Consistent Error Response Format

**Rule:** ALL error responses must follow this format:

```typescript
{
  error: string        // Human-readable error message
  details?: string     // Technical details (from Error.message)
  code?: string        // Error code for client handling
  fields?: string[]    // Missing/invalid fields (validation errors)
}
```

### API Error Response Helper

```typescript
/**
 * Create standardized error response
 */
function errorResponse(message: string, status: number, details?: string): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details && { details }),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

// Usage
return errorResponse('Resource not found', 404)
return errorResponse('Unauthorized', 401, 'Invalid token')
```

### Try-Catch Pattern

**Rule:** Wrap all async operations in try-catch blocks with proper error logging.

```typescript
try {
  // Operation
  const result = await someAsyncOperation()

  // Success response
  return new Response(JSON.stringify({ data: result, success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
} catch (error) {
  // REQUIRED: Log error for debugging
  console.error('Operation failed:', error)

  // REQUIRED: Return consistent error format
  return new Response(
    JSON.stringify({
      error: 'Operation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

---

## Security Patterns

### Authentication Check Pattern

**Rule:** ALL protected routes MUST check authentication before processing.

```typescript
// API Endpoint
export const POST: APIRoute = async ({ locals }) => {
  // REQUIRED: First line of protected endpoint
  if (!locals.userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Proceed with authenticated logic
}

// Astro Page
---
import { clerkClient } from '@clerk/astro/server'

// REQUIRED: Check auth before rendering protected page
const { userId } = Astro.locals.auth()
if (!userId) {
  return Astro.redirect('/sign-in')
}

const user = await clerkClient.users.getUser(userId)
---
```

### Input Validation Pattern

**Rule:** ALWAYS validate and sanitize user input.

```typescript
import { isValidEmail } from '#utils/email-validation'
import { sanitizeInput } from '#utils/input-sanitization'

// Validate email
if (!isValidEmail(email)) {
  return new Response(JSON.stringify({ error: 'Invalid email address' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Sanitize string input
const sanitized = sanitizeInput(userInput)
```

### CSRF Protection Pattern

**Rule:** Forms MUST include CSRF tokens.

```typescript
import { CSRF_CONFIG } from '#utils/csrf'

// Server-side: Generate token
const csrfToken = generateCsrfToken()

// Client-side: Include in form
<form>
  <input
    type="hidden"
    name={CSRF_CONFIG.FIELD_NAME}
    value={csrfToken}
  />
  {/* other fields */}
</form>

// Server-side: Validate token
const formData = await request.formData()
const token = formData.get(CSRF_CONFIG.FIELD_NAME)
if (!validateCsrfToken(token)) {
  return new Response(
    JSON.stringify({ error: 'Invalid CSRF token' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Rate Limiting Pattern

**Rule:** Public endpoints SHOULD implement rate limiting.

```typescript
import { checkRateLimit } from '#utils/rate-limiter'

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Check rate limit
  const rateLimit = await checkRateLimit(clientAddress)

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: rateLimit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter),
        },
      }
    )
  }

  // Proceed with request
}
```

---

## Testing Patterns

### Unit Test Structure

**Rule:** Unit tests use Vitest and follow this structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { functionToTest } from '#utils/module'

describe('functionToTest', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  it('should handle valid input correctly', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = functionToTest(input)

    // Assert
    expect(result).toBe('expected')
  })

  it('should throw error for invalid input', () => {
    expect(() => functionToTest(null)).toThrow()
  })
})
```

### E2E Test Structure

**Rule:** E2E tests use Playwright and follow this structure:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display expected content', async ({ page }) => {
    // Test logic
    await expect(page.locator('h1')).toContainText('Expected')
  })

  test('should handle user interaction', async ({ page }) => {
    await page.click('button')
    await expect(page.locator('.result')).toBeVisible()
  })
})
```

### Test File Location

**Rule:** Place tests in correct directories:

- **Unit tests**: `/tests/` directory
- **E2E tests**: `/e2e/` directory

```
tests/
├── utils/
│   └── validation.test.ts
└── libs/
    └── database.test.ts

e2e/
├── auth.spec.ts
└── api/
    └── messages.spec.ts
```

---

## File Organization Matrix

**Rule:** Follow this matrix for file placement:

| Feature Type        | Location                    | File Extension     | Import Pattern                                    |
| ------------------- | --------------------------- | ------------------ | ------------------------------------------------- |
| Server Component    | `src/components/astro/`     | `.astro`           | `import Comp from '#components/astro/Comp.astro'` |
| Client Component    | `src/components/react/`     | `.tsx`             | `import Comp from '#components/react/Comp'`       |
| Protected Component | `src/components/dashboard/` | `.astro` or `.tsx` | `import Comp from '#components/dashboard/Comp'`   |
| API Endpoint        | `src/pages/api/`            | `.ts`              | `export const GET: APIRoute`                      |
| Public Page         | `src/pages/`                | `.astro`           | N/A (route-based)                                 |
| Layout              | `src/layouts/`              | `.astro`           | `import Layout from '#layouts/Layout.astro'`      |
| Utility Function    | `src/utils/`                | `.ts`              | `import { fn } from '#utils/module'`              |
| Database Client     | `src/libs/`                 | `.ts`              | `import { getDatabase } from '#libs/database'`    |
| Type Definition     | `src/types/`                | `.ts`              | `import type { Type } from '#types/module'`       |
| Constant            | `src/constants/`            | `.ts`              | `import { CONST } from '#constants/module'`       |
| Content Collection  | `src/content/`              | `.md` or `.mdx`    | `getCollection('posts')`                          |
| Style               | `src/styles/`               | `.scss`            | `@use '#styles/variables'`                        |
| Test (Unit)         | `tests/`                    | `.test.ts`         | N/A (test files)                                  |
| Test (E2E)          | `e2e/`                      | `.spec.ts`         | N/A (test files)                                  |
| Database Migration  | `scripts/migrations/`       | `.sql`             | N/A (SQL files)                                   |
| Build Script        | `scripts/`                  | `.ts` or `.js`     | N/A (scripts)                                     |

---

## Code Comment Patterns

### JSDoc Comments (MANDATORY)

**Rule:** ALL exported functions, types, and classes MUST have JSDoc comments.

````typescript
/**
 * Fetches user data from the database by user ID.
 *
 * @param userId - The unique identifier for the user
 * @returns Promise resolving to User object or null if not found
 * @throws {DatabaseError} If database connection fails
 * @example
 * ```typescript
 * const user = await getUserById('user_123')
 * if (user) {
 *   console.log(user.name)
 * }
 * ```
 */
export async function getUserById(userId: string): Promise<User | null> {
  // Implementation
}
````

### Component Documentation

**Rule:** Components MUST have description comment at the top.

````astro
---
/**
 * Header component displaying site branding and navigation.
 *
 * @component Header
 * @example
 * ```astro
 * <Header
 *   title="Site Name"
 *   description="Site tagline"
 * />
 * ```
 */
export type Props = {
  title: string
  description: string | undefined
}
---
````

### Inline Comments

**Rule:** Use inline comments to explain "why", not "what".

```typescript
// ✅ CORRECT - Explains reasoning
// Using exponential backoff to handle rate limiting from API
await retryWithBackoff(apiCall)

// Cache result for 5 minutes to reduce database load during peak hours
const cached = await cache.get(key, { ttl: 300 })

// ❌ INCORRECT - States the obvious
// Loop through items
for (const item of items) {
  // Call function
  processItem(item)
}
```

### TODO Comments

**Rule:** TODO comments MUST include assignee and date.

```typescript
// TODO(@username, 2025-01-15): Refactor this to use new API pattern
// TODO(@username, 2025-01-15): Add error handling for edge case X
```

---

## Pattern Enforcement Checklist

Before completing ANY task, verify compliance with these patterns:

- [ ] All imports use `#` path aliases (no relative imports)
- [ ] Type imports use `import type` syntax
- [ ] Component Props exported as `Props` type
- [ ] Props use explicit `T | undefined` instead of `T?`
- [ ] API endpoints include authentication check (if protected)
- [ ] API endpoints validate input
- [ ] Database operations use abstraction layer (never direct)
- [ ] Error responses follow consistent format
- [ ] Try-catch blocks wrap async operations
- [ ] JSDoc comments added to exported functions
- [ ] Components placed in correct directory
- [ ] Files follow naming conventions
- [ ] Tests created/updated if applicable

---

## Questions or Exceptions?

If you encounter a scenario not covered by these patterns:

1. **Check CLAUDE-ANTI-PATTERNS.md** for common violations
2. **Check CLAUDE-VALIDATION.md** for decision trees
3. **Review existing code** for similar patterns
4. **Ask the user** before deviating from established patterns

**Remember:** These patterns exist for consistency and maintainability. Following them ensures the codebase remains clean, predictable, and easy to work with for all contributors.
