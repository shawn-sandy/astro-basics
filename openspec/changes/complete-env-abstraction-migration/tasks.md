# Implementation Tasks

## Phase 1: Authentication & Middleware (High Priority)

### 1.1 Migrate src/middleware.ts

- [ ] 1.1.1 Read current [src/middleware.ts](../../../src/middleware.ts) file
- [ ] 1.1.2 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] 1.1.3 Create `envConfig` instance at module level or in middleware function
- [ ] 1.1.4 Replace `import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY` with `envConfig.getClerkPublishableKey()`
- [ ] 1.1.5 Replace `import.meta.env.CLERK_SECRET_KEY` with `envConfig.getClerkSecretKey()`
- [ ] 1.1.6 Consider using `envConfig.isClerkConfigured()` for validation
- [ ] 1.1.7 Verify middleware logic unchanged (only access pattern changed)
- [ ] 1.1.8 Run type check: `npm run type-check`
- [ ] 1.1.9 Test authentication flow (sign in/sign out)

### 1.2 Migrate src/pages/api/webhooks/clerk.ts

- [ ] 1.2.1 Read current [src/pages/api/webhooks/clerk.ts](../../../src/pages/api/webhooks/clerk.ts) file
- [ ] 1.2.2 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] 1.2.3 Create `envConfig` instance
- [ ] 1.2.4 Replace `import.meta.env.CLERK_WEBHOOK_SECRET` with `envConfig.getClerkWebhookSecret()`
- [ ] 1.2.5 Replace any other Clerk-related env access with `envConfig` methods
- [ ] 1.2.6 Consider using `envConfig.isClerkConfigured()` for health checks
- [ ] 1.2.7 Verify webhook signature verification logic unchanged
- [ ] 1.2.8 Run type check: `npm run type-check`
- [ ] 1.2.9 Test webhook endpoint (if test suite available)

### 1.3 Migrate src/libs/supabase-auth.ts

- [ ] 1.3.1 Read current [src/libs/supabase-auth.ts](../../../src/libs/supabase-auth.ts) file
- [ ] 1.3.2 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] 1.3.3 Create `envConfig` instance
- [ ] 1.3.4 Replace `import.meta.env.SUPABASE_URL` with `envConfig.getSupabaseUrl()`
- [ ] 1.3.5 Replace `import.meta.env.SUPABASE_ANON_KEY` with `envConfig.getSupabaseAnonKey()`
- [ ] 1.3.6 Use `envConfig.isSupabaseConfigured()` for client initialization checks
- [ ] 1.3.7 Verify authentication client behavior unchanged
- [ ] 1.3.8 Run type check: `npm run type-check`
- [ ] 1.3.9 Test Supabase auth operations (if applicable)

### 1.4 Migrate src/libs/supabase-server.ts

- [ ] 1.4.1 Read current [src/libs/supabase-server.ts](../../../src/libs/supabase-server.ts) file
- [ ] 1.4.2 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] 1.4.3 Create `envConfig` instance
- [ ] 1.4.4 Replace `import.meta.env.SUPABASE_URL` with `envConfig.getSupabaseUrl()`
- [ ] 1.4.5 Replace `import.meta.env.SUPABASE_SERVICE_ROLE_KEY` with `envConfig.getSupabaseServiceRoleKey()`
- [ ] 1.4.6 Use `envConfig.isSupabaseConfigured()` for validation
- [ ] 1.4.7 Verify server-side client behavior unchanged
- [ ] 1.4.8 Run type check: `npm run type-check`
- [ ] 1.4.9 Test server-side database operations (if applicable)

### 1.5 Phase 1 Validation

- [ ] 1.5.1 Run full unit test suite: `npm test`
- [ ] 1.5.2 Verify all tests pass (excluding pre-existing sanitization failures)
- [ ] 1.5.3 Run production build: `npm run build`
- [ ] 1.5.4 Verify build succeeds without errors
- [ ] 1.5.5 Run linting: `npm run lint`
- [ ] 1.5.6 Fix any linting issues
- [ ] 1.5.7 Start development server: `npm run dev`
- [ ] 1.5.8 Test Clerk authentication manually (sign in/sign out)
- [ ] 1.5.9 Commit Phase 1 changes with message: `refactor: migrate auth & middleware to env-config abstraction`

