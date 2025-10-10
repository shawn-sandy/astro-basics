# Astro Basics Website

A production-ready Astro website showcasing modern web development practices with authentication, database
integration, and interactive features. This project demonstrates Astro's capabilities for building fast, secure,
content-focused websites with a comprehensive component library, multiple database backends, progressive web app
functionality, and enterprise-grade security features.

## Project Features

### Component Architecture

- **Astro Components** (`src/components/astro/`): Server-side rendered .astro components
- **React Components** (`src/components/react/`): Client-side interactive components
- **Component exports** through `src/components/index.ts` for internal organization

### Content Management

- Three content collections: `posts`, `docs`, and `content`
- Astro's content collections with shared schema
- MDX support with remark-toc and rehype-accessible-emojis
- **Comment System**: Full-featured commenting for blog posts and documentation
  - Threaded comments with 3-level nesting support
  - Real-time comment creation, editing, and soft deletion
  - Rate limiting (5 comments per minute per user) and spam protection
  - Content sanitization with DOMPurify for XSS prevention
  - CSRF token validation for secure form submissions

### Authentication & Security

- Clerk integration for user authentication with native Supabase integration (2025 production-ready)
- Protected routes via middleware (`/dashboard`, `/forum`, `/organization`)
- **Role-based access control** with hierarchical privilege escalation
  - Configurable user roles (member, admin, super_admin)
  - Automatic privilege inheritance (higher roles access lower-level content)
  - Component-level and page-level role guards
  - Flexible configuration with `useHierarchy` option for exact matching
- Environment-based configuration
- **Security Enhancements**:
  - CSRF protection for all form submissions
  - Rate limiting on API endpoints (5 requests/minute)
  - Input sanitization and XSS prevention
  - Content Security Policy (CSP) compliance with external scripts
  - Row-Level Security (RLS) policies for database tables

### Database Integration

- **Turso (LibSQL)** edge database for message storage
- **Supabase (PostgreSQL)** with real-time capabilities and native Clerk integration
- Automatic retry logic with exponential backoff
- Transaction support for complex operations
- Message CRUD operations with type safety
- Support for both Turso and Supabase backends
- Database switching utility for flexible backend selection
- Comment system with polymorphic database design
- Row-Level Security (RLS) policies for data protection

### Development Tools

- Comprehensive testing setup (Vitest + Playwright)
- SCSS compilation with Sass watcher
- Pre-commit hooks with Husky + lint-staged
- Complete linting setup (ESLint, StyleLint, Prettier, Markdown)
- GitHub Copilot integration with project-specific instructions
- **MCP Server Integration**: Model Context Protocol support for:
  - Supabase database operations
  - Chrome DevTools automation
  - Figma design system integration
  - Playwright browser testing
  - Clerk authentication management
- Automated release management system with security audits
- Database migration system with rollback support

### Progressive Web App (PWA)

- Service worker with automatic caching and offline support
- App manifest with icons and metadata
- Custom PWA installation prompts
- Offline page and connection status indicators
- Auto-update functionality for service worker
- Standalone mode for full-screen app experience

### User Features

- **Dashboard**: Protected user dashboard with profile management
- **Forum**: Community forum with authentication
- **Organization Management**: Organization creation and management features
- **User Profiles**: Comprehensive user profile with Clerk integration
- **Message System**: Submit and manage messages through the application

## Quick Start

### Initial Setup

1. **Install dependencies**: `npm install`
2. **Setup pre-commit hooks**: `npm run prepare`
3. **Copy environment variables**: Copy `.env.example` to `.env` and configure:
   - Clerk authentication keys (required for auth features)
   - Turso database credentials (optional, for message system)
   - Supabase credentials (optional, alternative to Turso, includes native Clerk integration)
4. **Setup database** (if using message system or comments):
   - For Supabase: `npm run db:setup-users` (set up user sync with Clerk)
   - For general setup: `npm run db:setup`
   - Check database connection: `npm run db:check`
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
npm run db:setup-users    # Set up Supabase user sync with Clerk
npm run db:sync-user      # Sync current user to database
npm run db:switch         # Switch between database backends
npm run db:switch:turso   # Switch to Turso backend
npm run db:switch:supabase # Switch to Supabase backend
npm run db:migrate        # Run database migrations
npm run db:migrate:status # Check migration status
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

### Documentation System

- **Starlight Integration**: Modern documentation framework built on Astro
  - Interactive component documentation with live examples
  - API reference documentation with TypeScript integration
  - MCP Server setup guides and troubleshooting
  - Searchable documentation with Pagefind
  - Edit links and last updated timestamps
  - Custom theming and styling

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

Comprehensive documentation is available in multiple formats:

- **Interactive Docs**: Visit `/guide` for Starlight-powered documentation with:
  - Getting started guides and component documentation
  - API reference with TypeScript integration
  - MCP Server setup and configuration guides
  - Database troubleshooting and switching guides
  - Role guard system usage
- **Development Docs**: The `docs/` folder contains detailed implementation guides, PRDs, and technical documentation
- **Feature Documentation**: See [FEATURES.md](FEATURES.md) for a complete feature overview
- **Changelog**: Review [CHANGELOG.md](CHANGELOG.md) for release notes and version history

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
