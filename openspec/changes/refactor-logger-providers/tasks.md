# Implementation Tasks

## 1. Phase 1: Provider Interface & Types

- [ ] 1.1 Create `src/utils/logger/types.ts` file
- [ ] 1.2 Define `LogProvider` interface with JSDoc comments
- [ ] 1.3 Export `LogLevel`, `LogContext`, `LogEntry` types
- [ ] 1.4 Add `ProviderOptions` type for configuration
- [ ] 1.5 Run `npm run type-check` to validate TypeScript compilation

## 2. Phase 2: Extract Axiom Provider

- [ ] 2.1 Create `src/utils/logger/providers/axiom-provider.ts` file
- [ ] 2.2 Copy Axiom initialization logic from `logger.ts`
- [ ] 2.3 Copy Axiom ingestion logic (`logToAxiom` method)
- [ ] 2.4 Implement `LogProvider` interface methods
- [ ] 2.5 Maintain dynamic import of @axiomhq/js
- [ ] 2.6 Maintain lazy initialization with graceful fallback
- [ ] 2.7 Maintain context flattening for optimal Axiom querying
- [ ] 2.8 Maintain metadata enrichment (environment, service tags)
- [ ] 2.9 Test with real Axiom dataset to verify feature parity
- [ ] 2.10 Create `tests/utils/logger/axiom-provider.test.ts`
- [ ] 2.11 Write unit tests for Axiom provider
- [ ] 2.12 Verify existing `tests/utils/logger.test.ts` still passes

## 3. Phase 3: Console Provider

- [ ] 3.1 Create `src/utils/logger/providers/console-provider.ts` file
- [ ] 3.2 Extract console formatting logic from `logger.ts`
- [ ] 3.3 Implement dual-mode formatting (dev emojis vs prod JSON)
- [ ] 3.4 Implement `getDevEmoji` helper function
- [ ] 3.5 Implement `getConsoleMethod` helper function
- [ ] 3.6 Implement `LogProvider` interface methods
- [ ] 3.7 Handle production console filtering (warn/error only)
- [ ] 3.8 Create `tests/utils/logger/console-provider.test.ts`
- [ ] 3.9 Write unit tests for console provider
- [ ] 3.10 Verify existing `tests/utils/logger.test.ts` still passes

## 4. Phase 4: Provider Factory

- [ ] 4.1 Create `src/utils/logger/provider-factory.ts` file
- [ ] 4.2 Implement `createDefaultProviders()` function
- [ ] 4.3 Add Axiom auto-detection logic (AXIOM_TOKEN + AXIOM_DATASET)
- [ ] 4.4 Add console provider as default fallback
- [ ] 4.5 Support custom provider injection via options parameter
- [ ] 4.6 Handle empty provider array edge case
- [ ] 4.7 Add JSDoc comments explaining provider selection logic
- [ ] 4.8 Create `tests/utils/logger/provider-factory.test.ts`
- [ ] 4.9 Write unit tests for factory function
- [ ] 4.10 Test Axiom auto-detection scenarios
- [ ] 4.11 Test custom provider injection scenarios
- [ ] 4.12 Verify existing `tests/utils/logger.test.ts` still passes

## 5. Phase 5: Shared Utilities

- [ ] 5.1 Create `src/utils/logger/utils/sanitizer.ts` file
- [ ] 5.2 Extract `sanitizeContext` function from `logger.ts`
- [ ] 5.3 Add comprehensive JSDoc explaining sanitization rules
- [ ] 5.4 Create `tests/utils/logger/utils/sanitizer.test.ts`
- [ ] 5.5 Write unit tests for sanitization logic
- [ ] 5.6 Test PII redaction (token, password, secret, clerkToken)
- [ ] 5.7 Test production context filtering
- [ ] 5.8 Verify existing `tests/utils/logger.test.ts` still passes

## 6. Phase 6: Configuration System

- [ ] 6.1 Create `src/utils/logger/config.ts` file
- [ ] 6.2 Implement `loadAxiomConfig()` function
- [ ] 6.3 Implement `isAxiomConfigured()` validation function
- [ ] 6.4 Add configuration type definitions
- [ ] 6.5 Add JSDoc comments explaining configuration loading
- [ ] 6.6 Create `tests/utils/logger/config.test.ts`
- [ ] 6.7 Write unit tests for configuration loading
- [ ] 6.8 Test environment variable validation
- [ ] 6.9 Verify existing `tests/utils/logger.test.ts` still passes

## 7. Phase 7: Core Logger Refactor

