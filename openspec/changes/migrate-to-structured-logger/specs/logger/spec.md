# Logger Capability Specification

## ADDED Requirements

### Requirement: Structured Logging with Log Levels

The system SHALL provide a structured logging utility with four log levels (debug, info, warn, error) that outputs appropriately formatted logs based on the execution environment.

#### Scenario: Development environment logging

- **WHEN** running in development mode (import.meta.env.DEV === true)
- **THEN** logs SHALL be output to console with emoji prefixes (🔍 DEBUG, ℹ️ INFO, ⚠️ WARN, ❌ ERROR)
- **AND** log context SHALL be displayed in readable format
- **AND** all log levels SHALL be output to console

#### Scenario: Production environment logging

- **WHEN** running in production mode (import.meta.env.PROD === true)
- **THEN** logs SHALL be output to console as structured JSON with timestamp, level, message, and context
- **AND** only warn and error levels SHALL be output to console (debug and info suppressed)
- **AND** all log levels SHALL be sent to Axiom if configured

#### Scenario: Log level API

- **WHEN** developer calls logger.debug(message, context)
- **THEN** log SHALL be recorded at debug level
- **WHEN** developer calls logger.info(message, context)
- **THEN** log SHALL be recorded at info level
- **WHEN** developer calls logger.warn(message, context)
- **THEN** log SHALL be recorded at warn level
- **WHEN** developer calls logger.error(message, context)
- **THEN** log SHALL be recorded at error level

### Requirement: Axiom Integration

The system SHALL integrate with Axiom for persistent log storage when configured with AXIOM_TOKEN and AXIOM_DATASET environment variables.

#### Scenario: Axiom configured and available

- **WHEN** AXIOM_TOKEN and AXIOM_DATASET are set in environment
- **THEN** logger SHALL initialize Axiom client on instantiation
- **AND** all log entries SHALL be sent to Axiom dataset asynchronously
- **AND** logs SHALL include metadata: environment (production/development) and service (astro-basics)

#### Scenario: Axiom not configured

- **WHEN** AXIOM_TOKEN or AXIOM_DATASET are missing
- **THEN** logger SHALL log warning about Axiom configuration in production
- **AND** logger SHALL fall back to console-only logging without errors
- **AND** application SHALL continue functioning normally

#### Scenario: Axiom ingestion failure

- **WHEN** Axiom SDK fails to ingest logs
- **THEN** logger SHALL log error to console about Axiom failure
- **AND** logger SHALL NOT throw exceptions or break application flow
- **AND** logs SHALL still appear in console output

### Requirement: Distributed Tracing with Correlation IDs

The system SHALL support distributed tracing via correlation IDs that uniquely identify requests across services and log entries.

#### Scenario: Correlation ID generation

- **WHEN** developer calls logger.createCorrelationId()
- **THEN** logger SHALL return a UUID v4 formatted string
- **AND** UUID SHALL be cryptographically random (via node:crypto randomUUID)

#### Scenario: Correlation ID in log context

- **WHEN** developer includes correlationId in log context
- **THEN** correlationId SHALL appear in all log outputs (console and Axiom)
- **AND** correlationId SHALL enable filtering logs by specific request

#### Scenario: API request lifecycle tracking

- **WHEN** developer calls logger.apiRequest(endpoint, method, userId, correlationId)
- **THEN** logger SHALL return context object with endpoint, method, userId, correlationId, and startTime
- **WHEN** developer calls logger.apiComplete(context, status)
- **THEN** logger SHALL log completion with calculated duration (Date.now() - startTime)
- **AND** logger SHALL log warning if duration exceeds 2000ms (slow request alert)

### Requirement: Automatic PII Sanitization

The system SHALL automatically sanitize log context to prevent sensitive data exposure by redacting common PII fields before any output.

#### Scenario: Sensitive field redaction

- **WHEN** log context contains fields named token, password, secret, or clerkToken
- **THEN** logger SHALL replace field values with '[REDACTED]' string
- **AND** redaction SHALL occur before console output
- **AND** redaction SHALL occur before Axiom ingestion

#### Scenario: Production context filtering

- **WHEN** running in production mode
- **THEN** logger SHALL filter context to only userId, endpoint, and method fields
- **AND** other context fields SHALL be excluded from production logs
- **AND** development mode SHALL preserve all non-sensitive context fields

#### Scenario: Immutable sanitization

- **WHEN** logger sanitizes context
- **THEN** logger SHALL create new object (not modify original)
- **AND** calling code SHALL retain original context object unchanged

### Requirement: Serverless Flush Support

The system SHALL provide manual flush capability to ensure log delivery in serverless environments where functions terminate immediately after response.

#### Scenario: Manual flush in API routes

- **WHEN** developer calls logger.flush()
- **THEN** logger SHALL await Axiom SDK flush completion
- **AND** all pending batched logs SHALL be delivered to Axiom
- **AND** function SHALL not return until flush completes

