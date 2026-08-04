## 🔴 MANDATORY: AI Assistant Instructions

**Before implementing ANY code changes, consult the specialized CLAUDE instruction files:**

### Primary Instructions (Read in Order)

1. **[CLAUDE.md](CLAUDE.md)** - Entry point with project overview and quick reference
2. **[CLAUDE-VALIDATION.md](CLAUDE-VALIDATION.md)** - Pre-flight checks and decision trees (START HERE for implementation)
3. **[CLAUDE-PATTERNS.md](CLAUDE-PATTERNS.md)** - Mandatory architectural patterns you MUST follow
4. **[CLAUDE-ANTI-PATTERNS.md](CLAUDE-ANTI-PATTERNS.md)** - Common violations and how to fix them

### Workflow Phases

1. **Planning Phase** → Reference CLAUDE-PATTERNS.md for pattern compliance
2. **Implementation Phase** → Use CLAUDE-VALIDATION.md decision trees to ensure correct approach
3. **Review Phase** → Check CLAUDE-ANTI-PATTERNS.md to avoid common mistakes
4. **Completion Phase** → Use CLAUDE-VALIDATION.md completion checklist before marking done

### Critical Rules for All Code Changes

**Import Rules:**

- ✅ ALWAYS use `#` path aliases: `import X from '#utils/x'`
- ❌ NEVER use relative imports: `import X from '../utils/x'`

**Database Rules:**

- ✅ ALWAYS use abstraction layer: `import { getDatabase } from '#libs/database'`
- ❌ NEVER access providers directly (Supabase/Turso clients)

**Component Rules:**

- ✅ ALWAYS export `type Props` for components
- ✅ ALWAYS place in correct directory: `astro/`, `react/`, or `dashboard/`

**API Rules:**

- ✅ ALWAYS check authentication FIRST on protected endpoints
- ✅ ALWAYS validate user input before processing
- ✅ ALWAYS use consistent error format: `{ error: string, details?: string }`

**See complete rules in:** [CLAUDE-PATTERNS.md](CLAUDE-PATTERNS.md) and [CLAUDE-VALIDATION.md](CLAUDE-VALIDATION.md)

---

# Repository Guidelines

## Project Structure & Module Organization

### Directory Structure

```
astro-basics/
├── src/
│   ├── components/
│   │   ├── astro/       # Server-rendered Astro components (.astro)
│   │   ├── react/       # Client-side React components (.tsx)
│   │   └── dashboard/   # Protected components (requires auth)
│   ├── pages/           # Route pages and API endpoints
│   │   └── api/        # API endpoints (.ts files)
│   ├── layouts/         # Page layouts
│   ├── content/         # Content collections (posts, docs, content)
│   ├── libs/            # Core libraries (database, clients)
│   ├── utils/           # Utility functions
│   ├── constants/       # Application constants
│   ├── types/           # TypeScript type definitions
│   └── styles/          # SCSS stylesheets
├── scripts/
│   └── migrations/      # Database migrations (SQL)
├── tests/               # Vitest unit tests
├── e2e/                 # Playwright E2E tests
├── project-docs/        # Project documentation
│
├── CLAUDE.md            # AI instructions entry point
├── CLAUDE-PATTERNS.md   # Mandatory patterns
├── CLAUDE-ANTI-PATTERNS.md  # Common violations
└── CLAUDE-VALIDATION.md # Decision trees and checklists
```

### Key Principles

- **Path Aliases**: ALL internal imports use `#` prefix (MANDATORY)
- **Database Abstraction**: Use `getDatabase()` from `#libs/database` (NEVER direct providers)
- **Component Segregation**: Clear separation between SSR (Astro) and client (React)
- **Type Safety**: TypeScript strict mode with explicit type annotations
- **Authentication**: Check `locals.userId` FIRST on protected endpoints

**See detailed patterns:** [CLAUDE-PATTERNS.md](CLAUDE-PATTERNS.md)

## Build, Test, and Development Commands

### Development

- `npm run start`: dev server + SCSS watcher (recommended)
- `npm run dev`: Astro dev server at `localhost:4321`
- `npm run build`: bundle production output into `dist/`

### Code Quality

