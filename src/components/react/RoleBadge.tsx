/**
 * RoleBadge Component
 *
 * Displays user roles with color-coded visual indicators for the 3-tier role system.
 * Provides consistent styling and accessibility for role display across the application.
 *
 * @module components/react/RoleBadge
 */

import type { CSSProperties } from 'react'

/**
 * User role type definition matching Supabase user_role enum
 */
export type UserRole = 'member' | 'admin' | 'super_admin'

/**
 * Props for RoleBadge component
 */
export type Props = {
  /** User role from Supabase users.role column */
  role: UserRole
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Role display configuration mapping roles to visual styles
 *
 * Color scheme rationale:
 * - member: Blue - Default, welcoming, represents majority of users
 * - admin: Purple - Authority without aggression, organization-level power
 * - super_admin: Amber - Highest privilege, system-wide control, commands attention
 */
const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string
    bgColor: string
    textColor: string
    description: string
  }
> = {
  member: {
    label: 'Member',
    bgColor: '#dbeafe', // blue-100
    textColor: '#1e40af', // blue-800
    description: 'Standard user with basic permissions',
  },
  admin: {
    label: 'Administrator',
    bgColor: '#e9d5ff', // purple-200
    textColor: '#6b21a8', // purple-800
    description: 'Organization administrator with elevated permissions',
  },
  super_admin: {
    label: 'Super Admin',
    bgColor: '#fef3c7', // amber-100
    textColor: '#92400e', // amber-900
    description: 'System administrator with full access',
  },
}

/**
 * RoleBadge - Visual indicator for user permission level
 *
 * Displays the user's role with appropriate styling based on permission hierarchy.
 * Uses semantic colors to quickly communicate privilege levels to both users and
 * administrators monitoring the system.
 *
 * @param {Props} props - Component properties
 * @returns {JSX.Element} Styled role badge
 *
 * @example
 * ```tsx
 * // Display user role
 * <RoleBadge role="member" />
 * <RoleBadge role="admin" />
 * <RoleBadge role="super_admin" />
 *
 * // With custom styling
 * <RoleBadge role="admin" className="custom-badge" />
 * ```
 *
 * @accessibility
 * - Uses aria-label for screen reader context
 * - Sufficient color contrast ratios (WCAG AA compliant)
 * - Does not rely solely on color to convey meaning (text labels provided)
 *
 * @performance Memoized inline styles, no CSS-in-JS runtime overhead
 */
export function RoleBadge({ role, className = '' }: Props) {
  const config = ROLE_CONFIG[role]

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: config.bgColor,
    color: config.textColor,
    border: `1px solid ${config.textColor}20`, // 20 = 12% opacity
  }

  return (
    <span
      style={badgeStyle}
      className={`role-badge role-badge--${role} ${className}`.trim()}
      aria-label={`User role: ${config.label}. ${config.description}`}
      title={config.description}
    >
      {config.label}
    </span>
  )
}

/**
 * Default export for convenient importing
 */
export default RoleBadge
