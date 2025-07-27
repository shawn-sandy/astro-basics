# @shawnsandy/astro-kit

A collection of reusable Astro components and utilities for building content-rich websites.
The project serves both as a component library and a working Astro site demonstrating the components.

## Installation

```bash
npm install @shawnsandy/astro-kit
```

## Project Features

### Component Library

- **Astro Components** (`src/components/astro/`): Server-side rendered .astro components
- **React Components** (`src/components/react/`): Client-side interactive components
- Components exported through `src/components/index.ts`

### Content Management

- Three content collections: `posts`, `docs`, and `content`
- Astro's content collections with shared schema
- MDX support with remark-toc and rehype-accessible-emojis

### Authentication & Security

- Clerk integration for user authentication
- Protected routes via middleware
- Environment-based configuration

### Development Tools

- Comprehensive testing setup (Vitest + Playwright)
- SCSS compilation with Sass watcher
- Pre-commit hooks with Husky + lint-staged
- Complete linting setup (ESLint, StyleLint, Prettier, Markdown)
- GitHub Copilot integration with project-specific instructions

## Quick Start

### Initial Setup

1. **Install dependencies**: `npm install`
2. **Setup pre-commit hooks**: `npm run prepare`
3. **Copy environment variables**: Copy `.env.example` to `.env` and configure Clerk keys
4. **Start development**: `npm run start` (dev server + SCSS watcher)

### Development Commands

```bash
# Development
npm run dev          # Start Astro development server
npm run start        # Start dev server with Sass watcher
npm run sass         # Watch and compile SCSS files

# Build & Deploy
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run Vitest unit tests
npm run test:e2e     # Run Playwright e2e tests

# Code Quality
npm run lint         # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
npm run fix:all      # Fix all auto-fixable issues
```

### Component Usage

```astro
---
// Using path aliases
import Header from '#components/astro/Header.astro'
import { ThemeToggle } from '#components/react/ThemeToggle'
import { SITE_TITLE } from '#utils/site-config'
---

<Header title={SITE_TITLE} />
<ThemeToggle client:load />
```

## Architecture

### Path Aliases

Uses `#*` import alias mapping to `./src/*` for cleaner imports.

### Content Collections

Three main collections defined in `src/content/config.ts`:

- `posts` - Blog posts
- `docs` - Documentation content
- `content` - General content articles

### Styling System

- SCSS-based styling in `src/styles/`
- Component-specific styles in `src/styles/components/`
- Uses @fpkit/acss for additional CSS utilities

### Deployment

- **Active**: Netlify adapter (`@astrojs/netlify`)
- **Alternative**: Node.js adapter (`@astrojs/node`) - available but commented out

## Documentation

Comprehensive development documentation available in the `docs/` folder, including detailed linting guides and PRD documents.

## Dependency Management

Dependabot is configured but currently disabled. To enable/disable:

- **Enable**: Set `open-pull-requests-limit: 5` in `.github/dependabot.yml`
- **Disable**: Set `open-pull-requests-limit: 0` in `.github/dependabot.yml`

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- Development workflow and setup
- Code style guidelines and conventions
- Testing requirements and procedures
- Pull request process and requirements
- Component development standards

Quick start for contributors:

1. Fork the repository
2. Run `npm install && npm run prepare`
3. Create a feature branch
4. Make changes following our guidelines
5. Run `npm run fix:all` before committing
6. Submit a pull request

## License

MIT
