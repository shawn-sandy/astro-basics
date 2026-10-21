#!/usr/bin/env node
/**
 * WCAG contrast for the Astro Kit direction tokens, light and dark, read straight
 * from the `direction-light` and `direction-dark` mixins in `_design-tokens.scss`.
 *
 * Usage (paths from the repo root; the token file is found from any directory):
 *   node .claude/skills/customize-design/scripts/contrast.mjs            # the token pairs
 *   node .claude/skills/customize-design/scripts/contrast.mjs '#185c53:#f5f8f6'  # any hex pair
 *
 * Exits 1 when a pair falls below 4.5:1, and 2 when it cannot measure (a malformed
 * pair, an unreadable colour, a missing token). Ratios are floored to two decimals,
 * so 4.499 never prints as a passing 4.50.
 */
import { readFileSync } from 'node:fs'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'

const TOKENS_FILE = fileURLToPath(
  new URL('../../../../src/styles/_design-tokens.scss', import.meta.url)
)
const FLOOR = 4.5

/**
 * Drop block and line comments, so a commented-out declaration, brace or mixin header
 * can never be read as a token. A `//` right after a `:` is kept, for `url(https://…)`.
 */
function stripComments(scss) {
  return scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Text-on-ground pairs the stylesheets paint, foreground first, with where each one shows. */
export const PAIRS = [
  ['ink', 'paper', 'body copy'],
  ['ink-soft', 'paper', 'decks, eyebrows, captions'],
  ['island', 'paper', 'links, focus ring, Paper label on the primary button'],
  ['ink', 'paper-sunk', 'header band, cards, code blocks'],
  ['ink-soft', 'paper-sunk', 'captions on cards and in the header band'],
  ['island', 'paper-sunk', 'links in the header band and on cards'],
  ['island', 'island-bg', 'ghost button hover, active dashboard link'],
  ['ink', 'island-bg', '::selection'],
]

/** The custom properties one mixin declares, as `{ name: value }` without the `--`. */
export function readTheme(scss, mixin) {
  const css = stripComments(scss)
  const header = new RegExp(`@mixin ${mixin}\\s*\\{`).exec(css)
  if (!header) throw new Error(`@mixin ${mixin} not found in _design-tokens.scss`)

  // Walk to the matching brace: a Sass `#{…}` inside the body would end a `[^}]*` match early.
  const start = header.index + header[0].length
  let end = start
  for (let depth = 1; end < css.length && depth > 0; end += 1) {
    if (css[end] === '{') depth += 1
    else if (css[end] === '}') depth -= 1
  }
  const body = css.slice(start, end - 1)

  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  )
}

function channels(color) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)
  if (m) {
    const hex = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1]
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
  }
  m = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/i.exec(color)
  const rgb = m?.slice(1).map(Number)
  if (rgb?.every(c => c <= 255)) return rgb
  // ponytail: opaque hex and rgb() only; e2e/home-accessibility.spec.ts measures anything the browser parses
  throw new Error(
    `cannot measure "${color}": use opaque hex or rgb(), or run e2e/home-accessibility.spec.ts`
  )
}

function luminance(color) {
  const [r, g, b] = channels(color).map(v => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return Math.floor(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

/** One line per pair with both themes' ratios; `failed` is true if any is under 4.5:1. */
export function report(scss) {
  const themes = {
    light: readTheme(scss, 'direction-light'),
    dark: readTheme(scss, 'direction-dark'),
  }
  let failed = false
  const lines = PAIRS.map(([fg, bg, where]) => {
    const cells = Object.entries(themes).map(([theme, tokens]) => {
      for (const name of [fg, bg]) {
        if (!tokens[name]) throw new Error(`--${name} is missing from @mixin direction-${theme}`)
      }
      const value = ratio(tokens[fg], tokens[bg])
      if (value < FLOOR) failed = true
      return `${theme} ${value.toFixed(2)}${value < FLOOR ? ' FAIL' : ''}`
    })
    return `${`${fg} on ${bg}`.padEnd(24)} ${cells.map(c => c.padEnd(16)).join('')}${where}`
  })
  return { lines, failed }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pairs = process.argv.slice(2)
  const malformed = pairs.find(pair => !/^[^:]+:[^:]+$/.test(pair))
  if (malformed !== undefined) {
    console.error(`"${malformed}" is not a pair.\nusage: contrast.mjs ['#fg:#bg' ...]`)
    process.exit(2)
  }
  let failed = false
  // Exit 1 means a pair measured under 4.5:1, so anything that stops a measurement
  // (an unreadable colour, a missing token) exits 2 instead of throwing.
  try {
    if (pairs.length) {
      for (const pair of pairs) {
        const [fg, bg] = pair.split(':')
        const value = ratio(fg, bg)
        if (value < FLOOR) failed = true
        console.log(`${fg} on ${bg}: ${value.toFixed(2)}${value < FLOOR ? ' FAIL' : ''}`)
      }
    } else {
      const result = report(readFileSync(TOKENS_FILE, 'utf8'))
      failed = result.failed
      console.log(result.lines.join('\n'))
    }
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }
  if (failed) {
    console.log(
      `\nA pair is under ${FLOOR}:1. Large text (24px+) and non-text marks need only 3:1.`
    )
    process.exit(1)
  }
}
