// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import ThemeToggle from '#components/astro/ThemeToggle.astro'

/** Read an attribute value out of a raw opening tag, e.g. `<button id="x">`. */
function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

/** First opening tag for `name` in the rendered markup. */
function openTag(html: string, name: string): string {
  const match = new RegExp(`<${name}\\b[^>]*>`).exec(html)
  if (!match) throw new Error(`no <${name}> in rendered output`)
  return match[0]
}

describe('ThemeToggle.astro markup contract', () => {
  const render = async () => {
    const container = await AstroContainer.create()
    return container.renderToString(ThemeToggle)
  }

  it('renders a native button that cannot submit a surrounding form', async () => {
    const tag = openTag(await render(), 'button')

    expect(attr(tag, 'type')).toBe('button')
  })

  it('exposes its state as a toggle button with an accessible name', async () => {
    const tag = openTag(await render(), 'button')

    // A toggle button keeps one name and flips `aria-pressed`; renaming the
    // control on every click would make screen readers announce a new button.
    expect(attr(tag, 'aria-pressed')).toMatch(/^(true|false)$/)
    expect(attr(tag, 'aria-label')?.trim()).toBeTruthy()
  })

  it('carries the hook the client script binds to', async () => {
    const tag = openTag(await render(), 'button')

    expect(tag).toMatch(/\sdata-theme-toggle[\s=>]/)
  })

  it('hides every icon from assistive technology', async () => {
    const html = await render()
    const svgs = html.match(/<svg\b[^>]*>/g) ?? []

    expect(svgs.length).toBeGreaterThanOrEqual(2)
    for (const svg of svgs) expect(attr(svg, 'aria-hidden')).toBe('true')
  })
})
