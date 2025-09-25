Show migration status and run pending database migrations to ensure schema compatibility across providers.

This command handles database migrations by:

- Checking current migration status and pending migrations
- Displaying migration history and version information
- Running pending migrations with provider-specific handling
- Validating schema compatibility between Turso and Supabase
- Providing rollback options and migration troubleshooting
- Ensuring database schema matches application expectations

Migration management works seamlessly with the database abstraction layer, maintaining schema consistency across both Turso (LibSQL) and Supabase (PostgreSQL) while handling provider-specific migration requirements.
