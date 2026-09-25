---
name: verify
description: How to verify astro-basics changes at runtime - Claude skills and their helper scripts, the db:* CLI scripts, API routes and the contact form - without real service credentials.
---

# Verifying astro-basics at runtime

## Skill changes

Skills under `.claude/skills/` have two surfaces: the helper script's CLI, and the
agent that follows `SKILL.md`. Verify both. No build step is needed.

### Script CLI (example: auth-and-database-setup)

- Run it exactly as the skill does, from the repo root:
  `node --env-file=<file> .claude/skills/auth-and-database-setup/scripts/status.mjs`.
  Use one env file per scenario in the scratchpad, never the real `.env`.
- Spawn it with `env: {}` so shell variables do not leak into the scenario.
- For the Supabase probe, run local `http.createServer` fakes that answer
  `/rest/v1/users` with 200 `[]`, 404 `{"code":"PGRST205"}`, 401 `{"code":"42501"}`,
  401 `{"message":"Invalid API key"}`, a silent socket, and 401 headers with a stalled
  body. The timeout cases take about 10s each.
- Grep every captured output for the fake secrets, hosts and ports you fed in. The
  script's contract is that none of them are ever printed.
- To see what the app would really request, point `@supabase/supabase-js` (resolved
  from the repo's `node_modules`) at the same fake server.

### Agent

- Put a throwaway `.env` with fake keys in the worktree. Check that none exists first,
  and afterwards `mv` it to the scratchpad (`rm` is denied here).
- Run this, then parse the JSONL for `tool_use` entries. Check that the skill was chosen,
  that the script ran, that `.env` was never read, and that the fake keys never appear in
  the transcript.

  ```bash
  claude -p "is auth enabled?" --output-format stream-json --verbose --max-turns 10 \
    --allowedTools "Skill" "Read" "Glob" "Grep" \
    "Bash(node --env-file=.env .claude/skills/auth-and-database-setup/scripts/status.mjs)"
  ```

### Gotchas

- The script path is relative. Run it from anywhere but the repo root and it dies with
  a Node module-not-found stack trace.
- `npm test` and `tsc` fail on a clean checkout for reasons unrelated to skills. They are
  not verification here.

## App changes: db scripts, API routes, contact form

### Handles

- Dev server: `preview_start` with the `dev` config in `.claude/launch.json` (port 4331).
- Worktrees usually have no `.env`, so every `npm run db:*` script fails with
  `node: .env: not found`. Run the script directly with a scratch env file instead:
  `node --env-file=<scratch>/x.env scripts/database-status.js`.

### Supabase without credentials

Run a tiny PostgREST stand-in on `127.0.0.1:54399` (Node `http` server in the scratchpad) that
logs each request and answers `/rest/v1/messages`:

- `POST ...?select=id` with `Accept: application/vnd.pgrst.object+json` -> `201 {"id":101}`
- `POST` without `select=` -> `201` empty
- `GET` -> `200` JSON array of rows (object when the Accept header asks for one)

Point the app at it with `SUPABASE_URL=http://127.0.0.1:54399` plus any `eyJ...` anon and service
keys. For the dev server, add a temporary launch config whose `runtimeExecutable` is `env` and
whose `runtimeArgs` are `VAR=value ...` followed by `npm run dev -- --port 4332`; revert
`launch.json` afterwards.

### Flows worth driving

- `/message-us` form (Name, Email, Subject, Message, Send Message) -> POST `/api/message-us`.
  Unconfigured: 503 "Database service unavailable". Configured: stub log shows the insert.
- `GET /api/message-us` -> `configured` / `provider`; `GET /api/supabase-test` -> reads via
  `getDatabase()`.
- `/dashboard/messages` -> reads messages through `getDatabase()`.
- `db:status`, `db:schema`, `db:seed:messages`, `db:manage`, with the `.env.example` placeholders
  and with the stub. `db:seed:messages` inserts its whole batch in one `POST`, so the stand-in
  should answer that `POST ...?select=id` with one `{"id":n}` per row it received.

### Gotchas

- CSRF cookie (`__Host-csrf-token`) is per host, not per port. After switching between dev servers
  on `localhost`, the first form POST can fail "CSRF token invalid"; reload the page and resubmit.
  `127.0.0.1` is refused by the browser pane.
- No `tmux` on this machine. For inquirer prompts (`setup:roles`) use a pty:
  `(sleep 8; printf 'y\r') | script -q /dev/null npx tsx scripts/setup-roles.ts --dry-run`.
- `db:wizard` writes `<projectRoot>/.env`. Copy `scripts/setup-wizard.js` and
  `scripts/lib/env-file.js` into a scratch dir and run it there with piped answers.
- `db:manage`, `db:schema` and `db:seed:messages` import `#libs/database`, so they need the
  `tsx` loader: run them directly as `node --import tsx --env-file=<scratch>/x.env <script>`.
  They accept an `http://` Supabase URL, which is what lets the stand-in above serve them.
- `db:manage test`, `db:manage tables`, `db:manage health` and `db:schema` each read the
  `messages` table and exit non-zero when that read fails, so the stand-in has to answer
  `GET /rest/v1/messages`. Answer `401` from it to see the failure path.
- `tests/scripts/db-scripts.test.ts` already drives these four commands against an in-process
  PostgREST stand-in; copy its `startStandIn` helper rather than writing a new one.
