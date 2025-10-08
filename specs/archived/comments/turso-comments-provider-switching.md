# Provider Switching Guide - Turso Comments System

This guide covers switching between database providers (Supabase and Turso) for the comment system.

## 🔄 Overview

The Turso Comments System supports seamless switching between:

- **Supabase** (PostgreSQL with Row-Level Security)
- **Turso** (LibSQL/SQLite with edge distribution)

Provider selection is controlled via environment variables with automatic fallback detection.

## ⚙️ Provider Configuration

### Environment Variables

| Variable                    | Values                      | Description                            |
| --------------------------- | --------------------------- | -------------------------------------- |
| `DATABASE_PROVIDER`         | `supabase`, `turso`, `auto` | Explicit provider selection (optional) |
| `SUPABASE_URL`              | URL                         | Supabase project URL                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Key                         | Supabase service role key              |
| `SUPABASE_ANON_KEY`         | Key                         | Supabase anonymous key (optional)      |
| `TURSO_DATABASE_URL`        | URL                         | Turso database URL                     |
| `TURSO_AUTH_TOKEN`          | Token                       | Turso authentication token             |

### Auto-Detection Logic

When `DATABASE_PROVIDER` is not set or set to `auto`:

1. **Check Supabase** configuration first (existing default behavior)
2. **Check Turso** configuration if Supabase unavailable
3. **Return null** if neither provider configured

## 🔀 Switching Scenarios

### Scenario 1: Supabase to Turso Migration

#### Prerequisites

- [ ] Turso database created and accessible
- [ ] Environment variables configured
- [ ] Data migration completed (if needed)

#### Step-by-Step Process

1. **Prepare Turso Environment**

   ```bash
   # Set Turso environment variables
   export TURSO_DATABASE_URL="libsql://your-database.turso.io"
   export TURSO_AUTH_TOKEN="your-auth-token"
   ```

2. **Run Turso Migrations**

   ```sql
   -- Apply migration 002_create_comments_tables.up.sql
   -- This creates the users and comments tables with proper schema
   ```

3. **Test Turso Configuration**

   ```bash
   # Validate Turso provider
   node scripts/test-comments-system.mjs --quick
   ```

4. **Switch Provider**

   ```bash
   # Option A: Explicit switching
   export DATABASE_PROVIDER="turso"

   # Option B: Auto-detection (remove Supabase env vars)
   unset SUPABASE_URL
   unset SUPABASE_SERVICE_ROLE_KEY
   ```

5. **Verify Switch**

   ```bash
   # Run comprehensive tests
   node scripts/test-comments-system.mjs

   # Check build
   npm run build
   ```

### Scenario 2: Turso to Supabase Migration

#### Prerequisites

- [ ] Supabase project created and accessible
- [ ] RLS policies configured
- [ ] Environment variables set
- [ ] Data migration completed (if needed)

#### Step-by-Step Process

1. **Prepare Supabase Environment**

   ```bash
   # Set Supabase environment variables
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
   export SUPABASE_ANON_KEY="eyJ..."
   ```

2. **Configure Supabase Tables**

   - Create `users` and `comments` tables
   - Set up RLS policies
   - Create appropriate indexes

3. **Test Supabase Configuration**

   ```bash
   node scripts/test-comments-system.mjs --quick
   ```

4. **Switch Provider**

   ```bash
   # Option A: Explicit switching
   export DATABASE_PROVIDER="supabase"

   # Option B: Auto-detection (Supabase takes priority)
   # Keep both sets of env vars - Supabase will be selected automatically
   ```

5. **Verify Switch**

   ```bash
   node scripts/test-comments-system.mjs
   npm run build
   ```

### Scenario 3: Multi-Environment Setup

#### Development with Turso, Production with Supabase

**Development (.env.development)**

```env
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=libsql://dev-database.turso.io
TURSO_AUTH_TOKEN=dev_token_here
```

**Production (.env.production)**

```env
DATABASE_PROVIDER=supabase
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod_key_here
SUPABASE_ANON_KEY=prod_anon_key_here
```

## 📊 Data Migration Considerations

### Schema Compatibility

Both providers use the same table structure:

