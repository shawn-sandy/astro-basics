Preview and execute database cleanup operations to optimize performance and remove unused data with safety checks.

This command provides database maintenance through:

- Dry-run mode to preview cleanup operations without changes
- Archived message removal (older than 90 days) with confirmation
- Orphaned record identification and cleanup recommendations
- Database optimization including index rebuilding and statistics updates
- Provider-specific cleanup operations (VACUUM for Turso, ANALYZE for Supabase)
- Backup creation before destructive operations

Cleanup operations use the database abstraction layer to perform provider-appropriate maintenance tasks, ensuring optimal performance while maintaining data integrity across both Turso and Supabase configurations.
