import type { Meta, StoryObj } from '@storybook/react-vite'

import { RoleGuard } from '#components/react/RoleGuard'

/**
 * `RoleGuard` conditionally renders its children based on a role that was
 * **already resolved on the server**.
 *
 * > **Security note:** never derive `userRole` in the browser. Fetch it with
 * > `getUserRole(Astro.locals)` in the `.astro` page and pass it down as a prop —
 * > this component is presentation only and provides no protection on its own.
 */
const meta = {
  title: 'React/RoleGuard',
  component: RoleGuard,
  argTypes: {
    userRole: {
      control: 'select',
      options: [null, 'member', 'admin', 'super_admin', 'org:member', 'org:admin'],
      description: 'Role resolved server-side. `null` means signed out or unknown.',
    },
    allowedRoles: {
      control: 'object',
      description: 'User needs at least one of these roles to see the children.',
    },
    loading: {
      control: 'boolean',
      description: 'Renders an `aria-busy` status block instead of evaluating access.',
    },
  },
  args: {
    userRole: 'admin',
    allowedRoles: ['admin', 'super_admin'],
    children: <p>Admin panel contents</p>,
  },
} satisfies Meta<typeof RoleGuard>

export default meta

type Story = StoryObj<typeof meta>

/** The role matches `allowedRoles`, so the children render. */
export const Authorized: Story = {
  args: {
    userRole: 'admin',
    allowedRoles: ['admin', 'super_admin'],
  },
}

/**
 * The role does not match and no `fallback` is supplied, so the component renders
 * nothing at all — the story area is intentionally empty.
 */
export const DeniedSilently: Story = {
  args: {
    userRole: 'member',
    allowedRoles: ['admin', 'super_admin'],
  },
}

/**
 * With a `fallback`, denied users get an explanation wrapped in `role="alert"`
 * rather than a blank space.
 */
export const DeniedWithFallback: Story = {
  args: {
    userRole: 'member',
    allowedRoles: ['admin', 'super_admin'],
    fallback: <p>You need administrator access to view this section.</p>,
  },
}

/** Signed-out visitors have a `null` role and are treated as unauthorized. */
export const SignedOut: Story = {
  args: {
    userRole: null,
    allowedRoles: ['member', 'admin', 'super_admin'],
    fallback: <p>Please sign in to continue.</p>,
  },
}

/** While the role is still being resolved, show the polite loading status. */
export const Loading: Story = {
  args: {
    userRole: null,
    allowedRoles: ['admin'],
    loading: true,
  },
}

/** Clerk organization roles (`org:*`) work through the same `AnyRole` union. */
export const OrganizationRole: Story = {
  args: {
    userRole: 'org:admin',
    allowedRoles: ['org:admin'],
    children: <p>Organization settings</p>,
  },
}
