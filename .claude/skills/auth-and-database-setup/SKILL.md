---
name: auth-and-database-setup
description: Turn on Clerk login and a Turso or Supabase database for astro-basics, keeping secrets out of the chat. Use when someone asks to enable auth, login, sign-in, or the database, or asks if they are on.
version: 0.1.0
---

# Auth and Database Setup

Take a running copy of astro-basics from "login and database are off" to "on and
verified". If the site does not run yet, do the `project-setup` skill first.

## Ground rules

- **Secrets never pass through the chat.** The person pastes keys into `.env`
  themselves. You check the result with the status script, which prints no values.
  If they paste a secret key into the chat anyway, tell them to regenerate it in that
  service's dashboard. The old one is now in the chat history.
- **Never read `.env`.** No `cat`, no Read tool, no `grep` that prints lines. Use the
  status script.
- **Do not use `npm run db:wizard`.** It rewrites `.env` from scratch and drops every
  key it does not know, including `PUBLIC_SUPABASE_*`, email, and Axiom settings.
- **Do not use `npm run db:migrate`.** It does not load `.env`, so it always reports
  missing Turso variables. Use `npm run db:setup` instead.
- `.env` is only read at startup. Restart `npm run dev` after every edit.

## Step 0 - Where things stand

If there is no `.env`, create one from the template. Never overwrite an existing one:

```bash
cp -n .env.example .env
```

Then run the status script:

```bash
node --env-file=.env .claude/skills/auth-and-database-setup/scripts/status.mjs
```

Each feature shows `ON` or `OFF`, and each setting shows `ok`, `placeholder`,
`missing`, or `wrong format`. Tell them in plain words what is on, then ask what they
want: login, a database, or both.

## Part A - Login (Clerk)

1. They sign up at [clerk.com](https://clerk.com), create an application (email
   sign-in is fine to start), and open **API Keys** in the Clerk dashboard.
2. In `.env` they replace `YOUR_CLERK_PUBLISHABLE_KEY` with the key that starts
   `pk_`, and `YOUR_CLERK_SECRET_KEY` with the one that starts `sk_`. The trailing
   `# comment` on each line can stay.
3. Run the status script. `Login (Clerk): ON` is the goal. `wrong format` usually
   means the two keys were swapped.
4. Restart `npm run dev`. The terminal should no longer print "Using dummy Clerk
   keys". Open `http://localhost:4321/dashboard`. It should send them to a Clerk
   sign-in page, and after they sign up it should bring them back to the dashboard.

`/dashboard`, `/forum`, and `/organization` require sign-in. Everything else stays
public.

**Webhook (optional, Supabase only).** The webhook copies Clerk users into the
Supabase `users` table. Clerk cannot reach `localhost`, so this only works on a
deployed site. In the Clerk dashboard, go to **Webhooks** and add the endpoint
`https://<their-site>/api/webhooks/clerk`. Subscribe it to the `user.*` and
`organizationMembership.*` events. Then they paste its Signing Secret (`whsec_...`)
into `CLERK_WEBHOOK_SECRET`. Locally, `npm run db:sync-user` does the same copy
once, on demand.

## Part B - Database

Help them choose:

| Choose       | If they want                                                            |
| ------------ | ----------------------------------------------------------------------- |
| **Turso**    | Messages (`/api/message-us`, `/dashboard/messages`). Simplest setup.    |
| **Supabase** | Signed-in users stored with roles, organizations, and preferences.      |
| **Both**     | Both of the above. Set `DATABASE_PROVIDER=turso` in `.env` (see below). |

The repo has no Supabase SQL that creates the `messages` table. When both databases
are configured, the app sends messages to Supabase by default, and those calls fail.
Setting `DATABASE_PROVIDER=turso` keeps messages on Turso, and user sync still goes
to Supabase.

### Turso

1. Install the Turso CLI. On a Mac use `brew install tursodatabase/tap/turso`,
   otherwise `curl -sSfL https://get.tur.so/install.sh | bash`. Then run
   `turso auth signup` (or `turso auth login`). Both open a browser.
2. Create the database and get its URL. The URL is not a secret, so you can run
   these yourself:

   ```bash
   turso db create astro-basics
   turso db show astro-basics --url
   ```

3. **They** run `turso db tokens create astro-basics` in their own terminal. The
   output is a secret, so do not run it yourself. In `.env` they replace
   `YOUR_TURSO_DATABASE_URL` with the URL (`libsql://...`) and
   `YOUR_TURSO_AUTH_TOKEN` with the token.
4. Create the tables, then confirm that `messages` is listed:

   ```bash
   npm run db:setup
   npm run test:db:connection
   ```

### Supabase

1. They create a project at [supabase.com](https://supabase.com) and open
   **Project Settings > API**.
2. In `.env` they replace the placeholders:
   - `SUPABASE_URL` and `PUBLIC_SUPABASE_URL`: the Project URL (`https://...`)
   - `SUPABASE_ANON_KEY` and `PUBLIC_SUPABASE_ANON_KEY`: the anon (or publishable)
     key
   - `SUPABASE_SERVICE_ROLE_KEY`: the service_role (or secret) key. This key is
     needed for Clerk user sync.
3. Create the schema. In the Supabase dashboard, open **SQL Editor** and run these
   two files, in order and one at a time:
   - `scripts/migrations/001_core_schema.sql`
   - `scripts/migrations/002_security_policies.sql`

   On a Mac, `pbcopy < scripts/migrations/001_core_schema.sql` puts a file on the
   clipboard. Skip the other files in that folder. `scripts/migrations/README.md`
   explains why.

4. Run the status script. The goal is `Database: Supabase: ON` and
   `Supabase users table: found`.

The policies in `002` check the Clerk user's ID, so queries made from the browser
also need Clerk added as a Third-Party Auth provider in Supabase. Server-side code
uses the service role key and does not need it. The steps are in
`src/content/docs/guide/integrations/clerk-supabase.mdx`.

## When something goes wrong

| What they see                                     | What it means                                               | What to do                                                          |
| ------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Status script says `ok` but the site is unchanged | The dev server is still using the old `.env`                | `Ctrl+C`, `npm run dev`                                             |
| `node: .env: not found`                           | There is no `.env` yet                                      | Step 0                                                              |
| `Supabase users table: MISSING`                   | The schema SQL has not been run                             | Supabase, step 3                                                    |
| `Supabase users table: key rejected`              | The anon key was copied wrong or belongs to another project | Recopy `SUPABASE_ANON_KEY`                                          |
| `could not reach SUPABASE_URL (ENOTFOUND)`        | Typo in the URL, or the project is paused                   | Check the Project URL; resume the project in the Supabase dashboard |
| `db:setup` fails with `fetch failed`              | The Turso URL or token is wrong                             | Rerun `turso db show astro-basics --url` and create a new token     |
| `npm run db:status` says "Set" for everything     | That script counts placeholders as set                      | Trust the status script instead                                     |

## Done

Run the status script one last time and report what is on, in plain words. Out of
scope for this skill: custom roles (`npm run setup:roles`, which is interactive, so
they run it in their own terminal), email, and Axiom logging.
