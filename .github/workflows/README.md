# GitHub Workflows

This directory contains GitHub Actions workflows for automated testing and quality assurance.

## PR Tests Workflow (`pr-tests.yml`)

Runs comprehensive tests on pull requests and pushes to main/primary branches.

### Jobs

#### `test` Job

- **Linting**: ESLint, StyleLint, Prettier, Markdown
- **Type Checking**: TypeScript (continue-on-error due to .astro imports)
- **Unit Tests**: Vitest (continue-on-error due to compatibility issues)
- **Build**: Project build verification

#### `e2e-tests` Job

- **E2E Testing**: Playwright tests across multiple browsers
- **Preview Server**: Starts with node adapter for compatibility
- **Artifact Upload**: Test reports on failure

### Environment Configuration

The workflow uses test environment variables:

- `CI=true` - Enables CI mode
- `ASTRO_ADAPTER=node` - Uses node adapter for preview server compatibility
- `PUBLIC_CLERK_PUBLISHABLE_KEY=test_key` - Test Clerk auth
- `CLERK_SECRET_KEY=test_secret` - Test Clerk secret
- `SUPABASE_URL=https://test.supabase.co` - Test Supabase URL
- `SUPABASE_ANON_KEY=test_anon_key` - Test Supabase key

### Adapter Strategy

- **CI/Testing**: Uses `@astrojs/node` adapter for preview server compatibility
- **Production**: Uses `@astrojs/netlify` adapter (default)
- **Override**: Set `ASTRO_ADAPTER` environment variable to change adapter

### Tolerances

Some checks use `continue-on-error: true`:

- **TypeScript**: .astro file imports cause type errors
- **Unit Tests**: Vitest/Astro integration has compatibility issues
- **Markdown**: Style issues in documentation

Core requirements (ESLint, StyleLint, Prettier, Build) must pass.
