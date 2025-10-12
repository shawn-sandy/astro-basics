# Logger Capability Specification

## ADDED Requirements

### Requirement: Provider Interface Contract

The logger system SHALL define a standardized `LogProvider` interface that all logging backends MUST implement. The interface SHALL include three lifecycle methods: `initialize()` for asynchronous setup, `log()` for sending log entries, and `flush()` for ensuring delivery in serverless environments.

#### Scenario: Provider implements all required methods

- **WHEN** a provider class implements the `LogProvider` interface
- **THEN** it MUST provide `initialize()`, `log()`, and `flush()` methods
- **AND** all methods MUST return `Promise<void>`
- **AND** TypeScript compilation succeeds without errors

#### Scenario: Provider initialization is non-blocking

- **WHEN** a provider's `initialize()` method is called during logger construction
- **THEN** the initialization MUST run asynchronously
- **AND** logger construction MUST complete immediately
- **AND** log calls MUST wait for initialization to complete before attempting delivery

#### Scenario: Provider log method handles errors gracefully

- **WHEN** a provider's `log()` method encounters an error
- **THEN** the error MUST NOT propagate to the caller
- **AND** the error MAY be logged to console for debugging
- **AND** the application MUST continue executing normally

#### Scenario: Provider flush completes within timeout

- **WHEN** a provider's `flush()` method is called in a serverless environment
- **THEN** it MUST complete within 2000 milliseconds (Netlify Functions constraint)
- **AND** it MUST ensure all pending logs are delivered
- **AND** it MUST handle timeout gracefully without throwing errors

### Requirement: Axiom Provider Implementation

The logger system SHALL provide a built-in `AxiomProvider` class that maintains all current Axiom integration features including dynamic SDK import, lazy initialization, automatic batching, context flattening, metadata enrichment, and silent error handling.

#### Scenario: Axiom provider auto-detects configuration

- **WHEN** `AXIOM_TOKEN` and `AXIOM_DATASET` environment variables are set
- **THEN** the Axiom provider MUST initialize automatically
- **AND** the Axiom SDK MUST be dynamically imported
- **AND** logs MUST be sent to the configured Axiom dataset

#### Scenario: Axiom provider falls back gracefully

- **WHEN** `AXIOM_TOKEN` or `AXIOM_DATASET` environment variables are missing
- **THEN** the Axiom provider MUST disable itself
- **AND** no errors MUST be thrown
- **AND** logs MUST fall back to console provider

#### Scenario: Axiom provider flattens context for querying

- **WHEN** a log entry with nested context is sent to Axiom provider
- **THEN** the context object MUST be flattened to top-level fields
- **AND** the flattened structure MUST optimize Axiom query performance
- **AND** metadata tags (environment, service) MUST be added

#### Scenario: Axiom provider enriches logs with metadata

- **WHEN** the Axiom provider sends a log entry
- **THEN** it MUST add an `environment` field (production or development)
- **AND** it MUST add a `service` field with value "astro-basics"
- **AND** it MUST add a `_time` field with ISO 8601 timestamp

#### Scenario: Axiom provider handles ingestion failures

- **WHEN** Axiom SDK ingestion fails due to network error
- **THEN** the error MUST be logged to console
- **AND** the error MUST NOT throw to the application
- **AND** subsequent log calls MUST continue to attempt delivery

### Requirement: Console Provider Implementation

The logger system SHALL provide a built-in `ConsoleProvider` class that implements dual-mode formatting with emoji prefixes in development and structured JSON in production, maintaining the current console logging behavior.

#### Scenario: Console provider formats development logs with emojis

- **WHEN** the application runs in development mode
- **AND** a log entry is sent to console provider
- **THEN** the log MUST be formatted with an emoji prefix (ℹ️, ⚠️, ❌, 🔍)
- **AND** the log MUST include the log level in uppercase (INFO, WARN, ERROR, DEBUG)
- **AND** the context MUST be pretty-printed if present

#### Scenario: Console provider formats production logs as JSON

- **WHEN** the application runs in production mode
- **AND** a log entry is sent to console provider
- **THEN** the log MUST be formatted as structured JSON
- **AND** the JSON MUST include timestamp, level, message, and context fields
- **AND** the JSON MUST be compact (no pretty-printing)

#### Scenario: Console provider filters production logs by level

- **WHEN** the application runs in production mode
- **AND** a DEBUG or INFO level log is sent to console provider
- **THEN** the log MUST NOT be written to console
- **AND** WARN and ERROR level logs MUST be written to console

#### Scenario: Console provider uses appropriate console method

