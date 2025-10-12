# CLAUDE-ANTI-PATTERNS.md

**Common Violations and How to Fix Them**

This file documents anti-patterns—common mistakes and violations that must be avoided in this project. Each anti-pattern includes a side-by-side comparison showing the incorrect approach and the correct solution.

---

## Table of Contents

1. [Import Anti-Patterns](#import-anti-patterns)
2. [Component Anti-Patterns](#component-anti-patterns)
3. [Props Typing Anti-Patterns](#props-typing-anti-patterns)
4. [API Endpoint Anti-Patterns](#api-endpoint-anti-patterns)
5. [Database Anti-Patterns](#database-anti-patterns)
6. [Error Handling Anti-Patterns](#error-handling-anti-patterns)
7. [Security Anti-Patterns](#security-anti-patterns)
8. [File Organization Anti-Patterns](#file-organization-anti-patterns)

---

## Import Anti-Patterns

### ❌ Anti-Pattern 1: Relative Imports

**Problem:** Using relative paths instead of path aliases makes refactoring difficult and imports brittle.

```typescript
// ❌ INCORRECT
import Header from '../components/astro/Header.astro'
import { SITE_TITLE } from '../../utils/site-config'
import { getDatabase } from './database'
import type { Message } from '../types/message'
```

**Solution:** Always use `#` path aliases.

```typescript
// ✅ CORRECT
import Header from '#components/astro/Header.astro'
import { SITE_TITLE } from '#utils/site-config'
import { getDatabase } from '#libs/database'
import type { Message } from '#types/message'
```

**Why This Matters:**

- Refactoring becomes easier (no path updates needed)
- Consistent import style across codebase
- Clear distinction between internal and external imports
- Better IDE autocomplete support

---

### ❌ Anti-Pattern 2: Runtime Import for Types

**Problem:** Importing types without `import type` increases bundle size.

```typescript
// ❌ INCORRECT
import { APIRoute } from 'astro'
import { Props } from './types'

const handler: APIRoute = async () => {
  /* ... */
}
```

**Solution:** Use `import type` for type-only imports.

```typescript
// ✅ CORRECT
import type { APIRoute } from 'astro'
import type { Props } from './types'

const handler: APIRoute = async () => {
  /* ... */
}
```

**Why This Matters:**

- Smaller bundle size (types are stripped at compile time)
- Makes dependencies clear (runtime vs compile-time)
- Enables better tree-shaking
- Required for TypeScript isolatedModules mode

---

### ❌ Anti-Pattern 3: Mixed Import Styles

**Problem:** Inconsistent import ordering makes code harder to scan.

```typescript
// ❌ INCORRECT
import { SITE_TITLE } from '#utils/site-config'
import React from 'react'
import type { Props } from './types'
import Header from '#components/astro/Header.astro'
import { clerkClient } from '@clerk/astro/server'
```

**Solution:** Group imports in consistent order.

```typescript
// ✅ CORRECT
import React from 'react'
import { clerkClient } from '@clerk/astro/server'

import Header from '#components/astro/Header.astro'

import { SITE_TITLE } from '#utils/site-config'

import type { Props } from './types'
```

**Why This Matters:**

- Easier to scan and find imports
- Reduces merge conflicts
- Consistent across team
- Supported by auto-formatting tools

---

## Component Anti-Patterns

### ❌ Anti-Pattern 4: Component in Wrong Directory

**Problem:** Placing React components in Astro directory or vice versa.

```typescript
// ❌ INCORRECT
// File: src/components/astro/InteractiveForm.tsx
import React, { useState } from 'react'

export const InteractiveForm = () => {
  const [value, setValue] = useState('')
  // Client-side state in wrong directory
}
```

**Solution:** Place components in correct directory based on rendering strategy.

```typescript
// ✅ CORRECT
// File: src/components/react/InteractiveForm.tsx
import React, { useState } from 'react'

export const InteractiveForm = () => {
  const [value, setValue] = useState('')
  // Client-side component in correct directory
}
```

**Why This Matters:**

- Clear separation of SSR vs client-side code
- Prevents confusion about component capabilities
- Easier to locate components
- Follows framework conventions

---

### ❌ Anti-Pattern 5: Missing Props Type Export

**Problem:** Not exporting Props type makes component contract unclear.

```astro
---
// ❌ INCORRECT
type Props = {
  title: string
}

const { title } = Astro.props
---
```

**Solution:** Always export Props type.

```astro
---
// ✅ CORRECT
export type Props = {
  title: string
}

const { title } = Astro.props
---
```

**Why This Matters:**

- Makes component API discoverable
- Enables type checking for consumers
- Required for type inference
- Documentation through types

---

### ❌ Anti-Pattern 6: No Component Documentation

**Problem:** Missing JSDoc comments make components hard to understand.

```astro
---
// ❌ INCORRECT
export type Props = {
  title: string
  description: string | undefined
}
---
```

**Solution:** Add comprehensive JSDoc documentation.

````astro
---
// ✅ CORRECT
/**
 * Header component displaying page title and description.
 *
 * @component Header
 * @example
 * ```astro
 * <Header title="Welcome" description="Get started" />
 * ```
 */
export type Props = {
  /** Page title displayed as h1 */
  title: string
  /** Optional page description */
  description: string | undefined
}
---
````

**Why This Matters:**

- Self-documenting code
- Better IDE tooltips
- Helps future maintainers
- Examples show usage

---

## Props Typing Anti-Patterns

### ❌ Anti-Pattern 7: Optional Syntax for Nullable Props

**Problem:** Using `?` makes it unclear if prop can be undefined or just optional.

```typescript
// ❌ INCORRECT
export type Props = {
  title: string
  description?: string // Ambiguous: missing or undefined?
  count?: number // Should this have a default?
}
```

**Solution:** Use explicit `| undefined` for nullable props, reserve `?` for optional with defaults.

```typescript
// ✅ CORRECT
export type Props = {
  title: string
  description: string | undefined // Must be passed, can be undefined
  count?: number // Optional, has default value
}

const { title, description, count = 0 } = Astro.props
```

**Why This Matters:**

- Explicit contract about prop requirements
- Aligns with TypeScript strict mode
- Prevents accidental omissions
- Clear default value intent

---

### ❌ Anti-Pattern 8: Inconsistent Props Naming

**Problem:** Using different names for props type across components.

```typescript
// ❌ INCORRECT
export type HeaderProps = {
  /* ... */
}
export interface ICardProps {
  /* ... */
}
export type AlertProperties = {
  /* ... */
}
```

**Solution:** Always use `Props` as the type name.

```typescript
// ✅ CORRECT
export type Props = {
  /* ... */
} // Header component
export type Props = {
  /* ... */
} // Card component
export type Props = {
  /* ... */
} // Alert component
```

**Why This Matters:**

- Consistency across codebase
- Easier to search and find
- Predictable pattern
- Reduced cognitive load

---

## API Endpoint Anti-Patterns

### ❌ Anti-Pattern 9: Missing Authentication Check

**Problem:** Protected endpoints that don't verify authentication.

```typescript
// ❌ INCORRECT
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()

  // Directly processing without auth check
  const db = getDatabase()
  const result = await db.insertMessage(body)

  return new Response(JSON.stringify(result), { status: 201 })
}
```

**Solution:** Always check authentication first.

```typescript
// ✅ CORRECT
export const POST: APIRoute = async ({ locals, request }) => {
  // REQUIRED: Authentication check first
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json()
  const db = getDatabase()
  const result = await db.insertMessage(body)

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

**Why This Matters:**

- Security vulnerability if missing
- Prevents unauthorized access
- Consistent security posture
- Follows principle of least privilege

---

### ❌ Anti-Pattern 10: No Input Validation

**Problem:** Processing user input without validation.

```typescript
// ❌ INCORRECT
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()

  // No validation - accepts any data
  const db = getDatabase()
  const result = await db.insertMessage(body)

  return new Response(JSON.stringify(result), { status: 201 })
}
```

**Solution:** Validate all required fields before processing.

```typescript
// ✅ CORRECT
export const POST: APIRoute = async ({ request }) => {
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
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Proceed with validated data
  const db = getDatabase()
  const result = await db.insertMessage(body)

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

**Why This Matters:**

- Prevents invalid data in database
- Better error messages for clients
- Data integrity
- Security best practice

---

### ❌ Anti-Pattern 11: Inconsistent Error Responses

**Problem:** Different error formats across endpoints.

```typescript
// ❌ INCORRECT - Inconsistent formats
// Endpoint 1
return new Response('Not found', { status: 404 })

// Endpoint 2
return new Response(JSON.stringify({ message: 'Resource not found' }), { status: 404 })

// Endpoint 3
return new Response(JSON.stringify({ err: 'Not found', code: 404 }), { status: 404 })
```

**Solution:** Use consistent error response format.

```typescript
// ✅ CORRECT - Consistent format
// All endpoints use same structure
return new Response(
  JSON.stringify({
    error: 'Not Found',
    details: 'Resource with ID 123 does not exist',
  }),
  {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }
)
```

**Why This Matters:**

- Client code can handle errors uniformly
- Predictable API behavior
- Easier debugging
- Professional API design

---

### ❌ Anti-Pattern 12: No Error Handling

**Problem:** Async operations without try-catch blocks.

```typescript
// ❌ INCORRECT
export const GET: APIRoute = async ({ params }) => {
  // No error handling - will crash on any error
  const db = getDatabase()
  const result = await db.getMessageById(params.id)

  return new Response(JSON.stringify(result), { status: 200 })
}
```

**Solution:** Wrap operations in try-catch with proper error responses.

```typescript
// ✅ CORRECT
export const GET: APIRoute = async ({ params }) => {
  try {
    const db = getDatabase()
    const result = await db.getMessageById(params.id)

    if (!result) {
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('API Error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

**Why This Matters:**

- Graceful error handling
- Better client experience
- Error logging for debugging
- Prevents server crashes

---

## Database Anti-Patterns

### ❌ Anti-Pattern 13: Direct Database Provider Access

**Problem:** Directly accessing Supabase or Turso clients bypasses abstraction layer.

```typescript
// ❌ INCORRECT
import { createClient } from '@supabase/supabase-js'

export const GET: APIRoute = async () => {
  // Direct Supabase access - bad!
  const supabase = createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY)

  const { data } = await supabase.from('messages').select('*')

  return new Response(JSON.stringify(data), { status: 200 })
}
```

**Solution:** Always use the unified database abstraction layer.

```typescript
// ✅ CORRECT
import { getDatabase } from '#libs/database'
import type { MessageQueryOptions } from '#libs/database-types'

export const GET: APIRoute = async () => {
  // Use abstraction layer
  const db = getDatabase()
  const options: MessageQueryOptions = { limit: 10 }
  const messages = await db.getMessages(options)

  return new Response(JSON.stringify({ data: messages }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

**Why This Matters:**

- Enables database provider switching without code changes
- Consistent interface across project
- Easier testing (mock single interface)
- Centralized connection management
- Type safety across providers

---

### ❌ Anti-Pattern 14: Hardcoded Provider Logic

**Problem:** Using if/else logic to check which database provider is active.

```typescript
// ❌ INCORRECT
export const GET: APIRoute = async () => {
  if (import.meta.env.DATABASE_PROVIDER === 'supabase') {
    // Supabase logic
    const supabase = createClient(/* ... */)
    const { data } = await supabase.from('messages').select('*')
    return new Response(JSON.stringify(data), { status: 200 })
  } else if (import.meta.env.DATABASE_PROVIDER === 'turso') {
    // Turso logic
    const turso = createClient(/* ... */)
    const result = await turso.execute('SELECT * FROM messages')
    return new Response(JSON.stringify(result.rows), { status: 200 })
  }
}
```

**Solution:** Use the abstraction layer which handles provider detection automatically.

```typescript
// ✅ CORRECT
import { getDatabase } from '#libs/database'

export const GET: APIRoute = async () => {
  // Works with any provider - no conditional logic needed
  const db = getDatabase()
  const messages = await db.getMessages({ limit: 10 })

  return new Response(JSON.stringify({ data: messages }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

**Why This Matters:**

- Adding new providers doesn't require endpoint changes
- Eliminates branching logic
- Single source of truth for provider selection
- Cleaner, more maintainable code

---

## Error Handling Anti-Patterns

### ❌ Anti-Pattern 15: Silent Failures

**Problem:** Catching errors without logging or user feedback.

```typescript
// ❌ INCORRECT
try {
  const result = await someOperation()
  return new Response(JSON.stringify(result), { status: 200 })
} catch (error) {
  // Silent failure - user gets nothing
  return new Response(null, { status: 200 })
}
```

**Solution:** Always log errors and provide feedback.

```typescript
// ✅ CORRECT
try {
  const result = await someOperation()
  return new Response(JSON.stringify({ data: result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
} catch (error) {
  // Log for debugging
  console.error('Operation failed:', error)

  // Inform user
  return new Response(
    JSON.stringify({
      error: 'Operation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

**Why This Matters:**

- Debugging becomes possible
- Users get meaningful feedback
- Error tracking and monitoring
- Professional error handling

---

### ❌ Anti-Pattern 16: Generic Error Messages

**Problem:** Vague error messages that don't help users or developers.

```typescript
// ❌ INCORRECT
if (!valid) {
  return new Response(JSON.stringify({ error: 'Bad input' }), { status: 400 })
}

if (!found) {
  return new Response(JSON.stringify({ error: 'Error' }), { status: 500 })
}
```

**Solution:** Provide specific, actionable error messages.

```typescript
// ✅ CORRECT
if (!valid) {
  return new Response(
    JSON.stringify({
      error: 'Invalid email address',
      details: 'Email must be in format: user@domain.com',
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
}

if (!found) {
  return new Response(
    JSON.stringify({
      error: 'Resource not found',
      details: `Message with ID ${id} does not exist`,
    }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  )
}
```

**Why This Matters:**

- Users know what went wrong
- Developers can debug faster
- Better user experience
- Reduces support burden

---

## Security Anti-Patterns

### ❌ Anti-Pattern 17: No Input Sanitization

**Problem:** Accepting user input without sanitization.

```typescript
// ❌ INCORRECT
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()

  // Directly using unsanitized input
  const db = getDatabase()
  await db.insertMessage({
    name: body.name, // Could contain malicious scripts
    message: body.message, // Could contain XSS attacks
  })
}
```

**Solution:** Sanitize all user input before processing.

```typescript
// ✅ CORRECT
import { sanitizeInput } from '#utils/input-sanitization'
import { isValidEmail } from '#utils/email-validation'

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()

  // Validate email format
  if (!isValidEmail(body.email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Sanitize inputs
  const db = getDatabase()
  await db.insertMessage({
    name: sanitizeInput(body.name),
    email: body.email, // Already validated
    message: sanitizeInput(body.message),
  })
}
```

**Why This Matters:**

- Prevents XSS attacks
- Prevents SQL injection
- Data integrity
- Security best practice

---

### ❌ Anti-Pattern 18: Missing CSRF Protection

**Problem:** Forms without CSRF token validation.

```typescript
// ❌ INCORRECT
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData()

  // No CSRF validation - vulnerable to CSRF attacks
  const name = formData.get('name')
  // Process form...
}
```

**Solution:** Include and validate CSRF tokens.

```typescript
// ✅ CORRECT
import { CSRF_CONFIG } from '#utils/csrf'
import { validateCsrfToken } from '#utils/csrf'

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData()

  // Validate CSRF token
  const token = formData.get(CSRF_CONFIG.FIELD_NAME)
  if (!validateCsrfToken(token)) {
    return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Proceed with validated request
  const name = formData.get('name')
  // Process form...
}
```

**Why This Matters:**

- Prevents CSRF attacks
- Protects state-changing operations
- Industry standard security practice

---

## File Organization Anti-Patterns

### ❌ Anti-Pattern 19: Files in Wrong Locations

**Problem:** Placing files in incorrect directories.

```
// ❌ INCORRECT
src/
├── components/
│   └── database.ts        # Database logic in components
├── utils/
│   └── Header.astro       # Component in utils
└── pages/
    └── getUserById.ts     # Utility in pages
```

**Solution:** Follow the established file organization matrix.

```
// ✅ CORRECT
src/
├── components/
│   └── astro/
│       └── Header.astro   # Component in correct location
├── utils/
│   └── validation.ts      # Utilities in utils
├── libs/
│   └── database.ts        # Database logic in libs
└── pages/
    └── api/
        └── users.ts       # API endpoint in pages/api
```

**Why This Matters:**

- Predictable file locations
- Easier to find code
- Consistent project structure
- Follows framework conventions

---

### ❌ Anti-Pattern 20: Inconsistent File Naming

**Problem:** Mixed naming conventions across files.

```
// ❌ INCORRECT
src/components/
├── UserProfile.tsx      # PascalCase
├── contact-form.tsx     # kebab-case
├── header_component.tsx # snake_case
└── FOOTER.TSX          # UPPERCASE
```

**Solution:** Use consistent naming conventions.

```
// ✅ CORRECT
src/components/react/
├── UserProfile.tsx      # PascalCase for React components
├── ContactForm.tsx      # PascalCase for React components
└── Alert.tsx           # PascalCase for React components

src/components/astro/
├── Header.astro        # PascalCase for Astro components
└── Footer.astro        # PascalCase for Astro components

src/utils/
├── validation.ts       # kebab-case for utilities
└── email-validator.ts  # kebab-case for utilities
```

**Why This Matters:**

- Consistent codebase appearance
- Easier file searching
- Follows community conventions
- Reduces confusion

---

## Quick Reference: Common Fixes

| Problem                   | Fix                             |
| ------------------------- | ------------------------------- | ------------------------ |
| Relative imports          | Use `#` path aliases            |
| Runtime type imports      | Use `import type`               |
| Missing auth check        | Add `if (!locals.userId)` first |
| No input validation       | Validate required fields        |
| Direct DB access          | Use `getDatabase()` abstraction |
| Inconsistent errors       | Use standard error format       |
| No error handling         | Wrap in try-catch               |
| Missing JSDoc             | Add comprehensive comments      |
| Wrong component directory | Move to correct location        |
| Optional props syntax     | Use `T                          | undefined`instead of`T?` |

---

## Prevention Checklist

Before committing code, verify you haven't introduced these anti-patterns:

- [ ] No relative imports (all use `#` aliases)
- [ ] Type-only imports use `import type`
- [ ] Protected endpoints check authentication
- [ ] User input is validated and sanitized
- [ ] Database accessed via abstraction layer only
- [ ] Error responses follow consistent format
- [ ] Try-catch blocks wrap async operations
- [ ] Components in correct directories
- [ ] Files follow naming conventions
- [ ] JSDoc comments on exported functions

---

**Remember:** These anti-patterns represent real mistakes found in codebases. Learning to recognize and avoid them will make you a more effective developer and keep this codebase clean and maintainable.
