/**
 * Regression tests for the `@fpkit/acss` alert visibility contract.
 *
 * `@fpkit/acss` v6 ships:
 *
 * ```css
 * [role="alert"]:not([data-visible="true"]) { opacity: 0 }
 * ```
 *
 * so its own dismissible `<Alert>` can fade in. That selector (0,2,0) outranks this
 * project's `.alert` rules (0,1,0), so any `role="alert"` element rendered without
 * `data-visible="true"` is fully transparent — present in the DOM, announced by
 * screen readers, and invisible to sighted users.
 *
 * These tests lock in the attribute on the components that render alerts, and scan
 * the component sources so a newly added `role="alert"` cannot reintroduce the bug.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import Alert from '#components/react/Alert'
import { RoleGuard } from '#components/react/RoleGuard'

describe('Alert visibility contract (@fpkit/acss v6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('React Alert', () => {
    it.each(['error', 'success', 'info'] as const)(
      'marks the %s alert visible so acss does not hide it',
      type => {
        render(<Alert type={type}>Message</Alert>)

        expect(screen.getByRole('alert')).toHaveAttribute('data-visible', 'true')
      }
    )

    it('still renders its content and type class', () => {
      render(<Alert type="error">Something went wrong</Alert>)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Something went wrong')
      expect(alert.className).toContain('alert-error')
    })
  })

  describe('React RoleGuard fallback', () => {
    it('marks the access-denied fallback visible', () => {
      render(
        <RoleGuard userRole="member" allowedRoles={['admin']} fallback={<p>No access</p>}>
          <p>Secret</p>
        </RoleGuard>
      )

      expect(screen.getByRole('alert')).toHaveAttribute('data-visible', 'true')
    })
  })
})

/** Source files that may render markup, excluding stories and generated output. */
function componentSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return componentSources(path)
    if (entry.name.includes('.stories.')) return []
    return /\.(astro|tsx)$/.test(entry.name) ? [path] : []
  })
}

/** Strips block comments so prose mentioning `role="alert"` is not treated as markup. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

/**
 * Returns the full opening tag containing the character at `index`.
 *
 * Tracks quotes and brace depth so `class={`alert alert-${type}`}` does not end the
 * tag early on the `}` inside the template literal.
 */
function openingTagAt(source: string, index: number): string {
  const start = source.lastIndexOf('<', index)
  if (start === -1) return ''

  let depth = 0
  let quote: string | null = null

  for (let i = start; i < source.length; i++) {
    const char = source[i]
    if (quote) {
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') quote = char
    else if (char === '{') depth++
    else if (char === '}') depth--
    else if (char === '>' && depth === 0) return source.slice(start, i + 1)
  }
  return source.slice(start)
}

describe('every role="alert" element opts out of the acss fade-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const offenders = componentSources('src/components').flatMap(file => {
    const source = stripComments(readFileSync(file, 'utf8'))
    const tags: string[] = []

    for (
      let index = source.indexOf('role="alert"');
      index !== -1;
      index = source.indexOf('role="alert"', index + 1)
    ) {
      const tag = openingTagAt(source, index)
      if (!tag.includes('data-visible')) tags.push(`${file}: ${tag.replace(/\s+/g, ' ')}`)
    }

    return tags
  })

  it('finds no role="alert" element missing data-visible', () => {
    expect(offenders).toEqual([])
  })

  it('actually inspected the components that render alerts', () => {
    // Guards against the scan silently matching nothing (a rename, a moved directory).
    const scanned = componentSources('src/components').filter(file =>
      stripComments(readFileSync(file, 'utf8')).includes('role="alert"')
    )

    expect(scanned).toEqual(
      expect.arrayContaining([
        'src/components/astro/Alert.astro',
        'src/components/astro/RoleGuard.astro',
        'src/components/react/Alert.tsx',
        'src/components/react/RoleGuard.tsx',
      ])
    )
  })
})
