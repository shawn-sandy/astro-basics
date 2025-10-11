# Quick Start - 5 Minute Orientation

**New to astro-basics?** This guide gets you oriented in 5 minutes.

## What is astro-basics?

A production-ready Astro website with:

- **Server-side rendering** (SSR)
- **Clerk authentication** with role-based access control
- **Dual database support** (Turso LibSQL or Supabase PostgreSQL)
- **Component library** (exportable Astro + React components)
- **Content management** (MDX-powered blog, docs, and content collections)
- **Full-featured comment system** with threading and moderation
- **PWA capabilities** with offline support

## Project at a Glance

```
astro-basics/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Routes and API endpoints
│   ├── content/         # MDX content (posts, docs)
│   ├── layouts/         # Page templates
│   └── libs/            # Database clients and utilities
├── project-docs/              # 📍 YOU ARE HERE - All documentation
├── docs/               # Public-facing Starlight docs
├── e2e/                # Playwright end-to-end tests
└── tests/              # Vitest unit tests
```

## Essential Information

### Tech Stack

- **Framework**: Astro 5.x with SSR
- **Auth**: Clerk (user management, organizations, roles)
- **Database**: Turso (LibSQL) OR Supabase (PostgreSQL) - your choice
- **Styling**: SCSS with utility classes
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deployment**: Netlify (default), Vercel, or Node adapters

### Key Concepts

**1. Database Abstraction**

- Switch between Turso and Supabase without code changes
- Unified API in `src/libs/database.ts`
- Use `npm run db:wizard` for setup

**2. Role-Based Access Control**

- Three core roles: `member`, `admin`, `super_admin`
- Configurable role system in `config/roles.config.ts`
- Hierarchical permission inheritance

**3. Protected Routes**

- `/dashboard/*` - Requires authentication
- `/forum/*` - Requires authentication
- `/organization/*` - Requires authentication + organization membership
- Public routes: `/`, `/posts`, `/docs`, `/content`

**4. Content Collections**

- Three identical collections: `posts`, `docs`, `content`
- MDX support with remark/rehype plugins
- Filter by `publish: true` for public content

## Your First Steps

### 1. Set Up the Project (10 minutes)

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Set up pre-commit hooks
npm run prepare

# Install Playwright browsers (for E2E tests)
npx playwright install

# Start development server
npm run start
```

Visit: <http://localhost:4321>

### 2. Configure Authentication (5 minutes)

**Option A: Use Dummy Keys** (works for browsing, auth will fail)

```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy
CLERK_SECRET_KEY=sk_test_dummy
```

**Option B: Get Real Keys** (recommended for development)

1. Create free account at [clerk.com](https://clerk.com)
2. Create new application
3. Copy keys to `.env`

**See**: [01-getting-started/authentication-guide.md](./01-getting-started/authentication-guide.md)

### 3. Choose Your Database (10 minutes)

**Option A: Turso** (recommended for simplicity)

```bash
# Install Turso CLI
npm run db:wizard

# Follow prompts to set up Turso
# Adds TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env
```

**Option B: Supabase** (recommended for PostgreSQL features)

```bash
# Create project at supabase.com
# Copy URL and keys to .env
npm run db:wizard

