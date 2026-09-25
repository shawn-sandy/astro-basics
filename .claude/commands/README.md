# Claude Database Management Commands

This directory contains Claude slash commands for managing the astro-basics database system, which uses Supabase (PostgreSQL) behind a unified abstraction layer (`getDatabase()` from `#libs/database`).

## Available Commands

### Core Database Operations

- **`/db-status`** - Show comprehensive database status and Supabase configuration
- **`/db-test`** - Test current database connectivity and performance
- **`/db-health`** - Run complete health check with diagnostics

### Data Management

- **`/db-tables`** - List tables and show sample data

### Setup & Maintenance

- **`/db-setup`** - Launch interactive setup wizard
- **`/db-cleanup`** - Preview/execute database cleanup operations

### Development Tools

- **`/db-schema`** - Validate the Supabase database schema
- **`/db-debug`** - Advanced debugging with verbose logging

## Architecture Integration

These commands leverage the existing robust infrastructure:

### Database Abstraction Layer

- **`src/libs/database.ts`** - Main abstraction with unified Database interface
- **`src/libs/database-types.ts`** - Shared TypeScript types
- **Supabase implementation** - The only database provider

### Management Scripts

- **`scripts/database-manager.js`** - CLI tool with 7 management commands
- **`scripts/database-status.js`** - Comprehensive status reporting
- **`npm run db:*` scripts** - Complete database management workflow

### Documentation

- **Clerk + Supabase Setup Guide** - Supabase configuration walkthrough
- **Database Troubleshooting Guide** - Technical troubleshooting reference
- **Comprehensive error handling** - With recovery procedures

## Configuration

`getDatabase()` returns the Supabase implementation when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set, and throws a clear error otherwise. Run `/db-setup` (`npm run db:wizard`) to configure them.

## Command Usage Pattern

Each command follows this pattern:

1. **Execute** the corresponding npm script or management tool
2. **Provide educational insights** about the database architecture
3. **Guide next steps** based on results and system state
4. **Handle errors** gracefully with troubleshooting guidance

## Educational Benefits

These commands provide learning opportunities about:

- **Database abstraction patterns** with a single entry point
- **Configuration management** for Supabase
- **Schema validation** for PostgreSQL
- **Production-ready database infrastructure** patterns

## Integration with Existing Workflows

Commands maintain full compatibility with:

- All existing npm scripts (`npm run db:*`)
- Direct script execution (`node scripts/database-manager.js`)
- Manual configuration management
- Existing documentation and troubleshooting guides

This creates a seamless Claude interface while preserving all established development workflows and operational procedures.
