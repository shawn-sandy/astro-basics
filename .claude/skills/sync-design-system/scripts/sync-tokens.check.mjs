/**
 * Checks for sync-tokens.mjs. Run from the repo root:
 *   node --test .claude/skills/sync-design-system/scripts/sync-tokens.check.mjs
 *
 * Expected colours are read from the real `_design-tokens.scss`, never pinned: rebranding
 * the site is what the skill is for. The artifact files are fixtures built in a temp folder.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { URL, fileURLToPath } from 'node:url'
import { readTheme } from '../../customize-design/scripts/contrast.mjs'

const SCRIPT = fileURLToPath(new URL('./sync-tokens.mjs', import.meta.url))
const SCSS = fileURLToPath(new URL('../../../../src/styles/_design-tokens.scss', import.meta.url))
const NAMES = ['ink', 'ink-soft', 'paper', 'paper-sunk', 'island', 'island-bg', 'rule']
const OLD = '#aa0000' // an old brand colour no project would ship
const made = []

const scss = readFileSync(SCSS, 'utf8')
const project = {
  light: readTheme(scss, 'direction-light'),
  dark: readTheme(scss, 'direction-dark'),
}

/** An artifact folder in the shape the type writes it; `skipCss` drops one token's tokens.css lines. */
function artifact({ without, skipCss, readme, errorHex } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'sync-ds-'))
  made.push(dir)
  mkdirSync(join(dir, 'project'))
  const named = NAMES.filter(name => name !== without)
  const tokens = {
    color: {
      themes: [
        { id: 'light', name: 'Light' },
        { id: 'dark', name: 'Dark' },
      ],
      tokens: [
        ...named.map(name => ({
          name,
          value: { light: OLD, dark: '#bb0000' },
          usage: `${name} note`,
        })),
        {
          name: 'color-error',
          value: { light: errorHex ?? '#ef4444' },
          usage: 'status 3.66:1 on paper',
        },
      ],
    },
  }
  const cssNames = NAMES.filter(name => name !== skipCss)
  const css = [
    '/* Test — generated from tokens.json */',
    ':root, [data-theme="light"] {',
    ...cssNames.map(name => `  --${name}: ${OLD}; /* stale note */`),
    '  --color-error: #ef4444; /* status 3.66:1 on paper */',
    '}',
    '[data-theme="dark"] {',
    ...cssNames.map(name => `  --${name}: #bb0000;`),
    '}',
    ':root {',
    '  --space-1: 0.25rem; /* grid */',
    '}',
    '',
  ].join('\n')
  writeFileSync(join(dir, 'project/tokens.json'), JSON.stringify(tokens, null, 2))
  writeFileSync(join(dir, 'project/tokens.css'), css)
  writeFileSync(join(dir, 'project/README.md'), readme ?? `The accent is ${OLD}.\n`)
  return dir
}

const run = (dir, env) =>
  spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8', env: { ...process.env, ...env } })

/** A _design-tokens.scss with both mixins; `light` overrides light values, `noDark` drops a dark token. */
function scssFile({ light = {}, noDark } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'sync-ds-scss-'))
  made.push(dir)
  const lightValues = {
    ink: '#101010',
    'ink-soft': '#505050',
    paper: '#ffffff',
    'paper-sunk': '#f0f0f0',
    island: '#006600',
    'island-bg': '#e0f0e0',
    rule: '#d0d0d0',
    ...light,
  }
  const darkValues = {
    ink: '#f0f0f0',
    'ink-soft': '#a0a0a0',
    paper: '#101010',
    'paper-sunk': '#181818',
    island: '#66cc66',
    'island-bg': '#102010',
    rule: '#303030',
  }
  const block = (name, values, skip) =>
    `@mixin ${name} {\n${Object.entries(values)
      .filter(([key]) => key !== skip)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join('\n')}\n}\n`
  const file = join(dir, '_design-tokens.scss')
  writeFileSync(
    file,
    block('direction-light', lightValues) + block('direction-dark', darkValues, noDark)
  )
  return file
}
const read = (dir, file) => readFileSync(join(dir, 'project', file), 'utf8')

