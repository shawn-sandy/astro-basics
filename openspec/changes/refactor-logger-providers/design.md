# Logger Provider System Design

## Context

The current logger at `src/utils/logger.ts` is a 596-line monolithic class with Axiom integration hard-coded throughout. While production-ready and feature-rich, this architecture prevents extensibility and violates the Open/Closed Principle. The refactoring will introduce a provider abstraction layer without changing the public API.

**Constraints**:

- Zero breaking changes for existing consumers
- Performance overhead must be <2% (measured via benchmarking)
- Axiom remains the default provider with auto-detection
- All 247 existing test assertions must pass without modification
- Serverless-compatible (Netlify Functions, Vercel Edge)

**Stakeholders**:

- **Project maintainers**: Need extensible logging without rewriting core logic
- **API consumers**: Existing code must continue working unchanged
- **Developers**: Want ability to add custom providers (Datadog, Sentry, etc.)
- **Future integrations**: OpenTelemetry support planned, needs clean abstraction

## Goals / Non-Goals

**Goals**:

- Extract provider interface for pluggable logging backends
- Maintain all current Axiom features (batching, tracing, PII redaction)
- Enable custom provider implementations in <50 lines of code
- Support multiple providers simultaneously (composition pattern)
- Preserve backward compatibility (zero breaking changes)
- Improve testability with injectable providers

**Non-Goals**:

- Built-in Datadog, Sentry, or Splunk providers (developer responsibility)
- Provider discovery or plugin system
- Configuration file for providers (environment variables sufficient)
- Provider marketplace or registry
- Dynamic provider loading at runtime
- Provider hot-swapping or reloading

## Decisions

### Decision 1: Strategy Pattern for Provider Abstraction

**What**: Use the Strategy Pattern to encapsulate transport mechanisms behind a common interface.

**Why**:

- Clean separation of concerns (core logic vs transport)
- Each provider is independently testable
- Adding new providers doesn't modify existing code (Open/Closed)
- Multiple providers can coexist without conflict

**Interface Design**:

```typescript
/**
 * Provider interface for pluggable logging backends.
 *
 * Implementations handle transport-specific logic (Axiom, Datadog, Sentry, etc.)
 * while the core logger manages common concerns (sanitization, formatting, API).
 */
export interface LogProvider {
  /**
   * Initializes the provider with environment configuration.
   * Called once during logger construction, runs asynchronously.
   * MUST NOT throw errors - providers should fail gracefully.
   */
  initialize(): Promise<void>

  /**
   * Sends a log entry to the provider's backend.
   * Called for every log statement, must be non-blocking.
   * MUST NOT throw errors - logging failures shouldn't break the app.
   */
  log(entry: LogEntry): Promise<void>

  /**
   * Flushes pending logs to ensure delivery.
   * Critical for serverless environments where functions terminate immediately.
   * MUST complete within 2 seconds (Netlify Functions constraint).
   */
  flush(): Promise<void>
}
```

**Alternatives Considered**:

- **Observer Pattern**: Too heavyweight, unnecessary pub/sub complexity
- **Decorator Pattern**: Doesn't support multiple independent providers
- **Factory Method**: Doesn't provide interface for custom providers
- **Template Method**: Requires inheritance, less flexible than composition

### Decision 2: Dependency Injection for Provider Configuration

**What**: Accept providers via constructor/factory parameter, auto-detect Axiom if not provided.

**Why**:

- Enables custom provider injection for testing
- Maintains backward compatibility (auto-detection)
- Explicit dependencies (follows Dependency Inversion Principle)
- Allows multiple providers without special configuration

**Implementation**:

```typescript
export function createLogger(options?: { providers?: LogProvider[] }): Logger {
  const providers = options?.providers || createDefaultProviders()
  return new Logger(providers)
}

// Auto-detect Axiom from environment
function createDefaultProviders(): LogProvider[] {
  const providers: LogProvider[] = []

  // Axiom provider if configured
  if (import.meta.env.AXIOM_TOKEN && import.meta.env.AXIOM_DATASET) {
    providers.push(new AxiomProvider())
  }

  // Console fallback always available
  providers.push(new ConsoleProvider())

  return providers
}
```

**Backward Compatibility**:

```typescript
// Existing code works unchanged
export const logger = createLogger()

// Advanced usage for custom providers
export const logger = createLogger({
  providers: [new CustomProvider()],
})
```

**Alternatives Considered**:

- **Service Locator**: Global state, harder to test, hidden dependencies
- **Singleton with Registration**: Requires initialization order, more complex
- **Configuration File**: Overkill for simple environment-based detection

