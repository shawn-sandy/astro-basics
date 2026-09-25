Launch the interactive database setup wizard to configure or reconfigure the Supabase connection.

This command provides guided database configuration:

- Supabase project URL and anon key collection with validation
- Optional Supabase service role key
- Automatic .env file configuration and formatting
- Connection testing before finalizing setup
- Integration with existing project structure

The setup wizard runs `npm run db:wizard` and writes the Supabase configuration that `getDatabase()` from `#libs/database` needs. Perfect for new projects or rotating Supabase credentials.
