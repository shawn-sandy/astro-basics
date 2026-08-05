import { createRequire } from 'node:module'
import { test, expect, type Page, type Locator } from '@playwright/test'
import { BASE_URL } from './test-utils'

/**
 * E2E coverage for the native-popover primary navigation.
 *
 * `src/components/astro/Navigation.astro` ships no JavaScript: open, close,
 * Esc-to-close and outside-click ("light dismiss") all come from the browser
 * via the `popover` / `popovertarget` attributes.
 *
 * IMPORTANT: `aria-expanded` is NOT a DOM attribute on a popover invoker — it
 * is an implicit accessibility-tree mapping — so `getByRole('button', {
 * expanded: true })` and `[aria-expanded="true"]` never match. Open state is
 * asserted with `:popover-open` instead, polled rather than read once so the
 * 150ms fade cannot race the assertion.
 */

const NAV = 'nav[aria-label="Primary"]'
const PANEL_ID = 'site-nav-popover'
const LINK_LABELS = ['Home', 'Articles', 'Blog', 'About', 'Contact'] as const

/** WCAG 2.2 SC 2.5.8 asks for 24x24; the design target here is 44x44. */
const MIN_TARGET_PX = 44

/**
 * axe is injected from `node_modules/axe-core` deliberately. It is a
 * transitive install (via the declared devDependency `eslint-plugin-jsx-a11y`)
 * rather than a direct dependency, because this work carries a hard
 * no-new-dependency constraint. `require.resolve` is used so a missing install
 * throws loudly at test time instead of silently skipping the scan.
 */
const require = createRequire(import.meta.url)

type AxeViolation = {
  id: string
  impact: string | null
  help: string
  nodes: { target: string[] }[]
}

declare global {
  interface Window {
    axe: {
      run: (
        context: unknown,
        options: unknown
      ) => Promise<{ violations: AxeViolation[]; passes: { id: string }[] }>
    }
  }
}

const hamburger = (page: Page): Locator =>
  page.locator(`${NAV} button[popovertarget="${PANEL_ID}"]`)
const panel = (page: Page): Locator => page.locator(`#${PANEL_ID}`)

/** Poll `:popover-open` so the opacity transition cannot race the assertion. */
async function expectPopoverOpen(target: Locator, open: boolean): Promise<void> {
  await expect
    .poll(async () => target.evaluate(el => el.matches(':popover-open')), {
      message: `expected #${PANEL_ID} :popover-open to be ${open}`,
      timeout: 5000,
    })
    .toBe(open)
}

