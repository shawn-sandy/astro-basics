# Standardize on Turso for Messages Database

## Why

The project currently uses a unified database abstraction layer that supports both Supabase (PostgreSQL) and Turso (LibSQL) for message storage. However, maintaining dual implementations adds complexity without clear architectural benefits. This proposal standardizes on Turso as the primary and recommended database for messages:

- **Separation of Concerns**: Turso exclusively handles messages while Supabase focuses on authentication, organizations, comments, and user management
- **Edge-Ready Architecture**: Turso's LibSQL provides global edge distribution with low latency (<50ms globally)
- **Simplified Abstraction Layer**: Single implementation reduces maintenance burden and testing surface area
- **Developer Experience**: Consistent Turso CLI tooling and SDK across all message operations
- **Type Safety**: Existing TypeScript integration with comprehensive database-types.ts
- **Production-Ready**: Already battle-tested in the current codebase with retry logic and connection management
- **Cost Effective**: Generous free tier (500 databases, 9GB storage) suitable for development and small production deployments

By standardizing on Turso for messages, we maintain clear separation between authentication/social features (Supabase) and messaging infrastructure (Turso), while eliminating the complexity of supporting multiple message storage backends.

## What Changes

This proposal refines the database abstraction layer to establish Turso as the standard messages database:

- Enhance existing `TursoDatabase` class in `src/libs/turso.ts` with improved error handling
- Remove Supabase as a fallback option for messages table operations
- Update provider detection logic to prioritize Turso for messages
- Simplify `DATABASE_PROVIDER` environment variable to clearly indicate Turso for messages
- Enhance Turso connection validation with detailed diagnostics
- Add comprehensive seed data for development using enhanced `scripts/seed-messages.ts`
- Improve npm scripts for Turso-specific operations (shell, inspect, migrate)
- Update documentation to explain the dual-database architecture (Supabase + Turso)
- **Non-Breaking**: Existing Turso implementation remains unchanged, only documentation and recommendations updated
- **Clear Migration Path**: Guide for teams currently using Supabase for messages to switch to Turso

### Provider Separation Strategy

- **Supabase (PostgreSQL)**: Handles users, organizations, organization_memberships, user_preferences, and comments
- **Turso (LibSQL)**: Dedicated handler for messages table exclusively
- **Selection Logic**: Explicit separation - no provider selection for messages, always Turso
- **Environment Variables**:
  - `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` required for message operations
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` required for auth/social features

## Impact

### Affected Specs

- `database-abstraction` - Simplify to remove multi-provider support for messages
- `message-system` - Standardize on Turso as the exclusive storage backend
- `turso-integration` - Enhance with improved tooling and developer experience features

### Affected Code

- `src/libs/database.ts` - Remove Supabase fallback for messages, enforce Turso
- `src/libs/database-types.ts` - Update documentation to clarify provider responsibilities
- `src/libs/turso.ts` - Enhance error handling, connection diagnostics, and retry logic
- `scripts/seed-messages.ts` - Expand with comprehensive seed data examples
- `scripts/turso-setup.ts` - Create new setup wizard for first-time Turso configuration
- `package.json` - Add enhanced Turso CLI integration scripts
- `.env.example` - Update documentation clarifying Turso requirement for messages
- `docs/database/turso-setup.md` - Comprehensive Turso setup and usage guide
- `docs/database/database-architecture.md` - Document dual-database strategy

### Migration Path

For teams currently using Supabase for messages:

1. **Assessment**: Verify Turso CLI installation (`turso --version`)
2. **Database Creation**: Create Turso database using `turso db create astro-basics-messages`
3. **Schema Migration**: Run Turso schema migration for messages table
4. **Data Export**: Export existing messages from Supabase using provided script
5. **Data Import**: Import messages to Turso using `scripts/migrate-messages-to-turso.ts`
6. **Environment Update**: Update `.env` with Turso credentials
7. **Validation**: Run `npm run db:check` to verify Turso connection
8. **Testing**: Execute E2E tests to confirm message operations
9. **Deployment**: Update production environment variables

### Developer Experience Improvements

- **Faster Onboarding**: Clear, single-path setup for messages database
- **Local Development**: Turso's local replica support for offline development
- **Database Inspection**: `turso db shell` for direct SQL access and debugging
- **Migration Tooling**: Dedicated migration scripts for schema versioning
- **Type Safety**: Automated TypeScript type generation from Turso schema
- **Consistent Tooling**: Unified Turso CLI for all database operations
- **Performance Monitoring**: Built-in query analytics via Turso dashboard

### Testing Impact

- Simplified test setup with single message database provider
- Faster E2E tests using Turso's in-memory replica mode
- Reduced CI/CD complexity by removing multi-provider test matrices
- Consistent test data seeding using Turso-specific scripts
- Improved test isolation with ephemeral Turso database creation

### Performance Benefits

- **Lower Latency**: Edge distribution reduces global message retrieval times
- **Read Replicas**: Automatic replication to multiple regions
- **Connection Pooling**: Efficient connection management with HTTP-based protocol
- **Reduced Complexity**: Single database engine for messages eliminates abstraction overhead
- **Optimized Queries**: Turso-specific query optimizations without multi-provider constraints

### Documentation Updates

New documentation to be created:

1. `docs/database/turso-setup.md` - Complete Turso setup guide
2. `docs/database/database-architecture.md` - Explain dual-database strategy
3. `docs/database/message-schema.md` - Turso messages table schema reference
4. `docs/database/turso-cli-guide.md` - Common Turso CLI operations
5. `docs/database/migration-from-supabase.md` - Step-by-step migration guide

Updated documentation:

1. `README.md` - Update database setup instructions
2. `docs/database/README.md` - Clarify provider responsibilities
3. `.env.example` - Enhanced comments for Turso variables
