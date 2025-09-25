Interactively switch between database providers (Turso ↔ Supabase) with automatic backup and validation.

This command provides safe database switching with:

- Automatic backup creation before switching (.env → .env.backup)
- Connection testing for target provider before commit
- Environment variable updates (DATABASE_PROVIDER)
- Rollback capability if switching fails
- Post-switch validation and status confirmation

The switching system uses the unified database abstraction layer that enables seamless provider changes without code modifications. Both providers share identical schemas and operations through the Database interface.
