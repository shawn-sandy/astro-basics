/**
 * RoleGuard - React component for role-based content visibility
 *
 * Client-side component that receives role data as props (pre-fetched server-side).
 * Provides conditional rendering based on user roles with loading and fallback states.
 *
 * @module components/react/RoleGuard
 *
 * @example
 * ```tsx
 * // In Astro page - fetch role server-side
 * ---
 * import Dashboard from '#components/react/Dashboard'
 * import { getUserRole } from '#utils/role-guard'
 *
 * const userRole = await getUserRole(Astro.locals, true)
 * ---
 * <Dashboard userRole={userRole} client:load />
 * ```
 *
 * @example
 * ```tsx
 * // In React component - use pre-fetched role
 * import { RoleGuard } from '#components/react/RoleGuard'
 *
 * function Dashboard({ userRole }: Props) {
 *   return (
 *     <RoleGuard
 *       userRole={userRole}
 *       allowedRoles={['admin', 'super_admin']}
 *       fallback={<AccessDenied />}
 *     >
 *       <AdminPanel />
 *     </RoleGuard>
 *   )
 * }
 * ```
 */

import type { ReactNode } from 'react'

import type { AnyRole } from '#utils/role-types'

/**
 * Props for RoleGuard component
 */
export interface RoleGuardProps {
  /**
   * Current user's role (passed from server)
   *
   * IMPORTANT: Must be fetched server-side using getUserRole() and
   * passed as prop. React components cannot access Astro.locals directly.
   */
  userRole: AnyRole | null

  /**
   * Roles allowed to view content
   *
   * Array of role strings. User must have at least ONE of these roles.
   */
  allowedRoles: AnyRole[]

  /**
   * Content to render when authorized
   */
  children: ReactNode

  /**
   * Fallback content when unauthorized
   *
   * Can be a string, React element, or null (default).
   * If null, nothing is rendered when access is denied.
   */
  fallback?: ReactNode

  /**
   * Show loading state
   *
   * Displays loading spinner/message while role data is being fetched.
   * Useful for async role loading scenarios.
   */
  loading?: boolean

  /**
   * Custom className for wrapper div
   *
   * Applied to the outermost div element for styling.
   */
  className?: string

  /**
   * Custom data-testid for testing
   *
   * Helpful for component testing and E2E tests.
   */
  'data-testid'?: string
}

/**
 * RoleGuard Component
 *
 * Conditionally renders children based on user role authorization.
 * Server-side role fetching required - this component only handles rendering.
 *
 * **Security Note**: Never determine roles client-side. Always fetch roles
 * server-side and pass as props to prevent role spoofing.
 *
 * @param props - Component props
 * @returns React element or null
 */
export function RoleGuard({
  userRole,
  allowedRoles,
  children,
  fallback = null,
  loading = false,
  className = '',
  'data-testid': testId,
}: RoleGuardProps) {
  // Loading state
  if (loading) {
    return (
      <div
        className={`role-guard-loading ${className}`.trim()}
        data-testid={testId ? `${testId}-loading` : undefined}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p>Loading...</p>
      </div>
    )
  }

  // Check if user has any allowed role
  const hasAccess = userRole !== null && allowedRoles.includes(userRole)

  // Access denied - show fallback or nothing
  if (!hasAccess) {
    if (fallback) {
      return (
        <div
          className={`role-guard-fallback ${className}`.trim()}
          data-testid={testId ? `${testId}-fallback` : undefined}
          role="alert"
        >
          {fallback}
        </div>
      )
    }
    return null
  }

  // Access granted - render children
  return (
    <div className={className} data-testid={testId}>
      {children}
    </div>
  )
}

/**
 * Default export for convenience
 */
export default RoleGuard
