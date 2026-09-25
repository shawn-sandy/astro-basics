Show comprehensive database status including Supabase configuration and health information for the astro-basics database abstraction system.

This command provides detailed insights into:

- Whether Supabase is configured (`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, all required for database queries)
- Database abstraction layer status
- Environment variables and connection status
- Next recommended actions

The status check runs `npm run db:status`, which reports the Supabase configuration used by `getDatabase()` from `#libs/database`. When Supabase is not configured, it recommends running `npm run db:wizard`.
