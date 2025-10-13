# Design: Complete Interactive Role Setup Wizard

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Interactive CLI Wizard                    │
│                   (scripts/setup-roles.ts)                   │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐   ┌──────────────────────────────┐
│   Template System      │   │   Prompt Engine              │
│   (config/templates/)  │   │   (inquirer.js)              │
│                        │   │                              │
│ • basic-roles          │   │ • Template selection         │
│ • forum-roles          │   │ • Role configuration         │
│ • blog-roles           │   │ • Validation & retry         │
│ • saas-roles           │   │ • Confirmation               │
└────────────┬───────────┘   └────────────┬─────────────────┘
             │                            │
             └───────────┬────────────────┘
                         ▼
             ┌───────────────────────┐
             │   Setup Orchestrator  │
             │                       │
             │ 1. Load/merge config  │
             │ 2. Validate           │
             │ 3. Generate types     │
             │ 4. Generate migration │
             │ 5. Write files        │
             │ 6. Show summary       │
             └───────┬───────────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────┐  ┌──────────────┐  ┌────────────┐
│Validator│  │Type Generator│  │Migration   │
│(exists) │  │(exists)      │  │Generator   │
│         │  │              │  │(exists)    │
└─────────┘  └──────────────┘  └────────────┘
```

## Component Design

### 1. Template System

**Purpose**: Provide pre-configured role sets for common use cases.

**Template Structure**:

```typescript
// config/templates/forum-roles.template.ts
import type { RoleConfig } from '../roles.config'

export const forumRolesTemplate: RoleConfig = {
  roles: {
    member: {
      level: 1,
      label: 'Member',
      description: 'Base member with posting privileges',
    },
    moderator: {
      level: 2,
      label: 'Moderator',
      description: 'Can moderate discussions and manage posts',
    },
    admin: {
      level: 3,
      label: 'Administrator',
      description: 'Full administrative access',
    },
    super_admin: {
      level: 4,
      label: 'Super Administrator',
      description: 'System-level access and configuration',
    },
  },
}
```

**Templates to Create**:

1. **basic-roles**: Default 3-tier (member, admin, super_admin)
2. **forum-roles**: + moderator, curator
3. **blog-roles**: + author, editor
4. **saas-roles**: + viewer, contributor, manager

**Template Loading**:

```typescript
async function loadTemplate(templateName: string): Promise<RoleConfig> {
  const templatePath = `./config/templates/${templateName}-roles.template.js`
  const module = await import(templatePath)
  return module[`${templateName}RolesTemplate`]
}
```

### 2. Prompt Engine

**Purpose**: Guide users through configuration with validation and smart defaults.

**Prompt Flow**:

```
1. Welcome Screen
   └─> 2. Template Selection
        └─> 3. Review Selected Roles
             └─> 4. Add Custom Roles? (loop)
                  ├─> 4a. Role Name Input
                  ├─> 4b. Hierarchy Level Input
                  ├─> 4c. Label Input
                  └─> 4d. Add Another?
                       └─> 5. Final Review
                            └─> 6. Confirm & Generate
                                 └─> 7. Success Summary
```

**Key Prompts**:

```typescript
// 1. Template Selection
const templatePrompt: inquirer.ListQuestion = {
  type: 'list',
  name: 'template',
  message: 'Choose a starting template:',
  choices: [
    { name: 'Basic (3 roles: member, admin, super_admin)', value: 'basic' },
    { name: 'Forum (+ moderator, curator)', value: 'forum' },
    { name: 'Blog (+ author, editor)', value: 'blog' },
    { name: 'SaaS (+ viewer, contributor, manager)', value: 'saas' },
    { name: 'Custom (start from scratch)', value: 'custom' },
  ],
  default: 'basic',
}

// 2. Add Custom Role
const roleNamePrompt: inquirer.InputQuestion = {
  type: 'input',
  name: 'roleName',
  message: 'Enter role name (lowercase, underscores only):',
  validate: (input: string) => {
    // Use existing role-validator logic
    const result = validateRoleName(input)
    return result.success || result.error
  },
}

// 3. Hierarchy Level with Smart Suggestion
const hierarchyPrompt: inquirer.InputQuestion = {
  type: 'input',
  name: 'level',
  message: answers => {
    const suggested = suggestHierarchyLevel(answers.roleName, existingRoles)
    return `Hierarchy level for '${answers.roleName}' (1-10, suggested: ${suggested}):`
  },
  default: answers => suggestHierarchyLevel(answers.roleName, existingRoles),
  validate: (input: string) => {
    const level = parseInt(input)
    if (isNaN(level) || level < 1 || level > 10) {
      return 'Level must be between 1 and 10'
    }
    if (levelAlreadyUsed(level, existingRoles)) {
      return `Level ${level} is already used. Choose a different level or confirm to share this level.`
    }
    return true
  },
}

