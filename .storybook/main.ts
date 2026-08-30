import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/react-vite'

const currentDir = dirname(fileURLToPath(import.meta.url))

/**
 * Storybook configuration for the astro-basics component library.
 *
 * Storybook renders the React (`src/components/react`) side of the library only —
 * `.astro` components are server-rendered by Astro and have no browser runtime that
 * Storybook can mount. Document those in the Starlight guide instead.
 *
 * @see project-docs/04-integrations/storybook.md
 */
const config: StorybookConfig = {
  // Stories are colocated with their components; standalone MDX doc pages live in
  // `src/stories/`. The MDX glob is scoped deliberately — `src/content/` holds
  // Starlight documentation pages that are not Storybook docs and must not be
  // indexed here.
  stories: ['../src/stories/**/*.mdx', '../src/components/react/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-links'],

  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        // Do NOT fall back to the root vite.config.ts — it wraps Astro's
        // getViteConfig() for Vitest and would drag the whole Astro build pipeline
        // (adapters, Starlight, MDX) into the Storybook preview.
        viteConfigPath: '.storybook/vite.config.ts',
      },
    },
  },

  core: {
    disableTelemetry: true,
  },

  typescript: {
    // Generate prop tables from the exported `Props` types the project standardises on.
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      tsconfigPath: resolve(currentDir, '../tsconfig.json'),
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: prop => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
}

export default config
