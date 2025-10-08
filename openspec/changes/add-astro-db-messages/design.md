# Design Document: Turso Standardization for Messages

## Context

The astro-basics-website project currently supports two database backends (Supabase PostgreSQL and Turso LibSQL) through a unified abstraction layer defined in `src/libs/database.ts`. While this dual-provider flexibility was initially valuable, it has created unnecessary complexity in the message storage layer without clear architectural benefits.

Turso solves this problem by providing:

- **Edge-native architecture**: Global distribution with <50ms latency worldwide
- **Production-proven reliability**: Already battle-tested in our codebase with comprehensive error handling
- **Exceptional developer experience**: Robust CLI tooling, local replicas, and built-in database shell
- **Cost-effective scaling**: Generous free tier (500 databases, 9GB storage) suitable for production
- **Separation of concerns**: Clear boundary between authentication/social (Supabase) and messaging (Turso)
- **Simplified abstraction**: Single implementation reduces maintenance and testing overhead

**Stakeholders:**

- **Developers**: Simplified codebase with single message storage implementation
- **DevOps**: Reduced complexity in deployment and configuration management
- **End Users**: Improved performance via edge distribution and optimized queries
- **Architecture Team**: Clear separation between database responsibilities

**Constraints:**

- Must not break existing Turso message operations
- Must maintain Supabase for users, organizations, comments, and authentication
- Should preserve the Database interface contract for future flexibility
- Must provide clear migration path for teams using Supabase for messages
- Should maintain type safety across the system

## Goals / Non-Goals

### Goals

- **Standardize on Turso** as the exclusive database provider for messages
- **Eliminate dual-provider complexity** from message storage layer
- **Enhance Turso integration** with improved error handling and diagnostics
- **Provide comprehensive migration tooling** for teams switching from Supabase to Turso
- **Improve developer experience** with enhanced Turso CLI integration
- **Document dual-database architecture** clearly (Supabase + Turso)
- **Maintain backward compatibility** with existing Turso message operations

### Non-Goals

- Migrate authentication, organizations, or comments from Supabase to Turso
- Remove the database abstraction layer entirely (may support future providers)
- Change the Message interface or API contract
- Support runtime provider switching for messages (Turso is always used)
- Add new database providers beyond Supabase and Turso

## Decisions

### Decision 1: Turso as Exclusive Messages Provider

**Decision:** Turso will be the only supported database provider for the messages table. Supabase continues to handle users, organizations, organization_memberships, user_preferences, and comments.

**Rationale:**

- **Separation of Concerns**: Messages are transactional data best suited for edge distribution, while user/org/comment data benefits from PostgreSQL's advanced features (RLS, real-time subscriptions, complex joins)
- **Performance Optimization**: Turso's edge architecture provides optimal latency for message retrieval globally
- **Reduced Complexity**: Eliminating provider choice for messages simplifies code, testing, and documentation
- **Clear Responsibility Boundaries**: Supabase owns identity/social features, Turso owns messaging infrastructure
- **Production-Ready**: Existing `src/libs/turso.ts` implementation already includes retry logic, connection pooling, and comprehensive error handling

**Alternatives Considered:**

1. **Keep dual Supabase/Turso support**: Rejected because maintaining two implementations adds complexity without measurable benefits for the message use case
2. **Consolidate everything into Supabase**: Rejected because Turso's edge distribution significantly improves message retrieval performance for global users
3. **Use Astro DB**: Rejected because Turso provides more mature tooling, better production track record, and clearer deployment model

### Decision 2: Remove DATABASE_PROVIDER for Messages

**Decision:** The `DATABASE_PROVIDER` environment variable will no longer apply to message operations. Messages always use Turso. The variable continues to control other database features if needed.

**Rationale:**

