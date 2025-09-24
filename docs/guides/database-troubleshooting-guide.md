# Database Troubleshooting Guide

**Project**: astro-basics Database System  
**Purpose**: Technical troubleshooting for database switching and configuration issues  
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

### Emergency Recovery

```bash
# If something went wrong during switching
npm run db:restore

# If restore fails, use manual backup
cp .env.backup .env
```

---

## Common Error Messages

### "Database not configured"

**Symptoms:**

- API endpoints return 503 errors
- Dashboard shows "Database service unavailable"
- `db:status` shows no configured providers

**Diagnosis:**

```bash
npm run db:status
# Look for: "❌ No database providers configured"
```

**Solutions:**

1. **Missing Environment Variables**

   ```bash
   # Check your .env file has required variables
   cat .env | grep -E "(TURSO|SUPABASE)"

   # For Turso, you need:
   TURSO_DATABASE_URL=libsql://...
   TURSO_AUTH_TOKEN=eyJ...

   # For Supabase, you need:
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
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
# Test connectivity to both providers
npm run db:manage test --verbose

# Check network connectivity
curl -I https://your-project.supabase.co  # For Supabase
# Turso connectivity is tested by the client
```

**Solutions:**

1. **Network Issues**

   - Check firewall settings
   - Verify DNS resolution
   - Test from different network if possible

2. **Invalid Credentials**

   ```bash
   # Turso: Verify token hasn't expired
   # Check at: https://turso.tech/

   # Supabase: Verify project is active
   # Check at: https://supabase.com/dashboard
   ```

3. **Database Server Issues**
   - Check provider status pages
   - Verify database instance is running
   - Check for maintenance windows

### "Provider detection failed"

**Symptoms:**

- Auto-detection doesn't work
- Wrong database provider selected
- Inconsistent behavior between environments

**Diagnosis:**

```bash
npm run db:status
# Look at "Provider Selection Logic" section
```

**Solutions:**

1. **Explicit Provider Setting**

   ```bash
   # Set explicit provider in .env
   echo "DATABASE_PROVIDER=turso" >> .env
   # or
   echo "DATABASE_PROVIDER=supabase" >> .env
   ```

2. **Clear Detection Issues**

   ```bash
   # Remove auto-detection, use explicit choice
   sed -i 's/DATABASE_PROVIDER=auto/DATABASE_PROVIDER=turso/' .env
   ```

3. **Multiple Providers Configured**
   - Priority is: Explicit → Supabase → Turso
   - Set `DATABASE_PROVIDER` to override auto-detection

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
   # For Turso
   npm run db:migrate

   # For Supabase
   # Check migrations in Supabase Dashboard
   ```

2. **Manual Schema Check**

   ```bash
   # List tables in current database
   npm run db:manage tables

   # Compare with expected schema in docs
   ```

---

## Database-Specific Issues

### Turso (LibSQL) Issues

#### "Invalid database URL format"

```bash
# Correct format:
TURSO_DATABASE_URL=libsql://database-name.turso.io
# Not: https://database-name.turso.io
```

#### "Authentication failed"

```bash
# Token might be expired - regenerate at:
# https://app.turso.tech/[your-org]/[your-db]/settings/tokens
```

#### "Database not found"

```bash
# Verify database exists in Turso dashboard
# Check organization and database name spelling
```

### Supabase (PostgreSQL) Issues

#### "Invalid API key"

```bash
# Don't use SUPABASE_ANON_KEY for server operations
# Use SUPABASE_SERVICE_ROLE_KEY instead
```

#### "Row Level Security (RLS) policy violation"

```bash
# Check RLS policies in Supabase Dashboard
# Ensure service role can access required tables
```

#### "Project paused"

```bash
# Check if Supabase project is paused
# Free tier projects pause after inactivity
```

---

## Switching Issues

### "Backup creation failed"

**Symptoms:**

- Switching command fails before making changes
- `.env.backup` file is not created

**Diagnosis:**

```bash
# Check filesystem permissions
ls -la .env
ls -la .env.backup 2>/dev/null || echo "Backup doesn't exist"
```

**Solutions:**

```bash
# Manual backup creation
cp .env .env.backup

# Fix permissions if needed
chmod 644 .env
```

### "Environment update failed"

**Symptoms:**

- Switching appears to succeed but database doesn't change
- `.env` file not updated correctly

**Diagnosis:**

```bash
# Check if .env file is writable
ls -la .env

# Verify current provider
npm run db:status | grep "Active Provider"
```

**Solutions:**

```bash
# Make .env writable
chmod 644 .env

# Manual environment update
echo "DATABASE_PROVIDER=turso" >> .env
# or edit directly with nano/vim
```

### "Rollback needed"

**Symptoms:**

- Switch completed but new database doesn't work
- Need to revert to previous configuration

**Solutions:**

```bash
# Automatic rollback
npm run db:restore

# Manual rollback
cp .env.backup .env
npm run db:status  # Verify restoration
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
- Need to restart dev server after switching

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
- Different database provider selected

**Diagnosis:**

```bash
# Check production environment variables
# Ensure DATABASE_PROVIDER is set explicitly
```

**Solutions:**

- Set explicit `DATABASE_PROVIDER` in production
- Use same credentials format as local
- Verify network access from production environment

---

## API Endpoint Issues

### "API returns wrong provider info"

**Symptoms:**

- `/api/supabase-test` reports wrong provider
- Inconsistent provider information

**Diagnosis:**

```bash
# Test API endpoint
curl http://localhost:4321/api/supabase-test

# Check which provider is actually active
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
- Consider switching providers for performance comparison

### "Memory issues during switching"

**Symptoms:**

- Switching process crashes
- Out of memory errors

**Solutions:**

```bash
# Use dry-run mode to test first
node scripts/switch-database.js --to turso --dry-run

# Switch without running other processes
# Stop dev server before switching
```

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
# Test Turso directly
node -e "
import { createClient } from '@libsql/client';
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});
console.log(await client.execute('SELECT 1'));
"

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
# Check all database-related environment variables
env | grep -E "(DATABASE|TURSO|SUPABASE)" | sort

# Check for invisible characters or extra spaces
od -c .env | grep -E "(TURSO|SUPABASE|DATABASE)"
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
DEBUG=1 npm run db:switch:turso 2>&1 | tee switch-debug.log
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
npm run db:backup
# Make changes...
# If issues: npm run db:restore
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

_This troubleshooting guide covers technical resolution for database system issues. For basic usage, see the Database Switching Guide._
