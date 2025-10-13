# Proposal: Configurable Role System (Setup-Time Configuration)

## Why

Developers need the ability to configure available application roles at project setup time without the complexity of runtime role creation, while maintaining type safety, database integrity, and zero performance overhead.

**Problem**: The current 3-tier role system (`member`, `admin`, `super_admin`) is hardcoded in PostgreSQL ENUMs and TypeScript types. Projects with different role requirements must either:

1. Accept the generic 3-tier model (limiting flexibility)
2. Manually modify ENUMs, types, and migrations (error-prone, not scalable)
3. Implement complex runtime custom role systems (performance overhead, complexity)

**Real-World Scenario**:

A project needs roles like `contributor`, `moderator`, `editor`, `admin`, and `super_admin` to match their organizational structure. With the current system, developers must:

- Manually edit PostgreSQL ENUM in migration files
- Update TypeScript type definitions in multiple files
- Ensure consistency between database and TypeScript
- Risk type mismatches if files get out of sync
- Repeat this process for every new project

**Desired Experience**:

```bash
npm run setup:roles

? Which roles do you want? (Press space to select)
  ✓ member (required)
  ✓ moderator
  ✓ contributor
  ✓ editor
  ✓ admin (required)
  ✓ super_admin (required)

? Hierarchy level for 'moderator': 2
? Hierarchy level for 'contributor': 2
? Hierarchy level for 'editor': 3

✓ Configuration saved to config/roles.config.ts
✓ Types generated in src/types/generated-roles.ts
✓ Migration created: scripts/migrations/003_custom_user_roles.sql
✓ Setup complete! Run 'npm run db:migrate' to apply changes.
```

## What Changes

Implement a setup-time role configuration system with automated type generation and migration creation:

**Configuration System**:

- Role definitions in `config/roles.config.ts` (TypeScript for validation)
- Interactive CLI wizard for guided setup (`scripts/setup-roles.ts`)
- Schema validation using Zod to prevent invalid configurations
- Support for role hierarchy levels and display labels
- Git-tracked configuration file for version control

**Type Generation**:

- Auto-generated TypeScript types in `src/types/generated-roles.ts`
- Exports `UserRole`, `USER_ROLES`, `ROLE_HIERARCHY`, `ROLE_LABELS`
- Seamless integration with existing `role-types.ts` via re-exports
- Generated code includes source attribution and modification warnings
- Type safety maintained throughout codebase

**Migration Generation**:

- Dynamic SQL migration generation based on configuration
- PostgreSQL ENUM created with configured role values
- Migration file created in `scripts/migrations/` with proper numbering
- Idempotent migration scripts (safe to re-run)
- Rollback migration generated automatically

**Setup Workflow**:

1. Developer runs `npm run setup:roles`
2. Interactive wizard collects role requirements
3. Configuration file written to `config/roles.config.ts`
4. TypeScript types generated automatically
5. Migration SQL file created with ENUM definition
6. Developer reviews generated files and commits to Git
7. Developer runs `npm run db:migrate` to apply schema changes

**Changes Summary**:

1. **New Files Created**:
   - `config/roles.config.ts` - Role configuration (developer-maintained)
   - `src/types/generated-roles.ts` - Auto-generated types (do not edit manually)
   - `scripts/setup-roles.ts` - Interactive setup wizard
   - `scripts/lib/role-generator.ts` - Type and migration generation logic
   - `scripts/lib/role-validator.ts` - Configuration validation with Zod

2. **Modified Files**:
   - `src/utils/role-types.ts` - Re-export generated types for backward compatibility
   - `package.json` - Add `setup:roles` script command

3. **Generated Files** (per setup):
   - `scripts/migrations/00X_user_roles.sql` - Dynamic migration based on config
   - `scripts/migrations/rollback_00X_user_roles.sql` - Rollback migration

**Backward Compatibility**:

- Default configuration ships with existing 3-tier system (`member`, `admin`, `super_admin`)
- Projects not running setup continue with hardcoded roles
- Existing `role-guard` functions work unchanged
- No breaking changes to APIs or components
- Migration path provided for projects wanting custom roles