- `npm run fix:all`: auto-fix ESLint, Stylelint, Prettier, Markdown
- `npm run type-check`: TypeScript type checking
- `npm run lint:all`: check all linting without fixes

### Testing

- `npm test`: execute Vitest unit tests in `tests/`
- `npm run test:e2e`: run Playwright E2E tests (requires: `npx playwright install`)
- `npm run test:e2e:report`: view HTML test report

### Database

- `npm run db:wizard`: interactive setup wizard (first-time)
- `npm run db:status`: check current configuration
- `npm run db:manage`: advanced database management

**See complete commands:** [CLAUDE.md](CLAUDE.md)

## Coding Style & Naming Conventions

### Formatting

- Format with Prettier (2-space indentation)
- Run `npm run format` before committing
- Follow ESLint and Stylelint rules for Astro, React, TypeScript, SCSS

### Naming Conventions

- **Components**: PascalCase (`Header.astro`, `UserProfile.tsx`)
- **Utilities**: camelCase or kebab-case (`content.ts`, `email-validation.ts`)
- **SCSS Partials**: underscore prefix (`_card.scss`, `_variables.scss`)
- **Types**: PascalCase for interfaces/types (`User`, `MessageData`)

### Import Patterns (MANDATORY)

```typescript
// ✅ CORRECT - Use # path aliases
import Header from '#components/astro/Header.astro'
import { SITE_TITLE } from '#utils/site-config'
import { getDatabase } from '#libs/database'
import type { Message } from '#libs/database-types'

// ❌ INCORRECT - NEVER use relative imports
import Header from '../components/astro/Header.astro'
import { SITE_TITLE } from '../../utils/site-config'
```