```sql
-- Users table (identical schema)
CREATE TABLE users (
  id TEXT/UUID PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments table (identical schema)
CREATE TABLE comments (
  id TEXT/UUID PRIMARY KEY,
  content TEXT NOT NULL,
  author_id TEXT/UUID REFERENCES users(id),
  commentable_type TEXT NOT NULL,
  commentable_id TEXT NOT NULL,
  parent_comment_id TEXT/UUID REFERENCES comments(id),
  status TEXT DEFAULT 'active',
  is_internal BOOLEAN DEFAULT FALSE,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Data Migration Scripts

#### Export from Supabase

```sql
-- Export users
COPY (SELECT * FROM users) TO '/tmp/users.csv' CSV HEADER;

-- Export comments
COPY (SELECT * FROM comments) TO '/tmp/comments.csv' CSV HEADER;
```

#### Import to Turso

```bash
# Use turso CLI or SQL scripts to import CSV data
turso db shell your-database < import-users.sql
turso db shell your-database < import-comments.sql
```

#### Export from Turso

```bash
# Export using turso CLI
turso db shell your-database "SELECT * FROM users" > users.csv
turso db shell your-database "SELECT * FROM comments" > comments.csv
```

## 🔍 Validation & Testing

### Pre-Switch Validation

```bash
# Test current provider
node scripts/test-comments-system.mjs

# Backup current data (if needed)
# Run provider-specific backup procedures
```

### Post-Switch Validation

```bash
# Validate new provider
node scripts/test-comments-system.mjs

# Test API endpoints
curl http://localhost:4321/api/comments?type=post&id=test

# Check application functionality
npm run build
npm run dev
```

### Rollback Procedures

If switching fails:

1. **Revert Environment Variables**

   ```bash
   # Restore original DATABASE_PROVIDER
   export DATABASE_PROVIDER="original_provider"
   ```

2. **Validate Rollback**

   ```bash
   node scripts/test-comments-system.mjs --quick
   ```

3. **Check Application**

   ```bash
   npm run build
   npm run dev
   ```

## 🚨 Common Issues & Troubleshooting

### Issue: "No database provider configured"

**Solution**: Ensure required environment variables are set for chosen provider

### Issue: "Provider reports as unavailable"

**Solution**: Check network connectivity and credentials

### Issue: "Foreign key constraint failed"

**Solution**: Ensure user exists before creating comments, or enable auto-user creation

### Issue: "Table does not exist"

**Solution**: Run migrations for the new provider

### Issue: "RLS policy violation" (Supabase)

**Solution**: Configure proper Row-Level Security policies

## 📋 Provider Switching Checklist

### Pre-Switch

- [ ] New provider environment configured
- [ ] New provider database accessible
- [ ] Migrations applied to new provider
- [ ] Data migration completed (if needed)
- [ ] Tests passing on new provider

### During Switch

- [ ] Environment variables updated
- [ ] Application restarted (if needed)
- [ ] DNS/load balancer updated (if applicable)

### Post-Switch

- [ ] Health checks passing
- [ ] API endpoints responding correctly
- [ ] User authentication working
- [ ] Comments system functional
- [ ] No critical errors in logs
- [ ] Performance within acceptable ranges

### Cleanup

- [ ] Old provider resources cleaned up (if no longer needed)
- [ ] Old environment variables removed
- [ ] Documentation updated
- [ ] Team notified of changes

## 🛠️ Advanced Configuration

### Hybrid Setup (Not Recommended)

While the system supports only one active provider, you can maintain configurations for both:

```env
# Both providers configured - Supabase takes priority
DATABASE_PROVIDER=auto
SUPABASE_URL=https://prod.supabase.co
SUPABASE_SERVICE_ROLE_KEY=key1
TURSO_DATABASE_URL=libsql://backup.turso.io
TURSO_AUTH_TOKEN=token2
```

### Custom Provider Selection Logic

For advanced use cases, modify `src/utils/database-config.ts`:

```typescript
export function getDatabaseProvider(): DatabaseProvider {
  // Custom logic here
  if (someCondition) return 'turso'
  return 'supabase'
}
```

## 📞 Support

If you encounter issues during provider switching:

1. Check the [Production Checklist](turso-comments-production-checklist.md)
2. Run comprehensive tests: `node scripts/test-comments-system.mjs`
3. Review application logs for specific error messages
4. Consult provider-specific documentation (Supabase/Turso)

---

**✅ Successful Switch**: All validations passing, system functional
**⚠️ Issues Detected**: Review troubleshooting guide and logs
**❌ Switch Failed**: Follow rollback procedures immediately
