# CLAUDE.md

**AI Development Assistant Instructions for astro-basics Project**

This file serves as the entry point for AI assistants working on this codebase. For detailed patterns and validation rules, consult the specialized instruction files below.

---

## 🔴 CRITICAL: Read Before Starting Any Task

### Required Reading (In Order)

1. **[CLAUDE-VALIDATION.md](CLAUDE-VALIDATION.md)** - Pre-flight checks and decision trees (START HERE)
2. **[CLAUDE-PATTERNS.md](CLAUDE-PATTERNS.md)** - Mandatory patterns you MUST follow
3. **[CLAUDE-ANTI-PATTERNS.md](CLAUDE-ANTI-PATTERNS.md)** - Common mistakes to avoid

### Quick Decision Guide

**Before implementing anything, ask yourself:**

```
What am I creating?
├─ Component?     → See CLAUDE-VALIDATION.md > Component Decision Tree
├─ API Endpoint?  → See CLAUDE-VALIDATION.md > API Endpoint Decision Tree
├─ Database Op?   → See CLAUDE-VALIDATION.md > Database Access Decision Tree
├─ Utility?       → See CLAUDE-VALIDATION.md > Utility Function Decision Tree
├─ Page/Route?    → See CLAUDE-VALIDATION.md > Page Creation Decision Tree
└─ Something else? → Read CLAUDE-PATTERNS.md for relevant pattern
```

---

## Project Overview

**astro-basics** is a content-rich Astro website serving as both a component library and demonstration site. It uses server-side rendering, Clerk authentication, and supports multiple database backends.

### Core Architecture Principles

1. **Server-First Rendering**: Astro SSR with selective client hydration
2. **Database Abstraction**: Unified interface supporting Supabase and Turso
3. **Strict Type Safety**: TypeScript strict mode with additional safety rules
4. **Path Alias Imports**: All internal imports use `#` prefix (MANDATORY)
5. **Component Segregation**: Clear separation between SSR (Astro) and client (React) components

---

## Repository Structure (Quick Reference)

```
astro-basics/
├── src/
│   ├── components/
│   │   ├── astro/       # Server-rendered components (.astro)
│   │   ├── react/       # Client-side components (.tsx)
│   │   └── dashboard/   # Protected components (auth required)
│   ├── pages/           # Routes and API endpoints
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
├── CLAUDE.md            # This file (entry point)
├── CLAUDE-PATTERNS.md   # Mandatory patterns
├── CLAUDE-ANTI-PATTERNS.md  # Common violations
└── CLAUDE-VALIDATION.md # Decision trees and checklists
```

**See detailed structure in:** [CLAUDE.md.backup](CLAUDE.md.backup) (original documentation)

---

## Essential Commands

### Development

```bash
npm run start          # Dev server + SCSS watcher (recommended)
npm run dev           # Astro dev server only (port 4321)
npm run build         # Production build
```

### Code Quality (Run before commits)

```bash
npm run fix:all       # Auto-fix all issues (ESLint, StyleLint, Prettier, Markdown)
npm run type-check    # TypeScript type checking
```

### Database

```bash
npm run db:wizard     # Interactive setup wizard (first-time setup)
npm run db:status     # Check current configuration
npm run db:manage     # Advanced database management
```

### Testing

```bash
npm test              # Run unit tests (Vitest)
npm run test:e2e      # Run E2E tests (Playwright - requires: npx playwright install)
```

### Styling (SCSS)

```bash
npm run sass          # Watch and compile SCSS to CSS
npm run lint:styles   # Check SCSS for style violations
npm run lint:styles:fix  # Auto-fix SCSS style issues
```

**For complete command reference:** See [CLAUDE.md.backup](CLAUDE.md.backup)

---

## Development Tools & Assistants

### Slash Commands

Project-specific slash commands to streamline common tasks:

```bash
/code-reviewer                     # Comprehensive code review (quality, accessibility, performance)
/refactor-css <file-or-directory> # Convert utility classes to semantic, reusable classes
/ai-comments                       # Generate intelligent JSDoc comments for TypeScript/JavaScript
/github-issue [type] [title]      # Create formatted GitHub issue with intelligent analysis
/github-feature [name] [desc]     # Create feature request with user stories and acceptance criteria
/github-bug [component] [desc]    # Create detailed bug report with reproduction steps
/openspec:proposal                 # Scaffold new OpenSpec change proposal
/openspec:apply                    # Implement approved OpenSpec change
/openspec:archive                  # Archive deployed OpenSpec change
/optimize-agents [agent-type]     # Optimize sub-agent implementations
```

