import { test, expect } from '@playwright/test'
import { BASE_URL, VIEWPORTS } from './test-utils'

test.describe('Home Page Responsive Design', () => {
  test('responsive layout integrity', async ({ page }) => {
    await page.goto(BASE_URL)

    const viewportSizes = [
      VIEWPORTS.mobile, // Mobile
      VIEWPORTS.tablet, // Tablet
      VIEWPORTS.desktop, // Desktop
    ]

    for (const viewport of viewportSizes) {
      await page.setViewportSize(viewport)

      // Test that main structure remains intact
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('navigation')).toBeVisible()
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })

  // WCAG 2.1 SC 1.4.10 (Reflow): content must not require horizontal scrolling
  // at a 320px viewport. The offender was @fpkit/acss's
  // `body { min-width: 20.3125rem }` (325px) floor, overridden in
  // src/styles/_base.scss. Nav-specific reflow is covered separately by
  // e2e/navigation-popover.spec.ts.
  // Parameterised over both colour schemes. The design direction repaints every
  // global surface and adds a dark branch that swaps borders, padding-bearing
  // bands and the hero specimen, so reflow has to be proved in both themes
  // rather than inferred from one. The `light` case is a strict superset of the
  // single-scheme test that stood here before -- same page, same assertion, and
  // it additionally names the widest offending element -- so keeping both would
  // only have run the same check twice.
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`no horizontal scrolling at 320px in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ width: 320, height: 640 })
      await page.goto('/')

      const { scrollWidth, clientWidth, widest } = await page.evaluate(() => {
        const root = document.documentElement
        // Name the widest offender so a failure points at an element instead
        // of just reporting a number.
        let widest = ''
        let widestWidth = 0
        for (const el of Array.from(document.body.querySelectorAll('*'))) {
          const width = el.getBoundingClientRect().width
          if (width > widestWidth) {
            widestWidth = width
            widest = `${el.tagName.toLowerCase()} ${Math.round(width)}px`
          }
        }
        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          widest,
        }
      })

      // `<= 0` rather than `=== 0`: WCAG 2.1 SC 1.4.10 forbids overflow, not
      // slack. Both figures are integers rounded from fractional layout values,
      // so a page with no overflow can legitimately report -1.
      expect(
        scrollWidth - clientWidth,
        `${colorScheme}: scrollWidth ${scrollWidth} vs clientWidth ${clientWidth}; widest element ${widest}`
      ).toBeLessThanOrEqual(0)
    })
  }
})
