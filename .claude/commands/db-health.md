Run comprehensive database health check including performance metrics, configuration validation, and Supabase diagnostics.

This command runs `npm run db:manage health`, which:

- checks the configuration through `getDatabase()` from `#libs/database` (URL, anon key and
  service role key)
- times a one-row read of the `messages` table and rates the response time
- links to the Supabase dashboard for anything it cannot see from here

The command exits non-zero when the database is not configured or the read fails. It does not
validate the schema (use `/db-schema`) or inspect any other table.
