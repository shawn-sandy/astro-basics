// @vitest-environment node
import { readFileSync } from 'node:fs'
// `URL` is imported rather than taken from the global scope: the ESLint test
// override declares no Node globals, so the bare global trips `no-undef`.
import { URL, fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guards the defect this plan fixes: `src/styles/_design-tokens.scss` declared a
 * full alias layer that nothing read, so every painted surface fell through to the
 * @fpkit/acss defaults and the dark-mode block could not change a single pixel.
 *
 * The assertions read the *compiled* stylesheet rather than the SCSS source,
 * because a token only has a consumer once the cascade Sass emits actually
 * contains one. `npm run sass:build` writes it compressed (one long line) and
 * lint-staged then runs Prettier over it, so everything below parses characters
 * and braces instead of relying on line breaks or indentation.
 */
const COMPILED_CSS = fileURLToPath(new URL('../../src/styles/index.css', import.meta.url))

type Declaration = { readonly property: string; readonly value: string }
type Rule = {
  readonly selector: string
  readonly conditions: readonly string[]
  readonly declarations: readonly Declaration[]
}

/** At-rules that wrap other rules rather than declarations, so the walk descends into them. */
const CONDITIONAL_GROUP = /^@(media|supports|layer|container|scope|document)\b/i

/** Drop CSS block comments, so a commented-out `var()` can never satisfy an assertion. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Inner text of the block whose `{` sits at `open`, plus the index of its matching `}`. */
function block(css: string, open: number): { inner: string; close: number } {
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    else if (css[i] === '}') {
      depth -= 1
      if (depth === 0) return { inner: css.slice(open + 1, i), close: i }
    }
  }
  throw new Error(`unbalanced braces in ${COMPILED_CSS}`)
}

/** Split a rule body into declarations, ignoring any nested block (e.g. keyframe steps). */
function declarations(body: string): Declaration[] {
  let flat = ''
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '{') {
      i = block(body, i).close
      continue
    }
    flat += body[i]
  }

  return flat
    .split(';')
    .map(part => {
      const colon = part.indexOf(':')
      if (colon === -1) return undefined
      return { property: part.slice(0, colon).trim(), value: part.slice(colon + 1).trim() }
    })
    .filter((decl): decl is Declaration => decl !== undefined && decl.property.length > 0)
}

/** Flatten the stylesheet into rules, recording the at-rule preludes each one sits under. */
function parseRules(css: string, conditions: string[] = [], out: Rule[] = []): Rule[] {
  let prelude = ''
  for (let i = 0; i < css.length; i += 1) {
    const char = css[i]
    if (char === '{') {
      const { inner, close } = block(css, i)
      const selector = prelude.trim()
      if (CONDITIONAL_GROUP.test(selector)) parseRules(inner, [...conditions, selector], out)
      else out.push({ selector, conditions, declarations: declarations(inner) })
      prelude = ''
      i = close
      continue
    }
    if (char === '}' || char === ';') {
      prelude = ''
      continue
    }
    prelude += char
  }
  return out
}

const css = stripComments(readFileSync(COMPILED_CSS, 'utf8'))
const rules = parseRules(css)

/** Declarations reading `var(--token)`, excluding the token's own declaration. */
function consumersOf(token: string): Array<Rule & { declaration: Declaration }> {
  const reference = new RegExp(`var\\(\\s*${token}\\s*[,)]`)
  return rules.flatMap(rule =>
    rule.declarations
      .filter(decl => decl.property !== token && reference.test(decl.value))
      .map(declaration => ({ ...rule, declaration }))
  )
}

/** Properties that actually paint, as opposed to custom properties that only re-alias. */
const PAINTED = new Set(['background', 'background-color', 'color'])

