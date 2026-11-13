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
function artifact({ without, skipCss, readme, errorHex, notes, eol = '\n' } = {}) {
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
          usage: notes?.[name] ?? `${name} note`,
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
  ].join(eol)
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

test('writes nothing when a colour cannot be measured', () => {
  const dir = artifact()
  const before = [read(dir, 'tokens.json'), read(dir, 'tokens.css')]
  const result = run(dir, {
    SYNC_TOKENS_SCSS: scssFile({ light: { island: 'oklch(0.5 0.1 200)' } }),
  })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /cannot measure/)
  assert.deepEqual([read(dir, 'tokens.json'), read(dir, 'tokens.css')], before)
})

test('keeps a multi-line usage note on one line, and settles', () => {
  const dir = artifact({ notes: { rule: 'line one\nline two' } })
  run(dir)
  const css = read(dir, 'tokens.css')
  assert.match(css, /--rule: [^;]+; \/\* line one line two \*\//)
  assert.ok(!css.split('\n').includes('line two */'), 'the note leaked onto its own line')
  assert.match(run(dir).stdout, /^in sync/)
})

test('keeps CRLF line endings in tokens.css', () => {
  const dir = artifact({ eol: '\r\n' })
  run(dir)
  const lines = read(dir, 'tokens.css').split('\n').slice(0, -1)
  assert.ok(
    lines.every(line => line.endsWith('\r')),
    'a rewritten line lost its \\r'
  )
})

test('exits 0 when every text pair passes', () => {
  assert.equal(run(artifact(), { SYNC_TOKENS_SCSS: scssFile() }).status, 0)
})

test('exits 1, still applying the colours, when a pair is under 4.5:1', () => {
  const dir = artifact()
  const result = run(dir, { SYNC_TOKENS_SCSS: scssFile({ light: { 'ink-soft': '#bbbbbb' } }) })
  assert.equal(result.status, 1)
  assert.match(result.stdout, /FAIL/)
  const token = JSON.parse(read(dir, 'tokens.json')).color.tokens.find(t => t.name === 'ink-soft')
  assert.equal(token.value.light, '#bbbbbb')
})

test('a hand-edited usage note takes one more run to reach tokens.css', () => {
  const dir = artifact()
  run(dir)
  const file = join(dir, 'project/tokens.json')
  const tokens = JSON.parse(readFileSync(file, 'utf8'))
  tokens.color.tokens.find(t => t.name === 'rule').usage = 'edited by hand'
  writeFileSync(file, JSON.stringify(tokens, null, 2))
  assert.match(run(dir).stdout, /^tokens\.css: colour lines rewritten/)
  assert.match(read(dir, 'tokens.css'), /--rule: [^;]+; \/\* edited by hand \*\//)
  assert.match(run(dir).stdout, /^in sync/)
})

test('names a usage note that quotes an integer ratio or a short hex', () => {
  const dir = artifact({ notes: { rule: 'Hairlines, 21:1 on paper', ink: 'Drawn on #fff only' } })
  const out = run(dir).stdout
  assert.match(out, /rewrite from the table below: .*\bink\b/)
  assert.match(out, /rewrite from the table below: .*\brule\b/)
})

test('lists short and alpha hex strays, but not anchors, entities or the palette in short form', () => {
  const readme = [
    'Shorthand #abc, alpha #11223344 and #abcd.',
    'See [tokens](#add-token) and &#123; here.',
    'Plain #fff is the palette white.',
    '',
  ].join('\n')
  const out = run(artifact({ readme, errorHex: '#ffffff' })).stdout
  assert.match(out, /README\.md:1 {2}#abc\b/)
  assert.match(out, /README\.md:1 {2}#11223344/)
  assert.match(out, /README\.md:1 {2}#abcd/)
  assert.doesNotMatch(out, /README\.md:[23]\b/)
})