- **WHEN** a log entry with level ERROR is sent to console provider
- **THEN** `console.error()` MUST be used
- **WHEN** a log entry with level WARN is sent
- **THEN** `console.warn()` MUST be used
- **WHEN** a log entry with level INFO is sent
- **THEN** `console.info()` MUST be used
- **WHEN** a log entry with level DEBUG is sent
- **THEN** `console.log()` MUST be used

### Requirement: Provider Factory Auto-Detection

The logger system SHALL provide a provider factory function that automatically detects and instantiates the Axiom provider when environment variables are present, with console provider as fallback, while supporting custom provider injection.

#### Scenario: Factory auto-detects Axiom provider

- **WHEN** `createDefaultProviders()` is called
- **AND** `AXIOM_TOKEN` and `AXIOM_DATASET` environment variables are set
- **THEN** the factory MUST return an array containing `AxiomProvider` instance
- **AND** the factory MUST return an array containing `ConsoleProvider` instance
- **AND** Axiom provider MUST appear first in the array

#### Scenario: Factory falls back to console only

- **WHEN** `createDefaultProviders()` is called
- **AND** `AXIOM_TOKEN` or `AXIOM_DATASET` environment variables are missing
- **THEN** the factory MUST return an array containing only `ConsoleProvider` instance
- **AND** no Axiom provider MUST be instantiated

#### Scenario: Factory accepts custom providers

- **WHEN** `createLogger()` is called with custom providers parameter
- **THEN** the factory MUST use the provided providers
- **AND** the factory MUST NOT auto-detect Axiom provider
- **AND** the provided providers MUST be used exclusively

#### Scenario: Factory handles empty provider array

- **WHEN** `createLogger()` is called with an empty providers array
- **THEN** the factory MUST fall back to default providers
- **AND** the default providers MUST include console provider at minimum

### Requirement: Multi-Provider Support

The logger system SHALL support multiple providers simultaneously by distributing log entries to all registered providers in parallel, with independent error handling per provider.

#### Scenario: Log sent to all providers in parallel

- **WHEN** logger has multiple providers registered
- **AND** a log entry is created
- **THEN** the log entry MUST be sent to all providers concurrently
- **AND** providers MUST execute in parallel via `Promise.allSettled()`
- **AND** no provider MUST block others from receiving logs

#### Scenario: Provider failure does not affect others

- **WHEN** logger has multiple providers registered
- **AND** one provider's `log()` method throws an error
- **THEN** the error MUST be caught and handled independently
- **AND** other providers MUST continue to receive log entries
- **AND** the application MUST continue executing normally

#### Scenario: Flush waits for all providers

- **WHEN** `logger.flush()` is called with multiple providers
- **THEN** the flush operation MUST wait for all providers to complete
- **AND** all providers' `flush()` methods MUST execute in parallel
- **AND** flush MUST complete only when all providers have flushed

#### Scenario: Multi-provider configuration via dependency injection

- **WHEN** `createLogger()` is called with multiple custom providers
- **THEN** all provided providers MUST be registered
- **AND** all providers MUST receive log entries
- **AND** providers MUST execute in the order provided

### Requirement: Context Sanitization

The logger system SHALL sanitize log context in the core `Logger` class before distributing to providers, automatically redacting sensitive fields (token, password, secret, clerkToken) and filtering context in production mode.

#### Scenario: Sensitive fields redacted before provider delivery

- **WHEN** a log entry includes context with a `token` field
- **THEN** the token value MUST be replaced with "[REDACTED]"
- **AND** the sanitized context MUST be sent to providers
- **AND** the original context object MUST remain unmodified

#### Scenario: Multiple sensitive fields redacted simultaneously

- **WHEN** a log entry includes context with `token`, `password`, and `secret` fields
- **THEN** all three fields MUST be replaced with "[REDACTED]"
- **AND** non-sensitive fields MUST remain unchanged
- **AND** the sanitized context MUST be sent to providers

#### Scenario: Production context filtering

- **WHEN** the application runs in production mode
- **AND** a log entry includes context with multiple fields
- **THEN** only `userId`, `endpoint`, and `method` fields MUST be retained
- **AND** all other fields MUST be removed
- **AND** the filtered context MUST be sent to providers

#### Scenario: Development context preserves all non-sensitive fields

- **WHEN** the application runs in development mode
- **AND** a log entry includes context with multiple fields
- **THEN** all fields MUST be retained except sensitive ones
- **AND** sensitive fields MUST be redacted to "[REDACTED]"
- **AND** the sanitized context MUST be sent to providers

### Requirement: Backward Compatibility

The logger system SHALL maintain complete backward compatibility with existing code by preserving the public API surface, singleton export pattern, and default behavior while adding provider extensibility as an opt-in feature.

#### Scenario: Existing logger imports work unchanged

- **WHEN** existing code imports logger via `import { logger } from '#utils/logger'`
- **THEN** the import MUST resolve successfully
- **AND** the logger instance MUST be a singleton
- **AND** all existing methods (debug, info, warn, error, flush) MUST be available

