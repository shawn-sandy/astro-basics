# Configurable Role System

The astro-basics project includes a powerful setup-time role configuration system that allows you to define custom user roles for your application. This system provides compile-time type safety, zero runtime overhead, and automatic database migration generation.

## Overview

The configurable role system allows you to:

- Define custom roles at project setup time
- Maintain full TypeScript type safety across your codebase
- Automatically generate database migrations for PostgreSQL (Supabase) or SQLite (Turso)
- Enforce role hierarchy and permissions
- Keep roles consistent between TypeScript and database

## Quick Start

### 1. Configure Your Roles

Edit [`config/roles.config.ts`](../../config/roles.config.ts):

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'moderator', level: 2, label: 'Moderator' },
    { name: 'admin', level: 3, label: 'Administrator' },
    { name: 'super_admin', level: 4, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'] as const,
}
```

### 2. Generate Types and Migrations

```bash
npm run setup:roles
```

This command will:

1. Validate your configuration
2. Generate TypeScript types in `src/types/generated-roles.ts`
3. Create database migrations in `scripts/migrations/`

### 3. Apply Database Migration

```bash
npm run db:migrate
```

### 4. Commit Generated Files

```bash
git add config/roles.config.ts src/types/generated-roles.ts scripts/migrations/
git commit -m "Configure custom roles"
```

## Configuration Options

### Role Definition

Each role must have three properties:

```typescript
interface RoleDefinition {
  name: string // Unique identifier (lowercase, alphanumeric + underscores)
  level: number // Hierarchy level (1-10, higher = more privileges)
  label: string // Human-readable display name
}
```

### Role Name Requirements

- Must be lowercase
- Must start with a letter
- Can contain letters, numbers, and underscores only
- Must be 2-30 characters long
- Cannot be a SQL or TypeScript reserved keyword

### Core Roles

Three roles are **required** and cannot be removed:

- `member` - Base user role
- `admin` - Administrative access
- `super_admin` - System administration

These roles are required for Row Level Security (RLS) policies and system stability.

### Hierarchy Levels

- Must be integers between 1 and 10
- Must be unique across all roles
- Higher levels have more privileges
- Used for hierarchical role checking

## Common Role Patterns

### Blog Platform

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'author', level: 2, label: 'Author' },
    { name: 'editor', level: 3, label: 'Editor' },
    { name: 'admin', level: 4, label: 'Administrator' },
    { name: 'super_admin', level: 5, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

### SaaS Platform

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'viewer', level: 2, label: 'Viewer' },
    { name: 'contributor', level: 3, label: 'Contributor' },
    { name: 'manager', level: 4, label: 'Manager' },
    { name: 'admin', level: 5, label: 'Administrator' },
    { name: 'super_admin', level: 6, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

### Forum Platform

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'moderator', level: 2, label: 'Moderator' },
    { name: 'curator', level: 3, label: 'Curator' },
    { name: 'volunteer', level: 4, label: 'Volunteer' },
    { name: 'admin', level: 5, label: 'Administrator' },
    { name: 'super_admin', level: 6, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

## Generated Files

### TypeScript Types

`src/types/generated-roles.ts` exports:

```typescript
// Union type of all role names
export type UserRole = 'member' | 'admin' | 'super_admin'

// Array of all valid roles
export const USER_ROLES: UserRole[] = ['member', 'admin', 'super_admin']

// Hierarchy levels for each role
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  admin: 2,
  super_admin: 3,
}

// Human-readable labels
export const ROLE_LABELS: Record<UserRole, string> = {
  member: 'Member',
  admin: 'Administrator',
  super_admin: 'Super Administrator',
}
```

### Database Migrations

PostgreSQL migration (`scripts/migrations/00X_user_roles.sql`):

- Creates `user_role` ENUM type
- Idempotent (safe to re-run)
- Includes verification queries
- Wrapped in transaction

Rollback migration (`scripts/migrations/rollback_00X_user_roles.sql`):

- Drops `user_role` ENUM type
- Includes safety warnings

## Usage in Code

### Type-Safe Role Checks

```typescript
import type { UserRole } from '#utils/role-types'
import { ROLE_HIERARCHY } from '#types/generated-roles'

function canEditPost(userRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.admin
}
```

### UI Display

```typescript
import { ROLE_LABELS } from '#types/generated-roles'

function UserRoleBadge({ role }: { role: UserRole }) {
  return <span className="badge">{ROLE_LABELS[role]}</span>
}
```

### Validation

```typescript
import { USER_ROLES } from '#types/generated-roles'

function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole)
}
```

## Updating Roles

### Adding a New Role

1. Edit `config/roles.config.ts` and add the role
2. Run `npm run setup:roles` to regenerate types
3. Run `npm run db:migrate` to update database
4. Commit all generated files

### Removing a Role

**WARNING**: Removing a role requires careful consideration!

1. Ensure no users have the role you're removing
2. Migrate existing users to a different role
3. Edit `config/roles.config.ts` to remove the role
4. Run `npm run setup:roles`
5. Apply migration carefully

### Modifying Role Levels

1. Edit `config/roles.config.ts` and change levels
2. Run `npm run setup:roles`
3. Test role-guard logic thoroughly
4. Commit changes

## Troubleshooting

### "Configuration validation failed"

Check error messages for specific issues:

- Role names must be lowercase alphanumeric with underscores
- Levels must be unique integers between 1-10
- All three core roles must be present
- No duplicate role names

### "Migration already exists"

The setup script auto-increments migration numbers. If you see conflicts:

1. Check `scripts/migrations/` for existing migrations
2. Delete generated migration if needed
3. Re-run `npm run setup:roles`

### "Type errors after regeneration"

1. Run `npm run type-check` to see specific errors
2. Ensure all imports use the new role names
3. Update role-guard configurations
4. Clear TypeScript cache: `rm -rf .astro`

### "Database migration failed"

1. Check database connection
2. Verify you have migration permissions
3. Check if ENUM already exists with different values
4. Review migration SQL for conflicts

## CLI Commands

```bash
# Generate types and migrations (interactive)
npm run setup:roles

# Dry run (preview changes without writing files)
npm run setup:roles:dry-run

# Validate configuration only
npm run validate:roles

# Apply database migration
npm run db:migrate

# Check migration status
npm run db:migrate:status
```

## Best Practices

1. **Always use setup:roles after modifying config** - Don't manually edit generated files
2. **Commit generated files to Git** - Ensures consistency across team
3. **Review migrations before applying** - Check SQL for correctness
4. **Test role-guard logic after changes** - Run unit tests
5. **Document custom roles** - Add comments explaining role purposes

## Performance

The configurable role system has:

- **Setup time**: ~5-10 seconds (one-time)
- **Type generation**: <1 second
- **Migration generation**: <1 second
- **Runtime overhead**: **0ms** (roles are static after setup)

## Security Considerations

- Core roles (`member`, `admin`, `super_admin`) are protected
- Configuration is validated before generation
- Database-level validation with PostgreSQL ENUMs
- Git-tracked configuration provides audit trail
- Hierarchy levels enforce privilege escalation rules

## Limitations

- Roles are configured at setup time, not runtime
- Requires redeployment to change roles
- PostgreSQL ENUMs can only be extended, not modified
- Not suitable for per-organization custom roles

For runtime custom roles, see the alternative `custom-role-system` proposal.

## See Also

- [Role Configuration Reference](role-configuration-reference.md)
- [Role-Guard System](../../src/utils/role-types.ts)
- [Database Migrations](../database/migrations.md)
