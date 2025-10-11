# Implementation Tasks

## 1. Phase 1: API Routes Migration

- [ ] 1.1 Migrate `src/pages/api/messages.ts` (7 console.error instances)
  - [ ] 1.1.1 Import logger utility and create correlation IDs
  - [ ] 1.1.2 Replace GET error handling with logger.error + context
  - [ ] 1.1.3 Replace POST error handling with logger.error + context
  - [ ] 1.1.4 Replace PATCH error handling with logger.error + context
  - [ ] 1.1.5 Replace DELETE error handling with logger.error + context
  - [ ] 1.1.6 Add logger.flush() calls before all response returns
  - [ ] 1.1.7 Add request lifecycle tracking with apiRequest/apiComplete

- [ ] 1.2 Migrate `src/pages/api/user/sync.ts` (4 instances)
  - [ ] 1.2.1 Replace console.log debug output with logger.debug
  - [ ] 1.2.2 Replace console.error with logger.error + Clerk/Supabase context
  - [ ] 1.2.3 Add correlation ID generation at request entry
  - [ ] 1.2.4 Add logger.flush() before response

- [ ] 1.3 Migrate `src/pages/api/message-us.ts` (3 console.error instances)
  - [ ] 1.3.1 Replace database initialization errors with logger.error
  - [ ] 1.3.2 Replace form submission errors with logger.error + form context
  - [ ] 1.3.3 Add logger.flush() before responses

- [ ] 1.4 Migrate `src/pages/api/supabase-test.ts` (3 console.error instances)
  - [ ] 1.4.1 Replace query error logging with logger.error + query context
  - [ ] 1.4.2 Replace unexpected error logging with logger.error
  - [ ] 1.4.3 Add logger.flush() before responses

- [ ] 1.5 Migrate `src/pages/api/test/sync-user.ts` (1 console.error instance)
  - [ ] 1.5.1 Replace error logging with logger.error + sync context
  - [ ] 1.5.2 Add logger.flush() before response

- [ ] 1.6 Phase 1 validation
  - [ ] 1.6.1 Run unit tests to verify no regressions
  - [ ] 1.6.2 Test API endpoints in development environment
  - [ ] 1.6.3 Verify logs appear in Axiom (if configured)
  - [ ] 1.6.4 Confirm correlation IDs present in all log entries

## 2. Phase 2: Library Code Migration

- [ ] 2.1 Migrate `src/libs/database.ts` (5 console.error instances)
  - [ ] 2.1.1 Replace Supabase insert errors with logger.error
  - [ ] 2.1.2 Replace Supabase query errors with logger.error + SQL context
  - [ ] 2.1.3 Replace update errors with logger.error + operation context
  - [ ] 2.1.4 Add correlation ID passthrough from calling code
  - [ ] 2.1.5 Enhance error context with provider name and table info

- [ ] 2.2 Migrate `src/libs/turso.ts` (6 console.error instances)
  - [ ] 2.2.1 Replace retry loop errors with logger.error + attempt count
  - [ ] 2.2.2 Replace transaction failures with logger.error + rollback context
  - [ ] 2.2.3 Replace insertMessage errors with logger.error
  - [ ] 2.2.4 Replace getMessage errors with logger.error
  - [ ] 2.2.5 Replace getMessages errors with logger.error
  - [ ] 2.2.6 Replace markAsRead/archive errors with logger.error

- [ ] 2.3 Migrate `src/libs/supabase-auth.ts` (6 instances: 5 console.warn, 1 console.error)
  - [ ] 2.3.1 Replace configuration warnings with logger.warn
  - [ ] 2.3.2 Replace Clerk ID resolution warnings with logger.warn + context
  - [ ] 2.3.3 Replace user not found warnings with logger.warn
  - [ ] 2.3.4 Replace unexpected errors with logger.error
  - [ ] 2.3.5 Replace getUserOrganizations errors with logger.error

- [ ] 2.4 Migrate `src/libs/schema-setup.ts` (3 console.error instances)
  - [ ] 2.4.1 Replace schema setup errors with logger.error
  - [ ] 2.4.2 Replace schema check errors with logger.error
  - [ ] 2.4.3 Replace schema drop errors with logger.error

- [ ] 2.5 Phase 2 validation
  - [ ] 2.5.1 Run unit tests for database libraries
  - [ ] 2.5.2 Test database operations in development
  - [ ] 2.5.3 Verify error logging includes proper context
  - [ ] 2.5.4 Confirm no performance regressions from async logging

## 3. Phase 3: Utilities & Code Quality Enforcement

- [ ] 3.1 Migrate `src/utils/role-guard.ts` (8 instances: 6 warn, 1 debug, 1 error)
  - [ ] 3.1.1 Replace Supabase configuration warnings with logger.warn
  - [ ] 3.1.2 Replace service role warnings with logger.warn
  - [ ] 3.1.3 Replace user not found debug with logger.debug
  - [ ] 3.1.4 Replace role fetch errors with logger.error + user context
  - [ ] 3.1.5 Replace invalid role warnings with logger.warn
  - [ ] 3.1.6 Replace general errors with logger.error
  - [ ] 3.1.7 Replace hierarchy evaluation warnings with logger.warn

