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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**astro-basics-website** is a content-rich Astro website that serves as both a component library and a
demonstration site. It uses server-side rendering (`output: "server"`), integrates Clerk authentication,
and supports multiple database backends (Supabase, Turso).

### Repository Structure

```
src/
├── components/          # Reusable components
│   ├── astro/          # Server-rendered Astro components
│   ├── react/          # Client-side React components
│   └── dashboard/      # Protected dashboard components
├── pages/              # Route pages and API endpoints
├── content/            # Content collections (posts, docs, content)
├── layouts/            # Page layouts (Base, Post, etc.)
├── styles/             # SCSS stylesheets
│   ├── components/     # Component-specific styles
│   └── index.scss      # Main stylesheet entry
├── libs/               # Database clients and utilities
├── utils/              # Helper functions and configs
├── constants/          # Application constants
└── middleware.ts       # Clerk authentication middleware

scripts/                # Database and migration scripts
e2e/                   # Playwright E2E tests
tests/                 # Vitest unit tests
docs/                  # Project documentation
```

### Key Features

- **Component Library**: Exportable Astro/React components via package.json exports
- **Content Management**: Three content collections with MDX support
- **Authentication**: Clerk integration with protected routes
- **Database Support**: Turso (LibSQL) and Supabase backends
- **Comment System**: Full-featured polymorphic comment system for posts and docs
- **PWA Ready**: Service worker and offline support
- **Testing**: Unit (Vitest) and E2E (Playwright) test suites
- **Performance**: Lighthouse monitoring, image optimization
- **Developer Experience**: Hot reload, SCSS watching, comprehensive linting

## Initial Setup

1. **Install dependencies**: `npm install` (takes ~4 minutes, warnings are expected)
2. **Setup environment**: `cp .env.example .env` and configure keys
3. **Install pre-commit hooks**: `npm run prepare` (Husky setup)
4. **Install Playwright browsers** (for E2E tests): `npx playwright install`
5. **Start development**: `npm run start`

## Essential Commands

### Development

```bash
npm run start          # Recommended: dev server + SCSS watcher in parallel
npm run dev           # Astro dev server only (port 4321)
npm run sass          # Watch and compile SCSS (src/styles/index.scss → index.css)
```

### Build & Testing

```bash
npm run build         # Production build (10-15 seconds)
npm run preview       # Preview production build
npm test              # Run Vitest unit tests (excludes e2e)
npm run test:e2e      # Run Playwright e2e tests (requires: npx playwright install)
npm run test:e2e:report  # Show Playwright test report
```

### Code Quality (Run before commits)

```bash
npm run fix:all       # Auto-fix all issues (ESLint, StyleLint, Prettier, Markdown)
npm run lint:all      # Check all linting without fixes
npm run type-check    # TypeScript type checking
npm run lint          # ESLint fix
npm run lint:check    # ESLint check only
npm run lint:styles:fix  # StyleLint fix
npm run format        # Prettier formatting
```

### Single Test Execution

```bash
npm test path/to/test.test.ts       # Run specific Vitest test
npx playwright test path/to/e2e.spec.ts  # Run specific Playwright test
```

### Database Commands

```bash
# Database Management
npm run db:status     # Check current database configuration and status
npm run db:wizard     # Interactive setup wizard for first-time configuration
npm run db:manage     # Advanced database management CLI

# Database Switching (with automatic backups)
npm run db:switch:turso      # Switch to Turso database
npm run db:switch:supabase   # Switch to Supabase database
npm run db:backup           # Create configuration backup
npm run db:restore          # Restore from backup

# Schema and Validation
npm run db:schema     # Validate database schema compatibility

# Legacy Commands (still available)
npm run db:setup      # Initialize database
npm run db:reset      # Reset database
npm run db:check      # Check database connection
npm run db:seed:messages  # Seed messages table
npm run db:migrate    # Run migrations up
npm run db:migrate:status  # Check migration status
npm run db:migrate:create  # Create new migration
npm run db:migrate:rollback  # Rollback migration
```

### GitHub Integration

```bash
npm run ticket:validate  # Verify GitHub CLI setup
npm run ticket:create    # Create GitHub issue (web)
npm run ticket:list      # List open issues
npm run ticket:labels    # List available labels
```

## Architecture

### Component System

The project exports components through `src/components/index.ts`:

- **Astro Components** (`/astro/`): Server-rendered, use `.astro` extension
- **React Components** (`/react/`): Client-side interactive, use `.tsx` extension
- **Dashboard Components** (`/dashboard/`): Protected routes requiring authentication

Components are consumed internally via path aliases (`#components/astro/Header.astro`).

### Page Routes

Key routes in the application:

- `/` - Homepage
- `/posts` - Blog posts listing
- `/posts/[...slug]` - Individual blog post
- `/docs` - Documentation listing
- `/docs/[...slug]` - Individual doc page
- `/content` - Content collection pages
- `/dashboard/*` - Protected dashboard (requires auth)
- `/forum/*` - Protected forum (requires auth)
- `/organization/*` - Protected organization pages (requires auth)
- `/api/*` - API endpoints

### API Endpoints

Available API routes:

- `/api/posts` - Get posts collection data
- `/api/comments` - Full CRUD comment system API
  - `GET` - Retrieve comments for posts/docs (supports pagination, threading)
  - `POST` - Create new comments (authentication required)
  - `PATCH` - Update user's own comments (authentication required)
  - `DELETE` - Soft delete user's own comments (authentication required)
- Additional API routes can be added in `src/pages/api/`

### Authentication Flow

Clerk middleware (`src/middleware.ts`) protects routes:

- Protected: `/dashboard/*`, `/forum/*`, `/organization/*`
- Validation: Checks for `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` on startup
- Redirects unauthenticated users to sign-in

### Role Configuration System

The project includes a configurable role system for setup-time customization:

- **Configuration**: Define roles in `config/roles.config.ts`
- **Type Generation**: Auto-generates TypeScript types in `src/types/generated-roles.ts`
- **Migration Generation**: Creates database migrations for PostgreSQL/SQLite
- **Core Roles**: Three required roles (`member`, `admin`, `super_admin`)
- **Hierarchical Privilege Escalation**: Higher-level roles automatically inherit lower-level permissions (default behavior, configurable via `useHierarchy` option in role guards)
- **Setup Command**: `npm run setup:roles` to generate types and migrations
- **Validation**: Zod schemas ensure safe role definitions
- **Type Safety**: Full TypeScript support with zero runtime overhead

**Quick Setup:**

```bash
# Edit configuration
vim config/roles.config.ts

# Generate types and migrations
npm run setup:roles

# Apply database migration
npm run db:migrate

# Commit generated files
git add config/ src/types/ scripts/migrations/
git commit -m "Configure custom roles"
```

See [specs/guides/configurable-roles.md](specs/guides/configurable-roles.md) and [specs/guides/role-guard-usage-guide.md](specs/guides/role-guard-usage-guide.md) for complete documentation.

### Content Collections

Three collections share identical schema (`src/content/config.ts`):

- `posts`, `docs`, `content`
- Key fields: title, pubDate, description, author, tags, featured, publish, youtube
- Filter by `publish: true` when rendering public content

### Database Integration

The project features a **unified database abstraction layer** that enables seamless switching between database providers:

- **Database Abstraction**: `src/libs/database.ts` provides unified interface for all database operations
- **Provider Auto-Detection**: Automatically detects and uses available database based on configuration
- **Unified Types**: `src/libs/database-types.ts` ensures consistent data structures across providers
- **Safe Switching**: Built-in backup/restore system prevents configuration loss during database switching

**Supported Providers:**

- **Supabase**: PostgreSQL with real-time features, uses service role for server operations
- **Turso**: LibSQL with edge distribution and low latency

**Provider Selection Priority:**

1. Explicit choice via `DATABASE_PROVIDER` environment variable
2. Supabase (if configured)
3. Turso (if configured)
4. Error if no providers available

All API endpoints and components automatically adapt to the active database provider without code changes.

#### Supabase Migrations

**Migration Structure (Consolidated - Updated 2025-10-06):**

The project uses a streamlined 2-migration approach for Supabase:

```
scripts/migrations/
├── 001_core_schema.sql              # All tables, indexes, triggers, functions
├── 002_security_policies.sql        # Row Level Security policies
├── rollback_001_core_schema.sql     # Rollback for migration 001
├── rollback_002_security_policies.sql  # Rollback for migration 002
└── archived/                        # Old fragmented migrations (6 files)
    └── README.md                    # Why migrations were consolidated
```

**User Role System:**

- **3-tier role hierarchy**: `member` (default) → `admin` → `super_admin`
- **Stored as ENUM type**: `user_role` in PostgreSQL
- **Synced from Clerk**: `publicMetadata.role` field
- **Default role**: All new users receive `member` role automatically

**Key Tables:**

- `users` - User profiles with role-based access control
- `organization_memberships` - Multi-tenant organization support
- `user_preferences` - App-specific user settings

**Applying Migrations:**

```bash
# For fresh databases - apply in order
npm run db:migrate -- 001_core_schema.sql
npm run db:migrate -- 002_security_policies.sql

# For databases with old migrations applied
# See: docs/database/supabase-migration-refactor-plan.md
```

**Rolling Back Migrations:**

