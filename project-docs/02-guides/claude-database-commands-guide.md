# Claude Database Commands Guide

**Project**: astro-basics Database Management  
**Purpose**: Guide for using Claude slash commands with the database system  
**Audience**: Developers using Claude Code for database management  
**Last Updated**: 2025-01-25

---

## Overview

The astro-basics project includes **8 Claude slash commands** that provide a streamlined interface to the Supabase database management scripts. These commands leverage the existing database abstraction layer and management infrastructure.

## Quick Command Reference

### Essential Commands (Start Here)

```
/db-status    # Show current database configuration and status
/db-test      # Test connectivity to your Supabase database
/db-health    # Run a full health check
```

### Complete Command Set

#### 🔧 Core Operations

- `/db-status` - Comprehensive database status and configuration info
- `/db-test` - Connection testing and performance metrics
- `/db-health` - Complete health check with diagnostics

#### 💾 Data Management

- `/db-tables` - List tables with sample data and row counts

#### 🛠️ Setup & Maintenance

- `/db-setup` - Interactive setup wizard for new configurations
- `/db-cleanup` - Database optimization and cleanup (with dry-run)

#### 🔍 Development Tools

- `/db-schema` - Schema validation against application expectations
- `/db-debug` - Advanced debugging with verbose logging

---

## Getting Started

### New to the Project?

1. **Check Status**: Use `/db-status` to see current configuration
2. **Setup Database**: Use `/db-setup` if Supabase is not configured
3. **Test Connection**: Use `/db-test` to verify everything works

### Troubleshooting Issues?

1. **Health Check**: `/db-health` identifies performance and connectivity issues
2. **Debug Mode**: `/db-debug` provides detailed diagnostics
3. **Schema Check**: `/db-schema` validates database compatibility

---

## Understanding the Database Architecture

### Unified Abstraction Layer

The commands work with the **database abstraction layer**:

```
┌─────────────────────────────────────────┐
│ Claude Commands (/db-*)                 │
├─────────────────────────────────────────┤
│ NPM Scripts (npm run db:*)               │
├─────────────────────────────────────────┤
│ Management Scripts (scripts/*.js)       │
├─────────────────────────────────────────┤
│ Database Abstraction (src/libs/)        │
├─────────────────────────────────────────┤
│ Supabase (PostgreSQL)                   │
└─────────────────────────────────────────┘
```

### Configuration

Supabase is the only database. `getDatabase()` from `#libs/database` returns the Supabase
implementation when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set, and throws a clear error
telling you to set them when they are not.

---

## Common Workflows

### Daily Development

```bash
/db-status     # Check what's configured
/db-test       # Verify connectivity
/db-tables     # Explore available data
```

### Troubleshooting Issues

```bash
/db-health     # Identify problems
/db-debug      # Get detailed diagnostics
/db-schema     # Check compatibility
```

### Setting Up New Environment

```bash
/db-setup      # Interactive configuration
/db-test       # Verify setup
```

Apply schema changes from `scripts/migrations/` with
`psql "$DATABASE_URL" -f scripts/migrations/<file>.sql`, or paste the
SQL into the Supabase SQL editor. See `scripts/migrations/README.md`.

---

## Educational Insights

### What You'll Learn

Using these commands provides insights into:

**Database Abstraction Patterns**

- How to hide a database client behind a single typed interface
- Typed query options and results shared across the codebase
- Environment-based configuration management

**Operational Best Practices**

- Health monitoring and performance diagnostics
- Schema validation against application expectations

**Production-Ready Infrastructure**

- Comprehensive error handling and recovery procedures
- Automated testing and validation workflows
- Documentation-driven troubleshooting approaches

---

## Integration with Existing Tools

### NPM Script Compatibility

Commands work alongside existing npm scripts:

```bash
# Claude commands
/db-status
/db-setup

# Equivalent npm scripts
npm run db:status
npm run db:wizard
```

### Direct Script Access

For automation or advanced usage:

```bash
# Management CLI
npm run db:manage test
npm run db:manage tables --verbose

# Individual scripts
node scripts/database-status.js
node scripts/schema-validator.js
```

### Documentation Integration

Commands reference the comprehensive guides:

- **Clerk + Supabase Setup Guide** - Database setup
- **Database Troubleshooting Guide** - Technical problem resolution
- **Implementation Documentation** - Developer technical details

---

## Best Practices

### For Development

- Use `/db-status` regularly to understand your current setup
- Use `/db-test` after any configuration changes

### for Troubleshooting

- Start with `/db-health` for general issues
- Use `/db-debug` for detailed analysis
- Check `/db-schema` for compatibility problems

### For Team Collaboration

- Share `/db-status` output when reporting configuration issues
- Use setup wizard (`/db-setup`) for new team members

---

## Advanced Features

### Dry-Run Operations

```bash
/db-cleanup    # Preview cleanup operations
```

### Verbose Diagnostics

```bash
/db-debug      # Detailed connection analysis
/db-health     # Performance metrics and recommendations
```

---

## Support and Documentation

### When Commands Need Help

- Commands automatically reference existing documentation
- Troubleshooting guides provide step-by-step resolution
- Error messages include specific recovery instructions

### Additional Resources

- **`project-docs/02-guides/clerk-supabase-setup.md`** - Database setup
- **`project-docs/02-guides/database-troubleshooting-guide.md`** - Technical problem solving
- **`scripts/database-manager.js --help`** - CLI tool documentation

---

_These Claude commands provide a powerful, educational interface to the production-ready astro-basics database infrastructure, enabling both learning and efficient database management._
