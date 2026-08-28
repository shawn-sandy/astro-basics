import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

const currentDir = dirname(fileURLToPath(import.meta.url))
const srcDir = resolve(currentDir, '../src')

/**
 * Vite config used exclusively by Storybook.
 *
 * The repository's root `vite.config.ts` wraps `getViteConfig()` from `astro/config`
 * for Vitest, which pulls the full Astro integration pipeline (adapters, Starlight,
 * MDX) into any build that loads it. Storybook must not inherit that, so
 * `.storybook/main.ts` points `viteConfigPath` here instead.
 *
 * Everything else Storybook needs — the React plugin, JSX handling, SCSS — comes from
 * `@storybook/react-vite` and Vite's own defaults.
 */
export default defineConfig({
  resolve: {
    alias: [
      // Mirror the `#*` subpath imports declared in package.json so stories can use
      // the same mandatory alias style as the rest of the codebase.
      { find: /^#(.*)$/, replacement: `${srcDir}/$1` },
    ],
  },
})
