import type { Meta, StoryObj } from '@storybook/react-vite'

import Alert from '#components/react/Alert'

/**
 * `Alert` renders an inline status message with `role="alert"`, so assistive
 * technology announces it as soon as it appears. Styling comes from the
 * `.alert` / `.alert-{type}` rules in `src/styles/components/_alert.scss`.
 *
 * The component renders `data-visible="true"` by necessity: `@fpkit/acss` v6 ships
 * `[role=alert]:not([data-visible=true]) { opacity: 0 }` so its own dismissible
 * `<Alert>` can fade in, and that selector outranks the project's `.alert` rules.
 * Without the attribute every alert renders fully transparent.
 */
const meta = {
  title: 'React/Alert',
  component: Alert,
  argTypes: {
    type: {
      control: 'inline-radio',
      options: ['error', 'success', 'info'],
      description: 'Visual severity of the message.',
    },
    children: {
      control: 'text',
      description: 'Message content. Accepts any React node, not just text.',
    },
  },
  args: {
    type: 'info',
    children: 'Your changes have been saved.',
  },
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

/** Neutral messaging — confirmations, hints, and general notices. */
export const Info: Story = {
  args: {
    type: 'info',
    children: 'Drafts are saved automatically every 30 seconds.',
  },
}

/** Positive confirmation after a completed action. */
export const Success: Story = {
  args: {
    type: 'success',
    children: 'Your message was sent. We usually reply within two business days.',
  },
}

/** Failure state. This is the variant `ContactForm` uses for its error summary. */
export const Error: Story = {
  args: {
    type: 'error',
    children: 'We could not reach the server. Please try again.',
  },
}

/**
 * Alerts accept arbitrary markup, which is how `ContactForm` renders a linked
 * summary of every invalid field.
 */
export const WithRichContent: Story = {
  args: {
    type: 'error',
    children: (
      <>
        <h6>Please correct the following errors</h6>
        <ul data-list="unstyled">
          <li>
            <a href="#name">Please enter your name</a>
          </li>
          <li>
            <a href="#email">Please enter a valid email address</a>
          </li>
        </ul>
      </>
    ),
  },
}
