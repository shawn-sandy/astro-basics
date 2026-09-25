# Messages Table

The `messages` table stores contact-form submissions. It is the only table the database
abstraction layer (`src/libs/database.ts`) reads or writes, so the contact form,
`/dashboard/messages` and `npm run db:seed:messages` all depend on it.

## Applying the migration

A fresh Supabase project does not have this table. Apply
`scripts/migrations/006_messages.sql` with `psql`, or paste it into the Supabase SQL editor:

```bash
# DATABASE_URL is your Supabase connection string (Project Settings → Database)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrations/006_messages.sql
```

Confirm it afterwards:

```bash
npm run db:schema      # reads the table and checks the columns the app needs
npm run db:manage test # reads one row and fails when the read is rejected
```

Without the migration, both commands fail with `relation "messages" does not exist`, the
contact form returns a 500, and `/dashboard/messages` shows no messages.

`006_messages.sql` depends on `001_core_schema.sql`: `messages.user_id` references
`users(id)`. Rolling it back with `rollback_006_messages.sql` **deletes every stored
message**; back the table up first with
`pg_dump "$DATABASE_URL" --table=messages > messages-backup.sql`.

## Schema

| Column          | Type          | Null | Notes                                              |
| --------------- | ------------- | ---- | -------------------------------------------------- |
| `id`            | `bigint`      | no   | Primary key, identity                              |
| `user_id`       | `uuid`        | yes  | References `users(id)`, `NULL` when anonymous      |
| `clerk_user_id` | `text`        | yes  | Clerk user id, `NULL` when anonymous               |
| `name`          | `text`        | no   | From the form                                      |
| `email`         | `text`        | no   | From the form                                      |
| `subject`       | `text`        | yes  | From the form                                      |
| `message`       | `text`        | no   | From the form                                      |
| `is_read`       | `boolean`     | no   | Default `false`, set by the dashboard              |
| `is_archived`   | `boolean`     | no   | Default `false`, set by the dashboard              |
| `ip_address`    | `text`        | yes  | Captured by the API route                          |
| `user_agent`    | `text`        | yes  | Captured by the API route                          |
| `created_at`    | `timestamptz` | no   | Default `now()`; a seed may set it                 |
| `updated_at`    | `timestamptz` | no   | Default `now()`, maintained by a trigger on update |

Indexes: `idx_messages_created_at` (the dashboard lists newest first),
`idx_messages_is_read`, `idx_messages_is_archived` and `idx_messages_user_id`.

### Row Level Security

RLS is enabled with a single policy, `messages_service_all`, granting the `service_role`
full access. `anon` and `authenticated` therefore have **no** access: messages hold
personal data (email, IP address, user agent), and every read and write goes through the
server-side service role client. This is why `getDatabase()` requires
`SUPABASE_SERVICE_ROLE_KEY` on top of the URL and anon key.

## Reading and writing it

Application code never touches the table directly:

```typescript
import { getDatabase } from '#libs/database'

const db = getDatabase()

const id = await db.insertMessage({ name, email, subject, message })
const unread = await db.getMessages({ is_read: false, limit: 10 })
await db.markMessageAsRead(id)
await db.archiveMessage(id)
```

### Bulk inserts

`insertMessage()` always creates an unread, unarchived message stamped with the current
time. `insertMessages()` writes rows verbatim, which is what a seed or an import needs:

```typescript
const ids = await db.insertMessages([
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    subject: 'Question about pricing',
    message: 'Do you offer annual discounts?',
    is_read: true,
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
  },
])
```

Every field beyond `name`, `email` and `message` is optional and falls back to the
`insertMessage()` default. The batch is one `INSERT`, so a failure leaves no partial write
behind, and the returned ids are in insert order.

## The db:\* scripts

`db:manage`, `db:schema` and `db:seed:messages` import `#libs/database` and therefore run
through the `tsx` loader (`node --import tsx --env-file=.env <script>`, which is what the
npm scripts do). They hold no Supabase credentials of their own:

| Command                    | What it does                                                 |
| -------------------------- | ------------------------------------------------------------ |
| `npm run db:status`        | Reports which keys are set. Sends no query.                  |
| `npm run db:manage test`   | Reads one row; exits non-zero when the read fails.           |
| `npm run db:manage tables` | Reads up to five rows; `--verbose` prints them.              |
| `npm run db:manage health` | Times a one-row read and rates the response time.            |
| `npm run db:schema`        | Reads one row and checks the NOT NULL columns the app reads. |
| `npm run db:seed:messages` | Inserts ~24 sample messages spread over the past 90 days.    |

`db:schema` cannot see column types, defaults, constraints or indexes, and cannot tell a
missing nullable column from a `NULL` one - the abstraction layer maps both to `null`.
`scripts/migrations/006_messages.sql` remains the source of truth for the full schema.

## Tests

`tests/scripts/db-scripts.test.ts` runs these commands against an in-process stand-in for
the Supabase REST API, asserting that each one really issues a request and that a rejected
read fails the command. Its `startStandIn` helper is the quickest way to exercise this code
without real Supabase credentials.

## Related documentation

- [Migrations README](../../scripts/migrations/README.md)
- [Database Troubleshooting](../02-guides/database-troubleshooting-guide.md)
- [Environment Configuration](../11-reference/environment-configuration.md)