**Core Role Protection**:

- Three roles are **required** and cannot be removed: `member`, `admin`, `super_admin`
- These roles maintain system stability and RLS policy compatibility
- Additional roles are optional and configurable
- Setup wizard enforces core role requirements

## Impact

### Affected Specifications

- **ADDED**: `configurable-roles` - New capability for setup-time role configuration
- **MODIFIED**: `role-guard` - Update to use generated types instead of hardcoded constants

### Affected Code

**New Files** (Setup System):

- `config/roles.config.ts` - TypeScript configuration file with role definitions
- `scripts/setup-roles.ts` - Interactive CLI wizard (uses inquirer for prompts)
- `scripts/lib/role-generator.ts` - Code generation for types and migrations
- `scripts/lib/role-validator.ts` - Zod schema validation for configuration
- `src/types/generated-roles.ts` - Auto-generated from configuration

**Modified Files** (Integration):

- `src/utils/role-types.ts` - Import and re-export from generated types
- `package.json` - Add `"setup:roles": "tsx scripts/setup-roles.ts"` script
- `.gitignore` - Do NOT ignore generated-roles.ts (should be tracked)

**Generated Files** (Per Project Setup):

- `scripts/migrations/00X_user_roles.sql` - ENUM migration based on config
- `scripts/migrations/rollback_00X_user_roles.sql` - Rollback for migration

**Tests** (New):

- `tests/scripts/role-generator.test.ts` - Type generation unit tests
- `tests/scripts/role-validator.test.ts` - Configuration validation tests
- `tests/integration/setup-roles-workflow.test.ts` - E2E setup workflow test

### Breaking Changes

**None** - This is a fully backward-compatible enhancement.

- Projects not using setup continue with hardcoded 3-tier system
- Generated types export same interface as hardcoded types
- No API changes to role-guard functions
- Existing migrations remain valid

### Migration Strategy

**For New Projects**:

1. Clone repository with default configuration
2. Run `npm run setup:roles` to customize roles
3. Review generated files
4. Run `npm run db:migrate` to apply schema
5. Commit configuration and generated files to Git

**For Existing Projects** (Upgrading):

1. Pull latest code with setup system
2. **Option A**: Continue with existing 3-tier system (no action required)
3. **Option B**: Run `npm run setup:roles` to customize roles
   - Select desired roles (must include member, admin, super_admin)
   - Generate new migration file
   - Apply migration to update ENUM
   - Existing user roles remain valid (no data migration needed)

**Rollback Plan**:

- Rollback migration provided automatically
- Configuration file can be deleted (revert to hardcoded)
- Generated types can be removed (role-types.ts falls back)
- Zero risk - setup is optional

### Conflicts with Existing Changes

**CONFLICTS WITH**: `add-custom-role-system`

This proposal represents a **different architectural approach** to the same problem:

| Aspect                 | custom-role-system                       | configurable-role-system (this)   |
| ---------------------- | ---------------------------------------- | --------------------------------- |
| **When roles defined** | Runtime (org admins via UI)              | Setup-time (developers via CLI)   |
| **Storage**            | Database tables (custom_roles)           | PostgreSQL ENUM + config file     |
| **Type safety**        | Partial (core roles only)                | Full (all roles typed)            |
| **Performance**        | +5-10ms (DB queries)                     | 0ms (static types)                |
| **Complexity**         | High (3 tables, RLS, UI, API)            | Low (config file + generator)     |
| **Self-service**       | Yes (org admins)                         | No (developers only)              |
| **Best for**           | Multi-tenant SaaS with varying org needs | Projects with stable, known roles |

**Recommendation**: Use this proposal (`configurable-role-system`) for projects where:

- Roles are relatively stable after initial setup
- Type safety and performance are priorities
- Developer control over available roles is preferred
- Simplicity is valued over runtime flexibility

Use `custom-role-system` for projects where:

- Organization admins need self-service role creation
- Different organizations have vastly different role requirements
- Runtime extensibility is required

