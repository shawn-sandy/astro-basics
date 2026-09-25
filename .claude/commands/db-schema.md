Validate the Supabase database schema and ensure it matches application expectations.

This command provides schema validation through:

- Supabase configuration check (`npm run db:schema`)
- Table structure validation and column type verification
- Index and constraint checking
- Application code schema requirement validation
- Migration recommendations for schema discrepancies (SQL files in `scripts/migrations/`)

Schema validation leverages the unified database abstraction layer's type system, ensuring the Supabase implementation properly supports the Database interface contract.
