# Design: Structured Logger Migration

## Context

The project has a production-ready structured logger utility at `src/utils/logger.ts` with comprehensive features:

- **Axiom Integration**: Persistent log storage with search and alerting
- **Distributed Tracing**: Correlation IDs for request tracking across services
- **Security**: Automatic PII sanitization (tokens, passwords, secrets)
- **Performance**: Fire-and-forget Axiom delivery, production log filtering
- **Serverless**: Manual flush() for Lambda/Netlify Functions
- **Dual Output**: Human-friendly dev logs, structured JSON production logs

However, ~45 instances of direct `console.*` usage in `src/` bypass this infrastructure, creating observability gaps, security risks, and inconsistent logging patterns.

**Key Stakeholders**:

- **Developers**: Need clear migration path and helpful linting errors
- **Operations**: Require centralized logs for production debugging
- **Security**: Demand PII protection and audit trails
- **Business**: Want faster incident resolution and better monitoring

**Constraints**:

- Must maintain backward compatibility during migration (no runtime breaking changes)
- ESLint rule can only prevent _new_ console usage, not break existing code
- Serverless deployment requires explicit `logger.flush()` calls
- TypeScript strict mode must be maintained throughout
- Performance impact must be negligible (async logging, fire-and-forget)

## Goals / Non-Goals

### Goals

1. **Production Observability**: Centralize all application logs in Axiom for search, correlation, and alerting
2. **Security Compliance**: Ensure automatic PII sanitization for all logs via logger utility
3. **Developer Experience**: Provide clear ESLint guidance and helpful error messages for console usage
4. **Performance Monitoring**: Enable automatic slow request detection (>2s) across all API routes
5. **Maintainability**: Establish logger as single source of truth with ESLint enforcement

### Non-Goals

1. **Client-Side Logging**: React components can optionally use console (different logging concerns)
2. **CLI Tool Migration**: Scripts in `scripts/` directory should continue using console (user-facing output)
3. **Browser Logging**: Public assets (`public/`) can use console for client-side debugging
4. **Backward Breaking**: Will not introduce runtime breaking changes (only ESLint rule for new code)
5. **Complete Refactor**: Will not redesign logger utility, only migrate usage

## Decisions

### Decision 1: Phased Migration Strategy

**Choice**: Migrate in 3 phases (API Routes → Libraries → Utilities) rather than all-at-once

**Rationale**:

- **Risk Mitigation**: Smaller changesets easier to review and test
- **Incremental Value**: API routes provide immediate observability benefits
- **Validation**: Each phase can be validated independently before proceeding
- **Rollback**: Easier to identify and revert problematic changes

**Alternatives Considered**:

- **Big Bang Migration**: All files at once
  - ❌ High risk of introducing bugs across many files simultaneously
  - ❌ Difficult to validate comprehensively
  - ❌ Large PR review burden
- **Bottom-Up** (utilities first, then libraries, then routes)
  - ❌ Delays highest-value improvements (API route observability)
  - ❌ Less motivating for team (benefits not immediately visible)

### Decision 2: ESLint Rule with Path-Based Exceptions

**Choice**: Add `no-console` rule with exceptions for `logger.ts`, `scripts/**`, and `public/**`

**Rationale**:

- **Prevention**: Stops new console usage from being introduced during migration
- **Appropriate Usage**: Allows console in contexts where it's the right tool (CLI scripts, browser debugging)
- **Developer Guidance**: Clear error messages guide developers to use logger utility
- **Pre-commit Safety**: Catch issues before code review

**Configuration**:

