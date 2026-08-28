# Integration Guides

This directory contains technical documentation for third-party service integrations.

## Available Integrations

### Authentication & Database

- **[Clerk + Supabase Integration (2025)](./clerk-supabase-integration-2025.md)** ⭐ **RECOMMENDED**
  - Native third-party auth integration
  - Production-ready with RLS policies
  - Includes troubleshooting and migration guide
  - **Status:** Current (as of April 2025)

### Development Tooling

- **[Storybook](./storybook.md)**
  - Isolated workshop and living documentation for the React component library
  - Storybook 10 + `@storybook/react-vite`, configured in `.storybook/`
  - Commands: `npm run storybook`, `npm run build-storybook`

### Deprecated Guides

The following guides use outdated methods and are kept for reference only:

- [JWT Implementation Guide](../jwt-implementation-guide.md) - Uses deprecated JWT templates
- [Clerk-Supabase Setup Guide](../guides/clerk-supabase-setup.md) - Mixed old/new methods
- [Clerk-Supabase Native Integration 2025](../clerk-supabase-native-integration-2025.md) - Superseded by integration guide

## Quick Start

For new projects, follow these steps:

1. **Read the integration guide**: [clerk-supabase-integration-2025.md](./clerk-supabase-integration-2025.md)
2. **Enable in Clerk**: Integrations → Supabase
3. **Configure Supabase**: Authentication → Third-party Auth → Clerk
4. **Apply migrations**: Run 001 and 002 SQL files
5. **Test**: Sign in and verify RLS policies work

## User-Facing Documentation

For simplified guides suitable for end users, see:

- [Starlight Integration Guide](/src/content/docs/guide/integrations/clerk-supabase.mdx)

## Support

If you encounter issues:

1. Check the [Troubleshooting](./clerk-supabase-integration-2025.md#troubleshooting) section
2. Review [Supabase migration documentation](../database/supabase-migration-refactor-plan.md)
3. Create a [GitHub issue](https://github.com/your-org/astro-basics/issues)

---

**Last Updated:** 2025-10-06