- **Eliminates Configuration Confusion**: Developers no longer need to understand provider selection logic for messages
- **Enforces Architectural Boundaries**: Makes it clear that messages have a dedicated infrastructure
- **Simplifies Testing**: No need to test multiple provider implementations for messages
- **Reduces Runtime Branching**: Application code doesn't need provider detection for message operations

**Alternatives Considered:**

1. **Keep DATABASE_PROVIDER with Turso-only validation**: Rejected as unnecessarily complex - why have a variable that only accepts one value?
2. **Separate MESSAGE_PROVIDER variable**: Rejected because it adds another environment variable without benefit

### Decision 3: Enhanced Turso Integration

**Decision:** Improve the existing `TursoDatabase` class with better error handling, connection diagnostics, and developer tooling.

**Rationale:**

- **Leverage Existing Code**: Build on proven implementation rather than rewrite
- **Better Developer Experience**: Enhanced error messages help debugging
- **Production Reliability**: Improved diagnostics reduce troubleshooting time
- **Consistent Patterns**: Maintain the Database interface for future flexibility

**Enhancements:**

- Detailed connection validation with specific error messages
- Retry logic improvements with exponential backoff
- Query performance logging for optimization
- Enhanced TypeScript types for query results
- Better handling of edge cases (network failures, rate limits)

**Alternatives Considered:**

1. **Rewrite from scratch**: Rejected because current implementation is stable and well-tested
2. **Minimal changes**: Rejected because opportunity to improve DX is valuable

### Decision 4: Comprehensive Migration Tooling

**Decision:** Create dedicated migration scripts to move messages from Supabase to Turso with validation, backup, and rollback support.

**Rationale:**

- **Safe Migration**: Teams need confidence their data won't be lost
- **Validation**: Schema compatibility must be verified before import
- **Rollback Plan**: Backups enable recovery if migration fails
- **Documentation**: Step-by-step guide reduces migration risk

**Migration Script Features:**

- Export messages from Supabase to JSON intermediate format
- Schema validation before import
- Dry-run mode for testing without data changes
- Progress reporting for large datasets
- Automatic backup creation before migration
- Idempotent import (safe to re-run)

**Alternatives Considered:**

1. **Manual migration instructions**: Rejected as error-prone for large datasets
2. **Live replication**: Rejected as overly complex for one-time migration

### Decision 5: Dual-Database Architecture Documentation

**Decision:** Create comprehensive documentation explaining the Supabase + Turso architecture, including when to use each database.

**Rationale:**

- **Clarity for New Developers**: Explicit documentation reduces confusion
- **Decision Transparency**: Future maintainers understand why this architecture exists
- **Best Practices**: Clear guidelines prevent misuse of either database
- **Onboarding Speed**: New team members get up to speed faster

**Documentation Structure:**

1. `docs/database/database-architecture.md` - High-level dual-database strategy
2. `docs/database/turso-setup.md` - Complete Turso setup and configuration
3. `docs/database/turso-cli-guide.md` - Common Turso CLI operations
4. `docs/database/message-schema.md` - Messages table schema reference
5. `docs/database/migration-from-supabase.md` - Step-by-step migration guide

**Alternatives Considered:**

1. **Inline code comments only**: Rejected because architecture decisions need dedicated documentation
2. **README.md only**: Rejected because detailed docs warrant separate files

## Architecture

### Component Structure

```
astro-basics-website/
├── src/
│   └── libs/
│       ├── database.ts                   # Simplified - Turso for messages only
│       ├── database-types.ts             # Updated docs, provider = 'turso' for messages
│       ├── supabase.ts                   # Unchanged - users/orgs/comments
│       └── turso.ts                      # Enhanced - exclusive message provider
├── scripts/
│   ├── turso-setup.ts                    # New - Interactive Turso setup wizard
│   ├── migrate-messages-to-turso.ts      # New - Supabase → Turso migration
│   ├── seed-messages.ts                  # Enhanced - Comprehensive seed data
│   └── migrations/
│       └── turso/                        # New - Turso schema migrations
│           └── 001_messages_table.sql
└── docs/
    └── database/
        ├── database-architecture.md      # New - Dual-database strategy
        ├── turso-setup.md                # New - Turso configuration guide
        ├── turso-cli-guide.md            # New - CLI operations reference
        ├── message-schema.md             # New - Schema documentation
        └── migration-from-supabase.md    # New - Migration guide
```

