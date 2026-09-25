List database tables with sample data and row counts, providing insights into the current database structure and content.

This command provides table information including:

- Available tables in the Supabase database
- Row counts and sample records from key tables (messages, etc.)
- Table structure insights
- Data examples to understand content format and types
- Supabase table access methods and limitations

The table listing runs `npm run db:manage tables` (add `--verbose` for sample records) against the Supabase (PostgreSQL) database behind the unified database abstraction layer.