// 4. Final Confirmation
const confirmPrompt: inquirer.ConfirmQuestion = {
  type: 'confirm',
  name: 'confirmed',
  message: answers => {
    const roleCount = Object.keys(answers.roles).length
    return `Generate configuration with ${roleCount} roles?`
  },
  default: true,
}
```

**Smart Defaults**:

```typescript
function suggestHierarchyLevel(roleName: string, existing: RoleConfig): number {
  const suggestions: Record<string, number> = {
    member: 1,
    viewer: 1,
    contributor: 2,
    author: 2,
    moderator: 2,
    editor: 3,
    manager: 3,
    admin: 3,
    super_admin: 4,
  }

  // Use suggestion if available
  if (suggestions[roleName]) {
    return suggestions[roleName]
  }

  // Otherwise, suggest next available level
  const usedLevels = Object.values(existing.roles).map(r => r.level)
  const maxLevel = Math.max(...usedLevels, 0)
  return maxLevel + 1
}

function suggestLabel(roleName: string): string {
  // Convert snake_case to Title Case
  return roleName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
```

### 3. Setup Orchestrator

**Purpose**: Coordinate the entire setup workflow with error handling.

**Workflow Implementation**:

```typescript
async function runSetupWizard(options: SetupOptions): Promise<void> {
  try {
    // Step 1: Welcome & detect existing config
    console.log(chalk.bold.cyan('\n✨ Role Setup Wizard\n'))

    const hasExisting = fs.existsSync('config/roles.config.ts')
    if (hasExisting) {
      const overwrite = await confirmOverwrite()
      if (!overwrite) {
        console.log('Setup cancelled.')
        return
      }
      // Backup existing
      backupConfigFile()
    }

    // Step 2: Template selection
    const { template } = await inquirer.prompt([templatePrompt])
    let config = await loadTemplate(template)

    // Step 3: Review template roles
    displayRoleTable(config)

    // Step 4: Add custom roles (loop)
    const { addCustom } = await inquirer.prompt([addCustomRolePrompt])
    if (addCustom) {
      while (true) {
        const roleData = await promptForCustomRole(config)
        config.roles[roleData.name] = {
          level: roleData.level,
          label: roleData.label,
        }

        const { addAnother } = await inquirer.prompt([addAnotherPrompt])
        if (!addAnother) break
      }
    }

    // Step 5: Final review
    console.log(chalk.bold('\n📋 Final Configuration:\n'))
    displayRoleTable(config)

    const { confirmed } = await inquirer.prompt([confirmPrompt])
    if (!confirmed) {
      console.log('Setup cancelled.')
      return
    }

    // Step 6: Validate
    console.log(chalk.gray('\n⏳ Validating configuration...'))
    const validation = validateRoleConfig(config)
    if (!validation.success) {
      console.error(chalk.red('❌ Validation failed:'))
      validation.errors.forEach(err => console.error(chalk.red(`   • ${err}`)))
      throw new Error('Configuration validation failed')
    }
    console.log(chalk.green('✓ Configuration valid'))

    // Step 7: Generate types
    console.log(chalk.gray('⏳ Generating TypeScript types...'))
    const types = generateRoleTypes(config)
    if (options.dryRun) {
      console.log(chalk.dim(types))
    } else {
      writeTypeFile(types, 'src/types/generated-roles.ts')
      console.log(chalk.green('✓ Types generated'))
    }

    // Step 8: Generate migration
    console.log(chalk.gray('⏳ Generating database migration...'))
    const migration = generateRoleMigration(config)
    const migrationNumber = getNextMigrationNumber()
    if (options.dryRun) {
      console.log(chalk.dim(migration))
    } else {
      writeMigrationFile(migration, `scripts/migrations/${migrationNumber}_user_roles.sql`)
      console.log(chalk.green('✓ Migration generated'))
    }

    // Step 9: Write config file
    console.log(chalk.gray('⏳ Writing configuration file...'))
    if (!options.dryRun) {
      writeConfigFile(config, 'config/roles.config.ts')
      console.log(chalk.green('✓ Configuration saved'))
    }

    // Step 10: Success summary
    displaySuccessSummary({
      configPath: 'config/roles.config.ts',
      typesPath: 'src/types/generated-roles.ts',
      migrationPath: `scripts/migrations/${migrationNumber}_user_roles.sql`,
      roleCount: Object.keys(config.roles).length,
    })
  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error.message)

    // Restore backup if available
    if (hasBackup()) {
      console.log(chalk.yellow('⏳ Restoring backup...'))
      restoreBackup()
      console.log(chalk.green('✓ Backup restored'))
    }

    process.exit(1)
  }
}
```

**Success Summary Display**:

```typescript
function displaySuccessSummary(result: SetupResult): void {
  console.log(chalk.bold.green('\n✅ Setup Complete!\n'))

  console.log(chalk.bold('Generated Files:'))
  console.log(chalk.gray(`   • ${result.configPath}`))
  console.log(chalk.gray(`   • ${result.typesPath}`))
  console.log(chalk.gray(`   • ${result.migrationPath}`))

  console.log(chalk.bold('\nNext Steps:'))
  console.log(chalk.yellow('   1. Review generated files'))
  console.log(chalk.yellow('   2. Run: npm run db:migrate'))
  console.log(chalk.yellow('   3. Commit files to version control'))

  console.log(chalk.bold('\nRoles Configured:'))
  console.log(chalk.gray(`   ${result.roleCount} roles defined\n`))
}
```

### 4. Error Handling & Recovery

**Validation Errors**:

- Display specific error with field context
- Allow retry without losing progress
- Show examples of valid input

**File Operation Errors**:

- Atomic writes (write to temp, then rename)
- Automatic backup before overwrite
- Rollback on failure

**User Cancellation**:

- Graceful exit at any prompt
- Clean up partial work
- Restore backups if needed

## Data Flow

### Template → Interactive → Config → Generated Files

```
1. User selects template
   ↓
