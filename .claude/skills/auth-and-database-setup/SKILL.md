---
name: auth-and-database-setup
description: Turn on Clerk login and the Supabase database for astro-basics, keeping secrets out of the chat. Use when someone asks to enable auth, login, sign-in, or the database, or asks if they are on.
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
- `npm run db:wizard` is an alternative for the database keys, but it is interactive,
  so only the person can run it, in their own terminal. It does not set
  `PUBLIC_SUPABASE_*`, so those still need editing by hand.
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

Each feature shows `ON` or `OFF`, using the app's own rules. Each setting shows `ok`,
`placeholder`, `missing`, `unusable` (the app will ignore it), or `set, but ...` (the
app accepts it, but it is probably pasted in the wrong place or only half replaced).
Tell them in plain words what is on, then ask what they want: login, a database, or
both.

## Part A - Login (Clerk)

1. They sign up at [clerk.com](https://clerk.com), create an application (email
   sign-in is fine to start), and open **API Keys** in the Clerk dashboard.
2. In `.env` they replace `YOUR_CLERK_PUBLISHABLE_KEY` with the key that starts
   `pk_`, and `YOUR_CLERK_SECRET_KEY` with the one that starts `sk_`. The trailing
   `# comment` on each line can stay.
3. Run the status script. `Login (Clerk): ON` with both keys `ok` is the goal.
   `set, but expected pk_...` usually means the two keys were swapped. Login still
   shows ON because the app accepts the values, but sign-in will fail.
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
into `CLERK_WEBHOOK_SECRET`.

## Part B - Database (Supabase)

Supabase stores signed-in users with their roles, organizations, and preferences, and
it is where the app sends contact messages.

The repo has no Supabase SQL that creates the `messages` table yet, so
`/api/message-us` and `/dashboard/messages` fail until that table exists. Tell them
this before they start.

1. They create a project at [supabase.com](https://supabase.com) and open
   **Project Settings > API**.
2. In `.env` they replace the placeholders:
   - `SUPABASE_URL` and `PUBLIC_SUPABASE_URL`: the Project URL (`https://...`), not the
     REST endpoint that ends in `/rest/v1`
   - `SUPABASE_ANON_KEY` and `PUBLIC_SUPABASE_ANON_KEY`: the anon (or publishable)
     key
   - `SUPABASE_SERVICE_ROLE_KEY`: the service_role (or secret) key. It is required:
     the app uses it for every database query, and for Clerk user sync.
3. Create the schema. In the Supabase dashboard, open **SQL Editor** and run these
   two files, in order and one at a time:
   - `scripts/migrations/001_core_schema.sql`
   - `scripts/migrations/002_security_policies.sql`

   On a Mac, `pbcopy < scripts/migrations/001_core_schema.sql` puts a file on the
   clipboard. Skip the other files in that folder. `scripts/migrations/README.md`
   explains why.

4. Run the status script. The goal is `Database: Supabase: ON` and
   `Supabase users table: found`. With login on too, it should also say
   `Clerk user sync: ready`. Otherwise signed-in users are never stored.

The policies in `002` check the Clerk user's ID, so queries made from the browser
also need Clerk added as a Third-Party Auth provider in Supabase. Server-side code
uses the service role key and does not need it. The steps are in
`src/content/docs/guide/integrations/clerk-supabase.mdx`.

## When something goes wrong

| What they see                                     | What it means                                                 | What to do                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Status script says `ok` but the site is unchanged | The dev server is still using the old `.env`                  | `Ctrl+C`, `npm run dev`                                                                  |
| `node: .env: not found`                           | There is no `.env` yet                                        | Step 0                                                                                   |
| `Supabase users table: MISSING (404)`             | The schema SQL has not been run, or the API cannot see it yet | Part B, step 3. If it already ran, check that the Data API exposes the `public` schema   |
| `Supabase users table: exists, but ... (42501)`   | The table is there, but the API roles have no grants on it    | The schema SQL changes no grants; check the table's API access in the Supabase dashboard |
| `Supabase users table: key rejected`              | The anon key was copied wrong or belongs to another project   | Recopy `SUPABASE_ANON_KEY`                                                               |
| `could not reach SUPABASE_URL (ENOTFOUND)`        | Typo in the URL, or the project is paused                     | Check the Project URL; resume the project in the Supabase dashboard                      |
| `SUPABASE_URL` says `without /rest/v1`            | They pasted the REST endpoint; the app adds `/rest/v1` itself | Delete `/rest/v1` from the end of `SUPABASE_URL` and `PUBLIC_SUPABASE_URL`               |
| `Supabase users table: timed out`                 | The URL points at something that never answers                | Check the Project URL is the one from **Project Settings > API**                         |
| `Clerk user sync: not ready`                      | Login is off                                                  | Part A                                                                                   |

## Done

Run the status script one last time and report what is on, in plain words. Out of
scope for this skill: custom roles (`npm run setup:roles`, which is interactive, so
they run it in their own terminal), email, and Axiom logging.