**Usage Notes:**

- Use `/code-reviewer` **proactively** after implementing features or making significant changes
- Use `/openspec:*` commands for architectural changes, breaking changes, or new capabilities
- Use `/ai-comments` for adding comprehensive JSDoc to TypeScript/JavaScript files

### Claude Skills

Specialized assistants available for this project:

- **wcag-compliance-reviewer** - Review HTML/CSS and React/TypeScript for WCAG 2.1 Level AA compliance
- **fpkit-developer** - Build applications with @fpkit/acss components
- **skill-creator** - Create custom skills for project-specific workflows
- **skill-packager** - Package skills into versioned distributable ZIP files

**When to Use Skills:**

- After creating UI components → Use `wcag-compliance-reviewer` for accessibility audit
- When building with @fpkit/acss → Use `fpkit-developer` for component patterns
- For custom workflows → Use `skill-creator` to build reusable assistants

---

## Critical Stop Points

### 🛑 STOP and consult specialized files when

1. **Creating ANY component**
   → Read: [CLAUDE-VALIDATION.md > Component Decision Tree](CLAUDE-VALIDATION.md#component-decision-tree)

2. **Creating ANY API endpoint**
   → Read: [CLAUDE-VALIDATION.md > API Endpoint Decision Tree](CLAUDE-VALIDATION.md#api-endpoint-decision-tree)

3. **Accessing database**
   → Read: [CLAUDE-PATTERNS.md > Database Access Patterns](CLAUDE-PATTERNS.md#database-access-patterns)

4. **Unsure about import style**
   → Read: [CLAUDE-PATTERNS.md > Import Patterns](CLAUDE-PATTERNS.md#import-patterns)

5. **Seeing an anti-pattern in existing code**
   → Read: [CLAUDE-ANTI-PATTERNS.md](CLAUDE-ANTI-PATTERNS.md)

---

## Non-Negotiable Rules

These rules override ALL other considerations:

### Import Rules

- ✅ **ALWAYS** use `#` path aliases: `import X from '#utils/x'`
- ❌ **NEVER** use relative imports: `import X from '../utils/x'`

### Database Rules

- ✅ **ALWAYS** use abstraction layer: `import { getDatabase } from '#libs/database'`
- ❌ **NEVER** access providers directly: `import { createClient } from '@supabase/supabase-js'`

### Security Rules

- ✅ **ALWAYS** check authentication on protected endpoints FIRST
- ✅ **ALWAYS** validate and sanitize user input
- ❌ **NEVER** skip authentication checks
- ❌ **NEVER** process unvalidated input

### Component Rules

- ✅ **ALWAYS** export `type Props` for components
- ✅ **ALWAYS** place components in correct directory (astro/react/dashboard)
- ❌ **NEVER** mix component types (React in /astro/ directory)

### Error Handling Rules

- ✅ **ALWAYS** wrap async operations in try-catch
- ✅ **ALWAYS** return consistent error format: `{ error: string, details?: string }`
- ❌ **NEVER** allow unhandled errors

**For complete rules:** See [CLAUDE-VALIDATION.md > Architecture Enforcement Rules](CLAUDE-VALIDATION.md#architecture-enforcement-rules)

---

## Quick Pattern Reference

### Component Props Pattern

```typescript
// ✅ CORRECT
export type Props = {
  title: string
  description: string | undefined // Explicit nullability
  count?: number // Optional with default
}
```

### API Endpoint Pattern

```typescript
// ✅ CORRECT
export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Authentication check FIRST
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 2. Validate input
    // 3. Database via abstraction layer
    const db = getDatabase()
    // 4. Business logic
    // 5. Return success response
  } catch (error) {
    // 6. Consistent error handling
  }
}
```

### Database Access Pattern

```typescript
// ✅ CORRECT
import { getDatabase } from '#libs/database'
import type { MessageQueryOptions } from '#libs/database-types'

const db = getDatabase()
const messages = await db.getMessages({ limit: 10 })
```

**For complete patterns:** See [CLAUDE-PATTERNS.md](CLAUDE-PATTERNS.md)

---

## Task Completion Checklist

Before marking ANY task as complete:

- [ ] Read relevant section in CLAUDE-VALIDATION.md
- [ ] Followed pattern from CLAUDE-PATTERNS.md
- [ ] Avoided anti-patterns from CLAUDE-ANTI-PATTERNS.md
- [ ] All imports use `#` path aliases
- [ ] Components in correct directories
- [ ] Authentication checks present (if required)
- [ ] Database accessed via abstraction layer
- [ ] Error handling implemented
- [ ] JSDoc comments added
- [ ] Code tested and working

**Full checklist:** See [CLAUDE-VALIDATION.md > Task Completion Checklist](CLAUDE-VALIDATION.md#task-completion-checklist)

---

## OpenSpec Integration

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

## Key Features Reference

### Authentication & Authorization

- **Provider**: Clerk authentication
- **Protected Routes**: `/dashboard/*`, `/forum/*`, `/organization/*`
- **Middleware**: `src/middleware.ts` handles route protection
- **Role System**: Configurable roles via `config/roles.config.ts`
  - See: [project-docs/02-guides/configurable-roles.md](project-docs/02-guides/configurable-roles.md)

### Database Support

- **Providers**: Supabase (PostgreSQL) and Turso (LibSQL)
- **Abstraction Layer**: `src/libs/database.ts` (MANDATORY to use)
- **Type Definitions**: `src/libs/database-types.ts`
- **Switching**: `npm run db:switch:turso` or `npm run db:switch:supabase`
- **Setup**: `npm run db:wizard`

### Content Collections

- **Collections**: `posts`, `docs`, `content`
- **Format**: MDX with frontmatter
- **Schema**: `src/content/config.ts`
- **Filtering**: Use `publish: true` for public content

### Component Library

- **Export**: Components exportable via `package.json` exports
- **Usage**: Internal via path aliases (`#components/astro/Header.astro`)
- **Types**: Astro (SSR), React (client), Dashboard (protected)

### Testing

- **Unit Tests**: Vitest in `/tests` directory
- **E2E Tests**: Playwright in `/e2e` directory
- **Commands**: `npm test` and `npm run test:e2e`

---

## Environment Configuration

### Required Variables

```env
# Clerk Authentication (REQUIRED)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Choose one or both)
DATABASE_PROVIDER=turso  # 'turso', 'supabase', or 'auto'

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

**Setup Guide**: `cp .env.example .env` or run `npm run db:wizard`

---

## Documentation Reference

### For Implementation Details

- **Getting Started**: [project-docs/01-getting-started/](project-docs/01-getting-started/)
- **Guides**: [project-docs/02-guides/](project-docs/02-guides/)
- **Features**: [project-docs/03-features/](project-docs/03-features/)
- **Integrations**: [project-docs/04-integrations/](project-docs/04-integrations/)
- **Database**: [project-docs/05-database/](project-docs/05-database/)

### For Original Documentation

- **Full CLAUDE.md**: [CLAUDE.md.backup](CLAUDE.md.backup)
- **All sections preserved with complete details**

---

## Common Scenarios Quick Links

| Scenario              | Go To                                                                                                |
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

1. **Check the decision tree** in CLAUDE-VALIDATION.md
2. **Search for the pattern** in CLAUDE-PATTERNS.md
3. **Look for the anti-pattern** in CLAUDE-ANTI-PATTERNS.md
4. **Review existing code** for similar implementations
5. **Ask the user** before deviating from established patterns

**Remember**: Consistency and adherence to patterns is MORE important than speed. Take time to do it right.

---

## File Changelog

- **2025-01-15**: Refactored into specialized instruction files
  - Created CLAUDE-PATTERNS.md (mandatory patterns)
  - Created CLAUDE-ANTI-PATTERNS.md (common violations)
  - Created CLAUDE-VALIDATION.md (decision trees & checklists)
  - Streamlined CLAUDE.md as entry point
  - Original preserved as CLAUDE.md.backup

**Original documentation preserved in**: [CLAUDE.md.backup](CLAUDE.md.backup)

- when asked to document a feature, method, utility or otherwise it should be documented in project docs and the starlight guide