### Class Structure

```typescript
interface Database {
  getProviderName(): string
  isConfigured(): boolean
  // Message operations only - enforced for Turso
  insertMessage(data: MessageData): Promise<number>
  getMessages(options?: MessageQueryOptions): Promise<Message[]>
  getMessageById(id: number): Promise<Message | null>
  markMessageAsRead(id: number): Promise<boolean>
  archiveMessage(id: number): Promise<boolean>
}

// Only TursoDatabase implements Database for messages
class TursoDatabase implements Database {
  // Enhanced error handling
  // Improved connection diagnostics
  // Better retry logic
  // Query performance logging
}

// SupabaseDatabase no longer used for messages
// (Continues to serve users, orgs, comments via separate interface)
```

### Data Flow

```
API Request → getDatabase() → TursoDatabase (always)
                                    ↓
                           Turso LibSQL Client
                                    ↓
                           Edge-Distributed Database
```

### Environment Variables

```bash
# Required for message operations
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=eyJ...

# Required for auth/social features (separate concern)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# No longer used for messages
# DATABASE_PROVIDER (kept for other features if needed)
```

## Risks / Trade-offs

### Risk 1: Single Provider Lock-in

**Risk:** Standardizing on Turso reduces flexibility to switch providers in the future.

**Mitigation:**

- Database interface remains intact for future provider additions if needed
- Turso is open-source (LibSQL) reducing vendor lock-in risk
- Migration tooling demonstrates we can move data between providers
- Dual-database architecture shows we're comfortable using multiple databases

**Trade-off:** Accepting reduced flexibility to gain simplicity and performance.

### Risk 2: Migration Data Loss

**Risk:** Migrating existing messages from Supabase to Turso could result in data loss or corruption.

**Mitigation:**

- Migration script includes mandatory backup step
- Dry-run mode allows validation without changes
- Export to JSON intermediate format enables inspection
- Schema validation prevents incompatible data imports
- Idempotent import allows safe re-runs
- Comprehensive testing with production-like data volumes
- Rollback procedures documented

**Trade-off:** Migration takes longer but is much safer.

### Risk 3: Turso Service Availability

**Risk:** If Turso experiences outages, message functionality fails completely.

**Mitigation:**

- Turso has strong uptime SLA (99.9%)
- Edge distribution provides redundancy
- Local replica support for development
- Database interface allows adding fallback provider if needed
- Monitoring and alerting for Turso connectivity

**Trade-off:** Accepting single-provider dependency for performance benefits.

### Risk 4: Learning Curve for Turso CLI

**Risk:** Developers unfamiliar with Turso may struggle with CLI operations.

**Mitigation:**

- Comprehensive CLI guide in `docs/database/turso-cli-guide.md`
- Interactive setup wizard (`scripts/turso-setup.ts`)
- npm scripts wrap common operations
- Detailed error messages with next steps
- Example commands for common scenarios

**Trade-off:** Initial learning investment pays off with better tooling long-term.

### Risk 5: Schema Migration Management

**Risk:** Turso schema changes might be harder to track than Supabase migrations.

**Mitigation:**

- Dedicated migration files in `scripts/migrations/turso/`
- Version numbering for migration order
- Migration status tracking
- Schema validation scripts
- Documentation of all schema changes

**Trade-off:** Additional process overhead for schema change management.

## Migration Plan

### Phase 1: Enhancement and Documentation (Week 1-2)

