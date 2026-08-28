import type { Meta, StoryObj } from '@storybook/react-vite'

import ContactForm from '#components/react/ContactForm'

/**
 * `ContactForm` is the client-side contact form used by
 * `src/components/astro/ContactForm.astro`. It validates on submit, renders an
 * `Alert` summary linking to each invalid field, and posts to Netlify Forms.
 *
 * Submit the form empty in the canvas to see the validation summary — fields are
 * deliberately validated only on submit, never while typing.
 */
const meta = {
  title: 'React/ContactForm',
  component: ContactForm,
  argTypes: {
    csrfToken: {
      control: 'text',
      description:
        'CSRF token generated server-side. When present it is emitted as a hidden input; leave it unset to preview the unprotected markup.',
    },
  },
} satisfies Meta<typeof ContactForm>

export default meta

type Story = StoryObj<typeof meta>

/** The form as an Astro page renders it, with a CSRF token supplied. */
export const Default: Story = {
  args: {
    csrfToken: 'storybook-demo-csrf-token',
  },
}

/** Without a token the hidden CSRF input is omitted from the markup. */
export const WithoutCsrfToken: Story = {}
