Preview and execute database cleanup operations to optimize performance and remove unused data with safety checks.

This command provides database maintenance through:

- Dry-run mode to preview cleanup operations without changes (`npm run db:manage cleanup --dry-run`)
- Archived message removal (older than 90 days) with confirmation
- Orphaned record identification and cleanup recommendations
- Database optimization including index rebuilding and statistics updates (VACUUM/ANALYZE on Supabase PostgreSQL)

Cleanup operations target the Supabase database behind the abstraction layer, ensuring optimal performance while maintaining data integrity.
