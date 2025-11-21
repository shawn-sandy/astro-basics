/**
 * Role Configuration
 *
 * This file defines the available user roles in your application.
 * After modifying this file, run `npm run setup:roles` to regenerate
 * TypeScript types and database migrations.
 *
 * @module config/roles.config
 */

/**
 * Role definition interface
 *
 * Defines a single user role with its hierarchy level and display label.
 */
export interface RoleDefinition {
  /**
   * Role identifier (must be lowercase alphanumeric with underscores)
   * @example 'member', 'moderator', 'admin'
   */
  name: string

  /**
   * Hierarchy level (1-10, higher = more privileges)
   *
   * Used for role-based access control where higher-level roles
   * can access resources restricted to lower-level roles.
   *
   * @example
   * member: 1
   * moderator: 2
   * admin: 3
   * super_admin: 4
   */
  level: number

  /**
   * Human-readable display label
   * @example 'Member', 'Moderator', 'Administrator'
   */
  label: string
}

/**
 * Complete role configuration
 */
export interface RoleConfig {
  /**
   * List of role definitions
   *
   * REQUIRED ROLES: member, admin, super_admin
   * These three core roles must always be present to maintain system stability.
   */
  roles: RoleDefinition[]

  /**
   * Core roles that cannot be removed
   *
   * These roles are required for Row Level Security (RLS) policies
   * and system functionality.
   */
  coreRoles: readonly string[]
}

/**
 * Default role configuration (3-tier system)
 *
 * This is the default configuration that matches the existing
 * hardcoded role system. Modify this configuration to add or
 * change roles for your project.
 *
 * After modification, run: npm run setup:roles
 */
export const roleConfig: RoleConfig = {
  roles: [
    {
      name: 'member',
      level: 1,
      label: 'Member',
    },
    {
      name: 'admin',
      level: 5,
      label: 'Administrator',
    },
    {
      name: 'super_admin',
      level: 10,
      label: 'Super Administrator',
    },
  ],
  coreRoles: ['member', 'admin', 'super_admin'] as const,
} as const