```json
{
  "rules": {
    "no-console": [
      "error",
      {
        "allow": []
      }
    ]
  },
  "overrides": [
    {
      "files": ["src/utils/logger.ts", "scripts/**/*.{js,ts}", "public/**/*.js"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

**Alternatives Considered**:

- **No ESLint Rule**: Rely on code review only
  - ❌ Easy to miss in large PRs
  - ❌ No automated enforcement
  - ❌ Inconsistent across contributors
- **Global no-console**: No exceptions
  - ❌ Breaks legitimate CLI script usage
  - ❌ Forces workarounds in browser code
  - ❌ Would flag logger.ts internal implementation

### Decision 3: Correlation ID Propagation Pattern

**Choice**: Generate correlation IDs at API route entry points, pass through function calls

**Pattern**:

```typescript
// API Route Entry Point
export const POST: APIRoute = async ({ request, locals }) => {
  const correlationId = logger.createCorrelationId()
  const ctx = logger.apiRequest('/api/messages', 'POST', locals.userId, correlationId)

  try {
    // Pass correlationId to all downstream calls
    const result = await createMessage(data, { correlationId })
    await logger.apiComplete(ctx, 200)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (error) {
    await logger.error('API error', {
      endpoint: '/api/messages',
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    await logger.apiComplete(ctx, 500)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  } finally {
    await logger.flush() // Critical for serverless
  }
}

// Library Function
async function createMessage(data: MessageData, context: { correlationId: string }) {
  await logger.debug('Creating message', {
    correlationId: context.correlationId,
    userId: data.userId,
  })
  // ... implementation
}
```

**Rationale**:

- **Request Tracing**: Follow single request across multiple services/layers
- **Debugging**: Filter logs by correlationId to see entire request lifecycle
- **Performance Analysis**: Correlate slow operations with specific requests
- **Production Troubleshooting**: Users can provide correlationId from error message

**Alternatives Considered**:

- **No Correlation IDs**: Each log entry independent
  - ❌ Impossible to trace request flow
  - ❌ Difficult to debug distributed issues
  - ❌ No performance profiling across layers
- **AsyncLocalStorage**: Node.js async context
  - ❌ Not available in all serverless environments
  - ❌ Adds complexity and potential memory leaks
  - ❌ Harder to understand and debug

### Decision 4: Explicit logger.flush() for Serverless

**Choice**: Require explicit `logger.flush()` calls in API routes before response

**Rationale**:

- **Log Reliability**: Serverless functions terminate immediately after response, potentially losing batched logs
- **Axiom Batching**: SDK batches logs for efficiency but needs manual flush in short-lived contexts
- **Developer Awareness**: Explicit call makes async logging visible in code
- **Best Practice**: Matches patterns from other serverless logging libraries

**Implementation**:

```typescript
// ✅ CORRECT: Flush in finally block
export const POST: APIRoute = async ({ request }) => {
  try {
    // ... business logic
    return new Response(...)
  } finally {
    await logger.flush() // Ensures logs delivered before function terminates
  }
}

// ❌ INCORRECT: No flush
export const POST: APIRoute = async ({ request }) => {
  await logger.info('Processing request')
  return new Response(...) // Logs may be lost
}
```

**Alternatives Considered**:

- **Automatic Flush on Response**: Hook into response lifecycle
  - ❌ No reliable hook in Astro/serverless for "before termination"
  - ❌ Would require framework-specific patches
  - ❌ Could introduce race conditions
- **Synchronous Logging**: Block until Axiom confirms receipt
  - ❌ Significant performance penalty (network round-trip)
  - ❌ Defeats purpose of fire-and-forget async logging
  - ❌ Would slow down all API responses

## Risks / Trade-offs

### Risk 1: Missing logger.flush() Calls

**Impact**: Logs lost in serverless functions, making debugging difficult

**Probability**: Medium (developers unfamiliar with serverless logging patterns)

**Mitigation**:

- Document flush requirement prominently in `CLAUDE.md`
- Add code comments in API route templates
- Create ESLint plugin to detect missing flush (future enhancement)
- Monitor Axiom ingestion rates to detect log loss patterns

### Risk 2: Correlation ID Threading Complexity

**Impact**: Missing correlation IDs in some log entries, breaking request tracing

**Probability**: Medium (deep call stacks, multiple abstraction layers)

**Mitigation**:

- Start with shallow call stacks (API routes only)
- Gradually add correlation ID parameters to library functions
- Use TypeScript to enforce correlation ID presence via required parameters
- Validate correlation ID presence in logs during testing

### Risk 3: Performance Impact from Async Logging

**Impact**: Increased latency from async logger calls, especially in tight loops

**Probability**: Low (logger uses fire-and-forget, minimal overhead)

**Mitigation**:

- Benchmark API route latency before/after migration
- Monitor production p95/p99 latencies post-deployment
- Logger already optimized with fire-and-forget Axiom delivery
- Production console filtering (warn/error only) reduces output volume

### Risk 4: Developer Resistance to Logger Adoption

**Impact**: Developers circumvent ESLint rule, leading to inconsistent logging

**Probability**: Low (clear benefits, helpful tooling)

**Mitigation**:

- Provide clear migration examples and documentation
- Make ESLint error messages helpful (suggest logger alternatives)
- Share production debugging success stories using Axiom
- Offer pair programming sessions for complex migrations

### Trade-off: Explicit vs. Implicit Logging

**Chosen**: Explicit logger calls throughout codebase

**Pros**:

- ✅ Clear intent in code (logging is visible)
- ✅ Easy to control log levels per call site
- ✅ No hidden magic or framework dependencies
- ✅ TypeScript validates logger usage at compile time

**Cons**:

- ❌ More verbose than console.log
- ❌ Requires correlation ID threading through calls
- ❌ Developer learning curve for logger API

**Justification**: Production observability benefits outweigh verbosity cost. Explicit logging makes debugging intent clear and enables proper correlation tracking.

## Migration Plan

### Phase 1: API Routes (Week 1)

**Target**: 5 API route files (~20 instances)

**Steps**:

1. Start with highest-traffic endpoint (`src/pages/api/messages.ts`)
2. Add correlation ID generation at entry point
3. Replace all console.error with logger.error + context
4. Add logger.flush() in finally blocks
5. Add API request lifecycle tracking (apiRequest/apiComplete)
6. Test in development, verify logs in Axiom
7. Repeat for remaining 4 API routes
8. Deploy to staging for validation

**Validation**:

- All API tests pass
- Logs appear in Axiom with correlation IDs
- No performance regression (p95 latency <5% increase)

**Rollback**: Revert individual file changes if issues detected

### Phase 2: Library Code (Week 2)

**Target**: 4 library files (~15 instances)

**Steps**:

1. Migrate database abstraction layer first (`src/libs/database.ts`)
2. Add correlation ID parameter to database functions
3. Replace console.error with logger.error + query context
4. Update Turso and Supabase clients
5. Thread correlation IDs from API routes through library calls
6. Test database operations with logging enabled

**Validation**:

- Database operations work correctly
- Correlation IDs propagate from routes to libraries
- Error context includes query details and retry attempts

**Rollback**: Revert library changes, API routes continue working independently

### Phase 3: Utilities & Enforcement (Week 3)

**Target**: 2 utility files + ESLint rule (~10 instances + tooling)

**Steps**:

1. Migrate role-guard and ip-validation utilities
2. Add ESLint no-console rule with exceptions
3. Update pre-commit hooks to enforce rule
4. Document logger usage in `CLAUDE.md`
5. Run full linting pass on codebase
6. Fix any new console usage discovered

**Validation**:

- ESLint passes on entire src/ directory
- Pre-commit hooks reject new console usage
- Documentation is clear and comprehensive

**Rollback**: Disable ESLint rule if blocking deployments

### Post-Migration Monitoring

**First 24 Hours**:

- Monitor Axiom ingestion rates (should increase significantly)
- Check for correlation IDs in production logs
- Verify no console.\* in production error logs
- Monitor for slow request alerts (>2s threshold)

**First Week**:

- Review common log queries in Axiom
- Identify gaps in logging coverage
- Collect developer feedback on logger DX
- Optimize log context based on usage patterns

**First Month**:

- Measure impact on incident resolution time
- Review security audit for PII exposure (should be zero)
- Assess need for additional logger helper utilities
- Consider expanding to client-side logging

## Open Questions

1. **Axiom Configuration**: Should Axiom integration be required or optional?
   - **Current**: Optional (graceful fallback to console-only)
   - **Proposal**: Keep optional but document setup prominently

2. **Log Retention**: How long should logs be retained in Axiom?
   - **Recommendation**: 30 days standard, 90 days for errors (aligns with incident investigation needs)

3. **Client-Side React Logging**: Should React components use logger or console?
   - **Recommendation**: Optional migration, different logger instance for browser (future work)

4. **Correlation ID Format**: UUID v4 or custom format?
   - **Current**: UUID v4 via `randomUUID()`
   - **Proposal**: Keep UUID v4 (standard, globally unique, sufficient entropy)

5. **Error Sampling**: Should high-volume errors be sampled to reduce Axiom costs?
   - **Recommendation**: Monitor volume first, implement sampling if costs spike (future optimization)
