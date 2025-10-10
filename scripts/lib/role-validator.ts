/**
 * Role Configuration Validator
 *
 * Validates role configurations using Zod schemas to ensure
 * safe and consistent role definitions before type generation.
 *
 * @module scripts/lib/role-validator
 */

import { z } from 'zod'
import type { RoleConfig } from '../../config/roles.config'

/**
 * SQL keywords that cannot be used as role names
 *
 * Prevents conflicts with PostgreSQL reserved words.
 */
const SQL_KEYWORDS = [
  'user',
  'role',
  'select',
  'insert',
  'update',
  'delete',
  'from',
  'where',
  'join',
  'group',
  'order',
  'table',
  'create',
  'drop',
  'alter',
  'grant',
  'revoke',
  'index',
  'view',
  'trigger',
  'function',
  'procedure',
  'database',
  'schema',
  'constraint',
  'primary',
  'foreign',
  'key',
  'unique',
  'check',
  'default',
  'null',
  'not',
  'and',
  'or',
  'in',
  'exists',
  'between',
  'like',
  'case',
  'when',
  'then',
  'else',
  'end',
] as const

/**
 * TypeScript keywords that cannot be used as role names
 *
 * Prevents conflicts with TypeScript reserved words.
 */
const TS_KEYWORDS = [
  'class',
  'interface',
  'type',
  'enum',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'switch',
  'case',
  'break',
  'continue',
  'for',
  'while',
  'do',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'this',
  'super',
  'extends',
  'implements',
  'public',
  'private',
  'protected',
  'static',
  'readonly',
  'abstract',
  'async',
  'await',
  'import',
  'export',
  'from',
  'as',
  'default',
  'namespace',
  'module',
  'declare',
  'any',
  'unknown',
  'never',
  'void',
  'string',
  'number',
  'boolean',
  'object',
  'symbol',
] as const

/**
 * Core roles that must be present in every configuration
 *
 * These roles are required for Row Level Security policies
 * and system stability.
 */
const REQUIRED_CORE_ROLES = ['member', 'admin', 'super_admin'] as const

/**
 * Zod schema for individual role definitions
 *
 * Validates role name format, hierarchy level, and display label.
 */
export const RoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(30, 'Role name must be at most 30 characters')
    .regex(/^[a-z][a-z0-9_]*$/, {
      message:
        'Role name must be lowercase, start with a letter, and contain only letters, numbers, and underscores',
    })
    .refine(name => !SQL_KEYWORDS.includes(name as (typeof SQL_KEYWORDS)[number]), {
      message: 'Role name conflicts with SQL keyword',
    })
    .refine(name => !TS_KEYWORDS.includes(name as (typeof TS_KEYWORDS)[number]), {
      message: 'Role name conflicts with TypeScript keyword',
    }),
  level: z
    .number()
    .int('Level must be an integer')
    .min(1, 'Level must be at least 1')
    .max(10, 'Level must be at most 10'),
  label: z.string().min(1, 'Label is required').max(50, 'Label must be at most 50 characters'),
})

/**
 * Zod schema for complete role configuration
 *
 * Validates the entire role configuration including:
 * - Minimum 3 roles (core roles required)
 * - Unique role names
 * - Unique hierarchy levels
 * - Presence of required core roles
 */
export const RoleConfigSchema = z
  .object({
    roles: z
      .array(RoleSchema)
      .min(3, 'Must define at least 3 roles (core roles: member, admin, super_admin)')
      .refine(
        roles => {
          const names = roles.map(r => r.name)
          return names.length === new Set(names).size
        },
        {
          message: 'Role names must be unique',
        }
      )
      .refine(
        roles => {
          const levels = roles.map(r => r.level)
          return levels.length === new Set(levels).size
        },
        {
          message: 'Hierarchy levels must be unique',
        }
      )
      .refine(roles => roles.some(r => r.name === 'member'), {
        message: "Required core role 'member' is missing",
      })
      .refine(roles => roles.some(r => r.name === 'admin'), {
        message: "Required core role 'admin' is missing",
      })
      .refine(roles => roles.some(r => r.name === 'super_admin'), {
        message: "Required core role 'super_admin' is missing",
      }),
    coreRoles: z.array(z.string()).length(3, 'Must have exactly 3 core roles'),
  })
  .refine(
    config => {
      const roleNames = config.roles.map(r => r.name)
      return config.coreRoles.every(core => roleNames.includes(core))
    },
    {
      message: 'All core roles must be defined in the roles array',
    }
  )
  .refine(
    config => {
      return REQUIRED_CORE_ROLES.every(required => config.coreRoles.includes(required))
    },
    {
      message: `Core roles must include: ${REQUIRED_CORE_ROLES.join(', ')}`,
    }
  )

/**
 * Validation result interface
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  success: boolean

  /**
   * Validated configuration (only present if success = true)
   */
  data?: RoleConfig

  /**
   * Validation errors (only present if success = false)
   */
  errors?: string[]
}

/**
 * Validates a role configuration
 *
 * @param config - The role configuration to validate
 * @returns Validation result with success flag and errors
 *
 * @example
 * ```typescript
 * import { validateRoleConfig } from './role-validator'
 * import { roleConfig } from '../../config/roles.config'
 *
 * const result = validateRoleConfig(roleConfig)
 * if (result.success) {
 *   console.log('Configuration is valid!')
 * } else {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validateRoleConfig(config: RoleConfig): ValidationResult {
  try {
    const validated = RoleConfigSchema.parse(config)
    return {
      success: true,
      data: validated,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.')
        return path ? `${path}: ${err.message}` : err.message
      })
      return {
        success: false,
        errors,
      }
    }
    return {
      success: false,
      errors: ['Unknown validation error'],
    }
  }
}

/**
 * Validates and returns configuration or throws error
 *
 * @param config - The role configuration to validate
 * @returns The validated configuration
 * @throws {Error} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const validated = validateRoleConfigOrThrow(roleConfig)
 *   // proceed with validated config
 * } catch (error) {
 *   console.error(error.message)
 *   process.exit(1)
 * }
 * ```
 */
export function validateRoleConfigOrThrow(config: RoleConfig): RoleConfig {
  const result = validateRoleConfig(config)
  if (!result.success) {
    const errorMessage = `Role configuration validation failed:\n${result.errors?.map(e => `  - ${e}`).join('\n')}`
    throw new Error(errorMessage)
  }
  return result.data!
}
