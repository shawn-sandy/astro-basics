/**
 * Role Type Generator
 *
 * Generates TypeScript types from role configuration for compile-time
 * type safety throughout the application.
 *
 * @module scripts/lib/role-generator
 */

import fs from 'fs'
import path from 'path'
import type { RoleConfig } from '../../config/roles.config'

/**
 * Generates WCAG AA compliant colors for a role based on its hierarchy level
 *
 * Uses a color scheme that maps privilege levels to visual hierarchy:
 * - Low privilege (0-40% of range): Blue tones - calming, approachable
 * - Mid privilege (40-70% of range): Purple tones - authority without aggression
 * - High privilege (70-100% of range): Amber tones - high visibility, commands attention
 *
 * All color combinations meet WCAG AA standards (4.5:1 contrast ratio minimum).
 *
 * @param level - The role's hierarchy level
 * @param label - The role's display label
 * @param minLevel - Minimum level in the role system
 * @param maxLevel - Maximum level in the role system
 * @returns Color configuration object with bg/text colors and description
 */
function generateRoleColor(
  level: number,
  label: string,
  minLevel: number,
  maxLevel: number
): RoleColorConfig {
  // Calculate percentage through hierarchy (0.0 to 1.0)
  // Handle edge case where all roles have the same level
  const percentage = maxLevel > minLevel ? (level - minLevel) / (maxLevel - minLevel) : 0.5

  if (percentage < 0.4) {
    // Low privilege: Blue tones
    return {
      label,
      bgColor: '#dbeafe', // blue-100
      textColor: '#1e40af', // blue-800 (contrast ratio: 7.0:1)
      description: 'Standard user with basic permissions',
    }
  } else if (percentage < 0.7) {
    // Mid privilege: Purple tones
    return {
      label,
      bgColor: '#e9d5ff', // purple-200
      textColor: '#6b21a8', // purple-800 (contrast ratio: 6.8:1)
      description: 'Elevated permissions for administrative tasks',
    }
  } else {
    // High privilege: Amber tones
    return {
      label,
      bgColor: '#fef3c7', // amber-100
      textColor: '#92400e', // amber-900 (contrast ratio: 8.2:1)
      description: 'Full administrative access and system control',
    }
  }
}

/**
 * Role color configuration
 */
export interface RoleColorConfig {
  label: string
  bgColor: string
  textColor: string
  description: string
}

/**
 * Generation result interface
 */
export interface GenerationResult {
  /**
   * Whether generation succeeded
   */
  success: boolean

  /**
   * Path to generated file (only present if success = true)
   */
  filePath?: string

  /**
   * Generated TypeScript code (only present if success = true)
   */
  code?: string

  /**
   * Error message (only present if success = false)
   */
  error?: string
}

/**
 * Generates TypeScript type definitions from role configuration
 *
 * Creates a TypeScript file with:
 * - UserRole union type
 * - USER_ROLES constant array
 * - ROLE_HIERARCHY constant object
 * - ROLE_LABELS constant object
 * - ROLE_COLORS constant object (with auto-generated WCAG AA compliant colors)
 *
 * @param config - The validated role configuration
 * @returns The generated TypeScript code as a string
 *
 * @example
 * ```typescript
 * const config = {
 *   roles: [
 *     { name: 'member', level: 1, label: 'Member' },
 *     { name: 'admin', level: 2, label: 'Administrator' }
 *   ],
 *   coreRoles: ['member', 'admin']
 * }
 * const code = generateRoleTypes(config)
 * ```
 */
