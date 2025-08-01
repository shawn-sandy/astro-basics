# Manual Database Setup for Netlify

## Option 1: Supabase (Recommended)

1. Create a Supabase project at <https://supabase.com>
2. Get your connection details:

   - `DATABASE_URL`: Your Supabase connection string
   - `SUPABASE_ANON_KEY`: Your anon key
   - `SUPABASE_URL`: Your project URL

3. Add to Netlify environment variables:

   ```env
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_URL=https://your-project.supabase.co
   ```

## Option 2: PlanetScale

1. Create a PlanetScale database
2. Get connection string and add to Netlify:

   ```env
   DATABASE_URL=mysql://[user]:[password]@[host]/[database]?sslaccept=strict
   ```

## Option 3: SQLite with Turso (LibSQL)

1. Install Turso CLI: `npm install -g @libsql/client`
2. Create database: `turso db create astro-basics`
3. Get auth token: `turso db tokens create astro-basics`
4. Add to Netlify:

   ```env
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your_auth_token
   ```

## Option 4: Keep Astro DB but Fix Setup

1. Run locally first: `npm run db:push`
2. Connect to Astro Studio: `npx astro db link`
3. Get your database URL from Astro Studio
4. Add to Netlify environment variables:

   ```env
   ASTRO_DATABASE_URL=your_astro_db_url
   ASTRO_DATABASE_TOKEN=your_astro_db_token
   ```
