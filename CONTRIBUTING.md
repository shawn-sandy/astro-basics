# Contributing to @shawnsandy/astro-kit

Thank you for your interest in contributing to @shawnsandy/astro-kit! This document outlines the process for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Component Guidelines](#component-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct that promotes a welcoming and inclusive environment. Please be respectful in all interactions.

## Getting Started

### Prerequisites

- Node.js (version specified in `.nvmrc` or `package.json`)
- npm (latest stable version)
- Git

### Initial Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/astro-kit.git
   cd astro-kit
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up pre-commit hooks:
   ```bash
   npm run prepare
   ```
5. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
6. Configure Clerk keys in `.env` for authentication features

## Development Workflow

### Branch Structure

- **Main branch**: `main` - stable production code
- **Feature branches**: `feat/feature-name` - new features
- **Bug fixes**: `fix/bug-description` - bug fixes
- **Documentation**: `docs/update-description` - documentation updates

### Working on Changes

1. Create a new branch from `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```

2. Start the development server:

   ```bash
   npm run start  # Includes dev server + SCSS watcher
   ```

3. Make your changes following the [code style guidelines](#code-style-guidelines)

4. Run quality checks frequently:
   ```bash
   npm run fix:all     # Fix all auto-fixable issues
   npm run lint:all    # Check all linting rules
   npm run type-check  # TypeScript type checking
   ```

## Code Style Guidelines

### File Naming Conventions

- **Astro Components**: PascalCase (e.g., `Header.astro`, `PostCard.astro`)
- **React Components**: PascalCase with `.tsx` extension (e.g., `ThemeToggle.tsx`)
- **SCSS Files**: Underscore prefix for partials (e.g., `_variables.scss`)
- **Utility Files**: camelCase (e.g., `site-config.ts`, `content.ts`)

### TypeScript Standards

- Use explicit types for component props and function parameters
- Leverage TypeScript strict mode (already configured)
- Export component props as `type Props`
- Use optional properties (`?`) appropriately

### Import/Export Patterns

```typescript
// Use # alias for internal imports
import { SITE_TITLE } from '#utils/site-config'
import Header from '#components/astro/Header.astro'

// Group imports: external dependencies first, then internal
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { PAGINATION_COUNT } from '#utils/site-config'
```

### SCSS Guidelines

```scss
// Use @use instead of @import
@use '#styles/variables' as *;
@use '#styles/mixins' as *;

.component-name {
  // CSS custom properties with kebab-case
  --primary-color: #{$color-primary};

  // Component styles
  background-color: var(--primary-color);
}
```

## Testing

### Unit Tests

- Located in `/tests` directory
- Use Vitest framework
- Run with: `npm test`

### End-to-End Tests

- Located in `/e2e` directory
- Use Playwright framework
- Run with: `npm run test:e2e`
- View reports: `npm run test:e2e:report`

### Test Requirements

- Add tests for new components
- Update existing tests when modifying components
- Ensure all tests pass before submitting PR
- Include both unit and e2e tests where appropriate

## Submitting Changes

### Before Submitting

1. **Run all quality checks**:

   ```bash
   npm run fix:all      # Auto-fix issues
   npm run lint:all     # Check all linting
   npm run type-check   # TypeScript validation
   npm test             # Unit tests
   npm run test:e2e     # E2E tests
   npm run build        # Production build
   ```

2. **Commit your changes**:

   - Use conventional commit messages
   - Pre-commit hooks will automatically run linting
   - Example: `feat: add new pagination component`

3. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

### Pull Request Process

1. **Create Pull Request**:

   - Target the `main` branch
   - Use a clear, descriptive title
   - Fill out the PR template completely

2. **PR Description should include**:

   - Summary of changes
   - Type of change (feature, bug fix, documentation, etc.)
   - Testing performed
   - Screenshots for UI changes
   - Breaking changes (if any)

3. **Review Process**:
   - Automated checks must pass
   - Code review by maintainers
   - Address any feedback promptly
   - Keep PR updated with main branch

## Component Guidelines

### Astro Components

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
    // Component styles
  }
</style>
```

### React Components

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

### Component Requirements

- Follow existing naming conventions
- Include proper TypeScript types
- Add appropriate accessibility attributes
- Use semantic HTML elements
- Include SCSS styles following project patterns
- Export through `src/components/index.ts`

## Documentation

### Code Documentation

- Use JSDoc comments for complex functions
- Document component props and their purposes
- Include usage examples in component comments

### README Updates

- Update README.md if adding new features
- Include new components in Available Components section
- Update architecture documentation as needed

### Content Guidelines

- Use clear, concise language
- Include code examples where helpful
- Follow existing documentation patterns
- Update CLAUDE.md if adding project-level changes

## Questions or Issues?

- Open an issue for bugs or feature requests
- Use discussions for questions about contributing
- Check existing issues before creating new ones
- Be patient and respectful in all communications

## Recognition

Contributors will be recognized in:

- Git commit history
- Release notes for significant contributions
- Project documentation where appropriate

Thank you for contributing to @shawnsandy/astro-kit!
