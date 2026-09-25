# Database Troubleshooting Guide

**Project**: astro-basics Database System  
**Purpose**: Technical troubleshooting for Supabase database configuration issues  
**Audience**: Developers and system administrators  
**Last Updated**: 2025-01-24

---

## Quick Diagnostics

### Check System Status

```bash
# Get comprehensive status overview
npm run db:status

# Test current database connection
npm run db:manage test

# Run full health check
npm run db:manage health

# Check schema compatibility
npm run db:schema
```

---

## Common Error Messages

### "Database not configured"

**Symptoms:**

- API endpoints return 503 errors
- Dashboard shows "Database service unavailable"
- `db:status` reports that Supabase is not configured

**Diagnosis:**

```bash
npm run db:status
# Look for: "Configure Supabase (SUPABASE_URL and SUPABASE_ANON_KEY)"
```

**Solutions:**

1. **Missing Environment Variables**

   ```bash
   # Check which required variables are set (never prints their values)
   npm run db:status

   # You need:
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...  # for server-side operations
   ```

2. **Run Setup Wizard**

   ```bash
   npm run db:wizard
   ```

3. **Manual Configuration Check**

   ```bash
   # Validate environment file exists and has content
   ls -la .env
   wc -l .env  # Should show more than just comments
   ```

### "Connection failed" During Operations

**Symptoms:**

- Database operations timeout
- "Failed to connect" errors in logs
- API endpoints return 500 errors

**Diagnosis:**

```bash
# Test connectivity to Supabase
npm run db:manage test --verbose

# Check network connectivity
curl -I https://your-project.supabase.co
```

**Solutions:**

1. **Network Issues**
   - Check firewall settings
   - Verify DNS resolution
   - Test from different network if possible

2. **Invalid Credentials**

   ```bash
   # Verify the Supabase project is active
   # Check at: https://supabase.com/dashboard
   ```

3. **Database Server Issues**
   - Check the Supabase status page
   - Verify database instance is running
   - Check for maintenance windows

### "Schema validation failed"

**Symptoms:**

- Operations succeed but data doesn't match expectations
- Missing tables or columns
- Type conversion errors

**Diagnosis:**

```bash
npm run db:schema
# Shows detailed schema comparison
```

**Solutions:**

1. **Run Database Migrations**

   ```bash
   # Apply a migration from scripts/migrations/
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrations/<file>.sql

   # Or paste the SQL into the Supabase SQL editor
   # See scripts/migrations/README.md for the order
   ```

2. **Manual Schema Check**

   ```bash
   # List tables in current database
   npm run db:manage tables

   # Compare with expected schema in docs
   ```

---

## Supabase (PostgreSQL) Issues

### "Invalid API key"

```bash
# Don't use SUPABASE_ANON_KEY for server operations
# Use SUPABASE_SERVICE_ROLE_KEY instead
```

### "Row Level Security (RLS) policy violation"

```bash
# Check RLS policies in Supabase Dashboard
# Ensure service role can access required tables
```

### "Project paused"

```bash
# Check if Supabase project is paused
# Free tier projects pause after inactivity
```

---

## Development Environment Issues

### "Module not found" Errors

**Symptoms:**

- Import errors for database modules
- TypeScript compilation fails

**Solutions:**

```bash
# Clear Node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript configuration
npm run type-check
```

### "Hot reload not working"

**Symptoms:**

- Changes to database configuration don't take effect
- Need to restart dev server after editing `.env`

**Solutions:**

```bash
# Stop and restart development server
# Kill existing processes
pkill -f "npm run"

# Start fresh
npm run start
```

### "Different behavior in production"

**Symptoms:**

- Works locally but fails in production

**Diagnosis:**

```bash
# Check production environment variables
# Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set
```

**Solutions:**

- Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in production
- Use same credentials format as local
- Verify network access from production environment

---

## API Endpoint Issues

### "API reports no database configured"

**Symptoms:**

- `/api/supabase-test` returns "No database provider is properly configured"
- `.env` has Supabase values but the API does not see them

**Diagnosis:**

```bash
# Test API endpoint
curl http://localhost:4321/api/supabase-test

# Check whether Supabase is configured
npm run db:status
```

**Solutions:**

- Clear any cached environment variables
- Restart development server
- Check for multiple .env files

### "API operations fail silently"

**Symptoms:**

- No errors but operations don't work
- Empty results from database queries

**Diagnosis:**

```bash
# Test direct database connection
npm run db:manage test

# Check API logs
npm run dev  # Look for console errors
```

**Solutions:**

- Verify database has required tables
- Check RLS policies (Supabase)
- Verify connection permissions

---

## Performance Issues

### "Slow database operations"

**Symptoms:**

- API endpoints timeout
- Dashboard takes long to load

**Diagnosis:**

```bash
# Run health check with timing
npm run db:manage health --verbose
```

**Solutions:**

- Check network latency to database
- Verify database instance performance tier

---

## File System Issues

### "Permission denied" Errors

**Symptoms:**

- Cannot read/write .env files
- Script execution fails

**Solutions:**

```bash
# Fix file permissions
chmod 644 .env .env.backup
chmod +x scripts/*.js

# Check directory permissions
ls -la .
```

### "Git conflicts with .env.backup"

**Symptoms:**

- Git wants to commit .env.backup
- Merge conflicts with backup files

**Solutions:**

```bash
# Ensure .env.backup is gitignored
echo ".env.backup" >> .gitignore

# Remove from git if already tracked
git rm --cached .env.backup
```

---

## Advanced Debugging

### Enable Debug Mode

```bash
# Add debug logging to scripts
DEBUG=1 npm run db:manage test

# Use verbose mode for detailed output
npm run db:manage status --verbose
```

### Manual Database Testing

```bash
# Test Supabase directly
node -e "
import { createClient } from '@supabase/supabase-js';
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log(await client.from('messages').select('count'));
"
```

### Environment Variable Debugging

```bash
# Check which database-related variables are set (names only, no values)
env | grep -o '^SUPABASE_[A-Z_]*=' | sort

# Check for Windows line endings or trailing spaces (prints line numbers, not values)
grep -n $'\r' .env | cut -d: -f1
grep -n '^SUPABASE_[A-Z_]*=.* $' .env | cut -d: -f1
```

---

## Getting Additional Help

### Diagnostic Information to Collect

When reporting issues, include:

```bash
# System information
npm run db:status > debug-info.txt
npm run db:manage health >> debug-info.txt
echo "Node version: $(node --version)" >> debug-info.txt
echo "NPM version: $(npm --version)" >> debug-info.txt
echo "OS: $(uname -a)" >> debug-info.txt
```

### Log Collection

```bash
# Enable logging and reproduce issue
DEBUG=1 npm run db:manage test 2>&1 | tee db-debug.log
```

### Reset to Clean State

```bash
# Complete reset procedure
cp .env .env.emergency-backup
npm run db:wizard
# Follow prompts to reconfigure from scratch
```

---

## Prevention Best Practices

### Regular Health Checks

```bash
# Add to your development routine
npm run db:status
npm run db:manage health
```

### Backup Before Changes

```bash
# Always backup before experimenting
cp .env .env.backup
# Make changes...
# If issues: cp .env.backup .env
```

### Environment Validation

```bash
# Validate configuration after changes
npm run db:schema
npm run db:manage test
```

### Version Control

```bash
# Never commit sensitive data
git status | grep -E "(\.env|backup)" && echo "⚠️  Check .env files"
```

---

_This troubleshooting guide covers technical resolution for database system issues. For setup, see the Clerk + Supabase Setup Guide (`project-docs/02-guides/clerk-supabase-setup.md`)._