## Phase 2: Components & Layouts (Medium Priority)

### 2.1 Migrate src/components/astro/RoleGuard.astro

- [ ] 2.1.1 Read current [src/components/astro/RoleGuard.astro](../../../src/components/astro/RoleGuard.astro) file
- [ ] 2.1.2 Identify any `import.meta.env` usage
- [ ] 2.1.3 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] 2.1.4 Create `envConfig` instance in component script
- [ ] 2.1.5 Replace any env access with appropriate `envConfig` methods
- [ ] 2.1.6 Verify authorization logic unchanged
- [ ] 2.1.7 Run type check: `npm run type-check`
- [ ] 2.1.8 Test component rendering and role checking

### 2.2 Migrate src/layouts/Base.astro

- [ ] 2.2.1 Read current [src/layouts/Base.astro](../../../src/layouts/Base.astro) file
- [ ] 2.2.2 Identify any `import.meta.env` usage
- [ ] 2.2.3 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] 2.2.4 Create `envConfig` instance in layout script
- [ ] 2.2.5 Replace any env access with appropriate `envConfig` methods
- [ ] 2.2.6 Verify layout rendering unchanged
- [ ] 2.2.7 Run type check: `npm run type-check`
- [ ] 2.2.8 Test layout on multiple pages

### 2.3 Migrate src/components/astro/CollectionTagList.astro

- [ ] 2.3.1 Read current [src/components/astro/CollectionTagList.astro](../../../src/components/astro/CollectionTagList.astro) file
- [ ] 2.3.2 Identify any `import.meta.env` usage
- [ ] 2.3.3 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'` (if needed)
- [ ] 2.3.4 Create `envConfig` instance in component script (if needed)
- [ ] 2.3.5 Replace any env access with appropriate `envConfig` methods (if needed)
- [ ] 2.3.6 Verify collection rendering unchanged
- [ ] 2.3.7 Run type check: `npm run type-check`
- [ ] 2.3.8 Test collection tag display

### 2.4 Phase 2 Validation

- [ ] 2.4.1 Run full unit test suite: `npm test`
- [ ] 2.4.2 Verify all tests pass (excluding pre-existing sanitization failures)
- [ ] 2.4.3 Run production build: `npm run build`
- [ ] 2.4.4 Verify build succeeds without errors
- [ ] 2.4.5 Run linting: `npm run lint`
- [ ] 2.4.6 Fix any linting issues
- [ ] 2.4.7 Start development server: `npm run dev`
- [ ] 2.4.8 Manually test component rendering on various pages
- [ ] 2.4.9 Commit Phase 2 changes with message: `refactor: migrate components & layouts to env-config abstraction`

## Phase 3: React Hooks (Medium Priority)

### 3.1 Migrate src/hooks/useSupabase.tsx

- [ ] 3.1.1 Read current [src/hooks/useSupabase.tsx](../../../src/hooks/useSupabase.tsx) file
- [ ] 3.1.2 Identify all `import.meta.env` usage
- [ ] 3.1.3 Add import statement: `import { getEnvironmentConfig } from '#utils/env-config'`
- [ ] 3.1.4 Create `envConfig` instance (consider hook context and browser environment)
- [ ] 3.1.5 Replace `import.meta.env.SUPABASE_URL` with `envConfig.getSupabaseUrl()`
- [ ] 3.1.6 Replace `import.meta.env.SUPABASE_ANON_KEY` with `envConfig.getSupabaseAnonKey()`
- [ ] 3.1.7 Use `envConfig.isSupabaseConfigured()` for initialization checks
- [ ] 3.1.8 Verify hook behavior unchanged (especially client-side behavior)
- [ ] 3.1.9 Run type check: `npm run type-check`
- [ ] 3.1.10 Test React hook functionality in browser

