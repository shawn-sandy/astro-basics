# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **astro-basics-website**, a collection of reusable Astro components and utilities for building content-rich websites. The project serves both as a component library and a working Astro site demonstrating the components.

## Essential Commands

### Development & Build

- `npm run dev` - Start Astro development server
- `npm run start` - Start dev server with Sass watcher in parallel (recommended for development)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run sass` - Watch and compile SCSS files to CSS (compressed)

### Testing

- `npm test` - Run Vitest unit tests (excludes e2e)
- `npm run test:e2e` - Run Playwright e2e tests (Chrome, Firefox, Safari)
- `npm run test:e2e:report` - View Playwright test reports

### Code Quality (Required before commits)

- `npm run fix:all` - Fix all auto-fixable issues (ESLint, StyleLint, Prettier, Markdown)
- `npm run lint:all` - Run all linting checks without fixes
- `npm run type-check` - Run TypeScript type checking

### Package Management

- `npm run npm-update` - Update all dependencies to latest versions
- `npm run npm-update-i` - Interactive dependency updates
- `npx @astrojs/upgrade` - Official Astro core and integration updates

### Database Management (Astro DB)

- `npm run db:push` - Push schema changes to local database
- `npm run db:push:remote` - Push schema changes to production database
- `npm run db:verify` - Verify database schema integrity
- `npm run db:execute` - Execute custom SQL commands

### GitHub Ticket Management

- `npm run ticket:validate` - Validate GitHub CLI authentication
- `npm run ticket:create` - Create GitHub issue via web interface
- `npm run ticket:list` - List open GitHub issues

## Project Setup

### Initial Setup

1. **Install dependencies**: `npm install`
2. **Setup pre-commit hooks**: `npm run prepare` (sets up Husky)
3. **Copy environment variables**: Copy `.env.example` to `.env` and configure Clerk keys
4. **Start development**: `npm run start` (dev server + SCSS watcher)
   - Database is auto-created at `.astro/content.db` on first run
   - Sample data is automatically seeded from `db/seed.ts`

### Branch Structure

- **Main branch**: `primary` (use for pull requests)

## Architecture

### Component Library Structure

The project exports components through `src/components/index.ts` with two main categories:

- **Astro Components** (`src/components/astro/`): Server-side rendered .astro components
- **React Components** (`src/components/react/`): Client-side React components (.tsx)
- **Dashboard Components** (`src/components/dashboard/`): Protected dashboard components

### Data Architecture

**Content Collections** (Static content):

- `posts` - Blog posts
- `docs` - Documentation content
- `content` - General content articles

**Astro DB** (Dynamic data):

- `User` - User accounts and profiles
- `Post` - Database-stored blog posts with analytics
- `Comment` - Post comments with threading support
- `Analytics` - Page view tracking and statistics
- `ContactSubmission` - Form submissions management
- `Newsletter` - Email subscriber management

Schema includes: title, pubDate, description, author, tags, featured status, breadcrumbSlug, publish status, and optional YouTube integration.

### Key Configuration

- **Path Aliases**: `#*` maps to `./src/*` for cleaner imports
- **Server-side Rendering**: Uses `output: "server"` mode (not static)
- **Authentication**: Clerk integration with protected routes (`/dashboard`, `/forum`, `/organization`)
- **Adapters**: Netlify (active), Node.js/Vercel (available via `ASTRO_ADAPTER` env var)

### Styling System

- SCSS compilation: `src/styles/index.scss` → `src/styles/index.css` (compressed)
- CSS custom properties for theming
- @fpkit/acss utility framework integration
- Component-specific styles in `src/styles/components/`

## TypeScript & Development Guidelines

### Naming Conventions

- **Files**: kebab-case (e.g., `my-component.ts`)
- **Variables/Functions**: camelCase (e.g., `myVariable`, `myFunction()`)
- **Classes/Types/Interfaces**: PascalCase (e.g., `MyClass`, `MyInterface`)
- **Constants/Enums**: ALL_CAPS (e.g., `MAX_COUNT`, `Color.RED`)
- **Generic Type Parameters**: Prefix with `T` (e.g., `TKey`, `TValue`)

### Import/Export Standards

```typescript
// Use import type for type-only imports
import type { User } from './user'
import type { APIRoute } from 'astro'

// Use # alias for internal imports
import { SITE_TITLE } from '#utils/site-config'
import Header from '#components/astro/Header.astro'

// Group imports: external dependencies first, then internal
import { getCollection } from 'astro:content'
import { PAGINATION_COUNT } from '#utils/site-config'
```

### Props & Type Definitions

```typescript
// Preferred: Export type Props pattern
export type Props = {
  title: string
  description: string | undefined // Prefer explicit over optional (?)
  featured?: boolean // Use sparingly, only for truly optional props
}

// Component usage
const { title, description, featured = false } = Astro.props
```

### Function Return Types

- Declare return types for top-level module functions
- Exception: React/Astro components don't need JSX return type

```typescript
const myFunc = (): string => {
  return 'hello'
}

// Components - no return type needed
const MyComponent = () => {
  return <div>Hello</div>
}
```

## CSS & Styling

### SCSS Architecture