**These proposals are MUTUALLY EXCLUSIVE** - implement one or the other, not both.

### Security Considerations

**Positive Security Impacts**:

- ✅ Type-safe role definitions prevent runtime type errors
- ✅ PostgreSQL ENUM enforces database-level validation
- ✅ Configuration file in Git provides audit trail of role changes
- ✅ Core roles protected (cannot be removed)
- ✅ Setup validation prevents misconfigured hierarchies

**Security Boundaries**:

- ⚠️ Setup script must run with appropriate permissions
- ⚠️ Generated migration files should be code-reviewed before applying
- ⚠️ Configuration changes require deployment (not runtime modifiable)
- ⚠️ Role hierarchy levels must be validated to prevent privilege escalation

**Risks and Mitigations**:

| Risk                         | Mitigation                                                  |
| ---------------------------- | ----------------------------------------------------------- |
| Invalid role configuration   | Zod schema validation prevents invalid configs              |
| Accidental core role removal | Setup wizard enforces core role requirements                |
| Hierarchy level conflicts    | Validator ensures unique levels and proper ordering         |
| Migration conflicts          | Generator checks existing migrations and sequences properly |
| Type generation failures     | Generator validates syntax before writing files             |

### User Experience Improvements

**For Developers**:

- ✅ Simple setup wizard guides role configuration
- ✅ Automatic type generation eliminates manual typing errors
- ✅ Clear configuration file shows all available roles at a glance
- ✅ Migration generation saves manual SQL writing
- ✅ Git-tracked configuration makes role changes visible in code review

**For System Administrators**:

- ✅ Role definitions stable and predictable
- ✅ No unexpected runtime role changes
- ✅ Clear documentation of available roles in codebase

**For End Users**:

- ✅ Consistent role names across application lifetime
- ✅ Predictable permissions (no runtime changes)
- ✅ Clear role hierarchy in organization structure

### Performance Impact

**Expected Overhead**:

- Setup time: ~5-10 seconds (one-time, not recurring)
- Type generation: <1 second (part of setup process)
- Migration generation: <1 second (part of setup process)
- **Runtime overhead: 0ms** (roles are static after setup)

**Performance Benefits**:

- ✅ No database queries for role definitions
- ✅ No runtime type validation overhead
- ✅ Compiler optimizations from static types
- ✅ Smaller bundle size vs runtime custom role system

### Documentation Impact

**New Documentation Required**:

- `/docs/guide/configurable-roles.md` - Complete setup guide with examples
- `/docs/guide/role-configuration-reference.md` - Configuration file schema reference
- `/docs/development/setup-roles-workflow.md` - Developer workflow documentation
- Example configurations for common role patterns (contributor, moderator, editor, etc.)

**Updated Documentation**:

- `/CLAUDE.md` - Add configurable role system to project overview
- `/README.md` - Add setup:roles command to essential commands
- `/docs/database/migrations.md` - Document role migration generation
- Role-guard documentation - Note generated types usage

### Testing Strategy

**Unit Tests**:

- Configuration validation (valid and invalid configs)
- Type generation (various role configurations)
- Migration generation (SQL syntax validation)
- Hierarchy level validation logic

**Integration Tests**:

- End-to-end setup workflow
- Generated types compile successfully
- Generated migrations apply cleanly
- Role-guard integration with generated types

**Manual Testing Checklist**:

1. Run setup wizard with default roles → verify files generated
2. Run setup wizard with custom roles → verify files generated
3. Attempt invalid configuration → verify validation errors
4. Apply generated migration → verify ENUM created correctly
5. Compile TypeScript with generated types → verify no errors
6. Run existing role-guard tests → verify backward compatibility

## Validation Checklist

Before submitting this proposal:

- [ ] Run `openspec validate add-configurable-role-system --strict`
- [ ] Ensure all requirements have at least one scenario
- [ ] Verify scenario format uses `#### Scenario:` headers
- [ ] Check for conflicts with existing changes
- [ ] Review affected code sections for completeness
- [ ] Confirm backward compatibility claims are accurate
