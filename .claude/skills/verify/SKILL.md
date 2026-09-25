---
name: verify
description: Recipe for verifying astro-basics changes at runtime - db:* CLI scripts, API routes and the contact form - without real Supabase credentials.
---

# Verifying astro-basics at runtime

## Handles

- Dev server: `preview_start` with the `dev` config in `.claude/launch.json` (port 4331).
- Worktrees usually have no `.env`, so every `npm run db:*` script fails with
  `node: .env: not found`. Run the script directly with a scratch env file instead:
  `node --env-file=<scratch>/x.env scripts/database-status.js`.

## Supabase without credentials

Run a tiny PostgREST stand-in on `127.0.0.1:54399` (Node `http` server in the scratchpad) that
logs each request and answers `/rest/v1/messages`:

- `POST ...?select=id` with `Accept: application/vnd.pgrst.object+json` -> `201 {"id":101}`
- `POST` without `select=` -> `201` empty
- `GET` -> `200` JSON array of rows (object when the Accept header asks for one)

Point the app at it with `SUPABASE_URL=http://127.0.0.1:54399` plus any `eyJ...` anon and service
keys. For the dev server, add a temporary launch config whose `runtimeExecutable` is `env` and
whose `runtimeArgs` are `VAR=value ...` followed by `npm run dev -- --port 4332`; revert
`launch.json` afterwards.

## Flows worth driving

- `/message-us` form (Name, Email, Subject, Message, Send Message) -> POST `/api/message-us`.
  Unconfigured: 503 "Database service unavailable". Configured: stub log shows the insert.
- `GET /api/message-us` -> `configured` / `provider`; `GET /api/supabase-test` -> reads via
  `getDatabase()`.
- `/dashboard/messages` -> reads messages through `getDatabase()`.
- `db:status`, `db:schema`, `db:seed:messages`, `db:manage`, with the `.env.example` placeholders
  and with the stub.

## Gotchas

- CSRF cookie (`__Host-csrf-token`) is per host, not per port. After switching between dev servers
  on `localhost`, the first form POST can fail "CSRF token invalid"; reload the page and resubmit.
  `127.0.0.1` is refused by the browser pane.
- No `tmux` on this machine. For inquirer prompts (`setup:roles`) use a pty:
  `(sleep 8; printf 'y\r') | script -q /dev/null npx tsx scripts/setup-roles.ts --dry-run`.
- `db:wizard` writes `<projectRoot>/.env`. Copy `scripts/setup-wizard.js` and
  `scripts/lib/env-file.js` into a scratch dir and run it there with piped answers.
- `db:manage test` only validates config and rejects `http://` URLs; it never queries.
