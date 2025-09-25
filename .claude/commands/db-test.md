Test database connectivity, performance, and basic operations for the currently configured provider.

This command performs comprehensive testing:

- Configuration validation (environment variables, format, keys)
- Network connectivity and authentication testing
- Basic CRUD operations (read test with messages table)
- Response time measurement and performance evaluation
- Provider-specific health indicators

The test uses the database abstraction layer's unified interface, automatically detecting the active provider through the provider selection logic: DATABASE_PROVIDER override → Supabase preference → Turso fallback.