**See complete patterns:** [CLAUDE-PATTERNS.md > Import Patterns](CLAUDE-PATTERNS.md#import-patterns)

## Component Creation Guidelines

### Decision Tree

```
Creating a component?
├─ Does it need client-side state or interactivity?
│  ├─ YES → Use React (.tsx)
│  │   ├─ Requires auth? → src/components/dashboard/*.tsx
│  │   └─ Public? → src/components/react/*.tsx
│  └─ NO → Use Astro (.astro)
│      ├─ Requires auth? → src/components/dashboard/*.astro
│      └─ Public? → src/components/astro/*.astro
```

### Required Structure

```typescript
// MANDATORY: Export Props type
export type Props = {
  title: string
  description: string | undefined // Explicit over optional
  count?: number // Only for truly optional with default
}

// Use # path aliases for imports
import Component from '#components/astro/Component.astro'

// Add JSDoc comment
/**
 * Component description
 * @component ComponentName
 */
```

**See complete guide:** [CLAUDE-VALIDATION.md > Component Decision Tree](CLAUDE-VALIDATION.md#component-decision-tree)

## API Endpoint Guidelines

### Mandatory Structure

```typescript
import type { APIRoute } from 'astro'
import { getDatabase } from '#libs/database'

export const POST: APIRoute = async ({ locals, request }) => {
  // 1. AUTHENTICATION CHECK (REQUIRED for protected endpoints)
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 2. INPUT VALIDATION (REQUIRED)
    const body = await request.json()
    // Validate required fields...

    // 3. DATABASE ACCESS (REQUIRED: Use abstraction layer)
    const db = getDatabase()
    const result = await db.someOperation()

    // 4. SUCCESS RESPONSE (REQUIRED: Consistent format)
    return new Response(JSON.stringify({ data: result, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // 5. ERROR HANDLING (REQUIRED: Consistent format)
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

**See complete guide:** [CLAUDE-VALIDATION.md > API Endpoint Decision Tree](CLAUDE-VALIDATION.md#api-endpoint-decision-tree)

## Database Access Guidelines

### MANDATORY: Use Abstraction Layer

```typescript
// ✅ CORRECT - Use abstraction layer
import { getDatabase } from '#libs/database'
import type { MessageQueryOptions } from '#libs/database-types'

const db = getDatabase()
const messages = await db.getMessages({ limit: 10 })

// ❌ INCORRECT - NEVER access providers directly
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key) // NEVER DO THIS
```

**Rationale:** Abstraction layer enables database provider switching (Supabase ↔ Turso) without code changes.

**See complete guide:** [CLAUDE-PATTERNS.md > Database Access Patterns](CLAUDE-PATTERNS.md#database-access-patterns)

## Testing Guidelines

### Unit Tests

- Place specs in `tests/*.test.ts`
- Cover error paths and integration surfaces
- Run `npm test` locally before pushing
- Follow pattern: Arrange → Act → Assert

### E2E Tests

- Store specs in `e2e/*.spec.ts`
- Reference `project-docs/08-testing/e2e-testing.md` for workflows
- Run `npm run test:e2e` when features touch user flows or UI
- Requires: `npx playwright install` (browser installation)

**See testing patterns:** [CLAUDE-PATTERNS.md > Testing Patterns](CLAUDE-PATTERNS.md#testing-patterns)

## Commit & Pull Request Guidelines

### Commit Format

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Group related changes logically
- Reference issues: `Closes #123`, `Fixes #456`

### Pre-Commit Checklist

```bash
npm run fix:all       # Auto-fix all issues
npm run type-check    # TypeScript validation
npm test              # Unit tests
npm run test:e2e      # E2E tests (if UI changes)
npm run build         # Production build
```

### Pull Request Requirements

- Describe the change clearly
- Link related issues
- Include screenshots for UI changes
- Note any breaking changes
- Follow CLAUDE patterns (validated by checklist)

**See PR guidelines:** [project-docs/11-reference/git-workflow.md](project-docs/11-reference/git-workflow.md)

## Security & Configuration Tips

### Environment Setup

1. Copy `.env.example` to `.env`
2. Populate Clerk authentication keys (REQUIRED)
3. Configure database provider (Supabase or Turso)
4. NEVER commit secrets to version control

### Required Environment Variables

```env
# Clerk Authentication (REQUIRED)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Choose one or both)
DATABASE_PROVIDER=turso  # 'turso', 'supabase', or 'auto'
```

**See complete setup:** [project-docs/01-getting-started/setup-guide.md](project-docs/01-getting-started/setup-guide.md)

### Security Best Practices

- Validate and sanitize ALL user input
- Check authentication on protected endpoints (FIRST line of code)
- Use CSRF tokens for forms
- Implement rate limiting on public endpoints
- Never expose sensitive data in client-side code

**See security patterns:** [CLAUDE-PATTERNS.md > Security Patterns](CLAUDE-PATTERNS.md#security-patterns)

---

## Quick Reference for Common Tasks

| Task                  | Reference                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Creating a component  | [CLAUDE-VALIDATION.md > Component Decision Tree](CLAUDE-VALIDATION.md#component-decision-tree)       |
| Creating API endpoint | [CLAUDE-VALIDATION.md > API Endpoint Decision Tree](CLAUDE-VALIDATION.md#api-endpoint-decision-tree) |
| Database operation    | [CLAUDE-PATTERNS.md > Database Access Patterns](CLAUDE-PATTERNS.md#database-access-patterns)         |
| Import question       | [CLAUDE-PATTERNS.md > Import Patterns](CLAUDE-PATTERNS.md#import-patterns)                           |
| Props typing          | [CLAUDE-PATTERNS.md > Props Typing Patterns](CLAUDE-PATTERNS.md#props-typing-patterns)               |
| Error handling        | [CLAUDE-PATTERNS.md > Error Handling Patterns](CLAUDE-PATTERNS.md#error-handling-patterns)           |
| Security concern      | [CLAUDE-PATTERNS.md > Security Patterns](CLAUDE-PATTERNS.md#security-patterns)                       |
| Fixing a mistake      | [CLAUDE-ANTI-PATTERNS.md](CLAUDE-ANTI-PATTERNS.md)                                                   |

---

## When In Doubt

1. **Check the decision tree** in [CLAUDE-VALIDATION.md](CLAUDE-VALIDATION.md)
2. **Search for the pattern** in [CLAUDE-PATTERNS.md](CLAUDE-PATTERNS.md)
3. **Look for the anti-pattern** in [CLAUDE-ANTI-PATTERNS.md](CLAUDE-ANTI-PATTERNS.md)
4. **Review existing code** for similar implementations
5. **Ask the user** before deviating from established patterns

**Remember**: Consistency and adherence to patterns is MORE important than speed. Take time to do it right.
