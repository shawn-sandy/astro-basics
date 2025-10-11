# Testing Scripts

This directory contains test scripts for verifying functionality and behavior of various components in the astro-basics project.

## Available Test Scripts

### Database Testing

- **`test-db-connection.js`** - Tests Turso database connection

  ```bash
  npm run test:db:connection
  ```

  Verifies database connectivity and lists existing tables.

- **`test-database-abstraction.js`** - Tests the unified database abstraction layer
  ```bash
  npm run test:db:abstraction
  ```
  Validates that the database abstraction layer works correctly with active provider.

### Webhook Testing

- **`test-duplicate-email-webhook.js`** - Tests Clerk webhook duplicate email handling

  ```bash
  npm run test:webhook:duplicate-email
  ```

  **Prerequisites:**
  - Dev server running (`npm run dev`)
  - `CLERK_WEBHOOK_SECRET` configured
  - Supabase configured with migration 004 applied

  **What it tests:**
  - Creates user with unique email (baseline)
  - Attempts duplicate email creation (should return 409)
  - Verifies database integrity
  - Confirms error logging with `logger.flush()`

## Usage Pattern

All test scripts follow this pattern:

```bash
# Start dev server (if needed for API tests)
npm run dev

# Run specific test
npm run test:<category>:<name>
```

## Adding New Tests

When adding new test scripts:

1. Place the script in this directory
2. Add npm script in `package.json` following pattern: `test:<category>:<name>`
3. Update this README with script description
4. Include prerequisites and usage examples
