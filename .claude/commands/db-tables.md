List database tables with sample data and row counts, providing insights into the current database structure and content.

This command runs `npm run db:manage tables` (add `--verbose` for sample records), which:

- reads up to five rows from the `messages` table through `getDatabase()` from `#libs/database`
- reports how many came back, and with `--verbose` prints their subject and id

Only `messages` is checked: it is the only table the abstraction layer covers. Use the
Supabase dashboard for a full table list, row counts and column types.

The command exits non-zero when the database is not configured or the read fails, so a
missing `messages` table (apply `scripts/migrations/006_messages.sql`) or a rejected
credential is reported rather than passed over.
