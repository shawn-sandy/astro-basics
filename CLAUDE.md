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
- `npx @astrojs/upgrade` - Official Astro core and integration updates (use astro-package-updater agent for comprehensive testing)

### GitHub Ticket Management

- `npm run ticket:validate` - Validate GitHub CLI authentication and repository access
- `npm run ticket:create` - Create GitHub issue via web interface (uses issue templates)
- `npm run ticket:list` - List open GitHub issues
- `npm run ticket:labels` - View available GitHub labels

**Automated Ticket Creation**: Use the `github-ticket-creator` agent for comprehensive ticket generation with proper labels, assignments, and project context. The agent supports both manual command generation and automatic execution when requested.

## Project Setup

### Initial Setup

1. **Install dependencies**: `npm install`
2. **Setup pre-commit hooks**: `npm run prepare` (sets up Husky)
3. **Copy environment variables**: Copy `.env.example` to `.env` and configure Clerk keys
4. **Start development**: `npm run start` (dev server + SCSS watcher)

### Branch Structure

- **Main branch**: `main` (use for pull requests)

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

## CSS & Styling Implementation

### CSS Architecture

#### File Structure & Organization

```
src/styles/
├── index.scss              # Main stylesheet (source)
├── index.css               # Compiled output (compressed)
├── index.css.map           # Source map for debugging
├── _base.scss              # Base styles and CSS custom properties
└── components/
    ├── _alert.scss         # Alert component styles
    ├── _card.scss          # Card component with hover states
    ├── _form.scss          # Form validation and styling
    └── _header.scss        # Header component styles
```

#### Build System

- **Source**: `src/styles/index.scss` (main SCSS file)
- **Output**: `src/styles/index.css` (compressed CSS)
- **Watch Command**: `npm run sass` (auto-compiles on changes)
- **Development**: `npm run start` (dev server + sass watcher in parallel)

#### Import Structure

```scss
// src/styles/index.scss
@use './base'; // Base styles and CSS custom properties
@use './components/card'; // Card component styles
@use './components/form'; // Form validation styles
@use './components/alert'; // Alert component styles
```

### CSS Custom Properties System

#### Root-level Design Tokens

```css
:root {
  --img-radius: 1rem; /* Image border radius */
  --error-color: firebrick; /* Error state color */
  --success-color: green; /* Success state color */
  --max-content-width: 1280px; /* Maximum content width */
}
```

#### Component-level Properties

```scss
// Example: Card component custom properties
section:has([data-grid], [data-flex]) {
  --card-gap: 1rem; // Gap between cards
  --space-l: 3rem; // Large spacing
  --px: 1rem; // Padding inline
  --content-w: 100%; // Content width
}
```

### Styling Conventions

#### SCSS Best Practices

```scss
// Use @use instead of @import for better performance
@use '#styles/variables' as *;
@use '#styles/mixins' as *;

.component-name {
  // CSS custom properties with kebab-case
  --primary-color: #{$color-primary};
  --spacing-unit: #{$spacing-base};

  // Component styles using custom properties
  background-color: var(--primary-color);
  padding: var(--spacing-unit);

  // Nested selectors with BEM-like structure
  &__element {
    // Element styles
  }

  &--modifier {
    // Modifier styles
  }
}
```

#### Modern CSS Features

```scss
// Logical properties for internationalization
padding-block: 2rem; // Top and bottom padding
padding-inline: 1rem; // Left and right padding
margin-block-start: 1.5rem; // Top margin

// CSS Grid with named areas
grid-template-rows: 'pile'; // Named grid area
grid-area: pile; // Assign to named area

// Modern selectors
section:has([data-grid]) {
  // :has() pseudo-class
  // Styles for sections containing data-grid elements
}

img + * {
  // Adjacent sibling selector
  padding-block-start: 1rem;
}
```

### Component Styling Patterns

#### Form Validation Styling

```scss
// Visual feedback for form validation
form {
  input:user-invalid:not(:focus) {
    background-color: #ffe6e6;
    outline: thin solid var(--error-color);

    + p {
      // Error message styling
      color: var(--error-color);

      &::before {
        content: '⚠ '; // Warning icon prefix
      }
    }
  }

  input:user-valid:not(:focus) {
    background-color: #e6ffe6;
    outline: thin solid var(--success-color);

    + p {
      display: none; // Hide error message
    }
  }
}
```

#### Alert Component Pattern

```scss
.alert {
  border-radius: 0.25rem;
  padding: 1rem;
  padding-inline-start: 1.5rem; // Logical property

  // Variant modifiers using BEM-like naming
  &-error {
    background-color: #f8d7da;
    border-color: #f5c6cb;
    color: #721c24;
  }

  &-success {
    background-color: #d4edda;
    border-color: #c3e6cb;
    color: #155724;
  }

  &-info {
    background-color: #d1ecf1;
    border-color: #bee5eb;
    color: #0c5460;
  }
}
```

#### Card Component with Advanced Interactions

