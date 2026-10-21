// @vitest-environment node
/**
 * Tests for the customize-design skill's contrast script.
 *
 * The real token file is checked for shape and for passing contrast, never for
 * specific values: rebranding the site is the point of the skill, so pinning today's
 * colours here would fail every customisation. Values are checked against fixtures.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
// `URL` is imported rather than taken from the global scope: the ESLint test
// override declares no Node globals, so the bare global trips `no-undef`.
import { URL, fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  PAIRS,
  ratio,
  report,
  readTheme,
} from '../../.claude/skills/customize-design/scripts/contrast.mjs'

const SCRIPT = fileURLToPath(
  new URL('../../.claude/skills/customize-design/scripts/contrast.mjs', import.meta.url)
)

const fixture = (light: Record<string, string>, dark: Record<string, string>) => {
  const decls = (tokens: Record<string, string>) =>
    Object.entries(tokens)
      .map(([name, value]) => `  --${name}: ${value};`)
      .join('\n')
  return `@mixin direction-light {\n${decls(light)}\n  color-scheme: light;\n}\n@mixin direction-dark {\n${decls(dark)}\n}`
}

const passing = {
  ink: '#000',
  'ink-soft': '#333333',
  paper: '#fff',
  'paper-sunk': '#eeeeee',
  island: '#0b6070',
  'island-bg': '#ffffff',
}

describe('customize-design contrast script', () => {
  it('reads every pair from both mixins of the real token file', () => {
    const { lines } = report(readFileSync('src/styles/_design-tokens.scss', 'utf8'))

    expect(lines).toHaveLength(PAIRS.length)
    for (const line of lines) expect(line).toMatch(/light \d+\.\d\d.*dark \d+\.\d\d/)
  })

  it('measures known ratios and floors instead of rounding', () => {
    expect(ratio('#000', '#fff')).toBe(21)
    expect(ratio('#fff', '#000')).toBe(21)
    expect(ratio('rgb(0, 0, 0)', '#ffffff')).toBe(21)
    // 6.7688... rounds to 6.77 but must report 6.76.
    expect(ratio('#99a2ad', '#151a20')).toBe(6.76)
  })

  it('fails a pair under 4.5:1 in either theme, and only that one', () => {
    const faint = { ...passing, 'ink-soft': '#aaaaaa' }
    const failsIn = (light: typeof passing, dark: typeof passing) =>
      report(fixture(light, dark)).lines.filter(line => line.includes('FAIL'))

    const darkOnly = failsIn(passing, faint)
    expect(darkOnly).toHaveLength(2)
    for (const line of darkOnly) {
      expect(line).toMatch(/^ink-soft on paper/)
      expect(line).toMatch(/dark \d+\.\d\d FAIL/)
      expect(line).not.toMatch(/light \d+\.\d\d FAIL/)
    }

    const lightOnly = failsIn(faint, passing)
    expect(lightOnly).toHaveLength(2)
    for (const line of lightOnly) {
      expect(line).toMatch(/light \d+\.\d\d FAIL/)
      expect(line).not.toMatch(/dark \d+\.\d\d FAIL/)
    }

    expect(report(fixture(faint, passing)).failed).toBe(true)
    expect(report(fixture(passing, passing)).failed).toBe(false)
  })

  it('ignores comments inside and around the mixins', () => {
    const scss = [
      '// @mixin direction-light { --ink: #ffffff; }',
      '@mixin direction-light {',
      '  // a {brace} in a comment',
      '  --island: #0b6070; // was --island: #ffffff;',
      '  /* --paper: #000000; */',
      '  --paper: #fff;',
      '}',
    ].join('\n')

    expect(readTheme(scss, 'direction-light')).toEqual({ island: '#0b6070', paper: '#fff' })
  })

  it('refuses a Sass expression rather than calling the token missing', () => {
    const scss = fixture({ ...passing, island: '#{$brand}' }, passing)
    expect(() => report(scss)).toThrow('cannot measure "#{$brand}"')
  })

  it('names a token missing from one theme instead of scoring nothing', () => {
    const { island: _dropped, ...withoutIsland } = passing
    expect(() => report(fixture(passing, withoutIsland))).toThrow(
      '--island is missing from @mixin direction-dark'
    )
  })

  it('refuses colours it cannot measure rather than guessing', () => {
    expect(() => ratio('oklch(50% 0.1 200)', '#fff')).toThrow('cannot measure')
    expect(() => ratio('rgb(300, 0, 0)', '#fff')).toThrow('cannot measure')
    expect(() => readTheme('', 'direction-light')).toThrow('@mixin direction-light not found')
  })
})

describe('customize-design contrast script CLI', () => {
  const run = (args: string[], cwd = '.') =>
    spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' })

  it('exits 0 for a passing pair and 1 for a failing one', () => {
    const pass = run(['#000:#fff'])
    expect(pass.status).toBe(0)
    expect(pass.stdout).toContain('#000 on #fff: 21.00')

    const fail = run(['#000:#fff', '#777777:#ffffff'])
    expect(fail.status).toBe(1)
    expect(fail.stdout).toContain('#777777 on #ffffff: 4.47 FAIL')
  })

  it('rejects a malformed pair with usage instead of a stack trace', () => {
    for (const bad of ['#fff', '#fff:', '#fff:#000:#111']) {
      const result = run([bad])
      expect(result.status, bad).toBe(2)
      expect(result.stderr, bad).toContain('usage:')
    }
  })

  it('exits 2, not the contrast-failure 1, on a colour it cannot read', () => {
    for (const bad of ['#12345:#fff', '#fff:teal', 'rgb(300, 0, 0):#000']) {
      const result = run([bad])
      expect(result.status, bad).toBe(2)
      expect(result.stderr, bad).toContain('cannot measure')
      expect(result.stderr, bad).not.toMatch(/^\s+at /m)
    }
  })

  it('finds the token file from any working directory', () => {
    const result = run([], 'src')
    // 0, not just "no error": every real pair must clear 4.5:1 whatever the brand.
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toMatch(/^ink on paper +light \d+\.\d\d/)
  })
})
