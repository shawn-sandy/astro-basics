# Claude Database Management Commands

This directory contains Claude slash commands for managing the astro-basics database system, which features a sophisticated unified abstraction layer supporting both Turso (LibSQL) and Supabase (PostgreSQL) providers.

## Available Commands

### Core Database Operations

- **`/db-status`** - Show comprehensive database status and provider information
- **`/db-switch`** - Interactively switch between database providers with backup
- **`/db-test`** - Test current database connectivity and performance
- **`/db-health`** - Run complete health check with diagnostics

### Data Management

- **`/db-backup`** - Create environment configuration backup
- **`/db-restore`** - Restore from backup with validation
- **`/db-tables`** - List tables and show sample data

### Setup & Maintenance

- **`/db-setup`** - Launch interactive setup wizard
- **`/db-migrate`** - Show migration status and run migrations
- **`/db-cleanup`** - Preview/execute database cleanup operations

### Development Tools

- **`/db-schema`** - Validate database schema compatibility
- **`/db-debug`** - Advanced debugging with verbose logging

## Architecture Integration

These commands leverage the existing robust infrastructure:

### Database Abstraction Layer

- **`src/libs/database.ts`** - Main abstraction with unified Database interface
- **`src/libs/database-types.ts`** - Shared TypeScript types
- **Provider-specific implementations** - Turso and Supabase clients

### Management Scripts

- **`scripts/database-manager.js`** - CLI tool with 9 management commands
- **`scripts/database-status.js`** - Comprehensive status reporting
- **`scripts/switch-database.js`** - Safe provider switching with backup
- **16 npm scripts** - Complete database management workflow

### Documentation

- **Database Switching Guide** - Complete user guide for provider switching
- **Database Troubleshooting Guide** - Technical troubleshooting reference
- **Comprehensive error handling** - With recovery procedures

## Provider Selection Logic

The system automatically selects providers using this priority:

1. **Explicit Choice** - `DATABASE_PROVIDER` environment variable
2. **Supabase Priority** - If both configured, prefers Supabase
3. **Turso Fallback** - Uses Turso if only it's configured
4. **Error State** - Clear guidance if no providers configured

## Command Usage Pattern

Each command follows this pattern:

1. **Execute** the corresponding npm script or management tool
2. **Provide educational insights** about the database architecture
3. **Guide next steps** based on results and system state
4. **Handle errors** gracefully with troubleshooting guidance

## Educational Benefits

These commands provide learning opportunities about:

- **Database abstraction patterns** and provider-agnostic design
- **Safe database switching** with backup and rollback strategies
- **Configuration management** for multiple database providers
- **Schema compatibility** across different database types (LibSQL vs PostgreSQL)
- **Production-ready database infrastructure** patterns

## Integration with Existing Workflows

Commands maintain full compatibility with:

- All existing npm scripts (`npm run db:*`)
- Direct script execution (`node scripts/database-manager.js`)
- Manual configuration management
- Existing documentation and troubleshooting guides

This creates a seamless Claude interface while preserving all established development workflows and operational procedures.
