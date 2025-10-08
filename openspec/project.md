# Project Context

## Purpose

**astro-basics-website** is a content-rich Astro website that serves as both a component library and a demonstration site. The project showcases modern web development practices with server-side rendering, authentication, multi-database support, and a comprehensive component system.

**Key Goals:**

- Provide exportable, reusable Astro and React components
- Demonstrate best practices for content management with multiple collections
- Showcase authentication patterns with Clerk integration
- Support flexible database backends (Supabase, Turso)
- Deliver high-performance, accessible web experiences
- Serve as a reference implementation for modern Astro applications

## Tech Stack

### Core Framework

- **Astro** (v5.1.7) - Static site generator with server-side rendering (`output: "server"`)
- **TypeScript** (v5.7.3) - Strict mode with enhanced safety rules
- **Node.js** - Runtime environment

### UI Libraries

- **React** (v19.0.0) - Client-side interactive components
- **SCSS** - Styling with custom compilation pipeline
- **@fpkit/acss** - Utility CSS framework integration

### Authentication & Database

- **Clerk** (@clerk/astro v2.1.6) - Authentication and user management
- **Supabase** (@supabase/supabase-js v2.47.10) - PostgreSQL with real-time features
- **Turso** (@libsql/client v0.14.0) - LibSQL edge database
- **Drizzle ORM** (v0.38.3) - Type-safe database abstraction layer

### Content & Markdown

- **MDX** (@astrojs/mdx v4.0.2) - Enhanced markdown with components
- **remark-toc** - Table of contents generation
- **rehype-accessible-emojis** - Accessible emoji rendering

### Testing & Quality

- **Vitest** (v2.1.8) - Unit testing framework
- **Playwright** (v1.50.0) - E2E testing (Chrome, Firefox, Safari)
- **ESLint** (v9.18.0) - JavaScript/TypeScript linting
- **Prettier** (v3.4.2) - Code formatting
- **StyleLint** (v16.11.0) - SCSS/CSS linting
- **markdownlint-cli** (v0.43.0) - Markdown linting

### Build & Development Tools

- **Vite** - Build tool and dev server
- **Workbox** (@vite-pwa/astro) - PWA and service worker support
- **Husky** (v9.1.7) - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files only

### Deployment Adapters

- **Netlify** (@astrojs/netlify) - Default deployment target
- **Node** (@astrojs/node) - Standalone server deployment
- **Vercel** (@astrojs/vercel) - Alternative deployment option

## Project Conventions

### Code Style

**Import Patterns:**

```typescript
// Use # alias for internal imports
import Header from '#components/astro/Header.astro'
import { SITE_TITLE } from '#utils/site-config'

// Use import type for type-only imports
import type { APIRoute } from 'astro'
import type { Props } from './types'
```

**Component Props Pattern:**

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

**Naming Conventions:**

- Files: kebab-case (`user-profile.ts`, `header-nav.astro`)
- Components: PascalCase (`UserProfile`, `HeaderNav`)
- Variables/Functions: camelCase (`getUserData`, `isAuthenticated`)
- Constants: UPPER_SNAKE_CASE (`SITE_TITLE`, `PAGINATION_COUNT`)
- Types/Interfaces: PascalCase with `Props` suffix for component props

**Formatting:**

- No emojis in markdown unless absolutely necessary
- JSDoc comments for all functions, methods, types, and interfaces
- Focus on "why" over "what" in comments for AI assistant comprehension
- Prefer explicit types over optional (`string | undefined` vs `string?`)

### Architecture Patterns

**Component System:**

- **Astro Components** (`src/components/astro/`) - Server-rendered, `.astro` extension
- **React Components** (`src/components/react/`) - Client-side interactive, `.tsx` extension
- **Dashboard Components** (`src/components/dashboard/`) - Protected routes requiring auth
- Components exported via `src/components/index.ts` for package consumption

**Database Abstraction:**

- Unified database interface in `src/libs/database.ts`
- Provider auto-detection based on environment configuration
- Shared TypeScript interfaces in `src/libs/database-types.ts`
- Seamless switching between Supabase and Turso without code changes
- Built-in backup/restore system for safe configuration changes

**Content Collections:**

- Three collections: `posts`, `docs`, `content` (shared schema in `src/content/config.ts`)
- Key fields: title, pubDate, description, author, tags, featured, publish, youtube
- Filter by `publish: true` for public content
- MDX support with component imports

**Authentication Flow:**

- Clerk middleware (`src/middleware.ts`) protects routes
- Protected routes: `/dashboard/*`, `/forum/*`, `/organization/*`
- Environment validation on startup
- Automatic sign-in redirects for unauthenticated users

**Comment System Architecture:**

- Polymorphic design supporting multiple content types (`post`, `doc`)
- Threaded comments with 3-level nesting
- Soft deletes (archived status)
- Rate limiting (5 comments/minute) with spam detection
- Content sanitization with DOMPurify
- Row-Level Security (RLS) policies in Supabase

**Styling System:**

- SCSS compilation: `src/styles/index.scss` → compressed CSS
- Component-specific styles in `src/styles/components/`
- Use `@use` instead of `@import` in SCSS
- CSS custom properties for theming
- Utility classes via @fpkit/acss integration