```scss
// Use @use instead of @import
@use '#styles/variables' as *;

.component-name {
  // CSS custom properties with kebab-case
  --primary-color: #{$color-primary};

  // Modern CSS features
  padding-block: 2rem; // Logical properties

  &:has([data-grid]) {
    // Modern selectors
  }
}
```

### Key Patterns

- CSS custom properties for theming (`:root` level design tokens)
- Modern CSS features: logical properties, `:has()` pseudo-class, CSS Grid
- Component-specific styles in `src/styles/components/`
- @fpkit/acss utility integration with `data-*` attributes

## Authentication & Environment

### Clerk Integration

- Uses `@clerk/astro` for user authentication
- Protected routes: `/dashboard`, `/forum`, `/organization` (via `src/middleware.ts`)
- Required environment variables:
  - `PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication (public)
  - `CLERK_SECRET_KEY` - Clerk authentication (private)
- Copy `.env.example` to `.env` and configure Clerk keys for development

### Deployment Adapters

- **Active**: Netlify (`@astrojs/netlify`)
- **Alternative**: Node.js/Vercel (via `ASTRO_ADAPTER` environment variable)
- Server-side rendering mode (`output: "server"`) requires environment variables at build time

## Testing & Development

### Testing Configuration

- **Unit Tests**: Vitest in `/tests` directory (excludes e2e)
- **E2E Tests**: Playwright in `/e2e` directory (Chrome, Firefox, Safari on port 4321)
- Test results in `/test-results`, reports in `/playwright-report`

### Development Notes

- Port 4321 is standard development server port
- Uses `npm-run-all` for parallel script execution (`npm run start`)
- TypeScript strict mode enabled with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- Pre-commit hooks (Husky + lint-staged) enforce code quality
- Current Astro version: 5.12.3

### Key Integrations

- **Astro DB**: Type-safe database with local SQLite development and LibSQL production
- **React**: Client islands for interactive components
- **MDX**: Enhanced markdown with remark-toc and rehype-accessible-emojis
- **astro-imagetools**: Image optimization and processing
- **astro-embed**: Enhanced content embedding capabilities
- **PWA**: Service worker and offline capabilities via @vite-pwa/astro
- **Sentry**: Error monitoring with Spotlight for development debugging

## Package Structure

This is published as an npm package with:

- Main export: `src/components/index.ts` (all components)
- Astro-specific export: `src/components/astro` (Astro components only)

## Component Templates

### Astro Component Template

```astro
---
export type Props = {
  title: string
  className?: string
}

const { title, className = '' } = Astro.props
---

<div class={`component-name ${className}`}>
  <h2>{title}</h2>
  <slot />
</div>

<style lang="scss">
  @use '#styles/variables' as *;

  .component-name {
    // Component-specific styles
  }
</style>
```

### React Component Template

```tsx
export type Props = {
  title: string
  onClick?: () => void
  className?: string
}

export function ComponentName({ title, onClick, className = '' }: Props) {
  return (
    <div className={`component-name ${className}`}>
      <button onClick={onClick} type="button">
        {title}
      </button>
    </div>
  )
}
```

## Content Collection Schema

### Frontmatter Standards

```yaml
---
title: 'Post Title'
pubDate: 2024-01-15
description: 'Brief description'
author: 'Author Name'
tags: ['tag1', 'tag2']
featured: false
breadcrumbSlug: 'custom-slug'
publish: true
youtube:
  id: 'optional-video-id'
  title: 'optional-title'
---
```

### Content Collection Patterns

- Use `getCollection()` with proper filtering for published content
- Leverage `slugify()` utility from `#libs/content` for URL generation
- All three collections (`posts`, `docs`, `content`) share the same schema

### Database Usage Patterns

```typescript
// Import database utilities
import { db, Post, User, Comment } from 'astro:db'
import { eq, desc, and, or, like } from 'astro:db'

// Basic queries
const posts = await db
  .select()
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .all()

// Joins and aggregations
const postsWithAuthors = await db
  .select({
    title: Post.title,
    author: User.name,
    commentCount: sql`(SELECT COUNT(*) FROM ${Comment} WHERE ${Comment.postId} = ${Post.id})`,
  })
  .from(Post)
  .leftJoin(User, eq(Post.userId, User.id))
  .all()
```

Database file location: `.astro/content.db` (auto-created)
Reset database: `rm -rf .astro && npm run dev`

## Development Workflow

### Before Committing

1. Run `npm run fix:all` to auto-fix all issues
2. Ensure tests pass with `npm test` and `npm run test:e2e`
3. Pre-commit hooks automatically run ESLint, StyleLint, and Prettier

### Key Files & Utilities

- `src/utils/site-config.ts` - Site constants (`PAGINATION_COUNT: 2`, breadcrumbs, contact info)
- `src/libs/content.ts` - Content utility functions (Slugify, Truncate)
- `src/utils/contact.ts` - Form validation utilities
- `src/constants/formErrors.ts` - Form error constants

### Documentation

- Comprehensive development docs in `docs/` folder
- PRD (Product Requirements Document) in `/docs/PRD/` for feature planning
- Linting guide available at `/docs/LINTING_GUIDE.md`