# Follow prompts to set up Supabase
```

**See**: [01-getting-started/database-setup.md](./01-getting-started/database-setup.md)

## Common Commands

### Development

```bash
npm run start          # Dev server + SCSS watcher (recommended)
npm run dev           # Dev server only (port 4321)
npm run sass          # SCSS watcher only
```

### Build & Test

```bash
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Run unit tests
npm run test:e2e      # Run E2E tests
```

### Code Quality

```bash
npm run fix:all       # Auto-fix all linting issues
npm run type-check    # TypeScript type checking
npm run lint          # ESLint with auto-fix
npm run format        # Prettier formatting
```

### Database

```bash
npm run db:wizard     # Interactive setup wizard
npm run db:status     # Check configuration
npm run db:migrate    # Run migrations
npm run db:switch:turso    # Switch to Turso
npm run db:switch:supabase # Switch to Supabase
```

## Where to Find Documentation

### Getting Started

- **Setup Guide**: [01-getting-started/setup-guide.md](./01-getting-started/setup-guide.md)
- **Auth Guide**: [01-getting-started/authentication-guide.md](./01-getting-started/authentication-guide.md)
- **Database Setup**: [01-getting-started/database-setup.md](./01-getting-started/database-setup.md)
- **Linting**: [01-getting-started/linting-guide.md](./01-getting-started/linting-guide.md)

### How-To Guides

- **All Guides**: [02-guides/](./02-guides/) directory
- **Role Configuration**: [02-guides/configurable-roles.md](./02-guides/configurable-roles.md)
- **Database Switching**: [02-guides/database-switching-guide.md](./02-guides/database-switching-guide.md)
- **Clerk-Supabase Setup**: [02-guides/clerk-supabase-setup.md](./02-guides/clerk-supabase-setup.md)

### Features & Architecture

- **Comment System**: [03-features/comment-system.md](./03-features/comment-system.md)
- **Database Schemas**: [05-database/](./05-database/) directory
- **Integration Docs**: [04-integrations/](./04-integrations/) directory

### Full Directory Map

See [README.md](./README.md) for complete navigation hub.

## Project Workflow

### Typical Development Flow

1. **Pick up a task** from GitHub issues or create your own
2. **Create a branch** from `primary` (main branch)

   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make changes** and test locally
4. **Run quality checks** before committing

   ```bash
   npm run fix:all    # Auto-fix issues
   npm run type-check # Verify TypeScript
   npm test           # Run tests
   ```

5. **Commit** (pre-commit hooks will run automatically)
6. **Push and create PR** targeting `primary` branch

### Testing Your Changes

```bash
# Unit tests (fast, no browser needed)
npm test

# E2E tests (requires Playwright browsers)
npm run test:e2e

# Run specific test file
npm test path/to/test.test.ts
npx playwright test path/to/spec.spec.ts

# Watch mode for TDD
npm test -- --watch
```

## Common Issues & Solutions

### "Module not found" errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Playwright tests fail

```bash
# Install browsers
npx playwright install

# Or install specific browser
npx playwright install chromium
```

### SCSS not compiling

```bash
# Make sure SCSS watcher is running
npm run sass

# Or use combined command
npm run start  # Runs dev + sass together
```

### Authentication not working

```bash
# Check your .env file has valid Clerk keys
# Dummy keys allow browsing but auth will fail
# Get real keys from clerk.com
```

### Database connection fails

```bash
# Check database configuration
npm run db:status

# Re-run setup wizard
npm run db:wizard

# Verify environment variables
cat .env | grep -E "(TURSO|SUPABASE)"
```

## Need Help?

### Documentation Resources

- **This Directory**: [README.md](./README.md) - Full documentation index
- **Project README**: [../README.md](../README.md) - Overview and quick reference
- **CLAUDE.md**: [../CLAUDE.md](../CLAUDE.md) - AI assistant instructions
- **Starlight Docs**: [../docs/](../docs/) - Public-facing documentation

### Getting Support

1. **Search existing docs** in `project-docs/` directory
2. **Check troubleshooting guides** in `02-guides/`
3. **Review GitHub issues** for similar problems
4. **Ask in discussions** or create new issue

## Next Steps

After this quick start:

1. **Read the full setup guide**: [01-getting-started/setup-guide.md](./01-getting-started/setup-guide.md)
2. **Understand authentication**: [01-getting-started/authentication-guide.md](./01-getting-started/authentication-guide.md)
3. **Configure your database**: [01-getting-started/database-setup.md](./01-getting-started/database-setup.md)
4. **Explore features**: Browse [03-features/](./03-features/) directory
5. **Review code quality setup**: [01-getting-started/linting-guide.md](./01-getting-started/linting-guide.md)

## Key Files to Bookmark

```
/project-docs/README.md                    # Documentation hub (you are here)
/CLAUDE.md                          # Project guidelines
/astro.config.mjs                   # Astro configuration
/src/middleware.ts                  # Auth middleware
/src/libs/database.ts               # Database abstraction
/config/roles.config.ts             # Role configuration
/src/content/config.ts              # Content collections schema
/.env.example                       # Environment template
/package.json                       # All available scripts
```

---

**Ready to dive deeper?** Head to [README.md](./README.md) for the full documentation index.

**Questions?** Check [01-getting-started/setup-guide.md](./01-getting-started/setup-guide.md) for comprehensive setup instructions.

---

**Last Updated**: 2025-10-10
