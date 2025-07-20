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

The project exports components through `src/components/index.ts` with primarily Astro components:

- **Astro Components** (`src/components/astro/`): Server-side rendered .astro components including AstroPages, BlogPosts, Pagination, Header, Footer, Navigation, ContactForm, and more
- **React Support**: React components can be created but the current library focuses on .astro components

### Content Architecture

Uses Astro's content collections with three main collections defined in `src/content/config.ts`:

- `posts` - Blog posts with postsCollection schema
- `docs` - Documentation content (aliased as astroKitDocs)  
- `content` - General content articles

All collections share the same schema including frontmatter for title, pubDate, description, author, tags, featured status, publish flag, breadcrumbSlug, image metadata, and optional YouTube integration.

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
- MDX for rich content authoring with remark-toc for table of contents generation
- Dual deployment: Both Node.js standalone and Netlify adapters configured
- Image optimization with astro-imagetools
- YouTube embeds via @astro-community/astro-embed-youtube, RSS feeds, and sitemap generation

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

### Development vs Production

- Development uses test Clerk environment
- Production requires live Clerk application setup

## Enhanced Integrations

### Error Monitoring & Performance

- `@sentry/astro` - Error tracking and monitoring
- `astro-lighthouse` - Performance auditing
- `@spotlightjs/astro` - Development debugging (configurable)

### Content & Media

- `astro-embed/integration` - Enhanced content embedding
- `astro-imagetools` - Advanced image processing and optimization
- `rehype-accessible-emojis` - Accessible emoji rendering in MDX

### Development Tools

- `@total-typescript/ts-reset` - Enhanced TypeScript experience
- Form validation utilities in `src/utils/contact.ts`
- Constants for form errors in `src/constants/formErrors.ts`

## Development Notes

- Port 4321 is the standard development server port
- **Server-side rendering**: Project uses `output: "server"` mode with Node.js standalone adapter
- Dual deployment: Configured for both standalone Node.js and Netlify (conflicting adapters in astro.config.mjs)
- TypeScript is configured with strict null checks and React JSX transform
- Enhanced parallel development with `npm run start` (dev + sass watching)
- Playwright tests expect server to be running via `npm run start` command
- Database-ready: Documentation exists for Astro DB integration (future enhancement)

## Documentation

- Comprehensive development docs in `docs/` folder
- PRD (Product Requirements Document) available for feature planning and tracking in `/docs/PRD/`

## important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
