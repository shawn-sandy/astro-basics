# Design Document: Configurable Role System

## Context

The astro-basics project currently uses a hardcoded 3-tier role system (`member`, `admin`, `super_admin`) defined as a PostgreSQL ENUM in migration files and TypeScript types in `src/utils/role-types.ts`. This rigid system works well for projects matching the 3-tier model but creates friction for projects needing different role structures.

**Current State**:

- Roles hardcoded in `scripts/migrations/001_core_schema.sql`:
  ```sql
  CREATE TYPE user_role AS ENUM ('member', 'admin', 'super_admin');
  ```
- Types hardcoded in `src/utils/role-types.ts`:
  ```typescript
  export type UserRole = 'member' | 'admin' | 'super_admin'
  ```
- Hierarchy hardcoded in `ROLE_HIERARCHY` constant
- Changes require manual editing of multiple files with risk of inconsistency

**Stakeholders**:

- **Developers**: Need simple way to configure roles for their specific projects
- **Project maintainers**: Want backward compatibility and minimal complexity
- **Database administrators**: Require migrations to be safe and idempotent
- **TypeScript users**: Expect full type safety for role operations

**Constraints**:

1. Must maintain backward compatibility with existing 3-tier system
2. PostgreSQL ENUM provides valuable database-level validation (should preserve)
3. Type safety is critical for role-guard system integrity
4. Setup process should be developer-friendly (CLI-based)
5. Generated code should be git-trackable for auditability

## Goals / Non-Goals

### Goals

1. **Setup-Time Flexibility**: Allow developers to define custom roles during project setup
2. **Type Safety**: Auto-generate TypeScript types from configuration to prevent mismatches
3. **Developer Experience**: Provide intuitive CLI wizard for role configuration
4. **Zero Runtime Overhead**: All role definitions resolved at compile/setup time
5. **Database Integrity**: Maintain PostgreSQL ENUM validation
6. **Backward Compatibility**: Existing projects continue working without changes
7. **Git-Friendly**: All configuration and generated files trackable in version control

### Non-Goals

1. **Runtime Role Creation**: Not supporting org admin self-service role creation (use `custom-role-system` for that)
2. **Per-Organization Roles**: Not supporting different roles per organization (setup is app-wide)
3. **Role Permissions System**: Not implementing granular permission checking (future enhancement)
4. **Database Migration Tool**: Not replacing existing migration system (use current workflow)
5. **Hot Reloading**: Not supporting role changes without redeployment

## Decisions

### Decision 1: TypeScript Configuration File (Not JSON/YAML)

**Choice**: Use TypeScript for configuration file (`config/roles.config.ts`)

**Alternatives Considered**:

| Option                | Pros                                                                | Cons                                               | Decision                                    |
| --------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| **TypeScript**        | Type validation, code comments, IDE support, JavaScript expressions | Requires compilation (minimal)                     | ✅ **SELECTED**                             |
| JSON                  | Simple, widely supported, no compilation                            | No comments, no validation, prone to errors        | ❌ Rejected - Too error-prone               |
| YAML                  | Human-readable, supports comments                                   | Extra dependency, no native validation             | ❌ Rejected - Adds complexity               |
| Environment Variables | Simple deployment                                                   | Limited structure, hard to validate complex config | ❌ Rejected - Not suitable for complex data |

**Rationale**:

- TypeScript provides **compile-time validation** of configuration structure
- Developers already familiar with TypeScript in this project
- IDE autocomplete assists with configuration
- Supports comments for documentation
- Zod validation layer provides runtime safety on top of TypeScript types

**Example**:

```typescript
// config/roles.config.ts
import { z } from 'zod'

export const roleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'moderator', level: 2, label: 'Moderator' },
    { name: 'admin', level: 3, label: 'Administrator' },
    { name: 'super_admin', level: 4, label: 'Super Administrator' },
  ],
  // Core roles that cannot be removed
  coreRoles: ['member', 'admin', 'super_admin'],
} as const

// Zod schema for runtime validation
export const RoleConfigSchema = z.object({
  roles: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z][a-z0-9_]*$/),
        level: z.number().int().min(1).max(10),
        label: z.string().min(1),
      })
    )
    .min(3), // Must have at least 3 core roles
  coreRoles: z.array(z.string()).length(3),
})
```

### Decision 2: Setup-Time Generation (Not Build-Time)

**Choice**: Generate types and migrations during explicit setup command (`npm run setup:roles`)

**Alternatives Considered**:

| Option          | Pros                                | Cons                                   | Decision                     |
| --------------- | ----------------------------------- | -------------------------------------- | ---------------------------- |
| **Setup-Time**  | Explicit, reviewable, git-trackable | Requires manual step                   | ✅ **SELECTED**              |
| Build-Time      | Automatic, no manual step           | Hidden in build process, hard to debug | ❌ Rejected - Too implicit   |
| Runtime         | Most flexible                       | Performance overhead, complexity       | ❌ Rejected - Violates goals |
| Pre-Commit Hook | Ensures consistency                 | Frustrating developer experience       | ❌ Rejected - Too aggressive |

