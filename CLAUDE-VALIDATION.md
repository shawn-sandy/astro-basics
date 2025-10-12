# CLAUDE-VALIDATION.md

**Pre-Flight Checks, Decision Trees, and Validation Checklists**

This file provides structured decision-making tools and validation checklists to ensure adherence to project patterns before, during, and after implementation.

---

## Table of Contents

1. [Pre-Flight Checks](#pre-flight-checks)
2. [Decision Trees](#decision-trees)
3. [Task Completion Checklist](#task-completion-checklist)
4. [Architecture Enforcement Rules](#architecture-enforcement-rules)
5. [Common Scenario Validation](#common-scenario-validation)

---

## Pre-Flight Checks

Before starting ANY implementation, complete these checks:

### 1. Understand the Task Scope

- [ ] Read the user's request completely
- [ ] Identify affected components/files
- [ ] Determine if this requires new files or edits
- [ ] Check if patterns exist for this type of work
- [ ] Review CLAUDE-PATTERNS.md for relevant patterns
- [ ] Review CLAUDE-ANTI-PATTERNS.md for common pitfalls

### 2. Identify the Implementation Type

Which category does this task fall into?

- [ ] **Component Creation** → Use [Component Decision Tree](#component-decision-tree)
- [ ] **API Endpoint** → Use [API Endpoint Decision Tree](#api-endpoint-decision-tree)
- [ ] **Database Operation** → Use [Database Access Decision Tree](#database-access-decision-tree)
- [ ] **Utility Function** → Use [Utility Function Decision Tree](#utility-function-decision-tree)
- [ ] **Page/Route** → Use [Page Creation Decision Tree](#page-creation-decision-tree)
- [ ] **Bug Fix** → Use [Bug Fix Validation](#bug-fix-validation)
- [ ] **Refactoring** → Use [Refactoring Validation](#refactoring-validation)

### 3. Verify Required Knowledge

Do you have all necessary information?

- [ ] Authentication requirements clear
- [ ] Data structure requirements clear
- [ ] Error handling expectations clear
- [ ] Testing requirements clear
- [ ] Performance requirements clear

**If NO to any:** Ask the user for clarification before proceeding.

---

## Decision Trees

### Component Decision Tree

```
Creating a new component?
│
├─ Does it need client-side state or interactivity?
│  │
│  ├─ YES → Use React
│  │   │
│  │   ├─ Does it require authentication?
│  │   │  ├─ YES → Place in: src/components/dashboard/*.tsx
│  │   │  └─ NO  → Place in: src/components/react/*.tsx
│  │   │
│  │   └─ Structure:
│  │       ✓ Export type Props
│  │       ✓ Use # path aliases
│  │       ✓ Add JSDoc comments
│  │       ✓ Follow React component pattern
│  │
│  └─ NO → Use Astro
│      │
│      ├─ Does it require authentication?
│      │  ├─ YES → Place in: src/components/dashboard/*.astro
│      │  │         ✓ Add authentication check
│      │  │         ✓ Handle redirect if unauthorized
│      │  │
│      │  └─ NO  → Place in: src/components/astro/*.astro
│      │
│      └─ Structure:
│          ✓ Export type Props
│          ✓ Use # path aliases
│          ✓ Add JSDoc comments
│          ✓ Follow Astro component pattern
```

**Validation:**

- [ ] Component in correct directory
- [ ] Props exported as `Props` type
- [ ] All imports use `#` aliases
- [ ] JSDoc comment at top
- [ ] Authentication handled if required

---

### API Endpoint Decision Tree

```
Creating an API endpoint?
│
├─ Is this a protected endpoint (requires auth)?
│  │
│  ├─ YES → MUST include authentication check
│  │   │
│  │   └─ Structure:
│  │       1. Authentication check (FIRST)
│  │       2. Input validation
│  │       3. Database access (via abstraction)
│  │       4. Business logic
│  │       5. Consistent response format
│  │       6. Error handling (try-catch)
│  │
│  └─ NO → Public endpoint
│      │
│      └─ Structure:
│          1. Input validation
│          2. Rate limiting (consider)
│          3. Database access (via abstraction)
│          4. Business logic
│          5. Consistent response format
│          6. Error handling (try-catch)
│
├─ What HTTP method?
│  ├─ GET    → Read operation, return 200/404
│  ├─ POST   → Create operation, return 201/400
│  ├─ PATCH  → Update operation, return 200/404
│  ├─ PUT    → Replace operation, return 200/404
│  └─ DELETE → Delete operation, return 204/404
│
└─ Location: src/pages/api/*.ts
    ✓ Export const [METHOD]: APIRoute
    ✓ Use getDatabase() for DB operations
    ✓ Validate all inputs
    ✓ Consistent error format
    ✓ Include try-catch
```

**Validation:**

- [ ] File in `src/pages/api/` directory
- [ ] Authentication check if protected
- [ ] Input validation present
- [ ] Uses `getDatabase()` (not direct provider)
- [ ] Consistent error response format
- [ ] Try-catch wraps async operations
- [ ] Correct HTTP status codes
- [ ] Response headers include Content-Type

---

### Database Access Decision Tree

```
Need to access database?
│
├─ STOP! Do NOT access providers directly
│
├─ Use: import { getDatabase } from '#libs/database'
│
├─ What operation?
│  │
│  ├─ INSERT → db.insertMessage(data)
│  │          ✓ Validate data first
│  │          ✓ Sanitize user input
│  │
│  ├─ SELECT → db.getMessages(options)
│  │          ✓ Specify limit/offset
│  │          ✓ Handle empty results
│  │
│  ├─ UPDATE → db.markMessageAsRead(id)
│  │          ✓ Verify ownership
│  │          ✓ Check if exists
│  │
│  └─ DELETE → db.archiveMessage(id)
│             ✓ Soft delete (archive)
│             ✓ Verify ownership
│
└─ Error handling:
    ✓ Wrap in try-catch
    ✓ Log errors
    ✓ Return consistent error format
```

**Validation:**

- [ ] Uses `getDatabase()` abstraction
- [ ] No direct Supabase/Turso client imports
- [ ] Input validated before DB operation
- [ ] Error handling present
- [ ] Appropriate query options used
- [ ] Results properly typed

---

### Utility Function Decision Tree

```
Creating a utility function?
│
├─ What category?
│  │
│  ├─ Validation (email, phone, input)
│  │  └─ Place in: src/utils/*-validation.ts
│  │
│  ├─ Security (CSRF, sanitization, rate limiting)
│  │  └─ Place in: src/utils/security.ts or src/utils/*.ts
│  │
│  ├─ Data transformation (slugify, truncate)
│  │  └─ Place in: src/utils/[feature].ts
│  │
│  └─ Configuration (constants, config)
│      └─ Place in: src/utils/*-config.ts or src/constants/*.ts
│
├─ Structure:
│  ✓ Add comprehensive JSDoc
│  ✓ Export function with descriptive name
│  ✓ Include type annotations
│  ✓ Add examples in JSDoc
│  ✓ Handle edge cases
│  ✓ Return consistent types
│
└─ Testing:
    ✓ Create unit test in tests/utils/
    ✓ Test happy path
    ✓ Test edge cases
    ✓ Test error conditions
```

**Validation:**

- [ ] File in correct directory (`src/utils/` or `src/constants/`)
- [ ] JSDoc comment with examples
- [ ] Type annotations present
- [ ] Edge cases handled
- [ ] Unit tests created
- [ ] Exports use descriptive names

---

### Page Creation Decision Tree

```
Creating a new page?
│
├─ Is this a protected page (requires auth)?
│  │
│  ├─ YES → Protected page
│  │   │
│  │   └─ Structure:
│  │       1. Import clerkClient
│  │       2. Get userId from Astro.locals.auth()
│  │       3. Redirect if !userId
│  │       4. Fetch user data if needed
│  │       5. Render protected content
│  │
│  └─ NO → Public page
│      │
│      └─ Structure:
│          1. Import layout
│          2. Import components
│          3. Fetch data (getCollection, etc.)
│          4. Render content
│
├─ Dynamic route or static?
│  │
│  ├─ Dynamic → Use [param].astro or [...slug].astro
│  │            ✓ Implement getStaticPaths()
│  │            ✓ Handle params properly
│  │            ✓ Return 404 for invalid params
│  │
│  └─ Static → Use descriptive-name.astro
│               ✓ Clear, semantic filename
│               ✓ Follow existing conventions
│
└─ Location: src/pages/
    ✓ Use appropriate layout
    ✓ Import with # aliases
    ✓ Handle loading states
    ✓ Handle error states
```

**Validation:**

- [ ] File in `src/pages/` directory
- [ ] Authentication handled if protected
- [ ] Layout imported and used
- [ ] Components imported with `#` aliases
- [ ] Dynamic routes have getStaticPaths
- [ ] Error states handled
- [ ] 404 handling for invalid params

---

## Task Completion Checklist

Before marking a task as complete, verify ALL items:

### Code Quality

- [ ] All imports use `#` path aliases (no relative imports)
- [ ] Type-only imports use `import type` syntax
- [ ] Props exported as `Props` type (components)
- [ ] Props use explicit `T | undefined` instead of `T?`
- [ ] JSDoc comments added to exported functions/types
- [ ] No TODO comments left unresolved
- [ ] Code follows existing style conventions

### Architecture Compliance

- [ ] Components placed in correct directory (astro/react/dashboard)
- [ ] API endpoints include authentication check (if protected)
- [ ] API endpoints validate input
- [ ] Database operations use abstraction layer (never direct)
- [ ] Error responses follow consistent format
- [ ] Try-catch blocks wrap async operations
- [ ] HTTP status codes are correct

### Security

- [ ] User input validated before processing
- [ ] User input sanitized where appropriate
- [ ] Authentication verified for protected resources
- [ ] CSRF tokens included in forms (if applicable)
- [ ] No sensitive data in client-side code
- [ ] Rate limiting considered for public endpoints

### Testing

- [ ] Unit tests created/updated (if applicable)
- [ ] E2E tests created/updated (if applicable)
- [ ] Tests pass locally
- [ ] Edge cases covered

### Documentation

- [ ] JSDoc comments explain "why", not just "what"
- [ ] Complex logic has inline comments
- [ ] Type definitions documented
- [ ] Examples included in JSDoc (for public APIs)

### Performance

- [ ] Database queries use appropriate indexes
- [ ] Pagination implemented for large datasets
- [ ] Images optimized (if applicable)
- [ ] Bundle size considered (for client components)

---

## Architecture Enforcement Rules

These rules are **MANDATORY** and must **NEVER** be violated:

### NEVER Rules (Absolute Prohibitions)

1. **NEVER use relative imports**
   - ❌ `import X from '../utils/x'`
   - ✅ `import X from '#utils/x'`

2. **NEVER access database providers directly**
   - ❌ `import { createClient } from '@supabase/supabase-js'`
   - ✅ `import { getDatabase } from '#libs/database'`

3. **NEVER skip authentication checks on protected endpoints**
   - ❌ Processing request without checking `locals.userId`
   - ✅ First line: `if (!locals.userId) return 401`

4. **NEVER process unvalidated user input**
   - ❌ `db.insert(body)` without validation
   - ✅ Validate required fields, sanitize inputs

5. **NEVER use inconsistent error response formats**
   - ❌ Different error structures per endpoint
   - ✅ `{ error: string, details?: string }`

6. **NEVER place components in wrong directories**
   - ❌ React components in `/astro/`
   - ✅ React in `/react/`, Astro in `/astro/`

7. **NEVER skip error handling on async operations**
   - ❌ `await operation()` without try-catch
   - ✅ Wrap in try-catch with proper error response

### ALWAYS Rules (Required Actions)

1. **ALWAYS use path aliases for internal imports**
   - Every internal import must use `#` prefix

2. **ALWAYS export Props type for components**
   - Every component must export `type Props`

3. **ALWAYS check authentication for protected resources**
   - First action in protected endpoints/pages

4. **ALWAYS validate user input**
   - Check required fields, validate formats

5. **ALWAYS use database abstraction layer**
   - Use `getDatabase()`, never direct clients

6. **ALWAYS include try-catch for async operations**
   - Wrap database calls, API calls, etc.

7. **ALWAYS add JSDoc to exported functions**
   - Describe purpose, params, returns, examples

### MUST Rules (Strict Requirements)

1. **MUST use consistent HTTP status codes**
   - 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

2. **MUST use explicit `T | undefined` for nullable props**
   - Reserve `T?` only for optional with defaults

3. **MUST place files in correct directories**
   - Follow file organization matrix

4. **MUST sanitize user input in forms/APIs**
   - Use sanitization utilities

5. **MUST log errors before returning error responses**
   - `console.error()` for debugging

---

## Common Scenario Validation

### Scenario 1: Adding a New React Form Component

**Pre-Flight:**

- [ ] Confirm this needs client-side state (React vs Astro)
- [ ] Determine if form requires authentication
- [ ] Check if validation utilities exist

**Implementation:**

- [ ] Create file in `src/components/react/`
- [ ] Export `type Props`
- [ ] Import validation utilities with `#` aliases
- [ ] Import constants with `#` aliases
- [ ] Add form validation logic
- [ ] Add error state handling
- [ ] Add loading state handling
- [ ] Include CSRF token (if server-side processing)
- [ ] Add JSDoc comment

**Completion:**

- [ ] All imports use `#` aliases
- [ ] Props properly typed
- [ ] Validation works correctly
- [ ] Error states render correctly
- [ ] Accessibility attributes present
- [ ] Component renders in target page

---

### Scenario 2: Creating a Protected API Endpoint

**Pre-Flight:**

- [ ] Identify HTTP method (GET, POST, PATCH, DELETE)
- [ ] Identify required request parameters
- [ ] Determine database operations needed
- [ ] Check authentication requirements

**Implementation:**

- [ ] Create file in `src/pages/api/`
- [ ] Export `const [METHOD]: APIRoute`
- [ ] Add authentication check FIRST
- [ ] Add input validation SECOND
- [ ] Import `getDatabase` with `#` alias
- [ ] Use database abstraction layer
- [ ] Implement business logic
- [ ] Wrap in try-catch
- [ ] Return consistent response format
- [ ] Add JSDoc comment

**Completion:**

- [ ] Authentication check present
- [ ] Input validation working
- [ ] Uses `getDatabase()` (not direct)
- [ ] Error handling present
- [ ] Correct HTTP status codes
- [ ] Consistent error format
- [ ] Try-catch wraps operations
- [ ] Tested with valid/invalid inputs

---

### Scenario 3: Adding Database Operation

**Pre-Flight:**

- [ ] Confirm operation type (INSERT, SELECT, UPDATE, DELETE)
- [ ] Check if operation exists in abstraction layer
- [ ] Determine if new abstraction method needed

**Implementation:**

- [ ] Import `getDatabase` from `#libs/database`
- [ ] Import types from `#libs/database-types`
- [ ] Call appropriate method on `db` instance
- [ ] Validate input data before operation
- [ ] Handle null/empty results
- [ ] Wrap in try-catch
- [ ] Log errors appropriately

**Completion:**

- [ ] Uses abstraction layer (not direct provider)
- [ ] Proper types imported
- [ ] Input validated
- [ ] Error handling present
- [ ] Results properly typed
- [ ] No direct Supabase/Turso imports

---

### Scenario 4: Bug Fix

**Pre-Flight:**

- [ ] Reproduce the bug
- [ ] Identify root cause
- [ ] Check if fix affects other areas
- [ ] Review existing patterns for similar fixes

**Implementation:**

- [ ] Make minimal changes to fix bug
- [ ] Follow existing patterns
- [ ] Maintain consistent style
- [ ] Add comments explaining fix
- [ ] Don't introduce new anti-patterns

**Completion:**

- [ ] Bug is fixed and verified
- [ ] No new bugs introduced
- [ ] Existing tests still pass
- [ ] Code quality maintained
- [ ] Follows project patterns

---

### Scenario 5: Refactoring

**Pre-Flight:**

- [ ] Understand current implementation
- [ ] Identify improvement goals
- [ ] Check for breaking changes
- [ ] Plan testing strategy

**Implementation:**

- [ ] Maintain backward compatibility (if possible)
- [ ] Follow current patterns strictly
- [ ] Update related documentation
- [ ] Update affected tests
- [ ] Keep changes focused

**Completion:**

- [ ] Functionality unchanged (or improved)
- [ ] All tests pass
- [ ] No breaking changes (or documented)
- [ ] Code quality improved
- [ ] Documentation updated

---

## Emergency Stop Conditions

**STOP immediately and ask the user if:**

1. Task requires creating 5+ new files
2. Task requires breaking changes to public APIs
3. Task requires new dependencies
4. Task requires database schema changes
5. Task involves security-critical code you're unsure about
6. Task contradicts established patterns
7. Task requires access to external services
8. Requirements are ambiguous or unclear

**Don't guess. Ask for clarification.**

---

## Pattern Violation Recovery

If you realize you've violated a pattern:

1. **Stop implementation immediately**
2. **Review the correct pattern** in CLAUDE-PATTERNS.md
3. **Refactor to follow the pattern** before continuing
4. **Verify with checklist** before proceeding
5. **Learn from the mistake** - add to mental model

---

**Remember:** These validation tools exist to prevent mistakes and ensure consistency. Use them every time. Rushing through validation leads to technical debt and bugs.
