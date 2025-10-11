# Verification Scripts

This directory contains verification scripts for validating database migrations, schema integrity, and system configuration.

## Available Verification Scripts

### Migration Verification

- **`simple-verify-migration.js`** - Quick verification of migration 004 (email uniqueness constraint)

  ```bash
  node --env-file=.env scripts/verification/simple-verify-migration.js
  ```

  **Checks:**
  - Index `idx_users_email_unique` exists
  - No duplicate emails in database
  - Constraint behavior (optional)

- **`verify-email-constraint.js`** - Comprehensive email uniqueness constraint verification

  ```bash
  node --env-file=.env scripts/verification/verify-email-constraint.js
  ```

  **Performs:**
  - Database connection validation
  - Index existence verification
  - Duplicate email detection
  - Detailed reporting

- **`verify-migration-004.sql`** - SQL-based verification queries for migration 004

  **Usage:**

  ```bash
  psql $SUPABASE_URL -f scripts/verification/verify-migration-004.sql
  ```

### Schema Verification

- **`verify-role-schema.js`** - Validates user role schema and ENUM types

  ```bash
  node --env-file=.env scripts/verification/verify-role-schema.js
  ```

  **Validates:**
  - `user_role` ENUM type exists
  - Valid role values (member, admin, super_admin)
  - Users table role column configuration

## When to Use Verification Scripts

### After Migrations

Run verification scripts after applying database migrations to ensure they were successful:

```bash
# Apply migration
npm run db:migrate

# Verify migration
node --env-file=.env scripts/verification/simple-verify-migration.js
```

### Before Deployment

Verify database integrity before deploying to staging/production:

```bash
# Verify role schema
node --env-file=.env scripts/verification/verify-role-schema.js

# Verify email constraints
node --env-file=.env scripts/verification/verify-email-constraint.js
```

### Troubleshooting

When investigating database issues, verification scripts help identify configuration problems:

```bash
# Check if migration was applied correctly
node --env-file=.env scripts/verification/simple-verify-migration.js
```

## Verification Best Practices

1. **Run before and after migrations** - Verify clean state before applying changes
2. **Include in CI/CD pipelines** - Automate verification in deployment workflows
3. **Document expected output** - Know what success looks like
4. **Keep idempotent** - Scripts should be safe to run multiple times
5. **Clear error messages** - Scripts should clearly indicate what went wrong

## Adding New Verification Scripts

When creating verification scripts:

1. Name descriptively: `verify-<feature-name>.{js,sql}`
2. Make idempotent (safe to run multiple times)
3. Include clear success/failure indicators
4. Document prerequisites and expected output
5. Update this README with usage instructions
