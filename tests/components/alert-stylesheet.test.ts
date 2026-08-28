// @vitest-environment node
/**
 * Guards for the alert stylesheet.
 *
 * `src/styles/components/alert.css` used to sit beside `_alert.scss`. Given
 * `@use "./components/alert"`, the two toolchains in this repo disagreed about
 * which file that meant:
 *
 * - the `sass` CLI (`npm run sass:build`, which produces the shipped `index.css`)
 *   picked `_alert.scss`
 * - Vite's sass resolver (Storybook, and any `.scss` imported through Astro)
 *   picked `alert.css`
 *
 * So edits to `_alert.scss` silently did nothing in Vite-built output, with no
 * warning from either tool. The stale duplicate is gone; these tests keep it gone.
 */

import { readdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

import { compile } from 'sass'
import { describe, expect, it } from 'vitest'

const STYLES_DIR = 'src/styles'

/** Every file under `src/styles`, recursively, as a repo-relative path. */
function styleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? styleFiles(path) : [path]
  })
}

describe('alert stylesheet', () => {
  it('compiles the stacked-layout rule into index.scss output', () => {
    const css = compile(`${STYLES_DIR}/index.scss`).css.replace(/\s+/g, ' ')

    // Qualified with [role=alert] so it outranks the acss row layout on
    // specificity rather than on stylesheet order.
    expect(css).toMatch(/\.alert\[role=alert\] \{[^}]*flex-direction: column/)
  })

  it('has no new .css file shadowing a same-named .scss partial', () => {
    const files = styleFiles(STYLES_DIR)

    // Only partials matter. `index.scss` -> `index.css` is the documented output of
    // `npm run sass:build`, and both are imported with an explicit extension, so
    // there is nothing for a resolver to guess at.
    const partials = new Set(
      files
        .filter(file => extname(file) === '.scss' && basename(file).startsWith('_'))
        .map(file => basename(file, '.scss').slice(1))
    )

    const shadowing = files.filter(
      file => extname(file) === '.css' && partials.has(basename(file, '.css'))
    )

    // Pre-existing, and the same trap: `@use "./design-tokens"` reaches the stale
    // 293-line `design-tokens.css` under Vite and the 399-line `_design-tokens.scss`
    // under the sass CLI. Removing it changes which tokens Storybook compiles, so it
    // wants its own change rather than riding along with an alert layout fix.
    expect(shadowing).toEqual(['src/styles/design-tokens.css'])
  })
})
