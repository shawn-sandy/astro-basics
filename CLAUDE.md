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
- `npx playwright test` - Run end-to-end tests (requires server running)

### Code Quality
- `npm run lint` - Run ESLint with auto-fix

### Package Management
- `npm run npm-update` - Update all dependencies to latest versions
- `npm run npm-update-i` - Interactive dependency updates

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

All collections share the same schema including frontmatter for title, pubDate, description, author, tags, featured status, and optional YouTube integration.

### Path Aliases
Uses `#*` import alias mapping to `./src/*` for cleaner imports across the codebase.

### Styling System
- SCSS-based styling in `src/styles/`
- Component-specific styles in `src/styles/components/`
- Sass watcher compiles to `src/styles/index.css` (compressed)
- Uses @fpkit/acss for additional CSS utilities

### Site Configuration
- `src/utils/site-config.ts` - Contains site constants (title, description, pagination, breadcrumbs)
- `src/libs/content.ts` - Content utility functions (Slugify, Truncate)

### Testing Setup
- **Unit Tests**: Vitest with Astro configuration, excludes e2e tests
- **E2E Tests**: Playwright configured for multi-browser testing (Chrome, Firefox, Safari)
- Test server runs on port 4321

### Key Integrations
- React support for interactive components
- MDX for rich content authoring
- Netlify adapter for static site deployment
- Image optimization with astro-imagetools
- YouTube embeds, RSS feeds, and sitemap generation

## Package Structure
This is published as an npm package with:
- Main export: `src/components/index.ts` (all components)
- Astro-specific export: `src/components/astro` (Astro components only)
- Files include: component index and all .astro files

## Development Notes
- Port 4321 is the standard development server port
- The project uses static output mode for Netlify deployment
- TypeScript is configured with strict null checks and React JSX transform
- No ESLint config file found - linting appears to use default settings