### Decision 3: Multi-Provider Support via Array Composition

**What**: Accept array of providers, send log entries to all in parallel.

**Why**:

- Common use case: Axiom (storage) + Sentry (error tracking)
- Independent error handling per provider
- No special multi-provider configuration needed
- Natural composition pattern

**Error Handling**:

```typescript
async log(level: LogLevel, message: string, context?: LogContext) {
  const logEntry = this.formatLogEntry(level, message, context)

  // Send to all providers in parallel, fail independently
  await Promise.allSettled(
    this.providers.map(provider => provider.log(logEntry))
  )
}
```

**Flush Behavior**:

```typescript
async flush() {
  // Wait for all providers to flush (critical for serverless)
  await Promise.all(
    this.providers.map(provider => provider.flush())
  )
}
```

**Alternatives Considered**:

- **Single Provider Only**: Doesn't support multi-destination logging
- **Primary + Fallback Pattern**: Too rigid, doesn't support parallel logging
- **Pipeline Pattern**: Overkill, providers don't need sequential processing

### Decision 4: Keep Sanitization in Core Logger

**What**: PII sanitization remains in core `Logger` class, not in providers.

**Why**:

- Security concern shared by all providers
- Prevents duplicate sanitization logic across providers
- Ensures consistent sanitization regardless of provider
- Providers receive pre-sanitized data by default

**Implementation**:

```typescript
class Logger {
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    // Shared sanitization logic (current implementation)
    if (!context) return undefined

    const sanitized = { ...context }

    // Redact sensitive fields
    if (sanitized.token) sanitized.token = '[REDACTED]'
    if (sanitized.password) sanitized.password = '[REDACTED]'
    // ...

    return sanitized
  }

  async log(level: LogLevel, message: string, context?: LogContext) {
    const sanitizedContext = this.sanitizeContext(context)
    const logEntry = this.formatLogEntry(level, message, sanitizedContext)

    // Providers receive pre-sanitized entries
    await Promise.allSettled(this.providers.map(provider => provider.log(logEntry)))
  }
}
```

**Alternatives Considered**:

- **Sanitization in Providers**: Duplicates security logic, error-prone
- **Sanitization Middleware**: Adds complexity, overkill for single concern

### Decision 5: Lazy Provider Initialization

**What**: Providers initialize asynchronously in background, don't block logger construction.

**Why**:

- Maintains current non-blocking startup behavior
- Axiom SDK initialization can take 50-100ms
- Logger available immediately even if provider initialization fails
- Matches existing architecture (dynamic import of @axiomhq/js)

**Implementation**:

```typescript
class AxiomProvider implements LogProvider {
  private axiom: Axiom | null = null
  private enabled = false
  private initializationPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    // Dynamic import, non-blocking
    this.initializationPromise = import('@axiomhq/js')
      .then(({ Axiom }) => {
        this.axiom = new Axiom({
          token: import.meta.env.AXIOM_TOKEN
        })
        this.enabled = true
      })
      .catch(() => {
        this.enabled = false
      })
  }

  async log(entry: LogEntry): Promise<void> {
    // Wait for initialization if still pending
    if (this.initializationPromise) {
      await this.initializationPromise
    }

    if (!this.enabled) return

    // Log to Axiom
    await this.axiom?.ingest(...)
  }
}
```

**Alternatives Considered**:

- **Synchronous Initialization**: Blocks logger construction, poor DX
- **Constructor Initialization**: Async constructors are anti-pattern in TypeScript
- **Explicit Init Call**: Requires manual initialization, breaks singleton pattern

## Risks / Trade-offs

### Risk: Performance Overhead from Abstraction

**Impact**: Every log call goes through provider interface, potential slowdown.

**Mitigation**:

- Benchmark with/without abstraction (target: <2% overhead)
- Provider interface methods are async (already non-blocking)
- Promise.allSettled allows parallel provider execution
- Lazy initialization preserves startup performance

**Measurement**:

```typescript
// Benchmark script
import { logger } from '#utils/logger'

const iterations = 10000
const start = performance.now()

for (let i = 0; i < iterations; i++) {
  await logger.info('Benchmark message', { iteration: i })
}

const duration = performance.now() - start
console.log(`${iterations} logs: ${duration}ms (${duration / iterations}ms per log)`)
```

### Risk: Breaking Existing Tests

**Impact**: 247 test assertions could fail if refactoring changes behavior.

**Mitigation**:

- Run full test suite after each phase
- Keep existing test file unchanged (validates backward compatibility)
- Add provider-specific tests in separate files
- Use feature flags to enable providers incrementally