```bash
# Rollback security policies first
npm run db:migrate -- rollback_002_security_policies.sql

# Then rollback core schema (WARNING: Deletes all data!)
npm run db:migrate -- rollback_001_core_schema.sql
```

**Migration Best Practices:**

1. **Idempotent design** - All migrations use IF NOT EXISTS/IF EXISTS
2. **Transaction-wrapped** - Each migration runs in single BEGIN/COMMIT
3. **Self-verifying** - Built-in verification reports success/failure
4. **Well-documented** - Extensive COMMENT statements for AI/developer context
5. **Rollback-ready** - Dedicated rollback scripts for safe downgrades

For detailed migration information, see [docs/database/supabase-migration-refactor-plan.md](docs/database/supabase-migration-refactor-plan.md)

### Deployment Adapters

Configured via `ASTRO_ADAPTER` environment variable:

- Default: Netlify (`@astrojs/netlify`)
- Alternatives: `node` (standalone), `vercel`
- Logic in `astro.config.mjs` switch statement

## Development Guidelines

### Import Patterns

```typescript
// Use # alias for internal imports
import Header from '#components/astro/Header.astro'
import { SITE_TITLE } from '#utils/site-config'

// Use import type for type-only imports
import type { APIRoute } from 'astro'
import type { Props } from './types'
```

### Component Props Pattern

```typescript
// Astro components
export type Props = {
  title: string
  description: string | undefined // Prefer explicit over optional
}
const { title, description } = Astro.props

// React components - same pattern
export type Props = {
  /* ... */
}
export function Component({ title }: Props) {
  /* ... */
}
```

### Styling System

- SCSS compilation: `src/styles/index.scss` → compressed CSS
- Component styles: `src/styles/components/`
- Use `@use` instead of `@import` in SCSS
- CSS custom properties for theming
- @fpkit/acss utility integration

### Testing Structure

- **Unit tests**: `/tests` directory, Vitest config excludes e2e
- **E2E tests**: `/e2e` directory, Playwright on port 4321
- CI runs Chromium only, local runs Chrome/Firefox/Safari

## Environment Configuration

### Required for Development

```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Database Configuration

**Choose one or both database providers:**

```env
# Database Provider Selection (optional - auto-detects if not specified)
DATABASE_PROVIDER=turso           # 'turso', 'supabase', or 'auto'

# Supabase (PostgreSQL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...         # For client-side operations
SUPABASE_SERVICE_ROLE_KEY=eyJ... # For server-side operations (required)

# Turso (LibSQL)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=eyJ...          # Authentication token
```

**Quick Setup:** Run `npm run db:wizard` for guided configuration.

## Branch Structure

- **Main branch**: `primary` (target for PRs)
- **Feature branches**: `feat/[feature-name]` convention

## Key Utilities and Libraries

- `src/utils/site-config.ts`: Site constants, PAGINATION_COUNT=2
- `src/libs/content.ts`: Slugify, Truncate utilities
- `src/constants/formErrors.ts`: Form validation messages
- `src/libs/database.ts`: Unified database abstraction layer with provider auto-detection
- `src/libs/database-types.ts`: Shared TypeScript interfaces for consistent data structures
- `src/libs/turso.ts`: Turso database client with retry logic and message operations
- `src/libs/supabase.ts`: Supabase client initialization
- `src/utils/comments-availability.ts`: Comment system availability checker
- `src/utils/sanitize.ts`: Content sanitization utilities with DOMPurify
- `src/utils/comment-rate-limiter.ts`: Enhanced rate limiting with spam detection
- `src/types/comments.ts`: TypeScript interfaces for comment system

## Project-Specific Patterns

### Comment System Architecture

The project includes a comprehensive comment system with:

- **Polymorphic Design**: Supports multiple content types (`post`, `doc`) with single table
- **Threaded Comments**: Up to 3-level nesting with parent_comment_id references
- **Security Features**: Rate limiting (5 comments/minute), CSRF protection, content sanitization
- **Real-time Interactivity**: Server-side rendering with client-side React components
- **Soft Deletes**: Comments marked as 'archived' rather than hard deleted
- **Row-Level Security**: Supabase RLS policies for secure data access
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

### Turso Database Operations

The project includes comprehensive Turso integration with:

- Connection validation and retry logic (3 attempts with exponential backoff)
- Message CRUD operations (insertMessage, getMessages, markMessageAsRead, archiveMessage)
- Transaction support via executeTransaction
- Proper error handling with descriptive messages

### PWA Configuration

Progressive Web App setup with:

- Service worker auto-update strategy
- Manifest with Astro Kit branding
- Workbox integration for offline support

### Integrations

Active integrations in `astro.config.mjs`:

- Clerk authentication
- React for interactive components
- MDX with remark-toc and rehype-accessible-emojis
- Sitemap generation
- Astro Image Tools
- PWA support via @vite-pwa/astro
- Lighthouse performance monitoring

## Dependency Management

```bash
npm run npm-update    # Update all dependencies
npm run npm-update-i  # Interactive dependency updates
```

## Configuration Files

### Key Config Files

- `astro.config.mjs` - Astro configuration with integrations and adapter setup
- `tsconfig.json` - TypeScript with strict mode and path aliases
- `vitest.config.ts` - Unit test configuration (excludes e2e)
- `playwright.config.ts` - E2E test configuration (port 4321)
- `.env.example` - Environment variable template
- `package.json` - Dependencies and scripts, includes package exports

### Linting Configuration

- `.eslintrc.json` - ESLint rules for JS/TS/Astro
- `.stylelintrc.json` - StyleLint for SCSS/CSS
- `.prettierrc` - Code formatting rules
- `.markdownlint.json` - Markdown linting rules
- `.husky/` - Pre-commit hooks configuration
- `lint-staged` config in package.json

## Known Considerations

- TypeScript strict mode with additional safety rules (noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- Pre-commit hooks via Husky and lint-staged
- Playwright requires browser installation: `npx playwright install`
- Build warnings for getStaticPaths in dynamic pages are expected
- Dummy Clerk keys allow building but cause runtime auth errors
- npm install shows warnings but completes successfully
- E2E tests require dev server running on port 4321

- always store \*.md docs in /docs organize and place in subdirectories if necessary

## Release Management

This project uses a comprehensive release management system with specialized Claude agents for automation and consistency.

### Release Process

**Standard Process:** Follow the 4-phase release workflow documented in `/docs/releases/RELEASE-PROCESS.md`

1. **Planning Phase** (T-14 days): Epic creation, team assignment, security planning
2. **Development Phase** (T-7 days): Feature freeze, security audit, testing
3. **Preparation Phase** (T-3 days): Version bump, build verification, final testing
4. **Execution Phase** (Release Day): Deployment, verification, communication

### Release Agent

Use the **astro-basics-release-manager** agent for automated release coordination:

```markdown
Create a new release for astro-basics project. Current version is X.Y.Z.
I need you to act as the astro-basics-release-manager agent and guide me through the complete release process.