test.describe('Primary navigation popover', () => {
  test('panel is closed on load while the hamburger is visible', async ({ page }) => {
    await page.goto(BASE_URL)

    await expect(hamburger(page)).toBeVisible()
    await expectPopoverOpen(panel(page), false)
    await expect(panel(page)).toBeHidden()

    // Links exist in the HTML response but are not exposed while closed.
    for (const label of LINK_LABELS) {
      await expect(panel(page).getByRole('link', { name: label, exact: true })).toBeHidden()
    }
  })

  test('clicking the hamburger reveals all five links', async ({ page }) => {
    await page.goto(BASE_URL)

    await hamburger(page).click()
    await expectPopoverOpen(panel(page), true)

    for (const label of LINK_LABELS) {
      await expect(panel(page).getByRole('link', { name: label, exact: true })).toBeVisible()
    }
  })

  test('Esc closes the panel and restores focus to the hamburger', async ({ page }) => {
    await page.goto(BASE_URL)

    await hamburger(page).click()
    await expectPopoverOpen(panel(page), true)

    // Move focus into the panel first, so the assertion below proves real
    // focus restoration rather than focus that simply never left the button.
    const firstLink = panel(page).getByRole('link', { name: 'Home', exact: true })
    await firstLink.focus()
    await expect(firstLink).toBeFocused()

    await page.keyboard.press('Escape')

    await expectPopoverOpen(panel(page), false)
    await expect(hamburger(page)).toBeFocused()
  })

  test('clicking outside light-dismisses the panel', async ({ page }) => {
    await page.goto(BASE_URL)
    const urlBeforeDismiss = page.url()

    await hamburger(page).click()
    await expectPopoverOpen(panel(page), true)

    // Derive the click point from the panel's own box rather than assuming an
    // edge: the panel moved from right-aligned to flush-left during
    // implementation, which silently invalidated a hardcoded "far from the
    // panel" coordinate. Clicking just past its bottom-right corner stays
    // outside it wherever it is anchored.
    const box = await panel(page).boundingBox()
    if (!box) throw new Error('panel has no box while open')
    await page.mouse.click(box.x + box.width + 40, box.y + box.height + 40)

    // Guard the derivation itself: a click that landed on a link would still
    // close the panel, so assert we never navigated.

    await expectPopoverOpen(panel(page), false)
    expect(page.url()).toBe(urlBeforeDismiss)
  })

  test('hamburger is reachable by Tab and opens the panel with Enter', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(hamburger(page)).toBeVisible()

    const button = hamburger(page)
    let reached = false
    for (let i = 0; i < 10 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await button.evaluate(el => el === document.activeElement)
    }

    expect(reached, 'hamburger should be reachable by Tab from the top of the page').toBe(true)
    await expect(button).toBeFocused()

    await page.keyboard.press('Enter')
    await expectPopoverOpen(panel(page), true)
  })

  test(`hamburger hit area is at least ${MIN_TARGET_PX}x${MIN_TARGET_PX}px`, async ({ page }) => {
    await page.goto(BASE_URL)

    const box = await hamburger(page).boundingBox()
    expect(box, 'hamburger should have a bounding box').not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TARGET_PX)
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET_PX)
  })

  test('open panel does not animate under prefers-reduced-motion: reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(BASE_URL)

    await hamburger(page).click()
    await expectPopoverOpen(panel(page), true)

    /** Longest of the comma-separated `transition-duration` values, in seconds. */
    const longestTransitionSeconds = () =>
      panel(page).evaluate(el =>
        Math.max(
          ...window
            .getComputedStyle(el)
            .transitionDuration.split(',')
            .map(d => Number.parseFloat(d))
        )
      )

    // NOT asserted as exactly '0s': @fpkit/acss ships the canonical reduced-
    // motion reset (`transition-duration: .01ms !important`, which computes to
    // `1e-05s`). 0.01ms rather than 0 is deliberate — it keeps `transitionend`
    // firing. Anything at or below 1ms is imperceptible; the 150ms fade is not.
    expect(await longestTransitionSeconds()).toBeLessThanOrEqual(0.001)

    // Flipping the query back proves the assertion above is discriminating
    // rather than vacuous: the panel really does animate without the override.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(await longestTransitionSeconds()).toBeGreaterThanOrEqual(0.1)
  })

  test('open panel has zero axe-core WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto(BASE_URL)

    await hamburger(page).click()
    await expectPopoverOpen(panel(page), true)

    // `:popover-open` flips at the START of the 150ms opacity fade, so without
    // this axe can sample a still-transparent panel and report a washed-out
    // colour-contrast ratio that no user ever sees. Settle the fade first.
    await expect
      .poll(() => panel(page).evaluate(el => window.getComputedStyle(el).opacity))
      .toBe('1')

    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })

    const results = await page.evaluate(
      async navSelector =>
        window.axe.run(navSelector, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
          },
        }),
      NAV
    )

    // Guard against a vacuous pass: an empty violations list means nothing if
    // axe never matched any node inside the nav.
    expect(results.passes.length, 'axe should have actually scanned the nav').toBeGreaterThan(0)

    const summary = results.violations.map(
      v =>
        `${v.id} (${v.impact ?? 'n/a'}): ${v.help} -> ${v.nodes.map(n => n.target.join(' ')).join(', ')}`
    )
    expect(summary, `axe violations in ${NAV}`).toEqual([])
  })

  test('anonymous visitors get no dashboard or profile links anywhere', async ({ page }) => {
    await page.goto(BASE_URL)

    // The popover is presentational, never access control: authenticated-only
    // links must be absent from the response, open panel or not.
    await hamburger(page).click()
    await expectPopoverOpen(panel(page), true)

    expect(await page.locator('a[href="/dashboard"]').count()).toBe(0)
    expect(await page.locator('a[href="/profile"]').count()).toBe(0)
  })

  test('open panel adds no horizontal scrolling at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto(BASE_URL)

    const metrics = () =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

    // Absolute check against the viewport, not against a closed-panel
    // baseline. @fpkit/acss's `body { min-width: 20.3125rem }` (325px) floor
    // used to make every page overflow a 320px viewport by 5px regardless of
    // the nav, which is why this once had to measure relative to itself. That
    // floor is now overridden in src/styles/_base.scss, so the page genuinely
    // fits 320px (WCAG 2.1 SC 1.4.10) both shut and open.
    const closed = await metrics()
    expect(
      closed.scrollWidth,
      `closed scrollWidth ${closed.scrollWidth} vs viewport ${closed.clientWidth}`
    ).toBeLessThanOrEqual(closed.clientWidth)

    await hamburger(page).click()
    await expectPopoverOpen(panel(page), true)
    const open = await metrics()

    expect(
      open.scrollWidth,
      `open scrollWidth ${open.scrollWidth} vs viewport ${open.clientWidth}`
    ).toBeLessThanOrEqual(open.clientWidth)

    // The panel itself must sit entirely inside the 320px viewport — this is
    // what the `max-width: calc(100vw - 2rem)` clamp in _navigation.scss buys,
    // and it fails if that clamp regresses.
    const box = await panel(page).boundingBox()
    expect(box, 'open panel should have a bounding box').not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(-1)
    expect(box!.x + box!.width).toBeLessThanOrEqual(open.clientWidth + 1)
  })
})
