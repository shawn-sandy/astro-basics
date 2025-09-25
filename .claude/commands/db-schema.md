Validate database schema compatibility between providers and ensure schema matches application expectations.

This command provides schema validation through:

- Cross-provider schema comparison (Turso LibSQL ↔ Supabase PostgreSQL)
- Table structure validation and column type mapping verification
- Index and constraint compatibility checking
- Application code schema requirement validation
- Migration recommendations for schema discrepancies
- Provider-specific schema features and limitations analysis

Schema validation leverages the unified database abstraction layer's type system, ensuring the Database interface contract is properly supported across both provider implementations while identifying potential compatibility issues.
