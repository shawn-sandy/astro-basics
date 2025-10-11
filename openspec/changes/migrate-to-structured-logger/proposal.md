# Migrate to Structured Logger

## Why

The codebase currently has ~45 instances of direct `console.*` usage in the `src/` directory that bypass the production-ready structured logger utility at `src/utils/logger.ts`. This creates significant observability gaps:

- **Lost Production Insights**: Console logs in API routes lack correlation IDs, structured context, and persistent storage, making debugging production issues difficult
- **Security Risks**: Direct console usage doesn't benefit from automatic PII sanitization, potentially exposing sensitive data (tokens, passwords) in logs
- **Inconsistent Logging**: Mix of unstructured console output and structured logger creates fragmented log streams with no centralized search or alerting
- **Missing Performance Metrics**: API routes lack request duration tracking and slow request alerts (>2s threshold)

The existing logger utility at `src/utils/logger.ts` is fully production-ready with Axiom integration, distributed tracing support, automatic PII redaction, and environment-aware formatting. This migration will establish it as the single source of truth for all application logging.

## What Changes

### Phase 1: API Routes Migration (~20 instances)

- **PRIORITY 1**: Migrate 5 API route files to use structured logger
  - `src/pages/api/messages.ts` (7 instances)
  - `src/pages/api/user/sync.ts` (4 instances)
  - `src/pages/api/message-us.ts` (3 instances)
  - `src/pages/api/supabase-test.ts` (3 instances)
  - `src/pages/api/test/sync-user.ts` (1 instance)
- Add correlation ID tracking to all API request flows
- Implement `logger.flush()` calls before serverless function completion
- Replace error logging with structured error context

### Phase 2: Library Code Migration (~15 instances)

- Migrate database abstraction layer (`src/libs/database.ts` - 5 instances)
- Update Turso client error handling (`src/libs/turso.ts` - 6 instances)
- Migrate Supabase authentication utilities (`src/libs/supabase-auth.ts` - 6 instances)
- Update schema setup logging (`src/libs/schema-setup.ts` - 3 instances)
- Enhance error context with query details, retry attempts, and operation context

### Phase 3: Utilities & Code Quality Enforcement (~10 instances + tooling)

- Migrate role-guard utility (`src/utils/role-guard.ts` - 8 instances)
- Update IP validation warnings (`src/utils/ip-validation.ts` - 3 instances)
- **BREAKING**: Add ESLint `no-console` rule with exceptions for:
  - `src/utils/logger.ts` (legitimate internal usage)
  - `scripts/**/*.{js,ts}` (CLI tools where console is appropriate)
  - `public/**/*.js` (client-side browser logging)
- Update pre-commit hooks to enforce no-console rule
- Document logger usage guidelines in `CLAUDE.md`

### Out of Scope

- **Scripts directory** (`scripts/`) - Console usage is appropriate for CLI tools (50+ instances preserved)
- **Public assets** (`public/`) - Browser console usage is acceptable for client-side debugging (13 instances preserved)
- **Documentation** (`*.mdx`, `*.md`) - Code examples in docs don't execute (50+ instances preserved)
- **Tests** - Test files may use console for debugging (3 files preserved)
- **Client-side React components** - Client-side logging has different requirements (optional migration)

## Impact

### Affected Specifications

- **NEW**: `logger` capability (doesn't currently exist in `openspec/specs/`)

### Affected Code

**High-Impact Files** (improved production observability):

- `src/pages/api/messages.ts` - Full CRUD comment system API
- `src/pages/api/user/sync.ts` - Clerk-Supabase user synchronization
- `src/pages/api/message-us.ts` - Contact form submission endpoint
- `src/libs/database.ts` - Unified database abstraction layer
- `src/libs/turso.ts` - Turso client with retry logic
- `src/libs/supabase-auth.ts` - Supabase authentication utilities

**Breaking Changes**:

- ESLint `no-console` rule addition will fail CI for new console usage in `src/` directory (excluding allowed paths)
- Pre-commit hooks will prevent commits with new console usage
- Developers must use `logger` utility for all new logging needs

**Migration Path**:

Existing console usage will be migrated incrementally across 3 phases with no runtime breaking changes. The ESLint rule will only prevent _new_ console usage, existing code continues to work during migration.

### Benefits

- **Observability**: Centralized logs in Axiom with full-text search and alerting
- **Debugging**: Correlation IDs enable request tracing across services and database operations
- **Performance**: Automatic slow request detection (>2s threshold) with warnings
- **Security**: Automatic PII redaction prevents accidental exposure of tokens, passwords, secrets
- **Consistency**: All logs follow structured JSON format for automated parsing and monitoring
- **Production-Ready**: Environment-aware logging (verbose dev, structured prod, warn/error-only console in production)

### Risks

- **Development Friction**: Developers accustomed to console.log will need to adopt logger patterns
- **Migration Complexity**: ~45 files to update with potential for introducing bugs if correlation IDs not properly threaded
- **Serverless Functions**: Missing `logger.flush()` calls could result in lost logs in Netlify/Vercel Functions

**Mitigation**:

- Phased rollout allows testing and validation at each stage
- Documentation and examples in `CLAUDE.md` for common logging patterns
- ESLint rule with clear error messages guides developers to correct usage
- Pre-commit hooks catch issues before code review
