// @vitest-environment node
/**
 * Tests for the customize-design skill's contrast script.
 *
 * The real token file is only checked for shape, never for values: rebranding the
 * site is the point of the skill, so pinning today's colours here would fail every
 * customisation. Values are checked against fixtures instead.
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  PAIRS,
  ratio,
  report,
  readTheme,
} from '../../.claude/skills/customize-design/scripts/contrast.mjs'

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
    const { lines, failed } = report(fixture(passing, { ...passing, 'ink-soft': '#aaaaaa' }))

    expect(failed).toBe(true)
    const flagged = lines.filter(line => line.includes('FAIL'))
    expect(flagged).toHaveLength(2)
    for (const line of flagged) expect(line).toMatch(/^ink-soft on paper/)
    expect(report(fixture(passing, passing)).failed).toBe(false)
  })

  it('names a token missing from one theme instead of scoring nothing', () => {
    const { island: _dropped, ...withoutIsland } = passing
    expect(() => report(fixture(passing, withoutIsland))).toThrow(
      '--island is missing from @mixin direction-dark'
    )
  })

  it('refuses colours it cannot measure rather than guessing', () => {
    expect(() => ratio('oklch(50% 0.1 200)', '#fff')).toThrow('cannot measure')
    expect(() => readTheme('', 'direction-light')).toThrow('@mixin direction-light not found')
  })
})
