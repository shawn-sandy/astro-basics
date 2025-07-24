# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **@shawnsandy/astro-kit**, a collection of reusable Astro components and utilities for building content-rich websites. The project serves both as a component library and a working Astro site demonstrating the components.

## Essential Commands

### Development

- `npm run dev` - Start Astro development server (opens browser automatically)
- `npm run start` - Start dev server with Sass watcher in parallel
- `npm run sass` - Watch and compile SCSS files to CSS (compressed)

### Build & Deploy

- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally

### Testing

- `npm test` - Run Vitest unit tests (excludes e2e folder)
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:report` - View Playwright test reports
- `npx playwright test` - Alternative command for e2e tests (requires server running)

### Code Quality

- `npm run lint` - Run ESLint with auto-fix
- `npm run lint:check` - Run ESLint without fixes
- `npm run lint:styles` - Run StyleLint for SCSS/CSS
- `npm run lint:styles:fix` - Fix StyleLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check Prettier formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run lint:md` - Lint Markdown files
- `npm run lint:md:fix` - Fix Markdown linting issues
- `npm run lint:all` - Run all linting checks
- `npm run fix:all` - Fix all auto-fixable issues

**Comprehensive Linting Setup**: See `/docs/LINTING_GUIDE.md` for detailed configuration and usage

**Pre-commit Automation**: Husky + lint-staged automatically runs ESLint, StyleLint, and Prettier on staged files before each commit

### Package Management

- `npm run npm-update` - Update all dependencies to latest versions
- `npm run npm-update-i` - Interactive dependency updates

## Project Setup

### Initial Setup

1. **Install dependencies**: `npm install`
2. **Setup pre-commit hooks**: `npm run prepare` (sets up Husky)
3. **Copy environment variables**: Copy `.env.example` to `.env` and configure Clerk keys
4. **Start development**: `npm run start` (dev server + SCSS watcher)

### Branch Structure

- **Main branch**: `main` (use for pull requests)
- **Current feature branch**: `feat/testing-setup`

## Architecture

### Component Library Structure

The project exports components through `src/components/index.ts` with two main categories:

- **Astro Components** (`src/components/astro/`): Server-side rendered .astro components
- **React Components** (`src/components/react/`): Client-side React components (.tsx)

### Content Architecture

Uses Astro's content collections with three main collections defined in `src/content/config.ts`:

- `posts` - Blog posts
- `docs` - Documentation content
- `content` - General content articles

All collections share the same schema including frontmatter for title, pubDate, description, author, tags, featured status, breadcrumbSlug, publish status, and optional YouTube integration.

### Path Aliases

Uses `#*` import alias mapping to `./src/*` for cleaner imports across the codebase.

```typescript
// Example usage:
import { SITE_TITLE } from '#utils/site-config'
import Header from '#components/astro/Header.astro'
```

### Styling System

- SCSS-based styling in `src/styles/`
- Component-specific styles in `src/styles/components/`
- Sass watcher compiles to `src/styles/index.css` (compressed)
- Uses @fpkit/acss for additional CSS utilities

### Site Configuration

- `src/utils/site-config.ts` - Contains site constants (title, description, `PAGINATION_COUNT: 2`, breadcrumbs, contact info)
- `src/libs/content.ts` - Content utility functions (Slugify, Truncate)

### Testing Setup

- **Unit Tests**: Vitest with Astro configuration in `/tests` directory, excludes e2e tests
- **E2E Tests**: Playwright configured for multi-browser testing in `/e2e` directory (Chrome, Firefox, Safari)
- Test server runs on port 4321 using `npm run start` for e2e testing
- Test results stored in `/test-results` and reports in `/playwright-report`

### Deployment Configuration

**Active Adapter**: Netlify (`@astrojs/netlify`) - Currently configured in `astro.config.mjs`
**Alternative Adapter**: Node.js (`@astrojs/node`) - Available but commented out, supports standalone mode

### Key Integrations

- React support for interactive components
- MDX for rich content authoring with remark-toc and rehype-accessible-emojis
- Image optimization with astro-imagetools
- YouTube embeds, RSS feeds, and sitemap generation
- Performance auditing with astro-lighthouse
- Enhanced content embedding with astro-embed
- Error monitoring with Sentry and development debugging with Spotlight

## Package Structure

This is published as an npm package with:

- Main export: `src/components/index.ts` (all components)
- Astro-specific export: `src/components/astro` (Astro components only)
- Files include: component index and all .astro files

## Authentication & Security

### Clerk Integration

- Uses `@clerk/astro` for user authentication
- Requires environment variables: `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- Middleware (`src/middleware.ts`) protects routes like `/dashboard` and `/forum`
- Authentication components (`SignedIn`, `SignedOut`, `UserButton`, `SignInButton`) integrated in layout
- Auth-specific layout available at `src/layouts/Auth.astro`

### Route Protection

- Protected routes require authentication via middleware
- Public routes are freely accessible
- Navigation includes authentication-aware slots

## Environment Configuration

### Required Environment Variables

- `PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication (public)
- `CLERK_SECRET_KEY` - Clerk authentication (private)
- Optional: Contentful CMS integration variables for content management
- See `.env.example` for complete environment variable structure

### Development vs Production

- Development uses test Clerk environment
- Production requires live Clerk application setup
- Server-side rendering mode requires environment variables at build time

