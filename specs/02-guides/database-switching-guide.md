# Database Switching Guide

**Project**: astro-basics Database Management  
**Purpose**: Complete guide for switching between Supabase and Turso databases  
**Audience**: Developers and non-technical users  
**Last Updated**: 2025-01-24

---

## Overview

The astro-basics project supports two database providers: **Supabase** (PostgreSQL) and **Turso** (LibSQL). You can easily switch between them using simple commands, and the system automatically handles backups and configuration updates.

## Quick Start Commands

```bash
# Check current database status
npm run db:status

# Switch to Turso database
npm run db:switch:turso

# Switch to Supabase database
npm run db:switch:supabase

# Create backup only (without switching)
npm run db:backup

# Restore from previous backup
npm run db:restore
```

---

## Initial Setup

### For New Projects

If you're setting up the database for the first time:

```bash
# Run the interactive setup wizard
npm run db:wizard
```

The wizard will:

- Ask you to choose between Turso, Supabase, or both
- Guide you through obtaining the necessary credentials
- Test your database connections
- Configure your `.env` file automatically

### Manual Configuration

If you prefer manual setup, add these variables to your `.env` file:

#### For Turso (LibSQL)

```env
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your_auth_token_here
DATABASE_PROVIDER=turso
```

#### For Supabase (PostgreSQL)

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_PROVIDER=supabase
```

---

## Understanding Database Status

Run `npm run db:status` to see detailed information:

```bash
$ npm run db:status

=== ASTRO-BASICS DATABASE STATUS ===

📁 Abstraction Layer Files:
✅ /src/libs/database.ts - Main abstraction layer
✅ /src/libs/database-types.ts - Unified type definitions

🔧 Environment Configuration:
DATABASE_PROVIDER: turso
✅ Turso: Configured and ready
✅ Supabase: Configured and ready
📍 Active Provider: Turso (turso)

🎯 Next Steps:
- Switch to Supabase: npm run db:switch:supabase
- Create backup: npm run db:backup
- Run database manager: npm run db:manage
```

---

## Switching Databases

### Safe Switching Process

The system automatically creates backups before switching:

1. **Current configuration is backed up** to `.env.backup`
2. **Database connectivity is tested** before switching
3. **Environment is updated** with new provider
4. **Validation confirms** the switch was successful

### Switch to Turso

```bash
npm run db:switch:turso
```

**What happens:**

- Backs up current `.env` to `.env.backup`
- Tests Turso connectivity
- Updates `DATABASE_PROVIDER=turso` in `.env`
- Confirms successful switch

### Switch to Supabase

```bash
npm run db:switch:supabase
```

**What happens:**

- Backs up current `.env` to `.env.backup`
- Tests Supabase connectivity
- Updates `DATABASE_PROVIDER=supabase` in `.env`
- Confirms successful switch

### Dry Run (Preview Changes)

To see what would happen without making changes:

```bash
# Preview switching to Turso
node scripts/switch-database.js --to turso --dry-run

# Preview switching to Supabase
node scripts/switch-database.js --to supabase --dry-run
```

---

## Backup and Restore

### Creating Backups

```bash
# Create backup without switching
npm run db:backup
```

This saves your current `.env` file to `.env.backup` without changing anything.

### Restoring from Backup

If something goes wrong, restore your previous configuration:

```bash
npm run db:restore
```

**What happens:**

- Current `.env` is backed up as `.env.backup.pre-restore`
- Previous configuration from `.env.backup` is restored
- Database connectivity is tested
- Success is confirmed

---

## Advanced Database Management

### Database Manager CLI

For advanced operations, use the database manager:

```bash
npm run db:manage
```

**Available commands:**

- `status` - Show detailed database status
- `test` - Test database connections
- `health` - Run health checks
- `tables` - List database tables
- `backup` - Create configuration backup
- `switch` - Interactive database switching
- `setup` - Re-run setup wizard

**Example usage:**

```bash
# Test current database connection
npm run db:manage test

