# Astro Basics Website - GitHub Copilot Instructions

**Always reference these instructions first** and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Initial Setup

- Bootstrap the repository:
  - `npm install` -- takes 4 minutes, shows warnings but completes successfully. NEVER CANCEL.
  - `cp .env.example .env` -- required for authentication
  - `npm run prepare` -- sets up Husky pre-commit hooks
  - For development with authentication features, configure Clerk keys in `.env`
- Build and validate:
  - `npm run build` -- takes 10-15 seconds. Build succeeds with dummy Clerk keys.
  - `npm run dev` -- starts development server on port 4321. Clerk auth errors are expected with dummy keys but server runs.
  - `npm run start` -- preferred for development (combines dev server + SCSS watcher)

### Development Workflow

- **Development server**: `npm run start` -- includes SCSS watcher, runs on port 4321
- **Build project**: `npm run build` -- fast build, 10-15 seconds, no timeout needed
- **SCSS compilation**: `npm run sass` -- watch mode for style changes
- **Code quality**: `npm run fix:all` -- fixes all auto-fixable linting issues
- **Linting**: `npm run lint:all` -- runs ESLint, StyleLint, Prettier, TypeScript, and Markdown linting

### Testing

- **Unit tests**: `npm test` -- uses Vitest, currently has some Astro plugin compatibility issues
- **E2E tests**: `npm run test:e2e` -- uses Playwright, requires `npx playwright install` first
- ALWAYS run `npx playwright install` before E2E testing if browsers not installed
- E2E tests take 1-2 minutes when browsers are installed

## Validation

### Manual Testing Scenarios

- ALWAYS test the development workflow after making changes:
  1. `npm run start` to verify dev server starts on port 4321
  2. Navigate to `http://localhost:4321` to verify basic functionality
  3. Test authentication flows if working with Clerk integration
  4. Verify SCSS compilation by editing styles and checking auto-reload
- ALWAYS run `npm run fix:all` before committing to ensure code quality
- Build validation: `npm run build` should complete in 10-15 seconds without errors

### Known Working Commands

All these commands are validated to work correctly:

```bash
npm install                    # 4 minutes - dependency installation
npm run build                  # 10-15 seconds - production build
npm run dev                    # Development server on port 4321
npm run start                  # Dev server + SCSS watcher (preferred)
npm run sass                   # SCSS compilation with watch
npm run fix:all               # Auto-fix all linting issues
npm run lint:all              # Run all linting checks
npm run type-check            # TypeScript validation
npm test                      # Unit tests with Vitest
npx playwright install        # Install browsers for E2E testing
npm run test:e2e              # E2E tests (after browser install)
```

## Project Architecture

### Component Structure

- **Astro Components** (`src/components/astro/`): Server-side rendered .astro components
- **React Components** (`src/components/react/`): Client-side interactive components
- **Dashboard Components** (`src/components/dashboard/`): Protected dashboard components
- **Component exports**: Through `src/components/index.ts` for library usage

### Key Directories

```
src/
├── components/           # Reusable components (Astro + React)
├── pages/               # Astro pages and API routes
├── content/             # Content collections (posts, docs, content)
├── layouts/             # Page layouts
├── styles/              # SCSS stylesheets
├── utils/               # Utility functions
└── middleware.ts        # Authentication middleware
```

### Content Management

- Three content collections: `posts`, `docs`, `content`
- Shared schema with frontmatter: title, pubDate, description, author, tags, featured, publish
- MDX support with remark-toc and rehype-accessible-emojis

### Authentication & Security

- **Clerk integration** for user authentication
- **Protected routes**: `/dashboard`, `/forum`, `/organization`
- **Environment variables**: `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` required
- **Middleware**: `src/middleware.ts` handles authentication

## Development Patterns

### Import Conventions

```typescript
// Use # alias for internal imports (maps to ./src/*)
import { SITE_TITLE } from '#utils/site-config'
import Header from '#components/astro/Header.astro'

// Group imports: external dependencies first, then internal
import { getCollection } from 'astro:content'
import { PAGINATION_COUNT } from '#utils/site-config'
```

### Component Props Pattern

```typescript
// Astro components
export type Props = {
  title: string
  description: string | undefined
  featured?: boolean
}

const { title, description, featured = false } = Astro.props
```

### SCSS Architecture

```scss
// Use @use instead of @import
@use '#styles/variables' as *;

.component-name {
  // CSS custom properties with kebab-case
  --primary-color: #{$color-primary};
  background-color: var(--primary-color);
}
```

## Common Issues & Solutions

### TypeScript Errors

- **Component exports**: Index files may reference non-existent components, causing TS errors
- **Type imports**: Use `import type` for type-only imports due to `verbatimModuleSyntax`
- Current known issues in `src/components/index.ts` and `src/components/dashboard/index.ts`

### Authentication Setup

- **Development**: Dummy Clerk keys in `.env` allow building but cause runtime auth errors
- **Working auth**: Requires real Clerk keys from https://dashboard.clerk.com
- **Auth errors**: Expected during development with dummy keys, doesn't break core functionality

### Build & Deployment

- **Adapter**: Uses Netlify adapter by default, Node.js available via `ASTRO_ADAPTER` env var
- **Output mode**: Server-side rendering (`output: "server"`)
- **Warnings**: getStaticPaths warnings in dynamic pages are expected

## Code Quality Standards

### Required Before Commits

- Run `npm run fix:all` to auto-fix all issues
- Ensure `npm run build` succeeds
- TypeScript errors in component exports are known issues, don't block development
- Pre-commit hooks automatically run linting via Husky + lint-staged

### Linting Setup

- **ESLint**: JavaScript/TypeScript + Astro-specific rules
- **StyleLint**: SCSS/CSS formatting and standards
- **Prettier**: Code formatting across all files
- **Markdown**: MarkdownLint for documentation
- **TypeScript**: Strict mode with additional safety rules

## Package Management

### Dependency Updates

```bash
npm run npm-update        # Update all dependencies
npm run npm-update-i      # Interactive dependency updates
npx @astrojs/upgrade      # Official Astro updates
```

### Development Dependencies

- **Testing**: Vitest (unit) + Playwright (E2E)
- **Linting**: ESLint + StyleLint + Prettier + MarkdownLint
- **Build**: Astro + Vite + TypeScript + Sass
- **Hooks**: Husky + lint-staged for pre-commit quality checks

## Troubleshooting

### Common Errors

- **"Publishable key not valid"**: Expected with dummy Clerk keys in development
- **TypeScript component errors**: Known issues in index.ts export files
- **E2E test failures**: Run `npx playwright install` to install browsers
- **SCSS deprecation warnings**: Expected, related to bogus-combinators in selectors

### Performance

- **Build time**: 10-13 seconds (very fast)
- **Dev server startup**: ~3 seconds
- **SCSS compilation**: ~1-2 seconds
- **Full linting**: ~10-20 seconds
- **E2E tests**: 1-2 minutes when properly set up

### Port Information

- **Development server**: http://localhost:4321
- **Production preview**: `npm run preview` (same port)
- **Astro standard**: Port 4321 is the default for all Astro projects

## GitHub Integration

### Automation

- **Dependabot**: Configured but disabled (set `open-pull-requests-limit: 0`)
- **Workflows**: GitHub Actions for automated testing and deployment
- **Pre-commit**: Husky hooks ensure code quality before commits

### Branch Strategy

- **Main branch**: `main` for production-ready code
- **Feature branches**: `feat/feature-name` for new features
- **Current**: Development happening on feature branches

Remember: These instructions prioritize practical development workflows and known working commands. Always validate changes with the build process and manual testing scenarios before considering work complete.
