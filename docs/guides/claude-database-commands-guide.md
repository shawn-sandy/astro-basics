# Claude Database Commands Guide

**Project**: astro-basics Database Management  
**Purpose**: Guide for using Claude slash commands with the database system  
**Audience**: Developers using Claude Code for database management  
**Last Updated**: 2025-01-25

---

## Overview

The astro-basics project now includes **12 Claude slash commands** that provide a streamlined interface to the robust database management system. These commands leverage the existing unified database abstraction layer and comprehensive management infrastructure.

## Quick Command Reference

### Essential Commands (Start Here)

```
/db-status    # Show current database configuration and status
/db-test      # Test connectivity to your active database
/db-switch    # Change between Turso and Supabase providers
```

### Complete Command Set

#### 🔧 Core Operations

- `/db-status` - Comprehensive database status and provider info
- `/db-switch` - Safe provider switching (Turso ↔ Supabase) with backup
- `/db-test` - Connection testing and performance metrics
- `/db-health` - Complete health check with diagnostics

#### 💾 Data Management

- `/db-backup` - Create configuration backup (.env → .env.backup)
- `/db-restore` - Restore from backup with validation
- `/db-tables` - List tables with sample data and row counts

#### 🛠️ Setup & Maintenance

- `/db-setup` - Interactive setup wizard for new configurations
- `/db-migrate` - Migration status and execution
- `/db-cleanup` - Database optimization and cleanup (with dry-run)

#### 🔍 Development Tools

- `/db-schema` - Schema validation between providers
- `/db-debug` - Advanced debugging with verbose logging

---

## Getting Started

### New to the Project?

1. **Check Status**: Use `/db-status` to see current configuration
2. **Setup Database**: Use `/db-setup` if no providers are configured
3. **Test Connection**: Use `/db-test` to verify everything works

### Switching Between Providers?

1. **Check Current Status**: `/db-status` shows active provider and alternatives
2. **Switch Safely**: `/db-switch` creates backup and switches providers
3. **Verify Switch**: `/db-test` confirms new provider works correctly
4. **Rollback if Needed**: `/db-restore` recovers from backup

### Troubleshooting Issues?

1. **Health Check**: `/db-health` identifies performance and connectivity issues
2. **Debug Mode**: `/db-debug` provides detailed diagnostics
3. **Schema Check**: `/db-schema` validates database compatibility

---

## Understanding the Database Architecture

### Unified Abstraction Layer

The commands work with a **sophisticated database abstraction system**:

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
│ Turso (LibSQL) │ Supabase (PostgreSQL) │
└─────────────────────────────────────────┘
```

### Provider Selection Priority

The system automatically selects databases using this logic:

1. **Explicit Choice** - `DATABASE_PROVIDER=turso` or `DATABASE_PROVIDER=supabase`
2. **Supabase Priority** - If both configured, defaults to Supabase
3. **Turso Fallback** - Uses Turso if only it's available
4. **Error Guidance** - Clear instructions if neither is configured

### Safe Switching Process

Every switch operation includes:

- **Automatic backup** of current configuration
- **Connection testing** before committing the switch
- **Rollback capability** if issues occur
- **Validation** of the new configuration

---

## Common Workflows

### Daily Development

```bash
/db-status     # Check what's configured
/db-test       # Verify connectivity
/db-tables     # Explore available data
```

### Provider Experimentation

```bash
/db-backup     # Save current config
/db-switch     # Try different provider
/db-test       # Verify it works
/db-restore    # Go back if needed
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
/db-migrate    # Apply schema if needed
```

---

## Educational Insights

### What You'll Learn

Using these commands provides insights into:

**Database Abstraction Patterns**

- How to design provider-agnostic database interfaces
- Unified type systems across different database engines
- Configuration management for multi-provider systems

**Operational Best Practices**

- Safe database switching with backup strategies
- Health monitoring and performance diagnostics
- Schema compatibility across database types

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
/db-switch

# Equivalent npm scripts
npm run db:status
npm run db:switch:turso
```

### Direct Script Access

For automation or advanced usage:

```bash
# Management CLI
npm run db:manage test
npm run db:manage tables --verbose

# Individual scripts
node scripts/database-status.js
node scripts/switch-database.js --to supabase
```

### Documentation Integration

Commands reference the comprehensive guides:

- **Database Switching Guide** - Complete user manual
- **Database Troubleshooting Guide** - Technical problem resolution
- **Implementation Documentation** - Developer technical details

---

## Best Practices

### For Development

- Use `/db-status` regularly to understand your current setup
- Always run `/db-backup` before experimenting
- Use `/db-test` after any configuration changes

### for Troubleshooting

- Start with `/db-health` for general issues
- Use `/db-debug` for detailed analysis
- Check `/db-schema` for compatibility problems

### For Team Collaboration

- Document provider choices with `/db-status` output
- Share backup/restore procedures for consistency
- Use setup wizard (`/db-setup`) for new team members

---

## Advanced Features

### Dry-Run Operations

```bash
/db-cleanup    # Preview cleanup operations
/db-migrate    # Check migration status before running
```

### Verbose Diagnostics

```bash
/db-debug      # Detailed connection analysis
/db-health     # Performance metrics and recommendations
```

### Cross-Provider Operations

```bash
/db-schema     # Compare Turso and Supabase schemas
/db-switch     # Safe transitions between providers
```

---

## Support and Documentation

### When Commands Need Help

- Commands automatically reference existing documentation
- Troubleshooting guides provide step-by-step resolution
- Error messages include specific recovery instructions

### Additional Resources

- **`docs/guides/database-switching-guide.md`** - Complete switching manual
- **`docs/guides/database-troubleshooting-guide.md`** - Technical problem solving
- **`scripts/database-manager.js --help`** - CLI tool documentation

---

_These Claude commands provide a powerful, educational interface to the production-ready astro-basics database infrastructure, enabling both learning and efficient database management._
