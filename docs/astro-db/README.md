# Astro DB Documentation

This directory contains comprehensive documentation for the Astro DB integration in the astro-basics project.

## Documentation Structure

### 🚀 [Setup Guide](./SETUP_GUIDE.md)

Step-by-step instructions for setting up Astro DB from scratch:

- Prerequisites and installation
- Development setup and verification
- Understanding the database schema
- Customizing tables and seed data
- Production deployment options
- Troubleshooting common issues

### 📖 [Complete Guide](./ASTRO_DB_GUIDE.md)

The comprehensive guide covering everything you need to know about Astro DB:

- Database schema and relationships
- Development setup and configuration
- Querying data with examples
- API endpoints documentation
- Production setup with Turso
- Migration strategies from content collections
- Best practices and troubleshooting

### ⚡ [Quick Reference](./ASTRO_DB_QUICK_REFERENCE.md)

A concise reference for common tasks and patterns:

- Essential commands and imports
- CRUD operation examples
- Query patterns (filtering, sorting, pagination)
- Common use cases and snippets
- Production deployment tips
- Debugging and troubleshooting

### 🛠️ [Implementation Examples](./ASTRO_DB_IMPLEMENTATION_EXAMPLES.md)

Real-world examples showing how to integrate Astro DB:

- Converting existing pages from content collections
- Building new features (admin dashboard, search)
- Component integration patterns
- Advanced implementations and patterns

### 📚 [Legacy Guide](./LEGACY_GUIDE.md)

The original comprehensive integration guide with step-by-step setup instructions. Contains detailed examples for hybrid approaches and migration strategies.

## Getting Started

1. **New to Astro DB?** Start with the [Setup Guide](./SETUP_GUIDE.md) for step-by-step instructions
2. **Need comprehensive info?** Read the [Complete Guide](./ASTRO_DB_GUIDE.md) for thorough understanding
3. **Use the [Quick Reference](./ASTRO_DB_QUICK_REFERENCE.md)** for daily development
4. **Check [Implementation Examples](./ASTRO_DB_IMPLEMENTATION_EXAMPLES.md)** for specific use cases

## Database Schema Overview

The project includes 6 main tables:

- **User** - User accounts and profiles
- **Post** - Blog posts with metadata
- **Comment** - Post comments with threading
- **Analytics** - Page view tracking
- **ContactSubmission** - Form submissions
- **Newsletter** - Email subscribers

## Key Features

- ✅ Type-safe queries with auto-generated TypeScript types
- ✅ Local SQLite database for development
- ✅ Production-ready with Turso integration
- ✅ Comprehensive seeding for development data
- ✅ REST API endpoints with full CRUD operations
- ✅ Advanced querying with joins and aggregations
- ✅ Performance optimizations with indexes

## NPM Scripts

```bash
# Database management
npm run db:push              # Push schema to local DB
npm run db:push:remote       # Push schema to production
npm run db:verify            # Verify database schema
npm run db:execute           # Execute SQL commands

# Development
npm run dev                  # Start dev server (auto-creates DB)
```

## Example Pages

Visit these pages to see Astro DB in action:

- `/blog-db` - Database-powered blog listing
- `/api/posts` - REST API endpoints

## Quick Start

1. The database is automatically created when you run `npm run dev`
2. Seed data is loaded automatically for development
3. Check the [Quick Reference](./ASTRO_DB_QUICK_REFERENCE.md) for common patterns
4. Explore the [Implementation Examples](./ASTRO_DB_IMPLEMENTATION_EXAMPLES.md) for specific use cases

## Support

- [Astro DB Official Documentation](https://docs.astro.build/en/guides/astro-db/)
- [Turso Documentation](https://docs.turso.tech/)
- [LibSQL Documentation](https://github.com/libsql/libsql)
