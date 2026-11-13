#!/usr/bin/env node
/**
 * Copy this project's seven direction colours onto a Design System artifact's files.
 *
 * Usage (from the repo root):
 *   node .claude/skills/sync-design-system/scripts/sync-tokens.mjs <dir>
 *
 * <dir> is the folder the artifact's files were read into: it holds project/tokens.json
 * and, if the artifact has one, project/tokens.css. Both are edited in place, so point
 * it at a copy you mean to publish, never at the repo.
 *
 * It sets the light and dark value of each token from the `direction-light` and
 * `direction-dark` mixins in `_design-tokens.scss`, rewrites that token's line in
 * tokens.css (value and usage note), prints the measured contrast, and lists every
 * 6-digit hex in the artifact's README, cards, stylesheet and cover that is not in its
 * palette, so a stale colour cannot hide there.
 *
 * Run it again after editing usage notes, because tokens.css repeats each note. A run
 * that prints "in sync" is also the check that a publish landed: read the published files
 * into a fresh folder and run it there.
 *
 * SYNC_TOKENS_SCSS points it at another token file; the checks use that.
 *
 * Exits 0 when done, 1 when a text pair is under 4.5:1, and 2 when it cannot continue
 * (a file or token it needs is missing, a tokens.css line it expects is not there).
 * Nothing is written on exit 2.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { readTheme, report } from '../../customize-design/scripts/contrast.mjs'

const SCSS =
  process.env.SYNC_TOKENS_SCSS ??
  fileURLToPath(new URL('../../../../src/styles/_design-tokens.scss', import.meta.url))
const NAMES = ['ink', 'ink-soft', 'paper', 'paper-sunk', 'island', 'island-bg', 'rule']
// What an artifact colour may be (format.md): no var(), color-mix() or named colours.
const READABLE =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgba?|hsla?|oklch|oklab|lab|lch)\([^()]*\))$/i
// The page writes these itself on a save, so a stale hex in them is not ours to list.
const GENERATED = /^(tokens\.(json|css)|manifest\.json|design-system\.json)$/

/** Edit one top-level tokens.css block, from its selector to its closing brace. */
function inBlock(css, open, edit) {
  const start = css.indexOf(open)
  const end = start < 0 ? -1 : css.indexOf('\n}', start)
  if (end < 0) throw new Error(`tokens.css has no "${open}" block`)
  return css.slice(0, start) + edit(css.slice(start, end)) + css.slice(end)
}

const declaration = name => new RegExp(`^(\\s*--${name}:)[^;\\n]*;[^\\n]*$`, 'm')

function* textFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'api') yield* textFiles(path)
    } else if (/\.(md|html|css|js|svg|txt)$/i.test(entry.name) && !GENERATED.test(entry.name)) {
      yield path
    }
  }
}