**Validation**:

```bash
# Must pass without modification
npm test tests/utils/logger.test.ts

# New provider tests
npm test tests/utils/logger/axiom-provider.test.ts
npm test tests/utils/logger/console-provider.test.ts
```

### Risk: Axiom Features Lost in Extraction

**Impact**: Extracting Axiom logic could lose features (batching, metadata, flattening).

**Mitigation**:

- Copy entire Axiom logic block-for-block into provider
- Test with real Axiom dataset to verify feature parity
- Document Axiom-specific behavior in provider JSDoc

**Feature Checklist**:

- [x] Dynamic import of @axiomhq/js
- [x] Lazy initialization with graceful fallback
- [x] Automatic batching (Axiom SDK feature)
- [x] Context flattening for optimal querying
- [x] Metadata enrichment (environment, service)
- [x] Silent failure handling
- [x] Flush mechanism for serverless

### Trade-off: More Files vs Single File

**Current**: Single 596-line `logger.ts` file
**Proposed**: 7 files across `logger/` directory

**Pros**:

- Better separation of concerns
- Easier to test individual providers
- Clearer responsibilities (types, config, providers)
- Follows Single Responsibility Principle

**Cons**:

- More files to navigate
- Higher cognitive load for simple changes
- Import paths become longer

**Decision**: Accept file proliferation for better architecture. Long-term maintainability wins.

## Migration Plan

### Phase 1: Types & Interface (Non-breaking)

1. Create `logger/types.ts` with provider interface
2. Export types for external consumption
3. No changes to existing logger.ts
4. Tests: Validate TypeScript compilation

### Phase 2: Extract Axiom Provider (Non-breaking)

1. Create `logger/providers/axiom-provider.ts`
2. Copy Axiom logic from logger.ts
3. Implement `LogProvider` interface
4. Tests: New Axiom provider tests, existing logger tests still pass

### Phase 3: Console Provider (Non-breaking)

1. Create `logger/providers/console-provider.ts`
2. Extract console formatting logic
3. Implement `LogProvider` interface
4. Tests: New console provider tests, existing logger tests still pass

### Phase 4: Provider Factory (Non-breaking)

1. Create `logger/provider-factory.ts`
2. Implement auto-detection logic
3. Support custom provider injection
4. Tests: Factory tests, existing logger tests still pass

### Phase 5: Core Refactor (Breaking internally, not externally)

1. Update `logger.ts` to accept providers
2. Delegate all log operations to providers
3. Keep public API unchanged (info, error, warn, debug, flush)
4. Tests: ALL tests must pass

### Phase 6: Documentation

1. Update logger architecture docs
2. Create custom provider guide
3. Add provider examples (Datadog, Sentry)
4. Update CLAUDE.md

### Rollback Plan

Each phase is non-breaking until Phase 5. If Phase 5 fails:

1. Revert `logger.ts` to original implementation
2. Keep provider files (no harm, unused)
3. Re-evaluate design decisions
4. Attempt alternative approach

### Validation

**After Each Phase**:

- Run `npm test` (all tests must pass)
- Run `npm run type-check` (no TypeScript errors)
- Run `npm run lint` (no linting issues)

**Final Validation**:

- Performance benchmark: <2% overhead
- All 247 test assertions pass
- Zero breaking changes for consumers
- Documentation complete

## Open Questions

1. **Should providers have access to raw (unsanitized) context?**
   - Current decision: No, all providers receive pre-sanitized data
   - Alternative: Provide both sanitized and raw context, let providers choose
   - Resolution: Keep sanitization in core for security consistency

2. **Should provider factory support environment variable provider selection?**
   - Example: `LOG_PROVIDER=datadog` to override auto-detection
   - Current decision: No, keep it simple (auto-detect Axiom or inject custom)
   - Future enhancement: Could add if requested by users

3. **Should providers have a `name` property for debugging?**
   - Useful for multi-provider scenarios to identify which provider logged
   - Current decision: Not in interface, but providers can add as implementation detail
   - Future enhancement: Add to interface if debugging need arises

4. **Should provider interface support log level filtering?**
   - Example: Sentry provider only receives `error` level logs
   - Current decision: Providers receive all logs, filter internally if needed
   - Alternative: Core logger filters per-provider
   - Resolution: Simpler to filter in provider implementation

5. **Should we support provider priority/ordering?**
   - Example: Send to Axiom first, then Sentry (sequential)
   - Current decision: All providers receive logs in parallel
   - Use case: Unclear if sequential ordering is ever needed
   - Resolution: Start with parallel, add ordering if requested
