Launch the interactive database setup wizard (`npm run db:wizard`) to configure or reconfigure the Supabase connection.

This command provides guided database configuration:

- Step-by-step collection of the Supabase project URL, anon key and (optional) service role key
- Format validation of each value before it is saved
- Updates only the keys it manages in `.env`, leaving every other line and comment untouched
- A configuration summary before and after setup

Supabase is the only database provider. After setup, apply the migrations in `scripts/migrations/`
(see its README) and check the result with `/db-status`.