### 3.2 Phase 3 Validation

- [ ] 3.2.1 Run full unit test suite: `npm test`
- [ ] 3.2.2 Verify all tests pass (excluding pre-existing sanitization failures)
- [ ] 3.2.3 Run production build: `npm run build`
- [ ] 3.2.4 Verify build succeeds without errors
- [ ] 3.2.5 Run linting: `npm run lint`
- [ ] 3.2.6 Fix any linting issues
- [ ] 3.2.7 Test React components using the hook
- [ ] 3.2.8 Verify client-side Supabase operations work
- [ ] 3.2.9 Commit Phase 3 changes with message: `refactor: migrate React hooks to env-config abstraction`

## Phase 4: Final Validation & Cleanup

### 4.1 Code Quality Checks

- [ ] 4.1.1 Run comprehensive code formatting: `npm run fix:all`
- [ ] 4.1.2 Run type checking: `npm run type-check`
- [ ] 4.1.3 Verify zero TypeScript errors
- [ ] 4.1.4 Run all linting: `npm run lint:all`
- [ ] 4.1.5 Fix any remaining linting issues
- [ ] 4.1.6 Search for remaining direct env access: `rg "import\.meta\.env\." src/ --type ts --type tsx --type astro`
- [ ] 4.1.7 Verify only [src/utils/env-config.ts](../../../src/utils/env-config.ts) appears in search results
- [ ] 4.1.8 Review git diff to ensure no unintended changes

### 4.2 Comprehensive Testing

- [ ] 4.2.1 Run full unit test suite: `npm test`
- [ ] 4.2.2 Verify all tests pass (excluding 2 pre-existing sanitization failures)
- [ ] 4.2.3 Run E2E test suite: `npm run test:e2e` (if available)
- [ ] 4.2.4 Verify E2E tests pass
- [ ] 4.2.5 Run production build: `npm run build`
- [ ] 4.2.6 Verify build completes successfully
- [ ] 4.2.7 Run preview server: `npm run preview`
- [ ] 4.2.8 Test production build in browser

### 4.3 Manual Functional Testing

- [ ] 4.3.1 Start development server: `npm run dev`
- [ ] 4.3.2 Test Clerk authentication flow (sign in)
- [ ] 4.3.3 Test Clerk authentication flow (sign out)
- [ ] 4.3.4 Test protected routes (dashboard, forum, organization pages)
- [ ] 4.3.5 Test Supabase database operations (if configured)
- [ ] 4.3.6 Test Turso database operations (if configured)
- [ ] 4.3.7 Test Axiom logging (check console for log messages)
- [ ] 4.3.8 Test environment status: run `getEnvironmentStatus()` in browser console
- [ ] 4.3.9 Verify no console errors related to environment configuration
- [ ] 4.3.10 Test role-based authorization (RoleGuard component)

### 4.4 Documentation Updates

- [ ] 4.4.1 Update [CLAUDE.md](../../../CLAUDE.md) with migration completion note
- [ ] 4.4.2 Add note about 100% environment abstraction adoption
- [ ] 4.4.3 Document that all env access should use `getEnvironmentConfig()`
- [ ] 4.4.4 Review existing env-config documentation for accuracy
- [ ] 4.4.5 Consider adding usage examples to documentation (optional)

### 4.5 Final Commit & Cleanup

- [ ] 4.5.1 Review all changes with: `git diff primary..HEAD`
- [ ] 4.5.2 Ensure commit messages are descriptive for all phases
- [ ] 4.5.3 Create final commit message:

  ```
  feat: complete environment variable abstraction migration

  - Migrate remaining 8 files to use getEnvironmentConfig()
  - Remove all direct import.meta.env access (except env-config.ts source layer)
  - Achieve 100% consistency in environment variable access patterns
  - Maintain backward compatibility and zero breaking changes

  Files migrated:
  - src/middleware.ts
  - src/pages/api/webhooks/clerk.ts
  - src/libs/supabase-auth.ts
  - src/libs/supabase-server.ts
  - src/components/astro/RoleGuard.astro
  - src/layouts/Base.astro
  - src/components/astro/CollectionTagList.astro
  - src/hooks/useSupabase.tsx

  Completes #317
  ```

