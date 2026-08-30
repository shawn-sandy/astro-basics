// @vitest-environment node
/**
 * Rendered-output guard for the `@fpkit/acss` alert visibility contract in Astro.
 *
 * `tests/components/alert-visibility.test.tsx` scans component sources for
 * `role="alert"` elements missing `data-visible`. This file renders `Alert.astro`
 * for real, which additionally proves the attribute survives Astro compilation —
 * a note placed in an HTML comment or a mis-scoped expression would not.
 *
 * `RoleGuard.astro` is covered by the source scan instead: rendering it needs
 * `Astro.locals` plus the Clerk and role-lookup stack, which would test the
 * mocking rather than the markup.
 */

import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

import Alert from '#components/astro/Alert.astro'

const render = async (type: 'error' | 'success' | 'info'): Promise<string> => {
  const container = await AstroContainer.create()
  return container.renderToString(Alert, {
    props: { type },
    slots: { default: 'Message body' },
  })
}

describe('Alert.astro visibility contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each(['error', 'success', 'info'] as const)(
    'renders the %s alert with data-visible="true"',
    async type => {
      const html = await render(type)

      expect(html).toContain('role="alert"')
      expect(html).toContain('data-visible="true"')
      expect(html).toContain(`alert-${type}`)
      expect(html).toContain('Message body')
    }
  )

  it('keeps the explanatory note out of the rendered HTML', async () => {
    const html = await render('info')

    expect(html).not.toContain('<!--')
    expect(html).not.toContain('opacity')
  })
})
