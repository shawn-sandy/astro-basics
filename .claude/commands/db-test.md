Test the Supabase connection with a real read.

This command runs `npm run db:manage test`, which:

- checks that `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set and
  that the URL is parseable, through `getDatabase()` from `#libs/database` - the same rule the
  app applies
- reads up to one row from the `messages` table through that abstraction layer

The command exits non-zero when the database is not configured or the read fails, so
"connection test passed" means Supabase accepted the credentials and the `messages` table
exists and is readable.

- A failing read usually means the credentials were rejected, or that
  `scripts/migrations/006_messages.sql` has not been applied to this project.
- `npm run db:status` reports which of the three keys are set without connecting.