### Testing Strategy

**Unit Testing (Vitest):**

- Location: `/tests` directory
- Configuration excludes E2E tests
- Run: `npm test` or `npm test path/to/test.test.ts`
- Focus on utility functions, business logic, and component logic

**E2E Testing (Playwright):**

- Location: `/e2e` directory
- Runs on port 4321 (dev server required)
- Browsers: Chrome, Firefox, Safari (local), Chromium only (CI)
- Run: `npm run test:e2e` or `npx playwright test path/to/e2e.spec.ts`
- View reports: `npm run test:e2e:report`
- Requires: `npx playwright install` (one-time setup)

**Pre-commit Quality Gates:**

```bash
npm run fix:all       # Auto-fix all issues (recommended before commits)
npm run lint:all      # Check all linting without fixes
npm run type-check    # TypeScript type checking
```

**Testing Philosophy:**

- Test user-facing behavior, not implementation details
- E2E tests for critical user journeys
- Unit tests for complex logic and edge cases
- Accessibility testing via Playwright's accessibility tools

### Git Workflow

**Branch Structure:**

- **Main branch:** `primary` (target for all PRs)
- **Feature branches:** `feat/[feature-name]`
- **Refactor branches:** `refactor/[description]`
- **Fix branches:** `fix/[issue-description]`

**Commit Conventions:**

- Follow conventional commits format
- Use Husky pre-commit hooks (auto-installed via `npm run prepare`)
- lint-staged runs linters on staged files only
- All commits must pass linting, formatting, and type-check

**Release Process:**

- 4-phase workflow: Planning → Development → Preparation → Execution
- Security-first approach with mandatory audits
- Version-prefixed documentation (`vX.Y.Z-RELEASE-epic.md`)
- Use `astro-basics-release-manager` agent for automation
- See: `/docs/releases/RELEASE-PROCESS.md`

## Domain Context

**Content Management:**

- Three content collections with identical schemas
- YouTube video embedding support via frontmatter
- Featured content flagging for homepage highlights
- Tag-based categorization and filtering
- Publication control via `publish: true/false` flag

**User Roles (Supabase):**

- 3-tier hierarchy: `member` (default) → `admin` → `super_admin`
- Stored as PostgreSQL ENUM type
- Synced from Clerk's `publicMetadata.role`
- Used for RLS policies and access control

**Multi-tenancy:**

- Organization memberships via `organization_memberships` table
- Clerk organization integration
- User preferences stored per-user in `user_preferences` table

**PWA Support:**

- Service worker with auto-update strategy
- Offline support via Workbox
- Manifest with Astro Kit branding
- Lighthouse performance monitoring

## Important Constraints

**Security Requirements:**

- All releases must pass OWASP Top 10 2021 compliance checks
- Zero critical/high vulnerabilities before production deployment
- Row-Level Security (RLS) policies required for all user-facing tables
- Content sanitization for all user-generated content
- CSRF protection on all mutating API endpoints
- Rate limiting on comment creation (5/minute)

**TypeScript Strictness:**

- Strict mode enabled
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- No implicit any allowed

**Performance Targets:**

- Lighthouse score >90 across all metrics
- Production build time: 10-15 seconds
- First Contentful Paint (FCP) <1.5s
- Largest Contentful Paint (LCP) <2.5s

**Build Constraints:**

- Server-side rendering required (`output: "server"`)
- Dynamic adapter selection via `ASTRO_ADAPTER` environment variable
- Build warnings for getStaticPaths in dynamic pages are expected
- Dummy Clerk keys allow building but cause runtime auth errors

**Development Guidelines:**

- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files unless explicitly requested
- Always add JSDoc comments to functions, methods, types, and interfaces
- Use the code-comments agent for adding comprehensive comments

## External Dependencies

**Authentication:**

- **Clerk** (clerk.com)
  - Required keys: `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - Protected routes: `/dashboard/*`, `/forum/*`, `/organization/*`
  - Organization management and role-based access control

**Database Services:**

- **Supabase** (supabase.com)

  - PostgreSQL with real-time subscriptions
  - Required keys: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Row-Level Security policies for data protection
  - Migrations in `scripts/migrations/` (consolidated 2-migration approach)

- **Turso** (turso.tech)
  - LibSQL edge database
  - Required keys: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
  - Connection retry logic with exponential backoff
  - Transaction support via executeTransaction

**Deployment Platforms:**

- **Netlify** (default) - Serverless functions and edge deployment
- **Vercel** (alternative) - Edge functions and global CDN
- **Node** (standalone) - Self-hosted server deployment

**Content Sanitization:**

- **DOMPurify** - XSS protection for user-generated content
- Used in comment system and any user-input rendering

**GitHub Integration:**

- **GitHub CLI (gh)** - Issue creation and management
- Commands: `npm run ticket:create`, `npm run ticket:list`, `npm run ticket:labels`
- Required for release management workflow

**Build & Development:**

- **npm** - Package management
- **Vite** - Build tool and dev server (port 4321)
- **SCSS** - Stylesheet compilation pipeline