**Rationale**:

- **Explicitness**: Developers see exactly when types/migrations are generated
- **Reviewability**: Generated files appear in Git diffs for code review
- **Debuggability**: Errors in generation are immediately visible
- **Control**: Developers decide when to regenerate (not automatic)
- **Simplicity**: No build tool integration complexity

**Workflow**:

```bash
# Developer modifies config/roles.config.ts
vim config/roles.config.ts

# Developer runs setup to regenerate
npm run setup:roles

# Review generated files
git diff src/types/generated-roles.ts
git diff scripts/migrations/

# Commit if satisfied
git add config/roles.config.ts src/types/generated-roles.ts scripts/migrations/
git commit -m "Add moderator and contributor roles"
```

### Decision 3: PostgreSQL ENUM (Not TEXT Column)

**Choice**: Continue using PostgreSQL ENUM for `users.role` column

**Alternatives Considered**:

| Option               | Pros                                               | Cons                                        | Decision                                |
| -------------------- | -------------------------------------------------- | ------------------------------------------- | --------------------------------------- |
| **ENUM**             | Database validation, compact storage, clear schema | Requires migration to add values            | ✅ **SELECTED**                         |
| TEXT + CHECK         | Easier to modify                                   | Verbose constraint, less performant         | ❌ Rejected - Loses validation benefits |
| TEXT (no constraint) | Maximum flexibility                                | No database validation, data integrity risk | ❌ Rejected - Too unsafe                |
| Foreign Key Table    | Normalized, queryable                              | Over-engineered for static roles            | ❌ Rejected - Unnecessary complexity    |

**Rationale**:

- PostgreSQL ENUMs provide **database-level validation** (critical for data integrity)
- Compact storage (internally stored as integers)
- Clear schema documentation (ENUM shows allowed values)
- Supabase RLS policies can reference ENUM values directly
- Migration overhead acceptable for setup-time changes (not runtime)
- Consistent with existing architecture

**Migration Strategy**:

Setup generates migration like:

```sql
-- Generated by setup:roles from config/roles.config.ts
CREATE TYPE user_role AS ENUM (
  'member',      -- Level 1: Base user role
  'moderator',   -- Level 2: Content moderation
  'contributor', -- Level 2: Content creation
  'admin',       -- Level 3: Administrative access
  'super_admin'  -- Level 4: System administration
);
```

### Decision 4: Interactive CLI Wizard (Not Declarative Config Only)

**Choice**: Provide interactive CLI wizard as primary setup method

**Alternatives Considered**:

| Option                 | Pros                                    | Cons                                 | Decision                      |
| ---------------------- | --------------------------------------- | ------------------------------------ | ----------------------------- |
| **Interactive Wizard** | User-friendly, guided, validates inputs | Requires inquirer dependency         | ✅ **SELECTED**               |
| Declarative Only       | Simple, scriptable                      | Requires manual config writing       | 🟡 Also supported (secondary) |
| Web UI                 | Visual, intuitive                       | Requires server, out-of-scope        | ❌ Rejected - Too complex     |
| VS Code Extension      | IDE-integrated                          | Limited audience, maintenance burden | ❌ Rejected - Overengineered  |

**Rationale**:

- **Developer Experience**: Interactive wizard reduces errors and learning curve
- **Validation**: Immediate feedback on invalid inputs
- **Flexibility**: Wizard can also read existing config and update it
- **Scriptability**: Developers can skip wizard and edit config directly if preferred

**Implementation**:

```typescript
// scripts/setup-roles.ts
import inquirer from 'inquirer'

const answers = await inquirer.prompt([
  {
    type: 'checkbox',
    name: 'roles',
    message: 'Which roles do you want to include?',
    choices: [
      { name: 'member (required)', value: 'member', checked: true, disabled: 'Required' },
      { name: 'moderator', value: 'moderator' },
      { name: 'contributor', value: 'contributor' },
      { name: 'editor', value: 'editor' },
      { name: 'admin (required)', value: 'admin', checked: true, disabled: 'Required' },
      { name: 'super_admin (required)', value: 'super_admin', checked: true, disabled: 'Required' },
    ],
  },
  // For each selected non-core role, prompt for level and label
])
```

### Decision 5: Generated Files are Git-Tracked

**Choice**: Generated TypeScript types and migrations are committed to Git

**Alternatives Considered**:

| Option                                     | Pros                                 | Cons                                | Decision                       |
| ------------------------------------------ | ------------------------------------ | ----------------------------------- | ------------------------------ |
| **Git-Tracked**                            | Reviewable, auditable, deterministic | Larger diffs                        | ✅ **SELECTED**                |
| Git-Ignored                                | Clean repo, regenerated on demand    | Inconsistent builds, hard to review | ❌ Rejected - Loses visibility |
| Hybrid (types tracked, migrations ignored) | Balance                              | Inconsistent, confusing             | ❌ Rejected - Inconsistent     |

**Rationale**:

- **Code Review**: Generated types visible in pull request diffs
- **Auditability**: Clear history of role changes over time
- **Determinism**: Everyone gets same generated files (no variation)
- **CI/CD**: No generation step needed in build pipeline
- **Debugging**: Can inspect generated code directly

**Generated File Header**:

```typescript
/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * This file was generated by scripts/setup-roles.ts
 * Source: config/roles.config.ts
 * Generated: 2025-10-10T12:00:00.000Z
 *
 * To modify roles, edit config/roles.config.ts and run:
 *   npm run setup:roles
 */
```

### Decision 6: Zod for Runtime Validation

**Choice**: Use Zod for configuration validation

**Alternatives Considered**:

| Option            | Pros                                       | Cons                            | Decision                        |
| ----------------- | ------------------------------------------ | ------------------------------- | ------------------------------- |
| **Zod**           | TypeScript-first, composable, great errors | Dependency (~50KB)              | ✅ **SELECTED**                 |
| Joi               | Mature, widely used                        | Less TypeScript-friendly        | ❌ Rejected - Not TS-native     |
| Custom Validation | No dependency                              | Error-prone, maintenance burden | ❌ Rejected - Reinventing wheel |
| TypeScript Only   | Zero runtime cost                          | No runtime validation           | ❌ Rejected - Unsafe            |

**Rationale**:

- Zod already used in modern TypeScript projects (common pattern)
- Excellent error messages guide developers to fix issues
- Type inference from Zod schemas ensures TS/runtime consistency
- Composable validation rules (reusable across setup scripts)
- Small bundle size acceptable for setup scripts (not production bundle)

**Example Validation**:

```typescript
import { z } from 'zod'

const RoleSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, 'Role name must be lowercase alphanumeric with underscores')
    .min(2, 'Role name must be at least 2 characters')
    .max(30, 'Role name must be at most 30 characters'),
  level: z
    .number()
    .int('Level must be an integer')
    .min(1, 'Level must be at least 1')
    .max(10, 'Level must be at most 10'),
  label: z.string().min(1, 'Label is required').max(50, 'Label must be at most 50 characters'),
})

const ConfigSchema = z.object({
  roles: z
    .array(RoleSchema)
    .min(3, 'Must define at least 3 roles (core roles required)')
    .refine(roles => roles.some(r => r.name === 'member'), { message: 'member role is required' })
    .refine(roles => roles.some(r => r.name === 'admin'), { message: 'admin role is required' })
    .refine(roles => roles.some(r => r.name === 'super_admin'), {
      message: 'super_admin role is required',
    }),
})
```

## Risks / Trade-offs

### Risk: Configuration Drift

**Risk**: Developers forget to run setup after modifying config, leading to type/DB mismatch

**Mitigation**:

- Setup script detects config changes and warns if types out of date
- Pre-commit hook (optional) can validate config matches generated types
- Clear error messages if types don't match runtime expectations
- Documentation emphasizes workflow: edit config → run setup → commit all

### Risk: Migration Numbering Conflicts

**Risk**: Generated migration gets same number as manually created migration

**Mitigation**:

- Setup script scans `scripts/migrations/` directory for existing numbers
- Automatically assigns next available number
- Warnings if migration gaps detected
- Developer review of generated migration before applying

**Implementation**:

```typescript
function getNextMigrationNumber(): string {
  const migrations = fs
    .readdirSync('scripts/migrations/')
    .filter(f => /^\d{3}_/.test(f))
    .map(f => parseInt(f.substring(0, 3)))
  const maxNum = Math.max(...migrations, 0)
  return String(maxNum + 1).padStart(3, '0')
}
```

### Risk: Invalid Role Names

**Risk**: Developers create role names that conflict with SQL keywords or TypeScript reserved words

**Mitigation**:

- Zod validation rejects names with uppercase, spaces, special characters
- Blocklist for SQL keywords (`user`, `role`, `select`, etc.)
- Blocklist for TypeScript keywords (`class`, `interface`, `type`, etc.)
- Setup wizard suggests fixes for invalid names

**Validation**:

```typescript
const SQL_KEYWORDS = ['user', 'role', 'select', 'insert', 'update', 'delete' /* ... */]
const TS_KEYWORDS = ['class', 'interface', 'type', 'enum', 'const', 'let' /* ... */]

const RoleNameSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/)
  .refine(name => !SQL_KEYWORDS.includes(name), { message: 'Role name conflicts with SQL keyword' })
  .refine(name => !TS_KEYWORDS.includes(name), {
    message: 'Role name conflicts with TypeScript keyword',
  })
```