## Enhanced Integrations

### Error Monitoring & Performance

- `@sentry/astro` - Error tracking and monitoring
- `astro-lighthouse` - Performance auditing
- `@spotlightjs/astro` - Development debugging (configurable)

### Content & Media

- `astro-embed/integration` - Enhanced content embedding
- `astro-imagetools` - Advanced image processing and optimization
- `rehype-accessible-emojis` - Accessible emoji rendering in MDX
- `remark-toc` - Table of contents generation for markdown

### Development Tools

- `@total-typescript/ts-reset` - Enhanced TypeScript experience (imported in `reset.d.ts`)
- Prettier with Astro plugin for code formatting
- Husky + lint-staged for pre-commit automation
- Form validation utilities in `src/utils/contact.ts`
- Constants for form errors in `src/constants/formErrors.ts`

## Development Notes

- Port 4321 is the standard development server port
- **Server-side rendering**: Project uses `output: "server"` mode (not static)
- **TypeScript Configuration**: Strict mode enabled with null checks, exact optional properties, and React JSX transform
- Enhanced parallel development with `npm run start` (dev + sass watching)
- Uses `npm-run-all` for parallel script execution
- Database-ready: Documentation exists for Astro DB integration (future enhancement)

### TypeScript Strict Configuration

```json
{
  "strict": true,
  "strictNullChecks": true,
  "noImplicitAny": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

## Code Style Guidelines

### Component Architecture & Naming

#### File Naming Conventions

- **Astro Components**: PascalCase (e.g., `Header.astro`, `PostCard.astro`)
- **React Components**: PascalCase with `.tsx` extension (e.g., `ThemeToggle.tsx`)
- **SCSS Files**: Underscore prefix for partials (e.g., `_variables.scss`, `_mixins.scss`)
- **Utility Files**: camelCase (e.g., `site-config.ts`, `content.ts`)

#### Directory Structure

- `/src/components/astro/` - Server-side rendered Astro components
- `/src/components/react/` - Client-side interactive React components
- `/src/styles/components/` - Component-specific SCSS files
- Component exports via `/src/components/index.ts` for both categories

### TypeScript Patterns

#### Props & Interface Definitions

```typescript
// Preferred: Export type Props pattern
export type Props = {
  title: string
  description?: string
  featured?: boolean
}

// Component usage
const { title, description = 'Default description', featured = false } = Astro.props
```

#### Type Annotations

- Use explicit types for component props and function parameters
- Leverage TypeScript strict mode settings (already configured)
- Use optional properties (`?`) for non-required props
- Employ `exactOptionalPropertyTypes` for precise optional handling

### Import/Export Standards

#### Path Alias Usage

```typescript
// Use # alias for internal imports
import { SITE_TITLE } from '#utils/site-config'
import Header from '#components/astro/Header.astro'
import { ThemeToggle } from '#components/react/ThemeToggle'

// Group imports: external dependencies first, then internal
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { PAGINATION_COUNT } from '#utils/site-config'
```

#### Re-export Patterns

```typescript
// Component index files should export all components
export { default as Header } from './astro/Header.astro'
export { default as Footer } from './astro/Footer.astro'
export { ThemeToggle } from './react/ThemeToggle'
```

### Component Structure Templates

#### Astro Component Template

```astro
---
// TypeScript frontmatter
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

#### React Component Template

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

### Styling Conventions

#### SCSS Architecture

```scss
// Use @use instead of @import
@use '#styles/variables' as *;
@use '#styles/mixins' as *;

.component-name {
  // CSS custom properties with kebab-case
  --primary-color: #{$color-primary};
  --spacing-unit: #{$spacing-base};

  // Component styles
  background-color: var(--primary-color);
  padding: var(--spacing-unit);
}
```

#### Utility Patterns

- Use `data-*` attributes for JavaScript hooks: `data-theme-toggle`
- Employ CSS custom properties for dynamic theming
- Follow BEM-like naming for complex components
- Leverage @fpkit/acss utilities where appropriate

### Content & Collections

#### Frontmatter Standards

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
youtubeId: 'optional-video-id'
---
```

#### Content Collection Patterns

- Use consistent schema across `posts`, `docs`, and `content` collections
- Employ `getCollection()` with proper filtering for published content
- Leverage `slugify()` utility from `#libs/content` for URL generation

### Development Workflow Integration

#### Code Quality Commands

- Run `npm run fix:all` before committing to auto-fix issues
- Use `npm run lint:all` for comprehensive checking
- Leverage pre-commit hooks (Husky + lint-staged) for automated quality control
- Reference `/docs/LINTING_GUIDE.md` for detailed linting configuration

#### Testing Patterns

- Unit tests in `/tests` directory using Vitest
- E2E tests in `/e2e` directory using Playwright
- Test server on port 4321 using `npm run start`
- Follow existing test structure and naming conventions

### Accessibility Standards

- Include `aria-*` attributes for interactive elements
- Use semantic HTML elements (`<nav>`, `<main>`, `<article>`)
- Ensure keyboard navigation support for interactive components
- Test with screen readers and automated accessibility tools

## Documentation

- Comprehensive development docs in `docs/` folder
  - PRD (Product Requirements Document) available for feature planning and tracking in `/docs/PRD/`
