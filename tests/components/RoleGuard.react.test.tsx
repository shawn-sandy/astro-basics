/**
 * React RoleGuard Component Tests
 *
 * Test suite for client-side RoleGuard component covering:
 * - Access control logic
 * - Loading states
 * - Fallback content rendering
 * - Accessibility attributes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleGuard } from '#components/react/RoleGuard'
import type { AnyRole } from '#utils/role-types'

describe('RoleGuard (React)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Access Control', () => {
    it('should render children when user has allowed role', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin', 'super_admin']}>
          <div>Admin Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('should not render children when user lacks allowed role', () => {
      render(
        <RoleGuard userRole="member" allowedRoles={['admin', 'super_admin']}>
          <div>Admin Content</div>
        </RoleGuard>
      )

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should not render children when user is not authenticated', () => {
      render(
        <RoleGuard userRole={null} allowedRoles={['admin']}>
          <div>Protected Content</div>
        </RoleGuard>
      )

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should support org roles', () => {
      render(
        <RoleGuard userRole="org:admin" allowedRoles={['org:admin', 'org:member']}>
          <div>Org Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Org Content')).toBeInTheDocument()
    })

    it('should support mixed role types in allowedRoles', () => {
      render(
        <RoleGuard
          userRole="super_admin"
          allowedRoles={['org:admin', 'admin', 'super_admin'] as AnyRole[]}
        >
          <div>Mixed Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Mixed Content')).toBeInTheDocument()
    })
  })

  describe('Fallback Content', () => {
    it('should render string fallback when access denied', () => {
      render(
        <RoleGuard userRole="member" allowedRoles={['admin']} fallback="Access denied">
          <div>Admin Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Access denied')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should render React element fallback when access denied', () => {
      render(
        <RoleGuard
          userRole="member"
          allowedRoles={['admin']}
          fallback={<div data-testid="custom-fallback">You need admin access</div>}
        >
          <div>Admin Content</div>
        </RoleGuard>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should render nothing when no fallback provided and access denied', () => {
      const { container } = render(
        <RoleGuard userRole="member" allowedRoles={['admin']}>
          <div>Admin Content</div>
        </RoleGuard>
      )

      expect(container.textContent).toBe('')
    })
  })

  describe('Loading State', () => {
    it('should render loading state when loading prop is true', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']} loading={true}>
          <div>Content</div>
        </RoleGuard>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    it('should not render loading state when loading prop is false', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']} loading={false}>
          <div>Content</div>
        </RoleGuard>
      )

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className to wrapper', () => {
      const { container } = render(
        <RoleGuard userRole="admin" allowedRoles={['admin']} className="custom-class">
          <div>Content</div>
        </RoleGuard>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('custom-class')
    })

    it('should apply className to loading state', () => {
      const { container } = render(
        <RoleGuard
          userRole="admin"
          allowedRoles={['admin']}
          loading={true}
          className="custom-loading"
        >
          <div>Content</div>
        </RoleGuard>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('custom-loading')
      expect(wrapper.className).toContain('role-guard-loading')
    })

    it('should apply className to fallback state', () => {
      const { container } = render(
        <RoleGuard
          userRole="member"
          allowedRoles={['admin']}
          fallback="Denied"
          className="custom-fallback"
        >
          <div>Content</div>
        </RoleGuard>
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('custom-fallback')
      expect(wrapper.className).toContain('role-guard-fallback')
    })
  })

  describe('Testing Support', () => {
    it('should apply data-testid to authorized content', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']} data-testid="role-guard-test">
          <div>Content</div>
        </RoleGuard>
      )

      expect(screen.getByTestId('role-guard-test')).toBeInTheDocument()
    })

    it('should apply data-testid-loading to loading state', () => {
      render(
        <RoleGuard
          userRole="admin"
          allowedRoles={['admin']}
          loading={true}
          data-testid="role-guard-test"
        >
          <div>Content</div>
        </RoleGuard>
      )

      expect(screen.getByTestId('role-guard-test-loading')).toBeInTheDocument()
    })

    it('should apply data-testid-fallback to fallback state', () => {
      render(
        <RoleGuard
          userRole="member"
          allowedRoles={['admin']}
          fallback="Denied"
          data-testid="role-guard-test"
        >
          <div>Content</div>
        </RoleGuard>
      )

      expect(screen.getByTestId('role-guard-test-fallback')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have role="status" on loading state', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']} loading={true}>
          <div>Content</div>
        </RoleGuard>
      )

      const loadingElement = screen.getByText('Loading...').parentElement
      expect(loadingElement).toHaveAttribute('role', 'status')
    })

    it('should have aria-live="polite" on loading state', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']} loading={true}>
          <div>Content</div>
        </RoleGuard>
      )

      const loadingElement = screen.getByText('Loading...').parentElement
      expect(loadingElement).toHaveAttribute('aria-live', 'polite')
    })

    it('should have aria-busy="true" on loading state', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']} loading={true}>
          <div>Content</div>
        </RoleGuard>
      )

      const loadingElement = screen.getByText('Loading...').parentElement
      expect(loadingElement).toHaveAttribute('aria-busy', 'true')
    })

    it('should have role="alert" on fallback state', () => {
      const { container } = render(
        <RoleGuard userRole="member" allowedRoles={['admin']} fallback="Access denied">
          <div>Content</div>
        </RoleGuard>
      )

      const fallbackElement = container.querySelector('.role-guard-fallback')
      expect(fallbackElement).toHaveAttribute('role', 'alert')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty allowedRoles array', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={[]}>
          <div>Content</div>
        </RoleGuard>
      )

      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    it('should handle multiple children', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']}>
          <div>First</div>
          <div>Second</div>
        </RoleGuard>
      )

      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })

    it('should handle nested RoleGuards', () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={['admin']}>
          <div>Outer</div>
          <RoleGuard userRole="admin" allowedRoles={['admin']}>
            <div>Inner</div>
          </RoleGuard>
        </RoleGuard>
      )

      expect(screen.getByText('Outer')).toBeInTheDocument()
      expect(screen.getByText('Inner')).toBeInTheDocument()
    })
  })
})
