import type { Preview } from '@storybook/react-vite'

// Same stylesheet stack that src/layouts/Base.astro loads, so stories render with the
// production look. The SCSS entry point is imported directly (rather than the compiled
// index.css) so style edits hot-reload in Storybook.
import '@fpkit/acss/styles'
import '#styles/index.scss'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Surface accessibility violations in the a11y panel without failing the story.
      test: 'todo',
    },
    options: {
      storySort: {
        order: ['Introduction', 'React'],
      },
    },
  },

  // Every story gets an auto-generated docs page from its JSDoc and prop types.
  tags: ['autodocs'],
}

export default preview