after(() => made.forEach(dir => rmSync(dir, { recursive: true, force: true })))

test('copies both themes of every token into tokens.json and tokens.css', () => {
  const dir = artifact()
  const result = run(dir)
  assert.notEqual(result.status, 2, result.stderr)

  const tokens = JSON.parse(read(dir, 'tokens.json')).color.tokens
  const css = read(dir, 'tokens.css')
  const [lightBlock, darkBlock] = css.split('[data-theme="dark"] {')
  for (const name of NAMES) {
    const { light, dark } = {
      light: project.light[name].toLowerCase(),
      dark: project.dark[name].toLowerCase(),
    }
    assert.deepEqual(tokens.find(t => t.name === name).value, { light, dark })
    assert.ok(lightBlock.includes(`--${name}: ${light}; /* ${name} note */`), `${name} light line`)
    assert.ok(darkBlock.includes(`--${name}: ${dark};`), `${name} dark line`)
  }
  assert.ok(!read(dir, 'tokens.json').includes(OLD) && !css.includes(OLD), 'old colour left behind')
  assert.ok(
    css.includes('--color-error: #ef4444; /* status 3.66:1 on paper */'),
    'status colour must be untouched'
  )
  assert.ok(css.includes('--space-1: 0.25rem; /* grid */'), 'non-colour lines must be untouched')
  assert.ok(css.startsWith('/* Test — generated from tokens.json */'), 'first comment must survive')
})

test('lists a stale hex left in the README', () => {
  const result = run(artifact())
  assert.match(result.stdout, /project\/README\.md:1 {2}#aa0000/)
})

test('a second run changes nothing and says so', () => {
  const dir = artifact()
  run(dir)
  const before = [read(dir, 'tokens.json'), read(dir, 'tokens.css')]
  const again = run(dir)
  assert.match(again.stdout, /^in sync/)
  assert.deepEqual([read(dir, 'tokens.json'), read(dir, 'tokens.css')], before)
})

test('stops, writing nothing, when the artifact lacks a colour token', () => {
  const dir = artifact({ without: 'rule' })
  const before = read(dir, 'tokens.json')
  const result = run(dir)
  assert.equal(result.status, 2)
  assert.match(result.stderr, /no colour token "rule"/)
  assert.equal(read(dir, 'tokens.json'), before)
})

test('stops, writing nothing, when tokens.css has no line for a token', () => {
  const dir = artifact({ skipCss: 'island-bg' })
  const before = read(dir, 'tokens.json')
  const result = run(dir)
  assert.equal(result.status, 2)
  assert.match(result.stderr, /no "--island-bg:" line/)
  assert.equal(
    read(dir, 'tokens.json'),
    before,
    'tokens.json must not be written when tokens.css fails'
  )
})

test('after a change, names the usage notes that quote a ratio, and only then', () => {
  const dir = artifact()
  assert.match(run(dir).stdout, /Usage notes that quote a ratio or hex.*color-error/)
  assert.doesNotMatch(run(dir).stdout, /Usage notes that quote/)
})

test('lists no README hex that is in the palette, whatever its case', () => {
  const dir = artifact({ errorHex: '#EF4444', readme: 'Errors use #ef4444.\n' })
  assert.doesNotMatch(run(dir).stdout, /README\.md:\d+/)
})

for (const [label, raw] of [
  ['a var()', 'var(--brand)'],
  ['a five-digit hex', '#12345'],
]) {
  test(`rejects ${label} in a mixin, writing nothing`, () => {
    const dir = artifact()
    const before = [read(dir, 'tokens.json'), read(dir, 'tokens.css')]
    const result = run(dir, { SYNC_TOKENS_SCSS: scssFile({ light: { island: raw } }) })
    assert.equal(result.status, 2)
    assert.match(result.stderr, /--island is ".*" in the light mixin/)
    assert.deepEqual([read(dir, 'tokens.json'), read(dir, 'tokens.css')], before)
  })
}

test('stops when a mixin lacks one of the seven tokens', () => {
  const result = run(artifact(), { SYNC_TOKENS_SCSS: scssFile({ noDark: 'rule' }) })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /--rule is missing from @mixin direction-dark/)
})