- [ ] 4.5.4 Stage all changes: `git add .`
- [ ] 4.5.5 Commit with detailed message
- [ ] 4.5.6 Run final validation: `npm run build && npm test`
- [ ] 4.5.7 Push to branch if ready for PR

## Phase 5: OpenSpec Maintenance

### 5.1 Update OpenSpec Change Status

- [ ] 5.1.1 Mark all tasks in this file as completed (replace `- [ ]` with `- [x]`)
- [ ] 5.1.2 Run OpenSpec validation: `openspec validate complete-env-abstraction-migration --strict`
- [ ] 5.1.3 Fix any validation issues
- [ ] 5.1.4 Verify change appears correctly in: `openspec list`
- [ ] 5.1.5 Check task completion percentage in OpenSpec output

### 5.2 Prepare for PR or Merge

- [ ] 5.2.1 Create pull request with link to proposal: `openspec/changes/complete-env-abstraction-migration/proposal.md`
- [ ] 5.2.2 Reference Issue #317 in PR description
- [ ] 5.2.3 Add labels: `refactoring`, `enhancement`, `type-safety`
- [ ] 5.2.4 Request code review from team
- [ ] 5.2.5 Address any review feedback

### 5.3 Post-Merge Archival (After Deployment)

- [ ] 5.3.1 After PR is merged and deployed, archive this change
- [ ] 5.3.2 Run: `openspec archive complete-env-abstraction-migration --skip-specs --yes`
- [ ] 5.3.3 Verify change moved to `openspec/changes/archive/`
- [ ] 5.3.4 Update any related documentation with "completed" status
- [ ] 5.3.5 Close Issue #317 with reference to completed work

## Success Criteria Checklist

Verify all success criteria are met before considering this change complete:

- [ ] ✅ All 8 remaining files migrated to use `getEnvironmentConfig()`
- [ ] ✅ Zero direct `import.meta.env` usage outside of [src/utils/env-config.ts](../../../src/utils/env-config.ts)
- [ ] ✅ Production build completes successfully: `npm run build`
- [ ] ✅ All tests pass: `npm test` (excluding pre-existing sanitization failures)
- [ ] ✅ Type checking passes: `npm run type-check`
- [ ] ✅ Linting passes: `npm run lint:all`
- [ ] ✅ Git grep confirms no stray usage: `rg "import\.meta\.env\." src/` returns only `env-config.ts`
- [ ] ✅ Development server works: `npm run dev`
- [ ] ✅ Clerk authentication functional (sign in/out tested)
- [ ] ✅ Database operations functional (Supabase and/or Turso tested)
- [ ] ✅ No console errors related to environment configuration
- [ ] ✅ Documentation updated with migration completion
- [ ] ✅ OpenSpec validation passes: `openspec validate complete-env-abstraction-migration --strict`

## Estimated Timeline

| Phase                         | Tasks         | Estimated Duration |
| ----------------------------- | ------------- | ------------------ |
| Phase 1: Auth & Middleware    | 37 tasks      | 30-40 minutes      |
| Phase 2: Components & Layouts | 28 tasks      | 20-30 minutes      |
| Phase 3: React Hooks          | 11 tasks      | 15-20 minutes      |
| Phase 4: Final Validation     | 41 tasks      | 20-30 minutes      |
| Phase 5: OpenSpec Maintenance | 15 tasks      | 10-15 minutes      |
| **Total**                     | **132 tasks** | **~1.5-2 hours**   |

## Notes

- All tasks should be completed sequentially within each phase
- Run validation after each phase before proceeding to next
- If any phase encounters issues, pause and debug before continuing
- Keep git commits organized by phase for easy rollback if needed
- Test authentication and database operations thoroughly after each phase
