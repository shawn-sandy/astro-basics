# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**astro-basics-website** is a content-rich Astro website that serves as both a component library and a demonstration site. It uses server-side rendering (`output: "server"`), integrates Clerk authentication, and supports multiple database backends (Supabase, Turso).

## Essential Commands

### Development

```bash
npm run start          # Recommended: dev server + SCSS watcher in parallel
npm run dev           # Astro dev server only (port 4321)
npm run sass          # Watch and compile SCSS (src/styles/index.scss → index.css)
```

### Build & Testing

```bash
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Run Vitest unit tests (excludes e2e)
npm run test:e2e      # Run Playwright e2e tests
```

### Code Quality (Run before commits)

```bash
npm run fix:all       # Auto-fix all issues (ESLint, StyleLint, Prettier, Markdown)
npm run lint:all      # Check all linting without fixes
npm run type-check    # TypeScript type checking
```

### Single Test Execution

```bash
npm test path/to/test.test.ts       # Run specific Vitest test
npx playwright test path/to/e2e.spec.ts  # Run specific Playwright test
```

## Architecture

### Component System

The project exports components through `src/components/index.ts`:

- **Astro Components** (`/astro/`): Server-rendered, use `.astro` extension
- **React Components** (`/react/`): Client-side interactive, use `.tsx` extension
- **Dashboard Components** (`/dashboard/`): Protected routes requiring authentication

Components are consumed internally via path aliases (`#components/astro/Header.astro`).

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
- **Current feature**: `feat/turso-db`

## Key Utilities

- `src/utils/site-config.ts`: Site constants, PAGINATION_COUNT=2
- `src/libs/content.ts`: Slugify, Truncate utilities
- `src/constants/formErrors.ts`: Form validation messages