#### Scenario: Flush when Axiom not configured

- **WHEN** developer calls logger.flush() and Axiom is not configured
- **THEN** flush SHALL return immediately without errors
- **AND** application SHALL continue normally

#### Scenario: Flush failure handling

- **WHEN** Axiom flush fails
- **THEN** logger SHALL log error to console
- **AND** logger SHALL NOT throw exception to calling code
- **AND** application SHALL continue functioning

### Requirement: Performance Monitoring

The system SHALL provide automatic performance monitoring for API requests with slow request detection and alerting.

#### Scenario: Request duration calculation

- **WHEN** developer uses apiRequest and apiComplete pattern
- **THEN** logger SHALL calculate duration as (completionTime - startTime)
- **AND** duration SHALL be included in completion log context
- **AND** duration SHALL be measured in milliseconds

#### Scenario: Slow request alert

- **WHEN** API request duration exceeds 2000ms
- **THEN** logger SHALL emit warning level log with message "Slow API request detected"
- **AND** warning SHALL include endpoint, status, requestDuration, and threshold (2000) in context
- **AND** warning SHALL be sent to both console and Axiom

#### Scenario: Normal request completion

- **WHEN** API request duration is less than 2000ms
- **THEN** logger SHALL emit info level log only (no warning)
- **AND** log SHALL include endpoint, status, and requestDuration in context

### Requirement: TypeScript Type Safety

The system SHALL provide comprehensive TypeScript types for all logging operations with strict type checking.

#### Scenario: Log context type validation

- **WHEN** developer passes context to logger methods
- **THEN** TypeScript SHALL enforce LogContext interface
- **AND** LogContext SHALL support userId, endpoint, method, correlationId, requestDuration, traceId, spanId, clerkTraceId, supabaseQueryId, status fields
- **AND** LogContext SHALL allow arbitrary additional fields via index signature

#### Scenario: Log level type safety

- **WHEN** developer uses logger methods
- **THEN** TypeScript SHALL enforce LogLevel union type (debug | info | warn | error)
- **AND** invalid log levels SHALL produce TypeScript compilation errors

#### Scenario: API lifecycle context types

- **WHEN** developer calls apiRequest
- **THEN** return type SHALL extend LogContext with startTime number property
- **WHEN** developer calls apiComplete
- **THEN** first parameter SHALL require context with startTime property

### Requirement: Convenience Functions

The system SHALL provide convenience functions for common logging patterns to simplify developer usage.

#### Scenario: logApiRequest convenience function

- **WHEN** developer calls logApiRequest(endpoint, method, userId)
- **THEN** function SHALL call logger.debug with message "API request to {endpoint}"
- **AND** function SHALL use logger.apiRequest to create context
- **AND** function SHALL be async and await log completion

#### Scenario: logApiResponse convenience function

- **WHEN** developer calls logApiResponse(endpoint, status, userId)
- **THEN** function SHALL call logger.debug with message "API response from {endpoint}"
- **AND** function SHALL use logger.apiResponse to create context
- **AND** function SHALL be async and await log completion

#### Scenario: logApiError convenience function

- **WHEN** developer calls logApiError(endpoint, error, userId)
- **THEN** function SHALL extract error message safely (handle Error instances and primitives)
- **AND** function SHALL call logger.error with message "API error in {endpoint}: {message}"
- **AND** function SHALL include endpoint, userId, and error type in context
- **AND** function SHALL be async and await log completion

### Requirement: ESLint Enforcement

The system SHALL enforce structured logger usage via ESLint no-console rule with path-based exceptions to prevent new direct console usage in application code.

#### Scenario: ESLint rejects console in src directory

- **WHEN** developer adds console.log, console.error, console.warn, or console.debug in src/ files (excluding exceptions)
- **THEN** ESLint SHALL fail with error level violation
- **AND** error message SHALL guide developer to use logger utility instead

#### Scenario: ESLint allows console in logger utility

- **WHEN** src/utils/logger.ts uses console methods internally
- **THEN** ESLint SHALL NOT flag violations (exception configured)
- **AND** logger implementation SHALL function correctly

#### Scenario: ESLint allows console in scripts

- **WHEN** scripts/\*_/_.{js,ts} files use console methods
- **THEN** ESLint SHALL NOT flag violations (CLI tools exception)
- **AND** database scripts, migration tools, and utilities SHALL function correctly

#### Scenario: ESLint allows console in public assets

- **WHEN** public/\*_/_.js files use console methods
- **THEN** ESLint SHALL NOT flag violations (browser debugging exception)
- **AND** client-side JavaScript SHALL function correctly

#### Scenario: Pre-commit hook enforcement

- **WHEN** developer attempts to commit code with new console usage in src/ (excluding exceptions)
- **THEN** Husky pre-commit hook SHALL run ESLint via lint-staged
- **AND** commit SHALL be rejected if console usage detected
- **AND** developer SHALL see clear error message with suggested fix
