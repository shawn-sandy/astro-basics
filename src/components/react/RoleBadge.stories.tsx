import type { Meta, StoryObj } from '@storybook/react-vite'

import RoleBadge from '#components/react/RoleBadge'
import { USER_ROLES } from '#types/generated-roles'

/**
 * `RoleBadge` renders a user's application role as a pill. Labels, colours and
 * descriptions all come from `ROLE_COLORS` in `src/types/generated-roles.ts`,
 * which `npm run setup:roles` regenerates from `config/roles.config.ts` — so the
 * roles listed here follow whatever the project is configured with.
 */
const meta = {
  title: 'React/RoleBadge',
  component: RoleBadge,
  argTypes: {
    role: {
      control: 'select',
      options: USER_ROLES,
      description: 'Configured user role. Drives the label, colours and tooltip.',
    },
    className: {
      control: 'text',
      description: 'Extra classes appended after `role-badge role-badge--{role}`.',
    },
  },
  args: {
    role: 'member',
  },
} satisfies Meta<typeof RoleBadge>

export default meta

type Story = StoryObj<typeof meta>

/** Default role for a newly synced user. */
export const Member: Story = {
  args: { role: 'member' },
}

/** Elevated permissions for administrative tasks. */
export const Admin: Story = {
  args: { role: 'admin' },
}

/** Full system access. */
export const SuperAdmin: Story = {
  args: { role: 'super_admin' },
}

/**
 * Every configured role side by side. Each badge carries an `aria-label` with the
 * role description, and the text label means colour is never the only signal —
 * both requirements for the WCAG AA target this project holds itself to.
 */
export const AllRoles: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
      {USER_ROLES.map(role => (
        <RoleBadge key={role} role={role} />
      ))}
    </div>
  ),
}
