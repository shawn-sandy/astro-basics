Test database connectivity, performance, and basic operations for the configured Supabase database.

This command performs comprehensive testing:

- Configuration validation (environment variables, format, keys)
- Network connectivity and authentication testing
- Basic CRUD operations (read test with messages table)
- Response time measurement and performance evaluation
- Supabase health indicators

The test runs `npm run db:manage test` and uses the same Supabase configuration (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) that `getDatabase()` from `#libs/database` requires.
