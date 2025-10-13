# Proposal: Complete Interactive Role Setup Wizard

## Why

The configurable role system foundation exists but lacks the interactive CLI experience that makes it accessible to developers. Without the setup wizard, developers must manually edit configuration files, defeating the purpose of automated setup.

**Current State**:

- ✅ Core type/migration generation works ([scripts/lib/role-generator.ts](scripts/lib/role-generator.ts))
- ✅ Configuration validation implemented ([scripts/lib/role-validator.ts](scripts/lib/role-validator.ts))
- ✅ Basic script exists ([scripts/setup-roles.ts](scripts/setup-roles.ts))
- ❌ **No interactive prompts** - developers must edit `config/roles.config.ts` manually
- ❌ **No guided workflow** - high barrier to entry for new users
- ❌ **No template selection** - each project starts from scratch

**Problem**:
Without an interactive wizard, developers face:

1. **Manual configuration** - editing TypeScript files is error-prone
2. **No validation feedback** - errors discovered only when running the script
3. **Steep learning curve** - must understand schema before configuring
4. **No templates** - reinventing common role patterns each time
5. **Poor developer experience** - contradicts the "setup-time simplicity" goal

**Real-World Scenario**:
A developer wants to add a `moderator` role to their forum application:

**Current (Manual) Experience**:

```typescript
// Developer must edit config/roles.config.ts directly
export const roleConfig = {
  roles: {
    member: { level: 1, label: 'Member' },
    moderator: { level: 2, label: 'Moderator' }, // Add this manually
    admin: { level: 3, label: 'Admin' },
    super_admin: { level: 4, label: 'Super Admin' },
  },
}
// Then run: npm run setup:roles
// Hope validation passes...
```

**Desired (Interactive) Experience**:

```bash
npm run setup:roles

✨ Role Setup Wizard
   Configure roles for your application

? Choose a starting template:
  ❯ Basic (3 roles: member, admin, super_admin)
    Forum (+ moderator, curator)
    Blog (+ author, editor)
    SaaS (+ viewer, contributor, manager)
    Custom (start from scratch)

? Select Forum template

✓ Template loaded: member, moderator, admin, super_admin

? Add more roles? (Y/n) n

? Review configuration:
  • member (level 1) - Base member role
  • moderator (level 2) - Forum moderator
  • admin (level 3) - Administrator
  • super_admin (level 4) - System administrator

? Confirm and generate? (Y/n) Y

✓ Configuration saved to config/roles.config.ts
✓ Types generated in src/types/generated-roles.ts
✓ Migration created: scripts/migrations/004_user_roles.sql
✓ Setup complete! Run 'npm run db:migrate' to apply changes.
```

## What Changes

Complete the interactive CLI wizard to provide a guided, user-friendly setup experience for configuring application roles.

### Core Features

**1. Interactive Prompts** (Section 2.2 from archived tasks):

- Template selection (basic, forum, blog, saas, custom)
- Role selection with checkboxes (core roles pre-selected and disabled)
- Custom role name input with real-time validation
- Hierarchy level input with smart suggestions
- Role label input with auto-generated defaults
- Configuration review before saving
- Overwrite confirmation for existing configs

**2. Configuration Templates** (Section 1.3 from archived tasks):

- `config/templates/basic-roles.template.ts` - Default 3-tier system
- `config/templates/forum-roles.template.ts` - Forum with moderators
- `config/templates/blog-roles.template.ts` - Blog with authors/editors
- `config/templates/saas-roles.template.ts` - SaaS with viewers/managers
- `config/templates/README.md` - Template documentation

**3. Setup Orchestration** (Section 5.1 from archived tasks):

- Full workflow: prompt → validate → generate types → generate migration
- Error handling with rollback on failure
- Success summary showing all generated files
- "Next steps" guidance (run db:migrate, commit files, etc.)
- Dry-run mode support

**4. Enhanced Validation**:

- Real-time validation during prompts
- Descriptive error messages with retry logic
- Conflict detection (name collisions, hierarchy conflicts)
- Smart defaults based on role names

### Files Created

**Templates** (New):

