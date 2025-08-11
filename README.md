# Astro Basics Website

A content-rich Astro website showcasing reusable components and modern web development practices.
This project demonstrates Astro's capabilities for building fast, content-focused websites with authentication, collections, and interactive components.

## Project Features

### Component Architecture

- **Astro Components** (`src/components/astro/`): Server-side rendered .astro components
- **React Components** (`src/components/react/`): Client-side interactive components
- **Component exports** through `src/components/index.ts` for internal organization

### Content Management

- Three content collections: `posts`, `docs`, and `content`
- Astro's content collections with shared schema
- MDX support with remark-toc and rehype-accessible-emojis

### Authentication & Security

- Clerk integration for user authentication
- Protected routes via middleware
- Environment-based configuration

### Database Integration

- **Turso (LibSQL)** edge database for message storage
- Automatic retry logic with exponential backoff
- Transaction support for complex operations
- Message CRUD operations with type safety
- Support for both Turso and Supabase backends

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
3. **Copy environment variables**: Copy `.env.example` to `.env` and configure:
   - Clerk authentication keys (required)
   - Turso database credentials (optional, for message system)
   - Supabase credentials (optional, alternative to Turso)
4. **Setup database** (if using message system): `npm run db:setup`
5. **Start development**: `npm run start` (dev server + SCSS watcher)

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

# Database Management
npm run db:setup     # Initialize Turso database schema
npm run db:reset     # Reset database (drop and recreate)
npm run db:check     # Check database connection
npm run db:seed:messages  # Seed sample messages
```

### Component Usage

```astro
---
// Using path aliases for internal component imports
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

### Database Configuration

The project supports two database backends:

#### Turso (LibSQL)

Edge-first SQLite database, ideal for low-latency global applications:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

Features:

- Automatic retry logic (3 attempts with exponential backoff)
- Connection pooling and error recovery
- Type-safe message operations
- Transaction support

#### Supabase (Alternative)

PostgreSQL database with real-time capabilities:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

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