### Trade-off: Flexibility vs Simplicity

**Trade-off**: Setup-time configuration is simpler but less flexible than runtime custom roles

**Decision**: Acceptable trade-off for this use case

**Rationale**:

- Most projects have stable role requirements after initial setup
- Simplicity reduces maintenance burden and potential bugs
- Performance benefits (zero runtime overhead) significant
- Projects needing runtime flexibility can use `custom-role-system` instead
- Clear documentation helps developers choose right approach

### Trade-off: TypeScript Compilation Required

**Trade-off**: Configuration file requires TypeScript compilation (minimal)

**Decision**: Acceptable overhead

**Rationale**:

- Setup is infrequent operation (not every build)
- `tsx` execution is fast (<1s for config file)
- Type safety benefits outweigh compilation cost
- Developers already using TypeScript in project

## Migration Plan

### For New Projects

1. **Initial Setup** (First time):

   ```bash
   git clone <repo>
   npm install
   npm run setup:roles  # Interactive wizard
   npm run db:migrate   # Apply generated migration
   ```

2. **Configuration Review**:

   - Review `config/roles.config.ts` for role definitions
   - Review `src/types/generated-roles.ts` for type exports
   - Review `scripts/migrations/00X_user_roles.sql` for database changes

3. **Commit**:
   ```bash
   git add config/ src/types/ scripts/migrations/
   git commit -m "Configure custom roles for project"
   ```

### For Existing Projects (Upgrade Path)

**Option A: Keep Existing 3-Tier System**

- No action required
- Continue using hardcoded roles
- Setup system is opt-in

**Option B: Migrate to Configurable System**

1. **Pull Latest Code**:

   ```bash
   git pull origin main
   npm install  # Get new dependencies (inquirer, zod)
   ```

2. **Run Setup**:

   ```bash
   npm run setup:roles
   # Select existing 3 roles: member, admin, super_admin
   # Or add new roles as needed
   ```

3. **Review Generated Migration**:

   - Check that ENUM values match existing roles
   - Verify no data migration needed (user roles stay same)
   - If adding new roles, ENUM is extended (non-breaking)

4. **Apply Migration**:

   ```bash
   npm run db:migrate
   ```

5. **Update Code**:

   - Imports from `role-types.ts` work unchanged (re-exports generated types)
   - No code changes required unless using new custom roles

6. **Test**:
   ```bash
   npm test  # Verify role-guard tests pass
   npm run type-check  # Verify TypeScript compiles
   ```

### Rollback Plan

**If Setup Fails**:

1. Delete generated files:

   ```bash
   rm src/types/generated-roles.ts
   rm scripts/migrations/00X_user_roles.sql
   ```

2. Restore hardcoded types:
   - `role-types.ts` falls back to hardcoded definitions
   - Application continues working

**If Migration Fails**:

1. Run rollback migration:

   ```bash
   npm run db:migrate -- rollback_00X_user_roles.sql
   ```

2. ENUM drops cleanly (no data loss if only extending)

3. Revert configuration commit:
   ```bash
   git revert <commit-hash>
   ```

## Open Questions

1. **Should we support role aliases?**

   - Example: `editor` is alias for `admin` level
   - Complexity vs flexibility trade-off
   - **Decision**: Defer to future enhancement if needed

2. **Should setup support template presets?**

   - Example: "Blog roles", "SaaS roles", "Forum roles"
   - Would improve DX but adds maintenance
   - **Decision**: Start simple, add presets if requested by users

3. **Should we generate Turso migrations too?**

   - Currently focused on Supabase (PostgreSQL)
   - Turso uses SQLite (no ENUMs)
   - **Decision**: Generate TEXT column with CHECK constraint for Turso (separate generator)

4. **How to handle role deletions?**
   - Removing a role from config breaks existing users with that role
   - Need data migration strategy
   - **Decision**: Setup warns if removing roles, suggests data migration plan

## Success Metrics

1. **Developer Satisfaction**: Setup completes in <5 minutes for first-time users
2. **Error Rate**: <5% of setups result in validation errors (indicates good UX)
3. **Type Safety**: 100% of role operations are type-checked (no runtime string comparisons)
4. **Performance**: Zero measurable runtime overhead vs hardcoded roles
5. **Adoption**: 50%+ of new projects use custom roles within 6 months

## References

- **Existing Implementation**: `src/utils/role-types.ts` (hardcoded 3-tier system)
- **Related Proposal**: `add-custom-role-system` (runtime alternative)
- **Similar Patterns**: Drizzle ORM schema generation, Prisma client generation
- **Validation Library**: Zod (https://zod.dev)
- **CLI Library**: Inquirer (https://github.com/SBoudrias/Inquirer.js)
