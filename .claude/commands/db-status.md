Show comprehensive database status including active provider, configuration, and health information for the astro-basics database abstraction system.

This command provides detailed insights into:

- Current database provider (Turso/Supabase/Auto-detected)
- Configuration status and available providers
- Database abstraction layer status
- Environment variables and connection status
- Next recommended actions

The status check leverages the existing database abstraction layer that automatically detects and prioritizes providers: Explicit choice → Supabase → Turso → Error if none configured.
