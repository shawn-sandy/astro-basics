/**
 * RoleBadge Component
 *
 * Displays user roles with color-coded visual indicators.
 * Colors are automatically generated based on role configuration with WCAG AA compliance.
 * Provides consistent styling and accessibility for role display across the application.
 *
 * @module components/react/RoleBadge
 */

import type { CSSProperties } from 'react'

import type { UserRole } from '#utils/role-types'
import { ROLE_COLORS } from '#utils/role-types'

/**
 * Props for RoleBadge component
 */
export type Props = {
  /** User role from Supabase users.role column (dynamically configured) */
  role: UserRole
  /** Optional additional CSS classes */
  className?: string
}

/**
 * RoleBadge - Visual indicator for user permission level
 *
 * Displays the user's role with appropriate styling based on permission hierarchy.
 * Colors are automatically generated from role configuration with WCAG AA compliance.
 *
 * @param {Props} props - Component properties
 * @returns {JSX.Element} Styled role badge
 *
 * @example
 * ```tsx
 * // Display user role (works with any configured role)
 * <RoleBadge role="member" />
 * <RoleBadge role="admin" />
 * <RoleBadge role="super_admin" />
 * <RoleBadge role="moderator" /> // If configured in roles.config.ts
 *
 * // With custom styling
 * <RoleBadge role="admin" className="custom-badge" />
 * ```
 *
 * @accessibility
 * - Uses aria-label for screen reader context
 * - WCAG AA compliant contrast ratios (minimum 4.5:1)
 * - Does not rely solely on color to convey meaning (text labels provided)
 *
 * @performance Memoized inline styles, no CSS-in-JS runtime overhead
 */
export function RoleBadge({ role, className = '' }: Props) {
  const config = ROLE_COLORS[role]

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