describe('compiled design tokens', () => {
  it('parses compressed and expanded stylesheets identically', () => {
    // `npm run sass:build` writes this file compressed on one line; lint-staged
    // then runs Prettier over it and expands it again. Both forms reach the
    // assertions below, so the parser has to be blind to the difference.
    const compressed =
      ':root{--card-background:var(--paper-sunk)}body [data-card]{background-color:var(--card-background)}' +
      '@media(prefers-color-scheme: dark){:root{--paper-sunk:#151a20}body{background-color:var(--paper)}}'
    const expanded = `
      :root {
        --card-background: var(--paper-sunk);
      }
      body [data-card] {
        background-color: var(--card-background);
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --paper-sunk: #151a20;
        }
        body {
          background-color: var(--paper);
        }
      }
    `

    // Prettier writes `@media (…)` where Sass writes `@media(…)`; that one space is
    // the only difference the parser is allowed to preserve, so it is normalised
    // away here rather than papered over inside parseRules.
    const normalise = (parsed: Rule[]) =>
      parsed.map(rule => ({ ...rule, conditions: rule.conditions.map(c => c.replace(/\s+/g, '')) }))
    const dark = ['@media(prefers-color-scheme:dark)']

    expect(normalise(parseRules(expanded))).toEqual(normalise(parseRules(compressed)))
    expect(normalise(parseRules(compressed))).toEqual([
      {
        selector: ':root',
        conditions: [],
        declarations: [{ property: '--card-background', value: 'var(--paper-sunk)' }],
      },
      {
        selector: 'body [data-card]',
        conditions: [],
        declarations: [{ property: 'background-color', value: 'var(--card-background)' }],
      },
      {
        selector: ':root',
        conditions: dark,
        declarations: [{ property: '--paper-sunk', value: '#151a20' }],
      },
      {
        selector: 'body',
        conditions: dark,
        declarations: [{ property: 'background-color', value: 'var(--paper)' }],
      },
    ])
  })

  it('parses the compiled stylesheet into rules', () => {
    // A silent parse failure would make every assertion below vacuously pass, so
    // pin the sanity floor first: the stylesheet is large and :root is declared.
    expect(rules.length).toBeGreaterThan(100)
    expect(rules.some(rule => rule.selector === ':root')).toBe(true)
  })

  // Scoped to these two aliases on purpose. The alias layer in
  // src/styles/_design-tokens.scss declares many more tokens than this plan wires
  // up, so asserting across all of them would fail on aliases nobody has given a
  // consumer yet and would block the verification gate on unrelated work. Widening
  // this list belongs with the change that wires the remaining aliases.
  describe.each(['--card-background', '--header-background'])('%s', token => {
    it('is declared in the compiled stylesheet', () => {
      expect(rules.some(rule => rule.declarations.some(decl => decl.property === token))).toBe(true)
    })

    it('has at least one var() consumer', () => {
      expect(consumersOf(token).length).toBeGreaterThan(0)
    })

    it('is read by a property that paints, not only by another alias', () => {
      // `--x: var(--card-background)` is a var() consumer but repaints nothing;
      // the zero-consumer defect would survive it.
      const painting = consumersOf(token).filter(hit => PAINTED.has(hit.declaration.property))

      expect(painting.length).toBeGreaterThan(0)
    })
  })

  describe('dark mode', () => {
    const darkMedia = rules.filter(rule =>
      rule.conditions.some(condition => /prefers-color-scheme\s*:\s*dark/.test(condition))
    )
    const darkToggle = rules.filter(rule => /^:root\[data-theme=['"]?dark/.test(rule.selector))

    it('emits a prefers-color-scheme: dark block', () => {
      expect(darkMedia.length).toBeGreaterThan(0)
    })

    it('paints a surface under prefers-color-scheme: dark rather than only redefining variables', () => {
      // The original defect: the single dark-scoped rule set custom properties on
      // :root and nothing else, so no element repainted. A rule that paints has to
      // target something other than :root itself.
      const painted = darkMedia.filter(
        rule =>
          rule.selector !== ':root' &&
          rule.declarations.some(decl => PAINTED.has(decl.property) && !decl.value.startsWith('--'))
      )

      expect(painted.length).toBeGreaterThan(0)
    })

    it('paints the same surfaces through the explicit [data-theme="dark"] toggle', () => {
      // The media query alone cannot be overridden by a UI switch, so the toggle
      // path has to repaint too, not just redeclare :root variables.
      const painted = darkToggle.filter(rule =>
        rule.declarations.some(decl => PAINTED.has(decl.property) && !decl.value.startsWith('--'))
      )

      expect(painted.length).toBeGreaterThan(0)
    })
  })
})
