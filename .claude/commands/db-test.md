Check that the Supabase configuration looks valid. This does not connect to the database.

This command runs `npm run db:manage test`, which checks:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- `SUPABASE_URL` starts with `https://` (a local `http://` Supabase URL is rejected)

It does not send a query. Its "Connection successful" line only means the configuration passed
these checks, not that credentials were accepted or that the `messages` table exists.

- For a real query, start the dev server and open `/api/supabase-test`, which reads through
  `getDatabase()` from `#libs/database`.
- `getDatabase()` also needs `SUPABASE_SERVICE_ROLE_KEY`, which this check does not look at.
  `npm run db:status` reports all three keys.