- [ ] 7.1 Backup current `src/utils/logger.ts` (copy to logger.ts.backup)
- [ ] 7.2 Update `Logger` class to accept `providers` parameter
- [ ] 7.3 Replace Axiom-specific logic with provider delegation
- [ ] 7.4 Update `log()` method to iterate through providers
- [ ] 7.5 Update `flush()` method to flush all providers
- [ ] 7.6 Keep `sanitizeContext()` in core logger
- [ ] 7.7 Maintain all public API methods (debug, info, warn, error)
- [ ] 7.8 Maintain correlation ID generation (`createCorrelationId`)
- [ ] 7.9 Maintain API helper methods (apiRequest, apiComplete, apiResponse)
- [ ] 7.10 Update `createLogger()` factory to use provider factory
- [ ] 7.11 Maintain singleton export: `export const logger = createLogger()`
- [ ] 7.12 Update imports to use extracted utilities
- [ ] 7.13 Remove old Axiom-specific code (now in provider)
- [ ] 7.14 Run full test suite: `npm test`
- [ ] 7.15 Verify ALL 247 test assertions pass
- [ ] 7.16 Run type-check: `npm run type-check`
- [ ] 7.17 Run linting: `npm run lint`
- [ ] 7.18 Fix any type errors or linting issues
- [ ] 7.19 Delete backup file if all tests pass

## 8. Phase 8: Provider Exports

- [ ] 8.1 Create `src/utils/logger/providers/index.ts` barrel export
- [ ] 8.2 Export `AxiomProvider` class
- [ ] 8.3 Export `ConsoleProvider` class
- [ ] 8.4 Update `src/utils/logger/index.ts` if needed
- [ ] 8.5 Verify imports work from external consumers
- [ ] 8.6 Run `npm run type-check` to validate exports

## 9. Testing & Validation

- [ ] 9.1 Run complete test suite: `npm test`
- [ ] 9.2 Verify all existing tests pass (backward compatibility)
- [ ] 9.3 Verify all new provider tests pass
- [ ] 9.4 Run E2E tests: `npm run test:e2e`
- [ ] 9.5 Test in development mode (emoji formatting)
- [ ] 9.6 Test in production build (JSON formatting)
- [ ] 9.7 Test with Axiom configured (real dataset)
- [ ] 9.8 Test without Axiom configured (console fallback)
- [ ] 9.9 Test with custom provider injection
- [ ] 9.10 Test with multiple providers simultaneously

## 10. Performance Benchmarking

- [ ] 10.1 Create `scripts/benchmark-logger.ts` script
- [ ] 10.2 Benchmark original logger (before refactor)
- [ ] 10.3 Benchmark refactored logger (after refactor)
- [ ] 10.4 Calculate overhead percentage
- [ ] 10.5 Verify overhead is <2% (success criterion)
- [ ] 10.6 Document benchmark results in PR description

## 11. Documentation

- [ ] 11.1 Update `project-docs/14-logging/logger-architecture.md`
- [ ] 11.2 Add provider system architecture diagram
- [ ] 11.3 Document provider interface specification
- [ ] 11.4 Create `project-docs/14-logging/custom-provider-guide.md`
- [ ] 11.5 Write step-by-step guide for implementing custom providers
- [ ] 11.6 Create `project-docs/14-logging/provider-examples.md`
- [ ] 11.7 Add Datadog provider implementation example (~40 lines)
- [ ] 11.8 Add Sentry provider implementation example (~50 lines)
- [ ] 11.9 Add custom provider template with comments
- [ ] 11.10 Update `CLAUDE.md` with extensibility information
- [ ] 11.11 Add provider interface to development guidelines
- [ ] 11.12 Document multi-provider usage patterns

## 12. Code Review Preparation

- [ ] 12.1 Run all quality checks: `npm run fix:all`
- [ ] 12.2 Ensure no console.log statements in new code
- [ ] 12.3 Verify all JSDoc comments are comprehensive
- [ ] 12.4 Check for TODO or FIXME comments (resolve or document)
- [ ] 12.5 Verify no debug code or commented-out sections
- [ ] 12.6 Review git diff for unintended changes
- [ ] 12.7 Create detailed PR description with examples

## 13. Final Validation Checklist

- [ ] 13.1 Zero breaking changes for existing consumers
- [ ] 13.2 All 247 existing test assertions pass
- [ ] 13.3 Performance overhead measured at <2%
- [ ] 13.4 Custom provider can be implemented in <50 lines
- [ ] 13.5 Documentation includes working examples
- [ ] 13.6 Provider interface is type-safe
- [ ] 13.7 Axiom features maintained (batching, tracing, PII redaction)
- [ ] 13.8 Console fallback behavior preserved
- [ ] 13.9 Multi-provider support works correctly
- [ ] 13.10 OpenSpec validation passes: `openspec validate refactor-logger-providers --strict`
