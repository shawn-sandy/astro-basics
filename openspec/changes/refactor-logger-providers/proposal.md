# Refactor Logger for Pluggable Providers

## Why

The current logger implementation at `src/utils/logger.ts` is tightly coupled to Axiom with hard-coded integration logic. While Axiom serves the project well as the default logging provider, this architectural coupling creates several limitations:

- **No Extension Path**: Developers cannot add custom logging providers (Datadog, Sentry, Splunk, custom solutions) without modifying core logger code
- **Violates Open/Closed Principle**: Logger is closed for extension, requiring invasive changes to support new backends
- **Single Provider Limitation**: No way to send logs to multiple destinations simultaneously (e.g., Axiom for storage + Sentry for error tracking)
- **Testing Complexity**: Axiom SDK must be mocked for every test, no way to inject test-only providers
- **Lock-in Risk**: Switching from Axiom to another provider requires rewriting significant logger internals

The logger utility is production-ready with excellent features (distributed tracing, PII sanitization, performance monitoring), but its architecture prevents it from being truly adaptable to different logging needs.

## What Changes

### Core Architectural Refactoring

**Provider Abstraction Layer**:

- Create `LogProvider` interface with standardized methods: `initialize()`, `log()`, `flush()`
- Extract all Axiom-specific logic into `AxiomProvider` implementing the interface
- Formalize console fallback behavior as `ConsoleProvider` implementing the interface
- Build provider factory with auto-detection and custom provider injection support

**File Structure Changes**:

```
src/utils/
├── logger.ts                    # Core logger (refactored to use providers)
└── logger/
    ├── types.ts                 # Public interfaces (LogProvider, LogEntry, etc.)
    ├── config.ts                # Configuration loader
    ├── provider-factory.ts      # Auto-detection and instantiation
    ├── providers/
    │   ├── index.ts             # Export built-in providers
    │   ├── axiom-provider.ts    # Axiom integration (extracted)
    │   └── console-provider.ts  # Console fallback (formalized)
    └── utils/
        └── sanitizer.ts         # Shared context sanitization
```

**Backward Compatibility Guarantees**:

- Existing `logger.info()`, `logger.error()`, etc. API unchanged
- Default behavior remains Axiom-first with console fallback
- All environment variables stay the same (`AXIOM_TOKEN`, `AXIOM_DATASET`, `AXIOM_ORG_ID`)
- Zero breaking changes for existing consumers
- All current tests pass without modification

**Developer Experience Improvements**:

- Custom providers implemented by creating a class implementing `LogProvider` interface
- Providers injected via `createLogger({ providers: [new CustomProvider()] })`
- Multiple providers supported: `providers: [new AxiomProvider(), new SentryProvider()]`
- Type-safe provider interface with full TypeScript support
- Examples documented for Datadog, Sentry, and custom implementations

### What We're NOT Building

- Built-in Datadog provider (developer responsibility)
- Built-in Sentry provider (developer responsibility)
- Built-in Splunk provider (developer responsibility)
- Complex provider marketplace or registry
- Provider discovery or plugin system

**Philosophy**: "Batteries included, extensibility welcomed" - Axiom provider is production-ready and built-in, but clear extension points exist for custom needs.

## Impact

### Affected Specifications

- **NEW**: `logger` capability (doesn't currently exist in `openspec/specs/`)

### Affected Code

**Core Refactoring** (significant changes):

- `src/utils/logger.ts` - Complete architectural refactor, maintains public API
- **NEW**: `src/utils/logger/types.ts` - Provider interface and types
- **NEW**: `src/utils/logger/config.ts` - Configuration system
- **NEW**: `src/utils/logger/provider-factory.ts` - Provider instantiation
- **NEW**: `src/utils/logger/providers/axiom-provider.ts` - Extracted Axiom logic
- **NEW**: `src/utils/logger/providers/console-provider.ts` - Formalized fallback

**Test Files**:

- `tests/utils/logger.test.ts` - All tests must pass without modification
- **NEW**: `tests/utils/logger/axiom-provider.test.ts` - Provider-specific tests
- **NEW**: `tests/utils/logger/console-provider.test.ts` - Provider-specific tests
- **NEW**: `tests/utils/logger/provider-factory.test.ts` - Factory tests

**Documentation**:

- `project-docs/14-logging/logger-architecture.md` - Update with provider system
- **NEW**: `project-docs/14-logging/custom-provider-guide.md` - Implementation guide
- **NEW**: `project-docs/14-logging/provider-examples.md` - Datadog, Sentry examples
- `CLAUDE.md` - Add extensibility documentation

### Breaking Changes

**NONE** - This is a pure refactoring with complete backward compatibility:

- Existing logger imports work unchanged
- Environment variables remain the same
- Default behavior (Axiom + console) is identical
- All consumer code continues to work
- Singleton export pattern maintained

### Benefits

**For the Project**:

- Maintains production-ready Axiom integration
- No configuration changes required
- No consumer code changes required
- Improved testability with injectable providers

**For Developers**:

- Can add custom logging providers in <50 lines of code
- Can use multiple providers simultaneously
- Can inject test-only providers for unit testing
- Clear interface documentation with examples
- Type-safe provider implementation

**For the Codebase**:

- Better separation of concerns (core logic vs transport)
- Easier to maintain (Axiom changes isolated to provider)
- More testable (providers can be mocked independently)
- Follows SOLID principles (Open/Closed, Dependency Inversion)

### Risks

**Performance Overhead**:

- Provider abstraction adds indirection to log calls
- **Mitigation**: Benchmark and ensure <2% overhead
- Lazy initialization maintains current startup performance

**Migration Complexity**:

- Significant internal refactoring of logger.ts
- **Mitigation**: Comprehensive test coverage, phased implementation
- Existing test suite validates no regressions

**Developer Learning Curve**:

- New concepts (providers, dependency injection) for logger usage
- **Mitigation**: Clear documentation, examples, default behavior unchanged
- Advanced features are opt-in, basic usage remains simple

**Maintenance Burden**:

- More files to maintain (types, factory, providers)
- **Mitigation**: Clear separation of concerns reduces complexity
- Provider interface stable, implementations change independently

### Success Criteria

1. All existing logger tests pass without modification
2. Performance overhead measured at <2% via benchmarking
3. Custom provider can be implemented in <50 lines of code
4. Documentation includes working examples for Datadog and Sentry
5. Provider interface is type-safe and well-documented
6. Zero breaking changes for existing consumers

### Dependencies

**This Change Depends On**:

- None - independent architectural refactoring

**Changes That Depend On This**:

- `migrate-to-structured-logger` - Can proceed independently, migration happens to existing logger API which remains unchanged
