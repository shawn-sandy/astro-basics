// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import Navigation from '#components/astro/Navigation.astro'

/** Read an attribute value out of a raw opening tag, e.g. `<div id="x">`. */
function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

/** First opening tag for `name` in the rendered markup. */
function openTag(html: string, name: string): string {
  const match = new RegExp(`<${name}\\b[^>]*>`).exec(html)
  if (!match) throw new Error(`no <${name}> in rendered output`)
  return match[0]
}

/**
 * Locate the popover panel and its inner HTML.
 *
 * The panel is found by being the first `<div>` carrying an `id` — deliberately
 * *not* by its `popover` attribute nor by the button's `popovertarget`, so the
 * assertions about those two attributes stay meaningful rather than circular.
 * The closing tag is found by walking `<div>` nesting depth, so slotted content
 * containing divs cannot truncate the slice early.
 */
function findPanel(html: string): { tag: string; inner: string } {
  const match = /<div\b[^>]*\sid="[^"]*"[^>]*>/.exec(html)
  if (!match) throw new Error('no panel <div> with an id in rendered output')

  const start = match.index + match[0].length
  const tags = /<(\/?)div\b/g
  tags.lastIndex = start

  let depth = 1
  let next: RegExpExecArray | null
  while ((next = tags.exec(html)) !== null) {
    depth += next[1] ? -1 : 1
    if (depth === 0) return { tag: match[0], inner: html.slice(start, next.index) }
  }
  throw new Error('panel <div> is never closed')
}

describe('Navigation.astro popover markup contract', () => {
  const render = async (props?: Record<string, unknown>) => {
    const container = await AstroContainer.create()
    return container.renderToString(Navigation, props ? { props } : undefined)
  }

  it('wires the hamburger button popovertarget to the panel id', async () => {
    const html = await render()
    const target = attr(openTag(html, 'button'), 'popovertarget')

    expect(target).toBeTruthy()
    expect(attr(findPanel(html).tag, 'id')).toBe(target)
  })

  it('declares the panel as popover="auto"', async () => {
    // A bare `popover` or `popover="manual"` silently disables Esc and light
    // dismiss, so the literal value is part of the contract.
    const { tag } = findPanel(await render())

    expect(tag).toMatch(/\spopover="auto"[\s>]/)
  })

  it('renders every nav link inside the popover panel', async () => {
    const { inner } = findPanel(await render())

    for (const href of ['/', '/content/1', '/posts/1', '/about', '/contact']) {
      expect(inner).toContain(`href="${href}"`)
    }
  })

  it('renders the brand link pointing at the site root by default', async () => {
    const html = await render()
    const brand = /<a\b[^>]*\bdata-nav-brand\b[^>]*>/.exec(html)?.[0]

    expect(brand).toBeDefined()
    expect(attr(brand as string, 'href')).toBe('/')
  })

  it('hides the hamburger icon from assistive tech and the tab order', async () => {
    const svg = openTag(await render(), 'svg')

    expect(attr(svg, 'aria-hidden')).toBe('true')
    expect(attr(svg, 'focusable')).toBe('false')
  })

  it('labels the nav landmark', async () => {
    expect(attr(openTag(await render(), 'nav'), 'aria-label')).toBe('Primary')
  })

  it('marks the nav root with data-site-nav', async () => {
    // Every selector in _navigation.scss and in the inline first-paint block
    // is scoped to this attribute. Dropping it would strip the component of
    // all its styling without failing any other assertion here.
    //
    // Astro emits the bare form (`data-site-nav`) today, but the lookahead
    // accepts `=` as well so the assertion tracks whether the marker is
    // present rather than how Astro chose to serialise it. The lookahead is
    // still required: without it, `data-site-navigation` would pass.
    const html = await render()

    expect(openTag(html, 'nav')).toMatch(/\sdata-site-nav(?=[\s>=])/)
    expect(html).toContain('nav[data-site-nav] > button[popovertarget]')
  })

  it('renders default-slot content inside the popover panel', async () => {
    // Base.astro passes the userId-gated Dashboard and Profile links through
    // the default slot, so they must land inside the panel rather than the bar.
    const container = await AstroContainer.create()
    const html = await container.renderToString(Navigation, {
      slots: { default: '<ul data-nav-account><li><a href="/dashboard">Dashboard</a></li></ul>' },
    })

    const { inner } = findPanel(html)
    expect(inner).toContain('data-nav-account')
    expect(inner).toContain('href="/dashboard"')
  })

  it('keeps popovertarget in sync when menuId is overridden', async () => {
    const html = await render({ menuId: 'custom-menu' })

    expect(attr(findPanel(html).tag, 'id')).toBe('custom-menu')
    expect(attr(openTag(html, 'button'), 'popovertarget')).toBe('custom-menu')
  })
})