# List all tables in current database
npm run db:manage tables

# Interactive switching with prompts
npm run db:manage switch
```

### Schema Validation

Check database schema compatibility:

```bash
npm run db:schema
```

This validates that your database schema matches project expectations and reports any issues.

---

## Environment Variables Reference

### Required Variables

**For Turso:**

- `TURSO_DATABASE_URL` - Your Turso database URL
- `TURSO_AUTH_TOKEN` - Authentication token for Turso

**For Supabase:**

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Anonymous access key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for server operations)

### Optional Variables

- `DATABASE_PROVIDER` - Explicit provider choice (`turso`, `supabase`, or `auto`)
  - If not set, system automatically detects based on available credentials
  - Priority: `turso` → `supabase` → error

---

## Common Use Cases

### Development Team Workflow

**Scenario**: Your team uses different databases for development

1. Each developer runs: `npm run db:wizard`
2. Choose preferred database (Turso for speed, Supabase for features)
3. System handles all configuration automatically
4. Switch anytime with `npm run db:switch:turso` or `npm run db:switch:supabase`

### Production Environment Setup

**Scenario**: Setting up production with specific database

1. Set environment variables in your deployment platform
2. Use `DATABASE_PROVIDER=supabase` (or `turso`) to be explicit
3. System automatically uses correct database without switching

### Local Testing

**Scenario**: Testing against both databases locally

```bash
# Test with Turso
npm run db:switch:turso
npm run dev
# Run your tests...

# Switch and test with Supabase
npm run db:switch:supabase
npm run dev
# Run your tests...

# Restore original setup
npm run db:restore
```

---

## Troubleshooting

### Common Issues

**"Database not configured" error**

- Run `npm run db:status` to see what's missing
- Use `npm run db:wizard` to configure properly

**"Connection failed" during switching**

- Check your credentials in `.env`
- Verify database is accessible from your network
- Try switching with `--dry-run` first to test

**"No database providers configured"**

- You need at least one set of database credentials
- Run `npm run db:wizard` for guided setup

### Getting Help

1. **Check Status**: `npm run db:status` shows current configuration
2. **Test Connection**: `npm run db:manage test` verifies connectivity
3. **Health Check**: `npm run db:manage health` runs diagnostics
4. **Reset**: `npm run db:wizard` reconfigures from scratch

### Recovery

If you need to completely reset:

1. Backup your current `.env`: `cp .env .env.manual-backup`
2. Run fresh setup: `npm run db:wizard`
3. If needed, restore: `cp .env.manual-backup .env`

---

## Best Practices

### For Development

- Use `turso` for faster local development
- Switch to `supabase` when testing advanced PostgreSQL features
- Always check `npm run db:status` when joining a project

### for Production

- Set `DATABASE_PROVIDER` explicitly in production environments
- Use service role keys for Supabase (never anonymous keys)
- Monitor database health with `npm run db:manage health`

### for Teams

- Document which database each environment uses
- Use the backup/restore feature when experimenting
- Share database setup instructions with `npm run db:wizard`

---

## Integration Notes

### How It Works

The system uses a database abstraction layer that:

- Automatically detects available database providers
- Provides unified operations (insert, get, update, delete)
- Handles provider-specific implementations transparently
- Requires no code changes when switching

### API Endpoints

All API endpoints automatically use the configured database:

- `/api/message-us` - Uses active database provider
- `/api/supabase-test` - Now tests any configured provider
- No code changes needed when switching

### Components

Dashboard components automatically adapt:

- Message lists use unified `Message` type
- Error handling adapts to active provider
- No restart required when switching providers

---

## Security Notes

- `.env.backup` files are automatically excluded from git
- Service role keys should only be used server-side
- Database switching requires filesystem access (production consideration)
- Always test connectivity before deploying with new database

---

_This guide covers the complete database switching system. For developer-specific technical details, see the implementation documentation._
