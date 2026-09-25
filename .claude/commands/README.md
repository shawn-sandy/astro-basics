# Claude Database Management Commands

This directory contains Claude slash commands for managing the astro-basics database. Supabase
(PostgreSQL) is the only database provider.

## Available Commands

- **`/db-status`** - Show whether the Supabase connection is configured (`npm run db:status`)
- **`/db-setup`** - Launch the interactive setup wizard (`npm run db:wizard`)

## Related Scripts

- **`scripts/setup-wizard.js`** - Interactive Supabase configuration; updates only the `.env` keys it manages
- **`scripts/database-status.js`** - Supabase configuration status report
- **`scripts/migrations/`** - Supabase SQL migrations, applied with `psql` (see its README)

## Server-Side Database Access

Application code reaches Supabase through the helpers in `src/libs/supabase-native.ts`
(`getSupabaseServiceRole()`, `createAuthenticatedSupabaseClient()`, `createServerSupabaseClient()`),
typed by `src/libs/database.types.ts`.