- [ ] 3.2 Migrate `src/utils/ip-validation.ts` (3 console.warn instances)
  - [ ] 3.2.1 Replace invalid IP format warnings with logger.warn
  - [ ] 3.2.2 Replace X-Forwarded-For warnings with logger.warn + header context
  - [ ] 3.2.3 Replace IPv6 normalization errors with logger.warn

- [ ] 3.3 Add ESLint no-console rule
  - [ ] 3.3.1 Update `.eslintrc.json` with no-console rule
  - [ ] 3.3.2 Add exceptions for `src/utils/logger.ts`
  - [ ] 3.3.3 Add exceptions for `scripts/**/*.{js,ts}`
  - [ ] 3.3.4 Add exceptions for `public/**/*.js`
  - [ ] 3.3.5 Test ESLint rule catches new console usage in src/
  - [ ] 3.3.6 Verify rule doesn't flag allowed paths

- [ ] 3.4 Update pre-commit hooks
  - [ ] 3.4.1 Ensure lint-staged runs ESLint on src/ files
  - [ ] 3.4.2 Test pre-commit hook rejects console usage
  - [ ] 3.4.3 Verify hook allows console in scripts/public directories

- [ ] 3.5 Update documentation
  - [ ] 3.5.1 Add logger usage guidelines to `CLAUDE.md`
  - [ ] 3.5.2 Document common logging patterns (API routes, error handling)
  - [ ] 3.5.3 Add migration examples (before/after)
  - [ ] 3.5.4 Document ESLint rule and exceptions
  - [ ] 3.5.5 Update development guidelines for new contributors

- [ ] 3.6 Phase 3 validation
  - [ ] 3.6.1 Run full test suite (unit + E2E)
  - [ ] 3.6.2 Verify ESLint passes on all src/ files
  - [ ] 3.6.3 Test pre-commit hooks work correctly
  - [ ] 3.6.4 Confirm no console usage remains in src/ (except logger.ts)

## 4. Final Validation & Documentation

- [ ] 4.1 Cross-cutting validation
  - [ ] 4.1.1 Run `npm run lint:all` - ensure all linting passes
  - [ ] 4.1.2 Run `npm run type-check` - ensure TypeScript compilation succeeds
  - [ ] 4.1.3 Run `npm test` - ensure all unit tests pass
  - [ ] 4.1.4 Run `npm run test:e2e` - ensure E2E tests pass
  - [ ] 4.1.5 Run `npm run build` - ensure production build succeeds

- [ ] 4.2 Production readiness checks
  - [ ] 4.2.1 Verify Axiom integration works (if AXIOM_TOKEN configured)
  - [ ] 4.2.2 Test correlation ID propagation through request lifecycle
  - [ ] 4.2.3 Verify logger.flush() prevents log loss in serverless
  - [ ] 4.2.4 Confirm PII sanitization works for sensitive fields
  - [ ] 4.2.5 Test slow request alerts trigger at >2s threshold

- [ ] 4.3 Documentation updates
  - [ ] 4.3.1 Update API documentation with logger examples
  - [ ] 4.3.2 Create migration guide for existing console usage
  - [ ] 4.3.3 Document troubleshooting for common logger issues
  - [ ] 4.3.4 Add Axiom setup instructions to deployment docs

- [ ] 4.4 OpenSpec archival preparation
  - [ ] 4.4.1 Verify all tasks marked complete
  - [ ] 4.4.2 Create logger capability spec in `openspec/specs/logger/`
  - [ ] 4.4.3 Run `openspec validate --strict` - ensure validation passes
  - [ ] 4.4.4 Prepare for `openspec archive migrate-to-structured-logger`

## 5. Deployment & Monitoring

- [ ] 5.1 Pre-deployment checklist
  - [ ] 5.1.1 Create release notes documenting logger migration
  - [ ] 5.1.2 Notify team of ESLint rule addition (breaking change)
  - [ ] 5.1.3 Prepare rollback plan if critical issues discovered
  - [ ] 5.1.4 Configure Axiom alerts for error/warn log spikes

- [ ] 5.2 Post-deployment monitoring
  - [ ] 5.2.1 Monitor Axiom for log ingestion (first 24 hours)
  - [ ] 5.2.2 Check for correlation ID presence in production logs
  - [ ] 5.2.3 Verify no console.\* usage in production error logs
  - [ ] 5.2.4 Monitor for slow request alerts (>2s threshold)
  - [ ] 5.2.5 Collect team feedback on logger developer experience

- [ ] 5.3 Continuous improvement
  - [ ] 5.3.1 Review Axiom query patterns and optimize log context
  - [ ] 5.3.2 Identify common logger usage patterns for documentation
  - [ ] 5.3.3 Consider adding helper utilities for common logging scenarios
  - [ ] 5.3.4 Update logger utility based on production usage insights