Please start by analyzing the current state and recommending the appropriate release type.
```

**Agent Documentation:** `@docs/agents/astro-basics-release-manager.md`

### Release Types

- **Major (X.0.0):** Breaking changes, architecture overhauls
- **Minor (0.X.0):** New features, enhancements (monthly cadence)
- **Patch (0.0.X):** Bug fixes, security patches (as needed)
- **Hotfix:** Critical issues requiring immediate deployment

### Mandatory Requirements

**Security First:** Every release MUST include:

- Complete security audit using `/docs/releases/vX.Y.Z-RELEASE-security-audit-checklist.md`
- OWASP Top 10 2021 compliance verification
- Technology-specific security checks (Astro, Clerk, Supabase, Turso)
- Zero critical/high vulnerabilities before production deployment

**File Naming:** All release documents use version-prefixed naming:

- Epic: `vX.Y.Z-RELEASE-epic.md`
- Security Audit: `vX.Y.Z-RELEASE-security-audit-checklist.md`
- Release Notes: `vX.Y.Z-RELEASE-notes.md`
- Migration Guide: `vX.Y.Z-RELEASE-migration-guide.md` (if applicable)

### GitHub Integration

**Labels:** Use these labels for release issues:

- `epic` - Release coordination issues
- `security` - Security audit requirements
- `priority:critical` - Release blocking issues
- `priority:high` - Security and quality issues

**Issue Creation:** Generate release issues with proper cross-references and blocking relationships

### Quality Gates

Before any production release:

- [ ] Security audit PASS result
- [ ] Performance benchmarks met (>90 Lighthouse)
- [ ] Zero critical bugs in testing
- [ ] All tests passing (unit + E2E)
- [ ] Documentation complete and accurate

### Release Documentation

- **Process Guide:** `/docs/releases/RELEASE-PROCESS.md`
- **Template Generator:** `/docs/releases/release-template-generator.md`
- **Agent Instructions:** `@docs/agents/astro-basics-release-manager.md`
- **Current Releases:** `/docs/releases/` (version-specific files)

### Emergency Releases

For critical security patches:

1. **Assessment** (< 1 hour): Evaluate severity
2. **Fast-Track Development** (< 4 hours): Minimal fix with essential testing
3. **Emergency Deployment** (< 6 hours): Direct to production with monitoring

**Rollback:** Automated triggers for authentication failures, data corruption, or performance degradation >50%

- always create guides in docs/guide using the project starlight integration