function sync(dir) {
  if (!dir) throw new Error('usage: sync-tokens.mjs <folder holding project/tokens.json>')
  const jsonPath = join(dir, 'project/tokens.json')
  const cssPath = join(dir, 'project/tokens.css')
  if (!existsSync(jsonPath)) {
    throw new Error(`${jsonPath} not found: read the artifact's project/tokens.json into ${dir}`)
  }

  const scss = readFileSync(SCSS, 'utf8')
  const project = {
    light: readTheme(scss, 'direction-light'),
    dark: readTheme(scss, 'direction-dark'),
  }
  const tokens = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const [lightId, darkId] = (tokens.color?.themes ?? []).map(theme => theme.id)
  if (!darkId) throw new Error('tokens.json needs a light and a dark theme in color.themes')

  const changes = []
  const targets = NAMES.map(name => {
    const token = tokens.color.tokens.find(entry => entry.name === name)
    if (!token) {
      throw new Error(
        `tokens.json has no colour token "${name}": add it by hand (name, value, usage), then run again`
      )
    }
    const value = typeof token.value === 'string' ? { [lightId]: token.value } : { ...token.value }
    const picked = {}
    for (const [id, theme] of [
      [lightId, 'light'],
      [darkId, 'dark'],
    ]) {
      const raw = project[theme][name]
      if (raw === undefined) throw new Error(`--${name} is missing from @mixin direction-${theme}`)
      if (!READABLE.test(raw)) {
        throw new Error(
          `--${name} is "${raw}" in the ${theme} mixin: an artifact colour must be hex, rgb(), hsl() or oklch() with plain numbers`
        )
      }
      picked[theme] = raw.toLowerCase()
      if (value[id] !== picked[theme])
        changes.push({ name, id, from: value[id], to: picked[theme] })
      value[id] = picked[theme]
    }
    token.value = value
    return { name, token, light: picked.light, dark: picked.dark }
  })

  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : null
  let nextCss = css
  if (css !== null) {
    nextCss = inBlock(css, `[data-theme="${lightId}"] {`, text => {
      for (const { name, token, light } of targets) {
        if (!declaration(name).test(text)) {
          throw new Error(`tokens.css has no "--${name}:" line in its ${lightId} block`)
        }
        const note = token.usage ? ` /* ${token.usage.replaceAll('*/', '* /')} */` : ''
        text = text.replace(declaration(name), (_, head) => `${head} ${light};${note}`)
      }
      return text
    })
    nextCss = inBlock(nextCss, `[data-theme="${darkId}"] {`, text => {
      for (const { name, light, dark } of targets) {
        if (declaration(name).test(text)) {
          text = text.replace(declaration(name), (_, head) => `${head} ${dark};`)
        } else if (dark !== light) {
          text += `\n  --${name}: ${dark};`
        }
      }
      return text
    })
  }

  // Everything is computed before anything is written, so a failure leaves both files alone.
  if (changes.length) writeFileSync(jsonPath, `${JSON.stringify(tokens, null, 2)}\n`)
  if (nextCss !== css) writeFileSync(cssPath, nextCss)

  const settled = !changes.length && nextCss === css
  console.log(
    settled
      ? 'in sync: tokens.json and tokens.css already match _design-tokens.scss'
      : changes
          .map(c => `${c.name.padEnd(11)} ${c.id.padEnd(5)} ${c.from ?? '(none)'} -> ${c.to}`)
          .join('\n')
  )
  if (!settled && css === null) console.log('no project/tokens.css to patch')
  if (!settled && nextCss !== css) console.log('tokens.css: colour lines rewritten')

  // A note that quotes a ratio or a hex went stale with the values it measured, status colours included.
  const stale = changes.length
    ? tokens.color.tokens
        .filter(t => /\d+\.\d+:1|#[0-9a-f]{6}\b/i.test(t.usage ?? ''))
        .map(t => t.name)
    : []
  if (stale.length) {
    console.log(
      `\nUsage notes that quote a ratio or hex, rewrite from the table below: ${stale.join(', ')}`
    )
  }

  const result = report(scss)
  console.log(`\nContrast, from _design-tokens.scss\n${result.lines.join('\n')}`)

  const palette = new Set(
    tokens.color.tokens.flatMap(entry =>
      Object.values(typeof entry.value === 'string' ? { v: entry.value } : entry.value).map(hex =>
        String(hex).toLowerCase()
      )
    )
  )
  const strays = new Set()
  for (const file of textFiles(join(dir, 'project'))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        for (const hex of line.match(/#[0-9a-f]{6}\b/gi) ?? []) {
          if (!palette.has(hex.toLowerCase())) {
            strays.add(`  ${relative(dir, file)}:${index + 1}  ${hex}  ${line.trim().slice(0, 70)}`)
          }
        }
      })
  }
  console.log(
    strays.size
      ? `\nHex colours outside the palette (stale, or deliberate?):\n${[...strays].join('\n')}`
      : '\nNo hex colour outside the palette in the README, cards, stylesheet or cover.'
  )
  return result.failed
}

try {
  process.exitCode = sync(process.argv[2]) ? 1 : 0
} catch (error) {
  console.error(error.message)
  process.exitCode = 2
}