```scss
.card {
  &:has(a:first-of-type:empty) {
    // Cards with empty anchor links
    border: lightgray solid thin;
    display: grid;
    grid-template-rows: 'pile'; // Stack elements
    position: relative;

    > a:empty {
      // Invisible overlay link
      position: absolute;
      top: 0;
      bottom: 0;
      width: 100%;
      z-index: 99;
      background-color: transparent;
    }

    &:has(a:empty:hover) {
      // Hover state styling
      border: blue solid thin;
    }

    div:has(a:not(:empty), button:not(:empty)) {
      position: absolute; // Positioned action buttons
      right: 0;
      z-index: 999; // Above overlay link
    }
  }
}
```

### Framework Integration

#### @fpkit/acss Integration

```typescript
// Import order in Layout.astro
import '@fpkit/acss/styles' // External utility framework
import '../styles/index.css' // Project-specific styles
```

#### Utility Classes Usage

```html
<!-- Use @fpkit/acss utilities alongside custom styles -->
<div data-grid="auto-fit" class="custom-component">
  <div data-flex="center">Content</div>
</div>
```

### Development Workflow

#### CSS Development Commands

```bash
# Watch and compile SCSS files
npm run sass

# Run development server with SCSS watcher
npm run start

# Lint CSS/SCSS files
npm run lint:styles

# Fix CSS/SCSS linting issues
npm run lint:styles:fix

# Check all code quality (includes CSS)
npm run lint:all

# Fix all auto-fixable issues
npm run fix:all
```

#### StyleLint Configuration

- Configured for SCSS and CSS files in `src/**/*.{css,scss}`
- Integrated with pre-commit hooks via Husky + lint-staged
- Auto-fix capability for consistent code formatting

### Responsive Design Patterns

#### Content Width Management

```css
/* Consistent content width across layout */
body > section,
main {
  margin: auto;
  width: min(100%, var(--max-content-width)); /* Responsive width with max constraint */
}

/* Responsive padding */
main > section {
  padding-inline: 2rem; /* Consistent horizontal padding */
}
```

#### Typography & Spacing

```css
/* Content-aware typography */
article p {
  max-width: 80ch; /* Optimal reading width */
}

p {
  max-width: 60ch; /* General paragraph width */
}

/* Consistent vertical rhythm */
article > * + * {
  margin-block-start: 1.5rem; /* Vertical spacing between elements */
}
```

### Accessibility Considerations

#### Semantic Styling

```css
/* Enhance semantic elements */
code {
  color: rgb(158, 49, 49); /* Distinct code color */
  font-size: smaller; /* Appropriate code size */
}

/* Focus states for interactive elements */
input:focus,
textarea:focus,
select:focus {
  outline: 2px solid var(--primary-color); /* Clear focus indicators */
}
```

#### Visual Feedback

```css
/* Form validation accessibility */
form label:where(+ input[required])::after {
  color: var(--error-color);
  content: ' required *'; /* Screen reader friendly */
  font-size: smaller;
}
```

### Performance Considerations

#### CSS Optimization

- SCSS compiled to compressed CSS for production
- Source maps generated for development debugging
- Minimal CSS custom property usage for optimal performance
- Logical properties for better browser optimization

#### Best Practices

- Use `@use` instead of `@import` for better SCSS performance
- Leverage CSS custom properties for theming without JavaScript
- Employ modern CSS features like `:has()` and logical properties
- Organize component styles for better maintainability and tree-shaking

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
- **Current Astro Version**: 5.12.3 (use `npx @astrojs/upgrade` for updates)

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

## Agent Integration

This project includes specialized Claude Code agents in `.claude/agents/` for enhanced productivity:

### Available Agents

- **github-ticket-creator**: Creates comprehensive GitHub issues with proper team assignments, labels, and project context. Features automatic execution capabilities, authentication validation, and error handling for reliable ticket creation.
- **astro-package-updater**: Updates Astro core packages using official `npx @astrojs/upgrade` command and ensures project compatibility with comprehensive testing.
- **astro-basics-code-reviewer**: Expert code review specialist for this project, focusing on Astro components, TypeScript, and SSR considerations.
- **code-reviewer**: General code review specialist for quality, performance, security, accessibility, and maintainability.

### Agent Usage

Claude Code automatically suggests appropriate agents based on task context. You can also explicitly request agent usage:

- Use `/agent github-ticket-creator` for creating GitHub issues
- Use `/agent astro-package-updater` for Astro version updates
- Agents are invoked automatically for code reviews after significant changes

### GitHub Issue Management

#### Issue Templates

Standardized GitHub issue templates are available in `.github/ISSUE_TEMPLATE/`:

- **Feature Request** (`feature_request.yml`) - For new features and functionality
- **Bug Report** (`bug_report.yml`) - For reporting bugs and issues
- **Enhancement** (`enhancement.yml`) - For improving existing features

#### Automated Workflows

- **Ticket Automation** (`.github/workflows/ticket-automation.yml`) - Workflow for creating tickets via GitHub Actions with manual dispatch
- **Manual Scripts** - Use `npm run ticket:*` commands for local ticket management
- **Agent Integration** - The `github-ticket-creator` agent provides intelligent ticket creation with validation and error handling

## Documentation

- Comprehensive development docs in `docs/` folder
  - PRD (Product Requirements Document) available for feature planning and tracking in `/docs/PRD/`
