Show the Supabase database configuration status by running `npm run db:status`.

This command reports:

- Whether `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set (unreplaced
  `YOUR_...` placeholders from `.env.example` count as not set)
- Overall status: fully configured, partially configured, or not configured
- The next recommended action, such as running `npm run db:wizard`

The service role key is needed for server-side operations such as the Clerk webhook and user sync.
