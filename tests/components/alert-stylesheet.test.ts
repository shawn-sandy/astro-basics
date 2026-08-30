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
 *
 * The invariant that actually matters is not "no .css sits beside a partial" — some
 * of those, like `design-tokens.css`, are deliberate published artifacts documented
 * in DESIGN-TOKENS-README.md. It is that no extensionless `@use` in index.scss can
 * resolve two different ways, which is what makes the toolchains disagree.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { compile } from 'sass'
import { describe, expect, it } from 'vitest'

const STYLES_DIR = 'src/styles'

/** Removes `//` line comments and block comments so prose is not scanned as code. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** Every file under `src/styles`, recursively, as a repo-relative path. */
function styleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? styleFiles(path) : [path]
  })
}

describe('alert stylesheet', () => {
  it('compiles the stacked-layout rule into index.scss output', () => {
    // Quotes and whitespace are Sass output details, not the thing under test —
    // normalise both away so a formatting change cannot fail this spuriously.
    const css = compile(`${STYLES_DIR}/index.scss`).css.replace(/['"]/g, '').replace(/\s+/g, '')

    // Qualified with [role=alert] so it outranks the acss row layout on
    // specificity rather than on stylesheet order.
    expect(css).toMatch(/\.alert\[role=alert\]\{[^}]*flex-direction:column/)
  })

  it('has no extensionless @use that two resolvers could read differently', () => {
    // Comments are stripped first: index.scss documents this very hazard by quoting a
    // bare `@use "./design-tokens"`, and scanning raw text would flag that prose.
    const entry = stripComments(readFileSync(`${STYLES_DIR}/index.scss`, 'utf8'))
    const files = new Set(styleFiles(STYLES_DIR))

    const ambiguous = [...entry.matchAll(/@use\s+['"]\.\/([^'"]+)['"]/g)]
      .flatMap(match => (match[1] === undefined ? [] : [match[1]]))
      .filter(spec => !spec.endsWith('.scss') && !spec.endsWith('.css'))
      .filter(spec => {
        const dir = spec.includes('/') ? `/${spec.slice(0, spec.lastIndexOf('/') + 1)}` : '/'
        const name = spec.slice(spec.lastIndexOf('/') + 1)
        return (
          files.has(`${STYLES_DIR}${dir}_${name}.scss`) &&
          files.has(`${STYLES_DIR}${dir}${name}.css`)
        )
      })

    // Each of these resolves to `_name.scss` under the sass CLI and `name.css` under
    // Vite. Give the @use an explicit filename instead of removing the .css file.
    expect(ambiguous).toEqual([])
  })
})
