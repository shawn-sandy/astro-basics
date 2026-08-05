import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-utils'

/**
 * E2E coverage for the "Skip to main content" link in `src/layouts/Base.astro`.
 *
 * The link ships no CSS of its own: `@fpkit/acss` already styles
 * `body > a[href^="#"]` (off-screen at `top: -4rem`, revealed by `:focus`).
 * An earlier revision duplicated that rule locally and lost the cascade to it,
 * so the offset assertions below are what catch a silent restyle.
 *
 * Focus movement is asserted via `document.activeElement`, not the URL hash:
 * fragment navigation updates the hash and scroll position even when focus
 * never moves, which is exactly the bug `tabindex="-1"` on the target fixes.
 */

const SKIP = 'a.skip-link'

test.describe('Skip to main content link', () => {
  test('is the first focusable element and is hidden until focused', async ({ page }) => {
    await page.goto(BASE_URL)

    const skip = page.locator(SKIP)
    await expect(skip).toHaveAttribute('href', '#main')

    // Off-screen before focus: acss parks it above the viewport.
    const restingTop = await skip.evaluate(el => el.getBoundingClientRect().bottom)
    expect(
      restingTop,
      'skip link should sit above the viewport when unfocused'
    ).toBeLessThanOrEqual(0)

    await page.keyboard.press('Tab')
    await expect(skip).toBeFocused()

    // Focused: fully inside the viewport. Polled so the 0.3s slide cannot race it.
    await expect
      .poll(async () => skip.evaluate(el => el.getBoundingClientRect().top), { timeout: 2000 })
      .toBeGreaterThanOrEqual(0)
  })

  test('moves keyboard focus to the main landmark, not just the scroll position', async ({
    page,
  }) => {
    await page.goto(BASE_URL)

    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // The assertion that matters: focus itself moved. Without tabindex="-1" on
    // the target this stays on the skip link while the hash still reads #main.
    await expect(page.locator('main#main')).toBeFocused()
  })

  test('page has exactly one main landmark for the link to target', async ({ page }) => {
    await page.goto(BASE_URL)

    // Guards against a layout re-introducing a nested <main>, which both breaks
    // the landmark structure and makes `locator('main')` ambiguous.
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('main#main')).toHaveCount(1)
  })
})