2. Template loaded as base config
   ↓
3. User modifies via prompts
   ↓
4. Final config assembled
   ↓
5. Validation checks
   ↓
6. [Validator] Checks rules
   ↓
7. [Type Generator] Creates .ts file
   ↓
8. [Migration Generator] Creates .sql file
   ↓
9. [File Writer] Saves all files
   ↓
10. Success summary displayed
```

## File Organization

```
config/
├── roles.config.ts           # User's configuration (generated or manual)
└── templates/
    ├── README.md             # Template documentation
    ├── basic-roles.template.ts
    ├── forum-roles.template.ts
    ├── blog-roles.template.ts
    └── saas-roles.template.ts

scripts/
├── setup-roles.ts            # Main wizard (enhanced)
└── lib/
    ├── role-validator.ts     # Existing
    ├── role-generator.ts     # Existing + Prettier
    ├── migration-generator.ts # Existing
    └── setup-utils.ts        # New: display helpers, smart defaults

src/types/
└── generated-roles.ts        # Auto-generated (formatted)
```

## State Management

**Prompt State**:

- Current configuration (accumulates during wizard)
- Validation errors (per field)
- User choices (for summary display)

**File State**:

- Backup paths (for rollback)
- Dry-run mode flag (skip actual writes)
- Generated file paths (for summary)

**No Persistent State**:

- Wizard is stateless between runs
- All state derived from user input + templates
- No session storage or caching needed

## Testing Strategy

### Unit Tests

- Template loading and parsing
- Smart default suggestions
- Validation during prompts
- Display formatting functions

### Integration Tests (Mocked Inquirer)

```typescript
// Mock inquirer responses
const mockResponses = {
  template: 'forum',
  addCustom: true,
  roleName: 'curator',
  level: 3,
  label: 'Curator',
  addAnother: false,
  confirmed: true,
}

// Stub inquirer.prompt
inquirer.prompt = jest.fn().mockImplementation(questions => {
  const name = Array.isArray(questions) ? questions[0].name : questions.name
  return Promise.resolve({ [name]: mockResponses[name] })
})

// Run wizard
await runSetupWizard({ dryRun: false })

// Assert files generated
expect(fs.existsSync('config/roles.config.ts')).toBe(true)
expect(fs.existsSync('src/types/generated-roles.ts')).toBe(true)
```

### Manual Tests

1. Each template selection
2. Adding 1+ custom roles
3. Triggering each validation error
4. Cancelling at different stages
5. Overwriting existing config
6. Dry-run mode
7. Error recovery and rollback

## Performance Considerations

- **Template loading**: < 50ms (small files)
- **Prompt rendering**: Instant (inquirer is fast)
- **Validation**: < 10ms per check
- **Type generation**: < 100ms (with Prettier)
- **Migration generation**: < 50ms
- **Total wizard time**: 10-30 seconds (mostly user input)

**Optimization**:

- Load templates lazily (only selected one)
- Cache Prettier instance
- Validate incrementally (per field)
- Async file operations (non-blocking)

## Security Considerations

**Input Sanitization**:

- Role names: `[a-z0-9_]` only (enforced by validator)
- Hierarchy levels: 1-10 integer range
- Labels: 1-50 printable characters
- No path traversal in template names

**File Operations**:

- All writes to predefined paths
- Backup before overwrite
- Atomic file operations
- No dynamic eval() or exec()

**User Feedback**:

- Validation errors don't expose system internals
- File paths shown are relative (no absolute paths exposed)
- No sensitive config shown in dry-run output
