Validate the Supabase `messages` table against what the application reads.

This command runs `npm run db:schema`, which:

- checks that `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set
- reads up to one row from the `messages` table through `getDatabase()` from `#libs/database`
- checks that the returned row carries the NOT NULL columns the application reads

It exits non-zero when the database is not configured, when the read fails, or when a column
is missing. An empty table is reported as readable but unconfirmed: there is no row to check
the columns against.

What it does not check, because the Supabase client cannot see it:

- column types, defaults, constraints and indexes
- the nullable columns (`subject`, `ip_address`, `user_agent`), which read as `NULL` whether
  or not they exist
- any table other than `messages`

`scripts/migrations/006_messages.sql` is the source of truth for the full schema; compare
against it, and apply it when the table does not exist. `--verbose` prints the expected
columns and indexes.