```
config/templates/
├── README.md                      # Template documentation
├── basic-roles.template.ts        # Default 3-tier
├── forum-roles.template.ts        # Forum use case
├── blog-roles.template.ts         # Blog use case
└── saas-roles.template.ts         # SaaS use case
```

**Modified Files**:

```
scripts/setup-roles.ts             # Add interactive prompts
scripts/lib/role-generator.ts      # Add Prettier formatting
package.json                       # Update description
```

**Tests** (New):

```
tests/integration/setup-wizard.test.ts  # E2E wizard tests
```

### Breaking Changes

**None** - This is a pure enhancement to existing tooling.

- Existing `npm run setup:roles` behavior unchanged (if no interactive session available, falls back to manual config)
- All generated file formats remain identical
- No API changes to generation functions
- Backward compatible with existing configurations

### Migration Strategy

**For Existing Projects**:

1. Pull updated code with interactive wizard
2. Run `npm run setup:roles` to experience new interface
3. **Or** continue editing `config/roles.config.ts` manually (still supported)

**For New Projects**:

1. Clone repository
2. Run `npm run setup:roles`
3. Follow interactive prompts
4. Review generated files
5. Apply migration with `npm run db:migrate`

### User Experience Impact

**For Developers**:

- ✅ **5-minute setup** vs. 20+ minutes of manual configuration
- ✅ **Zero TypeScript knowledge required** for basic setup
- ✅ **Instant validation feedback** during configuration
- ✅ **Pre-built templates** for common use cases
- ✅ **Clear next steps** after setup completion

**For Teams**:

- ✅ **Consistent setup process** across team members
- ✅ **Reduced onboarding time** for new developers
- ✅ **Self-documenting** through interactive prompts
- ✅ **Lower support burden** (fewer configuration errors)

### Performance Impact

**Setup Performance**:

- Interactive prompts: +2-3 seconds vs. direct file edit
- Template loading: <100ms
- Total setup time: 5-10 seconds for interactive flow
- **Runtime impact: 0ms** (no changes to runtime code)

### Documentation Impact

**New Documentation**:

- Template README explaining each template
- Interactive wizard user guide (add to existing [project-docs/02-guides/configurable-roles.md](project-docs/02-guides/configurable-roles.md))
- Template customization examples

**Updated Documentation**:

- [README.md](README.md) - Highlight interactive setup in examples
- [CLAUDE.md](CLAUDE.md) - Reference interactive wizard
- [project-docs/02-guides/configurable-roles.md](project-docs/02-guides/configurable-roles.md) - Add wizard walkthrough

### Testing Strategy

**Unit Tests**:

- Template loading and parsing
- Prompt validation logic
- Smart defaults generation
- Error message clarity

**Integration Tests**:

- Full wizard workflow (mock inquirer responses)
- Template selection → file generation
- Error recovery and retry logic
- Dry-run mode functionality

**Manual Testing**:

1. Run wizard with each template
2. Add custom roles interactively
3. Trigger validation errors intentionally
4. Test overwrite confirmation flow
5. Verify generated files are correct

### Conflicts with Existing Changes

**No conflicts**. This proposal:

- Builds on archived `add-configurable-role-system`
- Does not conflict with `add-custom-role-system` (different approach entirely)
- Complements all other active changes

### Security Considerations

**Positive Security Impacts**:

- ✅ Real-time validation prevents misconfigurations
- ✅ Template-based setup reduces human error
- ✅ Overwrite confirmation prevents accidental data loss
- ✅ Dry-run mode allows safe preview

**Security Boundaries**:

- ⚠️ User input is validated before file writes
- ⚠️ File operations use safe paths (no path traversal)
- ⚠️ Generated SQL is parameterized (already implemented)
- ⚠️ Templates are trusted code (in project repo)

## Validation Checklist

Before implementing:

- [x] Builds on existing foundation (archived change)
- [x] Focuses on high-value user experience improvement
- [x] No breaking changes or conflicts
- [x] Clear success criteria (functional interactive wizard)
- [ ] All requirements have scenarios (to be added in specs)