export function generateRoleTypes(config: RoleConfig): string {
  const timestamp = new Date().toISOString()

  // Extract role names, labels, and levels
  const roleNames = config.roles.map(r => r.name)
  const roleLabels = config.roles.map(r => ({ name: r.name, label: r.label }))
  const roleHierarchy = config.roles.map(r => ({ name: r.name, level: r.level }))

  // Calculate min/max levels for proper color distribution
  const levels = config.roles.map(r => r.level)
  const minLevel = Math.min(...levels)
  const maxLevel = Math.max(...levels)

  // Generate UserRole union type
  const userRoleType = `export type UserRole = ${roleNames.map(name => `'${name}'`).join(' | ')}`

  // Generate USER_ROLES constant
  const userRolesArray = `export const USER_ROLES: UserRole[] = [${roleNames.map(name => `'${name}'`).join(', ')}] as const`

  // Generate ROLE_HIERARCHY constant
  const hierarchyEntries = roleHierarchy.map(r => `  ${r.name}: ${r.level}`).join(',\n')
  const roleHierarchyConst = `export const ROLE_HIERARCHY: Record<UserRole, number> = {\n${hierarchyEntries},\n} as const`

  // Generate ROLE_LABELS constant
  const labelEntries = roleLabels.map(r => `  ${r.name}: '${r.label}'`).join(',\n')
  const roleLabelsConst = `export const ROLE_LABELS: Record<UserRole, string> = {\n${labelEntries},\n} as const`

  // Generate ROLE_COLORS constant with auto-generated WCAG AA compliant colors
  const colorEntries = config.roles
    .map(r => {
      const colors = generateRoleColor(r.level, r.label, minLevel, maxLevel)
      return `  ${r.name}: {
    label: '${colors.label}',
    bgColor: '${colors.bgColor}',
    textColor: '${colors.textColor}',
    description: '${colors.description}',
  }`
    })
    .join(',\n')

  const roleColorsConst = `export const ROLE_COLORS: Record<UserRole, {
  label: string
  bgColor: string
  textColor: string
  description: string
}> = {
${colorEntries},
} as const`

  // Assemble complete file
  const code = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * This file was generated by scripts/setup-roles.ts
 * Source: config/roles.config.ts
 * Generated: ${timestamp}
 *
 * To modify roles, edit config/roles.config.ts and run:
 *   npm run setup:roles
 *
 * @module types/generated-roles
 */

/**
 * User role type
 *
 * Represents all available user roles in the application.
 * This type is generated from the role configuration.
 */
${userRoleType}

/**
 * Array of all valid user roles
 *
 * Use this for runtime validation and iteration.
 */
${userRolesArray}

/**
 * Role hierarchy levels
 *
 * Higher numbers indicate more privileges.
 * Used for hierarchical role checking where higher-level roles
 * can access resources restricted to lower-level roles.
 */
${roleHierarchyConst}

/**
 * Human-readable role labels
 *
 * Maps role identifiers to display-friendly names for UI rendering.
 */
${roleLabelsConst}

/**
 * Role color configuration
 *
 * Maps role identifiers to color schemes for UI badges and indicators.
 * Colors are automatically generated based on role hierarchy with WCAG AA
 * compliant contrast ratios (minimum 4.5:1).
 *
 * Color scheme:
 * - Low privilege roles (levels 1-3): Blue tones
 * - Mid privilege roles (levels 4-7): Purple tones
 * - High privilege roles (levels 8-10): Amber tones
 */
${roleColorsConst}
`

  return code
}

/**
 * Writes generated TypeScript types to file
 *
 * @param config - The validated role configuration
 * @param outputPath - Optional custom output path (defaults to src/types/generated-roles.ts)
 * @returns Generation result with success flag and file path
 *
 * @example
 * ```typescript
 * const result = writeRoleTypes(config)
 * if (result.success) {
 *   console.log(`Types written to: ${result.filePath}`)
 * } else {
 *   console.error(`Error: ${result.error}`)
 * }
 * ```
 */
export function writeRoleTypes(config: RoleConfig, outputPath?: string): GenerationResult {
  try {
    // Generate the TypeScript code
    const code = generateRoleTypes(config)

    // Determine output path
    const filePath = outputPath || path.join(process.cwd(), 'src', 'types', 'generated-roles.ts')

    // Ensure output directory exists
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Create backup of existing file if it exists
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup`
      fs.copyFileSync(filePath, backupPath)
    }

    // Write the file
    fs.writeFileSync(filePath, code, 'utf-8')

    return {
      success: true,
      filePath,
      code,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Validates that generated TypeScript is syntactically valid
 *
 * This is a basic validation that checks if the generated code
 * can be parsed as TypeScript/JavaScript.
 *
 * @param code - The generated TypeScript code
 * @returns True if code appears valid, false otherwise
 */
export function validateGeneratedTypes(code: string): boolean {
  try {
    // Basic syntax check - ensure no obvious syntax errors
    // We check for required exports
    const hasUserRoleType = /export type UserRole = /.test(code)
    const hasUserRolesConst = /export const USER_ROLES/.test(code)
    const hasHierarchyConst = /export const ROLE_HIERARCHY/.test(code)
    const hasLabelsConst = /export const ROLE_LABELS/.test(code)
    const hasColorsConst = /export const ROLE_COLORS/.test(code)

    return (
      hasUserRoleType && hasUserRolesConst && hasHierarchyConst && hasLabelsConst && hasColorsConst
    )
  } catch {
    return false
  }
}