#### Scenario: Existing logger method calls work unchanged

- **WHEN** existing code calls `logger.info('message', { context })`
- **THEN** the log entry MUST be created successfully
- **AND** the log MUST be distributed to all providers
- **AND** the method signature MUST remain unchanged (backward compatible)

#### Scenario: Existing tests pass without modification

- **WHEN** the test suite `tests/utils/logger.test.ts` is executed
- **THEN** all 247 existing test assertions MUST pass
- **AND** no test file modifications MUST be required
- **AND** test behavior MUST remain identical to pre-refactor state

#### Scenario: Environment variables remain unchanged

- **WHEN** the logger is initialized
- **THEN** it MUST use the same environment variables as before (`AXIOM_TOKEN`, `AXIOM_DATASET`, `AXIOM_ORG_ID`)
- **AND** no new required environment variables MUST be added
- **AND** Axiom auto-detection MUST work identically to pre-refactor behavior

#### Scenario: Default behavior preserved

- **WHEN** logger is used without custom provider configuration
- **THEN** it MUST auto-detect Axiom provider if configured
- **AND** it MUST fall back to console provider if Axiom not configured
- **AND** behavior MUST be identical to pre-refactor logger

### Requirement: Custom Provider Implementation

The logger system SHALL enable developers to implement custom logging providers by creating classes that implement the `LogProvider` interface, with implementations requiring fewer than 50 lines of code for typical providers.

#### Scenario: Custom provider implements required interface

- **WHEN** a developer creates a custom provider class
- **AND** the class implements `LogProvider` interface
- **THEN** TypeScript MUST enforce presence of `initialize()`, `log()`, and `flush()` methods
- **AND** TypeScript MUST enforce correct method signatures
- **AND** compilation MUST succeed when all methods are implemented

#### Scenario: Custom provider injected via createLogger

- **WHEN** developer calls `createLogger({ providers: [new CustomProvider()] })`
- **THEN** the custom provider MUST be registered
- **AND** log entries MUST be sent to the custom provider
- **AND** the custom provider MUST receive all log levels (debug, info, warn, error)

#### Scenario: Custom provider used alongside Axiom

- **WHEN** developer provides both Axiom and custom providers
- **AND** calls `createLogger({ providers: [new AxiomProvider(), new CustomProvider()] })`
- **THEN** both providers MUST be registered
- **AND** log entries MUST be sent to both providers in parallel
- **AND** each provider MUST operate independently

#### Scenario: Custom provider error handling

- **WHEN** a custom provider's `log()` method throws an error
- **THEN** the error MUST be caught by the logger
- **AND** the error MUST NOT propagate to the application
- **AND** other providers MUST continue to receive log entries

### Requirement: Performance Constraints

The logger system SHALL maintain performance overhead below 2% compared to the pre-refactor implementation, measured by benchmarking 10,000 log operations with context.

#### Scenario: Provider abstraction overhead under 2%

- **WHEN** a benchmark executes 10,000 log operations
- **AND** each operation includes a log message with context
- **THEN** the refactored logger MUST complete within 102% of baseline time
- **AND** the overhead MUST be measured and documented
- **AND** performance MUST be validated before merging

#### Scenario: Provider initialization does not block startup

- **WHEN** the logger singleton is initialized
- **THEN** provider initialization MUST be asynchronous
- **AND** logger construction MUST complete in <5 milliseconds
- **AND** application startup time MUST not increase measurably

#### Scenario: Multi-provider overhead scales linearly

- **WHEN** logger has N providers registered
- **AND** a log entry is created
- **THEN** the overhead MUST scale approximately linearly with N
- **AND** parallel execution via `Promise.allSettled()` MUST prevent sequential bottlenecks

### Requirement: Type Safety

The logger system SHALL provide full TypeScript type safety for provider implementations, log entries, and configuration, ensuring compile-time validation of provider contracts and log context.

#### Scenario: Provider interface enforces method signatures

- **WHEN** a provider class implements `LogProvider` interface
- **AND** a method signature does not match the interface
- **THEN** TypeScript MUST report a compilation error
- **AND** the error message MUST clearly indicate the mismatch

#### Scenario: Log context type validation

- **WHEN** a log entry is created with context
- **AND** the context includes fields not in `LogContext` interface
- **THEN** TypeScript MUST allow the extra fields (index signature)
- **AND** TypeScript MUST validate common fields (userId, endpoint, method)

#### Scenario: Provider options type validation

- **WHEN** `createLogger()` is called with options parameter
- **AND** the options include invalid fields
- **THEN** TypeScript MUST report a compilation error
- **AND** only `providers` field MUST be allowed in options
