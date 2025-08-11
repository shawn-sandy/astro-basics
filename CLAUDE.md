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
- Additional API routes can be added in `src/pages/api/`

### Authentication Flow

Clerk middleware (`src/middleware.ts`) protects routes:

- Protected: `/dashboard/*`, `/forum/*`, `/organization/*`
- Validation: Checks for `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` on startup
- Redirects unauthenticated users to sign-in

### Content Collections

Three collections share identical schema (`src/content/config.ts`):

- `posts`, `docs`, `content`
- Key fields: title, pubDate, description, author, tags, featured, publish, youtube
- Filter by `publish: true` when rendering public content

### Database Integration

- **Supabase**: Client initialized when env vars present
- **Turso**: LibSQL client at `src/libs/turso.ts`, validates `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on import

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

### Optional Services

```env
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

## Branch Structure

- **Main branch**: `primary` (target for PRs)
- **Feature branches**: `feat/[feature-name]` convention

## Key Utilities and Libraries

- `src/utils/site-config.ts`: Site constants, PAGINATION_COUNT=2
- `src/libs/content.ts`: Slugify, Truncate utilities
- `src/constants/formErrors.ts`: Form validation messages
- `src/libs/turso.ts`: Turso database client with retry logic and message operations
- `src/libs/supabase.ts`: Supabase client initialization

## Project-Specific Patterns

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
