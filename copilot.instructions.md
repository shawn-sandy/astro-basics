# GitHub Copilot Instructions for @shawnsandy/astro-kit

## Project Overview

@shawnsandy/astro-kit is a collection of reusable Astro components and utilities for building
content-rich websites. The project serves both as a component library and a working Astro site
demonstrating the components. It uses server-side rendering (SSR) mode with Astro 5.x and includes
React client islands for interactivity.

## Architecture

### Component Structure

- **Astro Components**: Server-side rendered `.astro` files in `src/components/astro/`
- **React Components**: Client-side interactive `.tsx` files in `src/components/react/`
- **Dashboard Components**: Specialized components in `src/components/dashboard/`
- **Component Exports**: All components exported via `src/components/index.ts`

### Path Aliases

Use `#*` import aliases mapping to `./src/*`:

```typescript
import { SITE_TITLE } from '#utils/site-config'
import Header from '#components/astro/Header.astro'
import { ThemeToggle } from '#components/react/ThemeToggle'
```

### Content Collections

Three main collections defined in `src/content/config.ts`:

- `posts` - Blog posts
- `docs` - Documentation content
- `content` - General content articles

## Component Development Patterns

### Astro Component Template

```astro
---
export type Props = {
  readonly title: string
  readonly className?: string
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
  readonly title: string
  readonly onClick?: () => void
  readonly className?: string
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

### TypeScript Conventions

- Use `export type Props = {...}` pattern for component props
- Prefer `readonly` properties by default
- Use explicit return types for top-level functions (except JSX components)
- Leverage strict TypeScript configuration with `noUncheckedIndexedAccess`
- Use named exports instead of default exports (except when required by framework)

## Styling System

### SCSS Architecture

```scss
// Use @use instead of @import
@use '#styles/variables' as *;
@use '#styles/mixins' as *;

.component-name {
  // CSS custom properties with kebab-case
  --primary-color: #{$color-primary};
  --spacing-unit: #{$spacing-base};

  // Component styles using custom properties
  background-color: var(--primary-color);
  padding: var(--spacing-unit);
}
```

### CSS Custom Properties

```css
:root {
  --img-radius: 1rem;
  --error-color: firebrick;
  --success-color: green;
  --max-content-width: 1280px;
}
```

### Development Workflow

- `npm run sass` - Watch and compile SCSS to CSS (compressed)
- `npm run start` - Dev server + SCSS watcher in parallel
- SCSS source: `src/styles/index.scss`
- Compiled output: `src/styles/index.css`

## Authentication Patterns

### Clerk Integration

```typescript
// Middleware protection
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export const onRequest = clerkMiddleware((auth, context) => {
  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }
})
```

### Auth Components Usage

```astro
---
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/astro/components'
---

<SignedIn>
  <UserButton />
</SignedIn>
<SignedOut>
  <SignInButton />
</SignedOut>
```

## Content Management

### Content Collection Schema

```typescript
const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string(),
    author: z.string(),
    breadcrumbSlug: z.string().optional(),
    tags: z.array(z.string()).optional(),
    publish: z.boolean().default(false),
    featured: z.boolean().default(false),
    youtube: z
      .object({
        id: z.string(),
        title: z.string().optional(),
      })
      .optional(),
  }),
})
```

### Content Usage Patterns

```typescript
import { getCollection } from 'astro:content'

// Get published posts only
const posts = await getCollection('posts', ({ data }) => data.publish)

// Filter featured content
const featured = posts.filter(post => post.data.featured)
```

## Import/Export Standards

### Component Index Pattern

```typescript
// Export all components from index.ts
export { default as Header } from './astro/Header.astro'
export { default as Footer } from './astro/Footer.astro'
export { ThemeToggle } from './react/ThemeToggle'
```

### Import Organization

```typescript
// External dependencies first
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

// Internal imports with # aliases
import { SITE_TITLE } from '#utils/site-config'
import Header from '#components/astro/Header.astro'
```

## Testing Patterns

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  it('renders correctly', () => {
    const { getByText } = render(<ComponentName title="Test" />)
    expect(getByText('Test')).toBeInTheDocument()
  })
})
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
})
```

## Development Commands

```bash
# Development
npm run dev          # Start Astro development server
npm run start        # Dev server + SCSS watcher in parallel
npm run sass         # Watch and compile SCSS files

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run Vitest unit tests
npm run test:e2e     # Run Playwright e2e tests

# Code Quality
npm run lint         # ESLint with auto-fix
npm run lint:styles  # StyleLint for SCSS/CSS
npm run format       # Prettier formatting
npm run type-check   # TypeScript checking
npm run lint:all     # All linting checks
npm run fix:all      # Fix all auto-fixable issues
```

## Common Patterns

### Form Validation

```scss
form {
  input:user-invalid:not(:focus) {
    background-color: #ffe6e6;
    outline: thin solid var(--error-color);
  }

  input:user-valid:not(:focus) {
    background-color: #e6ffe6;
    outline: thin solid var(--success-color);
  }
}
```

### Card Component with Hover

```scss
.card {
  &:has(a:first-of-type:empty) {
    border: lightgray solid thin;
    display: grid;
    grid-template-rows: 'pile';
    position: relative;

    > a:empty {
      position: absolute;
      inset: 0;
      z-index: 99;
    }

    &:has(a:empty:hover) {
      border: blue solid thin;
    }
  }
}
```

### Modern CSS Features

```css
/* Logical properties for internationalization */
padding-block: 2rem;
padding-inline: 1rem;
margin-block-start: 1.5rem;

/* Modern selectors */
section:has([data-grid]) {
  --card-gap: 1rem;
}
```

### Result Type Pattern

```typescript
type Result<T, E extends Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

const parseJson = (input: string): Result<unknown, Error> => {
  try {
    return { ok: true, value: JSON.parse(input) }
  } catch (error) {
    return { ok: false, error: error as Error }
  }
}
```

## File Naming Conventions

- **Astro Components**: PascalCase (e.g., `Header.astro`, `PostCard.astro`)
- **React Components**: PascalCase with `.tsx` (e.g., `ThemeToggle.tsx`)
- **SCSS Files**: Underscore prefix for partials (e.g., `_variables.scss`)
- **Utility Files**: kebab-case (e.g., `site-config.ts`, `content.ts`)

## Key Dependencies

- **Astro**: 5.x with SSR mode
- **React**: Client islands for interactivity
- **TypeScript**: Strict mode configuration
- **SCSS**: Compiled to compressed CSS
- **Clerk**: Authentication and user management
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing
- **@fpkit/acss**: Additional CSS utilities

## Performance Considerations

- Use server-side rendering for better initial load times
- Leverage React islands only for interactive components
- Employ CSS custom properties for theming without JavaScript
- Use logical properties and modern CSS features for optimization
- Implement lazy loading for images and heavy components
