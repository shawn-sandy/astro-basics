# Getting Started with Astro Basics

A comprehensive guide to setting up and running the astro-basics project with authentication, database integration, role-based access control, and modern security features.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Configuration](#configuration)
  - [Authentication Setup (Clerk)](#authentication-setup-clerk)
  - [Database Setup](#database-setup)
  - [Role Configuration](#role-configuration)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Git** for version control
- A code editor (VS Code recommended)

### Optional Prerequisites

- **Playwright browsers** (for E2E tests): Install after project setup with `npx playwright install`
- **Clerk account** (for authentication features): [clerk.com](https://clerk.com)
- **Supabase account** (for PostgreSQL database): [supabase.com](https://supabase.com)
- **Turso account** (for LibSQL edge database): [turso.tech](https://turso.tech)

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/shawn-sandy/astro-basics.git
cd astro-basics

# Install dependencies (takes ~4 minutes, warnings are expected)
npm install

# Setup pre-commit hooks (Husky)
npm run prepare
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

The `.env` file contains all configuration options. You can proceed with minimal setup or configure all features:

**Minimal Setup (Development Mode):**

```env
# Only authentication is required for basic features
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Full Setup (All Features):**

```env
# Authentication (Required)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database - Choose one or both
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Alternative: Turso (LibSQL)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=eyJ...

# Optional: Database provider selection
# DATABASE_PROVIDER=supabase  # 'supabase', 'turso', or 'auto' (default)
```

## Configuration

### Authentication Setup (Clerk)

Clerk provides user authentication, session management, and role-based access control.

#### Step 1: Create a Clerk Application

1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Choose your authentication methods (email, social, etc.)

#### Step 2: Get Your API Keys

From your Clerk dashboard:

1. Navigate to **API Keys**
2. Copy your **Publishable Key** → `PUBLIC_CLERK_PUBLISHABLE_KEY`
3. Copy your **Secret Key** → `CLERK_SECRET_KEY`
4. Copy your **Webhook Secret** (optional) → `CLERK_WEBHOOK_SECRET`

#### Step 3: Configure Protected Routes

The following routes require authentication (configured in [src/middleware.ts](src/middleware.ts)):

- `/dashboard/*` - User dashboard and profile
- `/forum/*` - Community forum features
- `/organization/*` - Organization management

Unauthenticated users are automatically redirected to the sign-in page.

### Database Setup

The project supports **two database backends** with seamless switching:

- **Supabase** (PostgreSQL): Real-time features, native Clerk integration, RLS policies
- **Turso** (LibSQL): Edge-first SQLite, low latency, global distribution

#### Option A: Guided Setup (Recommended)

Use the interactive database wizard:

```bash
npm run db:wizard
```

The wizard will:

1. Detect available database credentials
2. Guide you through configuration choices
3. Set up the database schema automatically
4. Verify the connection

#### Option B: Manual Setup

##### Supabase Setup

1. **Create a Supabase Project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for project initialization (~2 minutes)

2. **Get Your Credentials**
   - Navigate to **Project Settings** → **API**
   - Copy **Project URL** → `SUPABASE_URL` and `PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `SUPABASE_ANON_KEY` and `PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Run Migrations**

   ```bash
   # Apply database schema (users, roles, organizations)
   npm run db:migrate

   # Verify migration status
   npm run db:migrate:status
   ```

4. **Configure Clerk Integration**

   ```bash
   # Set up user sync between Clerk and Supabase
   npm run db:setup-users
   ```

   See [specs/integrations/supabase-setup-guide.md](specs/integrations/supabase-setup-guide.md) for detailed instructions.

##### Turso Setup

1. **Create a Turso Database**

   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash

   # Login to Turso
   turso auth login

   # Create a database
   turso db create astro-basics

   # Get connection details
   turso db show astro-basics
   ```

2. **Configure Environment**

   ```bash
   # Get your database URL
   turso db show astro-basics --url
   # → TURSO_DATABASE_URL

   # Create an auth token
   turso db tokens create astro-basics
   # → TURSO_AUTH_TOKEN
   ```

3. **Initialize Database**

   ```bash
   npm run db:setup
   ```

#### Database Switching

The project includes a **unified database abstraction layer** that allows seamless switching:

```bash
# Check current database status
npm run db:status

# Switch to Supabase (with automatic backup)
npm run db:switch:supabase

# Switch to Turso (with automatic backup)
npm run db:switch:turso

# Auto-detect and use available database
npm run db:switch:auto

# Create backup only
npm run db:backup

# Restore from backup
npm run db:restore
```

**Key Features:**

- Automatic backup before switching
- Provider auto-detection
- Unified TypeScript types
- Zero code changes required

See [specs/guides/database-switching-guide.md](specs/guides/database-switching-guide.md) for detailed information.

### Role Configuration

The project includes a **configurable role system** that provides compile-time type safety and database migration generation.

#### Understanding Roles

Roles control user access levels with hierarchical privilege escalation:

```
Level 3: super_admin  ⚡ Full system access
         │
Level 2: admin        👔 Manage users & settings
         │
Level 1: member       👤 View content (default)
```

**Default Behavior:** Higher-level roles automatically inherit lower-level permissions.

#### Default Configuration

The project comes with three pre-configured roles:

- `member` (level 1) - Default role for new users
- `admin` (level 2) - Administrative access
- `super_admin` (level 3) - Full system access

These are defined in [config/roles.config.ts](config/roles.config.ts).

#### Customizing Roles

To add custom roles:

1. **Edit the configuration**

   ```bash
   vim config/roles.config.ts
   ```

2. **Add your custom roles**

   ```typescript
   export const roleConfig: RoleConfig = {
     roles: [
       { id: 'member', level: 1, name: 'Member', isDefault: true },
       { id: 'author', level: 2, name: 'Author' }, // New role
       { id: 'moderator', level: 3, name: 'Moderator' }, // New role
       { id: 'admin', level: 4, name: 'Admin' },
       { id: 'super_admin', level: 5, name: 'Super Admin' },
     ],
   }
   ```

3. **Generate types and migrations**

   ```bash
   # Dry run to preview changes
   npm run setup:roles:dry-run

   # Generate files
   npm run setup:roles
   ```

   This creates:
   - TypeScript types in `src/types/generated-roles.ts`
   - Database migrations in `scripts/migrations/`

4. **Apply database migration**

   ```bash
   npm run db:migrate
   ```

5. **Commit generated files**

   ```bash
   git add config/ src/types/ scripts/migrations/
   git commit -m "Configure custom roles"
   ```

#### Using Role Guards

Protect components and pages with role-based access:

```typescript
// Component-level protection
import { RoleGuard } from '#components/react/RoleGuard'

<RoleGuard allowedRoles={['admin']}>
  <AdminPanel />
</RoleGuard>

// With hierarchical checking (default)
<RoleGuard allowedRoles={['member']}>
  {/* Members, admins, and super_admins can access */}
  <Dashboard />
</RoleGuard>

// Exact role matching (no hierarchy)
<RoleGuard allowedRoles={['admin']} useHierarchy={false}>
  {/* Only admins can access */}
  <AdminOnlyPanel />
</RoleGuard>
```

For complete documentation, see:

- [specs/guides/configurable-roles.md](specs/guides/configurable-roles.md) - Role configuration guide
- [specs/guides/role-guard-usage-guide.md](specs/guides/role-guard-usage-guide.md) - Using role guards in components

## Development Workflow

### Starting Development

```bash
# Recommended: Start dev server + SCSS watcher together
npm run start

# Or start separately:
npm run dev    # Astro dev server only (port 4321)
npm run sass   # SCSS watcher only
```

The development server will:

- Open browser at `http://localhost:4321`
- Enable hot module replacement (HMR)
- Watch for file changes
- Compile SCSS to CSS automatically

### Project Structure

```
astro-basics/
├── src/
│   ├── components/          # Reusable components
│   │   ├── astro/          # Server-rendered (.astro)
│   │   ├── react/          # Client-side (.tsx)
│   │   └── dashboard/      # Protected components
│   ├── pages/              # Route pages & API endpoints
│   ├── content/            # Content collections (MDX)
│   │   ├── posts/         # Blog posts
│   │   ├── docs/          # Documentation
│   │   └── content/       # General content
│   ├── layouts/           # Page layouts
│   ├── styles/            # SCSS stylesheets
│   ├── libs/              # Database clients & utilities
│   ├── utils/             # Helper functions
│   └── middleware.ts      # Authentication middleware
├── config/                # Configuration files
│   └── roles.config.ts   # Role definitions
├── scripts/              # Database & utility scripts
│   └── migrations/       # Database migrations
├── specs/                # Project documentation
├── e2e/                  # Playwright E2E tests
└── tests/                # Vitest unit tests
```

### Import Patterns

The project uses path aliases for clean imports:

```typescript
// ✅ Use # alias for internal imports
import Header from '#components/astro/Header.astro'
import { SITE_TITLE } from '#utils/site-config'
import type { User } from '#types/users'

// ❌ Avoid relative imports
import Header from '../../components/astro/Header.astro'
```

### Code Quality

Before committing code, run quality checks:

```bash
# Fix all auto-fixable issues (recommended)
npm run fix:all

# Or run checks individually:
npm run lint          # ESLint fix
npm run format        # Prettier formatting
npm run type-check    # TypeScript checking
npm run lint:styles:fix  # StyleLint fix
npm run lint:md:fix   # Markdown linting
```

Pre-commit hooks (Husky) automatically run linting on staged files.

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run specific test file
npm test path/to/test.test.ts

# Watch mode
npm test -- --watch
```

### E2E Tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test path/to/e2e.spec.ts

# Run with UI mode
npx playwright test --ui

# View test report
npm run test:e2e:report
```

**Note:** E2E tests require the dev server running on port 4321. The test suite runs in Chromium by default; local development includes Chrome, Firefox, and Safari.

## Common Tasks

### Building for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

The build output goes to the `dist/` directory (~10-15 seconds build time).

### Database Management

```bash
# Check database status
npm run db:status

# Run migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Create new migration
npm run db:migrate:create

# Rollback last migration
npm run db:migrate:rollback

# Reset database (warning: deletes all data)
npm run db:reset

# Seed sample data
npm run db:seed:messages
```

### Content Management

Content is stored in [src/content/](src/content/) with three collections:

- `posts/` - Blog posts
- `docs/` - Documentation pages
- `content/` - General content pages

**Creating new content:**

```bash
# Create a new blog post
touch src/content/posts/my-post.mdx

# Add frontmatter
---
title: "My Post Title"
pubDate: 2025-01-10
description: "Post description"
author: "Your Name"
tags: ["tag1", "tag2"]
publish: true
featured: false
---

Your content here...
```

### Deployment

The project is configured for multiple deployment targets:

```bash
# Set deployment adapter in .env
ASTRO_ADAPTER=netlify  # or 'node', 'vercel'

# Netlify deployment
npm run deploy:preview  # Preview deployment
npm run deploy:prod     # Production deployment
```

**Supported Adapters:**

- **Netlify** (default): `@astrojs/netlify`
- **Node.js**: `@astrojs/node` (standalone server)
- **Vercel**: Configure in `astro.config.mjs`

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

**Problem:** "Clerk keys not configured" error

**Solution:**

```bash
# Verify keys are set in .env
grep CLERK .env

# Ensure keys match your Clerk dashboard
# PUBLIC_CLERK_PUBLISHABLE_KEY should start with pk_test_ or pk_live_
# CLERK_SECRET_KEY should start with sk_test_ or sk_live_
```

#### 2. Database Connection Issues

**Problem:** "Failed to connect to database"

**Solution:**

```bash
# Check database status
npm run db:status

# Verify credentials in .env
npm run db:check

# See detailed troubleshooting guide
# specs/guides/database-troubleshooting-guide.md
```

#### 3. Missing Database Tables

**Problem:** "Table does not exist" errors

**Solution:**

```bash
# Run migrations to create tables
npm run db:migrate

# Verify schema
npm run db:schema
```

#### 4. Build Warnings

**Problem:** Warnings about `getStaticPaths` in dynamic routes

**Solution:** These warnings are expected for dynamic routes and don't affect functionality. The build will complete successfully.

#### 5. Pre-commit Hook Failures

**Problem:** Commits fail due to linting errors

**Solution:**

```bash
# Fix all issues before committing
npm run fix:all

# Or fix specific issues
npm run lint
npm run format
```

### Getting Help

- **Documentation**: Browse [specs/](specs/) directory for detailed guides
- **Database Issues**: See [specs/guides/database-troubleshooting-guide.md](specs/guides/database-troubleshooting-guide.md)
- **Role System**: See [specs/guides/configurable-roles.md](specs/guides/configurable-roles.md)
- **GitHub Issues**: Report bugs at [github.com/shawn-sandy/astro-basics/issues](https://github.com/shawn-sandy/astro-basics/issues)

## Next Steps

Now that you have the project running:

1. **Explore the codebase**
   - Review [CLAUDE.md](CLAUDE.md) for project overview and architecture
   - Check [FEATURES.md](FEATURES.md) for complete feature list
   - Browse [specs/](specs/) for detailed documentation

2. **Configure custom features**
   - Set up custom roles: [specs/guides/configurable-roles.md](specs/guides/configurable-roles.md)
   - Configure database: [specs/guides/database-switching-guide.md](specs/guides/database-switching-guide.md)
   - Add MCP servers: Check [specs/](specs/) for MCP integration guides

3. **Start building**
   - Create new components in [src/components/](src/components/)
   - Add content to collections in [src/content/](src/content/)
   - Build API endpoints in [src/pages/api/](src/pages/api/)

4. **Read the guides**
   - [specs/AUTHENTICATION_DEVELOPER_GUIDE.md](specs/AUTHENTICATION_DEVELOPER_GUIDE.md) - Authentication patterns
   - [specs/LINTING_GUIDE.md](specs/LINTING_GUIDE.md) - Code quality standards
   - [specs/releases/RELEASE-PROCESS.md](specs/releases/RELEASE-PROCESS.md) - Release management

Happy coding! 🚀