1. Enhance `TursoDatabase` class with improved error handling
2. Create `scripts/turso-setup.ts` interactive wizard
3. Write comprehensive Turso documentation
4. Update `.env.example` with clear Turso instructions
5. Add npm scripts for Turso operations

**Success Criteria:**

- Enhanced error messages provide actionable guidance
- Setup wizard successfully configures new Turso instances
- Documentation covers all common operations

**Rollback:** No production changes; purely additive work

### Phase 2: Migration Tooling Development (Week 2-3)

1. Create `scripts/migrate-messages-to-turso.ts` migration script
2. Implement export from Supabase to JSON
3. Implement schema validation
4. Implement import from JSON to Turso
5. Test with production-like data volumes (10,000+ messages)
6. Document migration procedure

**Success Criteria:**

- Migration script completes without errors on test data
- All message fields preserved correctly
- Dry-run mode accurately predicts changes

**Rollback:** Keep Supabase implementation until migration validated

### Phase 3: Code Simplification (Week 3-4)

1. Update `src/libs/database.ts` to enforce Turso for messages
2. Remove Supabase fallback logic from message operations
3. Update tests to remove multi-provider message scenarios
4. Update API documentation
5. Run full test suite

**Success Criteria:**

- All tests pass with Turso-only message implementation
- Code complexity metrics improve
- No regressions in message functionality

**Rollback:** Git revert to previous commit; Supabase option still available in history

### Phase 4: Production Migration (Week 4-5+)

1. Communicate migration timeline to stakeholders
2. Create production Turso database backup
3. Run migration in staging environment
4. Validate staging data integrity
5. Execute production migration during low-traffic window
6. Monitor for 48 hours post-migration
7. Archive old Supabase message data

**Success Criteria:**

- Zero data loss during migration
- Message functionality works identically post-migration
- Performance metrics equal or better than Supabase

**Rollback Procedure:**

1. Restore Supabase from backup
2. Redeploy previous application version
3. Update environment variables to use Supabase
4. Verify message functionality restored

### Deployment Checklist

- [ ] Turso CLI installed and configured (`turso --version`)
- [ ] `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in environment
- [ ] Enhanced `TursoDatabase` class passes all tests
- [ ] Migration script tested on staging environment
- [ ] Documentation complete and reviewed
- [ ] Backup created before production migration
- [ ] Monitoring configured for Turso connectivity
- [ ] Team trained on new Turso workflows
- [ ] Rollback procedure tested and documented

### Rollback Procedures

**If Turso connection fails:**

1. Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correct
2. Verify Turso service status at status.turso.tech
3. Check application logs for specific error messages
4. Test connection using `turso db shell`
5. Contact Turso support if service issue

**If data corruption detected:**

1. Immediately stop application to prevent further writes
2. Restore Turso database from most recent backup
3. Compare data checksums with Supabase backup
4. Re-run migration script if needed
5. Investigate root cause before resuming

**If performance degradation:**

1. Check Turso dashboard for query analytics
2. Review slow query logs
3. Analyze query patterns for optimization opportunities
4. Consider adding database indexes
5. Contact Turso support for performance tuning

## Open Questions

1. **Should we add automatic Turso backups to CI/CD?**

   - Current answer: Yes, add daily backup jobs to prevent data loss
   - Action: Implement backup automation in Phase 4

2. **What's the optimal Turso database location for global users?**

   - Current answer: Primary in US, replicas in EU and APAC
   - Action: Test latency from different regions during Phase 1

3. **Should we implement read replicas for message retrieval?**

   - Current answer: Monitor performance first, add if needed
   - Action: Track P95 latency metrics during Phase 4

4. **How do we handle Turso schema migrations in production?**

   - Current answer: Use versioned migration files with dry-run validation
   - Action: Create migration SOP document during Phase 2

5. **Should we keep the Database interface for future flexibility?**
   - Current answer: Yes, minimal overhead and preserves options
   - Action: Document interface design decisions
